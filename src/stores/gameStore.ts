import { defineStore } from 'pinia'
import { ref, computed, watch, onScopeDispose } from 'vue'
import type {
  GameState,
  GamePhase,
  PlayerState,
  GameAction,
  GameActionType,
  GameSettings,
} from '@/types/game'
import { COMMANDER_TAX_PER_CAST, GAME_STATE_SAVE_DEBOUNCE_MS, PLAYER_COLORS, MAX_HISTORY_LENGTH, LIFE_CHANGE_BATCH_MS } from '@/config/gameConstants'
import { saveGameState, loadGameState } from '@/services/persistence'
import { useStatsStore } from '@/stores/statsStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { applyActionReverse as applyReverse, applyActionForward as applyForward } from '@/utils/gameActionHandlers'

function generateId(): string {
  return crypto.randomUUID()
}

function createPlayer(index: number, settings: GameSettings): PlayerState {
  return {
    id: generateId(),
    name: `Player ${index + 1}`,
    color: PLAYER_COLORS[index % PLAYER_COLORS.length]!,
    lifeTotal: settings.startingLife,
    // Fresh objects per player — DO NOT spread EMPTY_PLAYER_COUNTERS
    // (shallow copy would share the same arrays/objects across all players)
    commanders: [],
    commanderDamageReceived: {},
    poisonCounters: 0,
    experienceCounters: 0,
    energyCounters: 0,
    isMonarch: false,
    hasInitiative: false,
    cityBlessing: false,
    ringLevel: 0,
    radCounters: 0,
    hourglassTokens: 0,
  }
}

const PROFILE_MAPPING_KEY = 'mtg_commander_game_profile_mapping'

function loadProfileMapping(): Record<string, { playerProfileId: string; deckId?: string }> {
  const stored = localStorage.getItem(PROFILE_MAPPING_KEY)
  if (!stored) return {}
  try {
    return JSON.parse(stored) ?? {}
  } catch {
    return {}
  }
}

export const useGameStore = defineStore('game', () => {
  const currentGame = ref<GameState | null>(null)
  const redoStack = ref<GameAction[]>([])
  const playerProfileMapping = ref<Record<string, { playerProfileId: string; deckId?: string }>>(loadProfileMapping())

  // Restore saved game on init
  const savedGame = loadGameState()
  if (savedGame) {
    // Default gamePhase for legacy saves; skip transient initiative phase
    if (!savedGame.gamePhase || savedGame.gamePhase === 'initiative') {
      savedGame.gamePhase = 'playing'
    }
    if (savedGame.customPositionMap === undefined) {
      savedGame.customPositionMap = null
    }
    if (savedGame.dayNightState === undefined) {
      savedGame.dayNightState = null
    }
    if (savedGame.hourglassTimeBankRemainingMs === undefined) {
      savedGame.hourglassTimeBankRemainingMs = {}
    }
    if (savedGame.playerRoundTimeMs === undefined) {
      savedGame.playerRoundTimeMs = {}
    }
    if (savedGame.playerPlayTimeMs === undefined) {
      savedGame.playerPlayTimeMs = {}
    }
    // Backfill new player fields for legacy saves
    for (const player of savedGame.players) {
      if (player.cityBlessing === undefined) player.cityBlessing = false
      if (player.ringLevel === undefined) player.ringLevel = 0
      if (player.radCounters === undefined) player.radCounters = 0
      if (player.hourglassTokens === undefined) player.hourglassTokens = 0
    }
    currentGame.value = savedGame
  }

  // Persist game state on every change (debounced)
  let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null
  watch(
    currentGame,
    (gameState) => {
      if (saveDebounceTimer !== null) {
        clearTimeout(saveDebounceTimer)
      }
      saveDebounceTimer = setTimeout(() => {
        saveGameState(gameState)
        saveDebounceTimer = null
      }, GAME_STATE_SAVE_DEBOUNCE_MS)
    },
    { deep: true },
  )

  watch(
    playerProfileMapping,
    (mapping) => {
      localStorage.setItem(PROFILE_MAPPING_KEY, JSON.stringify(mapping))
    },
    { deep: true },
  )

  function findPlayerById(playerId: string): PlayerState | undefined {
    return currentGame.value?.players.find((player) => player.id === playerId)
  }

  const isGameActive = computed(() => currentGame.value !== null)
  const currentTurnPlayer = computed(() => {
    if (!currentGame.value) return null
    return currentGame.value.players[currentGame.value.currentTurnPlayerIndex]
  })

  const nextTurnPlayer = computed(() => {
    if (!currentGame.value) return null
    const playerCount = currentGame.value.players.length
    if (playerCount === 0) return null

    let nextIndex = (currentGame.value.currentTurnPlayerIndex + 1) % playerCount
    let checkedCount = 0
    while (checkedCount < playerCount) {
      const candidate = currentGame.value.players[nextIndex]
      if (candidate && !isPlayerDead(candidate)) return candidate
      checkedCount++
      nextIndex = (nextIndex + 1) % playerCount
    }
    return null
  })

  const effectivePriorityPlayer = computed(() => {
    if (!currentGame.value) return null
    if (currentGame.value.priorityPlayerId) {
      return findPlayerById(currentGame.value.priorityPlayerId) ?? null
    }
    return currentTurnPlayer.value
  })

  function checkPlayerDead(player: PlayerState): boolean {
    const gameSettings = useSettingsStore().gameSettings
    if (player.lifeTotal <= 0) return true
    if (gameSettings.poisonThreshold > 0 && player.poisonCounters >= gameSettings.poisonThreshold) return true
    for (const damage of Object.values(player.commanderDamageReceived)) {
      if (damage >= gameSettings.commanderDamageThreshold) return true
    }
    return false
  }

  const playerDeadStatusMap = computed<Record<string, boolean>>(() => {
    if (!currentGame.value) return {}
    return Object.fromEntries(
      currentGame.value.players.map((player) => [player.id, checkPlayerDead(player)])
    )
  })

  function isPlayerDead(player: PlayerState): boolean {
    return playerDeadStatusMap.value[player.id] ?? false
  }

  function startNewGame() {
    const gameSettings = useSettingsStore().gameSettings
    const players = Array.from({ length: gameSettings.playerCount }, (_, index) =>
      createPlayer(index, gameSettings),
    )

    currentGame.value = {
      id: generateId(),
      players,
      currentTurnPlayerIndex: 0,
      turnNumber: 1,
      startedAt: Date.now(),
      elapsedMs: 0,
      isRunning: false,
      history: [],
      playerPlayTimeMs: {},
      playerRoundTimeMs: {},
      priorityPlayerId: null,
      activeFlashPlayerIds: [],
      gamePhase: 'seating',
      customPositionMap: null,
      dayNightState: null,
      hourglassTimeBankRemainingMs: {},
    }
  }

  function setGamePhase(phase: GamePhase) {
    if (!currentGame.value) return
    currentGame.value.gamePhase = phase
    if (phase === 'playing') {
      currentGame.value.isRunning = true
      currentGame.value.startedAt = Date.now()
    }
  }

  function setCustomPositionMap(map: number[] | null) {
    if (!currentGame.value) return
    currentGame.value.customPositionMap = map
  }

  function swapPlayerPositions(playerIndexA: number, playerIndexB: number) {
    if (!currentGame.value || playerIndexA === playerIndexB) return
    const count = currentGame.value.players.length
    const map = [...(currentGame.value.customPositionMap
      ?? Array.from({ length: count }, (_, i) => i))]
    ;[map[playerIndexA], map[playerIndexB]] = [map[playerIndexB]!, map[playerIndexA]!]
    currentGame.value.customPositionMap = map
  }

  function reorderPlayersForTurnOrder(orderedPlayerIds: string[]) {
    if (!currentGame.value) return
    const game = currentGame.value
    const count = game.players.length
    const currentMap = game.customPositionMap
      ?? Array.from({ length: count }, (_, i) => i)

    const playerSlots: Record<string, number> = {}
    game.players.forEach((player, index) => {
      playerSlots[player.id] = currentMap[index]!
    })

    const playerById = new Map(game.players.map(p => [p.id, p]))
    game.players = orderedPlayerIds
      .map(id => playerById.get(id)!)
      .filter(Boolean)

    game.customPositionMap = game.players.map(p => playerSlots[p.id]!)
    game.currentTurnPlayerIndex = 0
  }

  function addAction(
    type: GameActionType,
    playerId: string,
    value: number,
    descriptionKey: string,
    descriptionParams?: Record<string, string | number>,
    targetPlayerId?: string,
    commanderId?: string,
    previousValue?: number,
  ) {
    if (!currentGame.value) return

    const action: GameAction = {
      id: generateId(),
      timestamp: Date.now(),
      type,
      playerId,
      targetPlayerId,
      commanderId,
      value,
      descriptionKey,
      descriptionParams,
      previousValue,
    }
    currentGame.value.history.push(action)
    if (currentGame.value.history.length > MAX_HISTORY_LENGTH) {
      currentGame.value.history = currentGame.value.history.slice(-MAX_HISTORY_LENGTH)
    }
    redoStack.value = [] // Clear redo on new action
  }

  function changeLife(playerId: string, amount: number) {
    if (!currentGame.value) return
    const player = findPlayerById(playerId)
    if (!player) return

    player.lifeTotal += amount

    // Try to merge with last history entry if same player + life_change + within batch window
    const history = currentGame.value.history
    const lastAction = history.length > 0 ? history[history.length - 1] : null
    const now = Date.now()

    if (
      lastAction
      && lastAction.type === 'life_change'
      && lastAction.playerId === playerId
      && (now - lastAction.timestamp) < LIFE_CHANGE_BATCH_MS
    ) {
      // Merge: accumulate value, update params + timestamp
      lastAction.value += amount
      const accumulatedAmount = lastAction.value
      lastAction.descriptionParams = {
        name: player.name,
        sign: accumulatedAmount > 0 ? '+' : '',
        amount: Math.abs(accumulatedAmount),
      }
      lastAction.timestamp = now
      redoStack.value = []
    } else {
      addAction('life_change', playerId, amount, 'game.lifeChange', {
        name: player.name,
        sign: amount > 0 ? '+' : '',
        amount: Math.abs(amount),
      })
    }
  }

  function dealCommanderDamage(targetPlayerId: string, commanderId: string, amount: number) {
    if (!currentGame.value) return
    const targetPlayer = findPlayerById(targetPlayerId)
    if (!targetPlayer) return

    const currentDamage = targetPlayer.commanderDamageReceived[commanderId] ?? 0
    const clampedAmount = Math.max(amount, -currentDamage)
    targetPlayer.commanderDamageReceived[commanderId] = currentDamage + clampedAmount
    targetPlayer.lifeTotal -= clampedAmount

    if (clampedAmount === 0) return

    addAction(
      'commander_damage',
      targetPlayerId,
      clampedAmount,
      'game.commanderDamage',
      { name: targetPlayer.name, amount: Math.abs(clampedAmount) },
      targetPlayerId,
      commanderId,
    )
  }

  function changeCounter(
    playerId: string,
    counterKey: 'poisonCounters' | 'experienceCounters' | 'energyCounters',
    actionType: GameActionType,
    counterLabel: string,
    amount: number,
  ) {
    if (!currentGame.value) return
    const player = findPlayerById(playerId)
    if (!player) return

    player[counterKey] = Math.max(0, player[counterKey] + amount)
    addAction(actionType, playerId, amount, 'game.counterChange', {
      name: player.name,
      sign: amount > 0 ? '+' : '',
      amount: Math.abs(amount),
      counter: counterLabel,
    })
  }

  function changePoison(playerId: string, amount: number) {
    changeCounter(playerId, 'poisonCounters', 'poison_change', 'poison', amount)
  }

  function changeExperience(playerId: string, amount: number) {
    changeCounter(playerId, 'experienceCounters', 'experience_change', 'experience', amount)
  }

  function changeEnergy(playerId: string, amount: number) {
    changeCounter(playerId, 'energyCounters', 'energy_change', 'energy', amount)
  }

  function castCommander(playerId: string, commanderIndex: number) {
    if (!currentGame.value) return
    const player = findPlayerById(playerId)
    if (!player || !player.commanders[commanderIndex]) return

    player.commanders[commanderIndex].castCount++
    addAction(
      'commander_cast',
      playerId,
      commanderIndex,
      'game.commanderCast',
      {
        name: player.name,
        cardName: player.commanders[commanderIndex].cardName,
        tax: (player.commanders[commanderIndex].castCount - 1) * COMMANDER_TAX_PER_CAST,
      },
    )
  }

  function getCommanderTax(player: PlayerState, commanderIndex: number): number {
    const commander = player.commanders[commanderIndex]
    if (!commander) return 0
    return Math.max(0, (commander.castCount - 1) * COMMANDER_TAX_PER_CAST)
  }

  function isPlayerDeadByCommanderDamage(player: PlayerState): string | null {
    const commanderDamageThreshold = useSettingsStore().gameSettings.commanderDamageThreshold
    for (const [commanderId, damage] of Object.entries(player.commanderDamageReceived)) {
      if (damage >= commanderDamageThreshold) {
        return commanderId
      }
    }
    return null
  }

  function isPlayerDeadByPoison(player: PlayerState): boolean {
    const poisonThreshold = useSettingsStore().gameSettings.poisonThreshold
    if (poisonThreshold <= 0) return false
    return player.poisonCounters >= poisonThreshold
  }

  function toggleExclusiveStatus(
    playerId: string,
    statusKey: 'isMonarch' | 'hasInitiative',
    actionType: GameActionType,
    gainDescriptionKey: string,
    loseDescriptionKey: string,
  ) {
    if (!currentGame.value) return
    const player = findPlayerById(playerId)
    if (!player) return
    const previousHolder = currentGame.value.players.find((p) => p[statusKey])
    const previousHolderId = previousHolder?.id
    const hadStatus = player[statusKey]
    for (const otherPlayer of currentGame.value.players) {
      otherPlayer[statusKey] = false
    }
    if (!hadStatus) {
      player[statusKey] = true
    }
    addAction(
      actionType,
      playerId,
      hadStatus ? 0 : 1,
      hadStatus ? loseDescriptionKey : gainDescriptionKey,
      { name: player.name },
      previousHolderId,
    )
  }

  function toggleMonarch(playerId: string) {
    toggleExclusiveStatus(playerId, 'isMonarch', 'monarch_change', 'game.monarchGain', 'game.monarchLose')
  }

  function toggleInitiative(playerId: string) {
    toggleExclusiveStatus(playerId, 'hasInitiative', 'initiative_change', 'game.initiativeGain', 'game.initiativeLose')
  }

  function toggleCityBlessing(playerId: string) {
    if (!currentGame.value) return
    const player = findPlayerById(playerId)
    if (!player) return
    player.cityBlessing = !player.cityBlessing
    addAction(
      'city_blessing_change',
      playerId,
      player.cityBlessing ? 1 : 0,
      player.cityBlessing ? 'game.cityBlessingGain' : 'game.cityBlessingLose',
      { name: player.name },
    )
  }

  function setRingLevel(playerId: string, level: number) {
    if (!currentGame.value) return
    const player = findPlayerById(playerId)
    if (!player) return
    const previousLevel = player.ringLevel
    player.ringLevel = Math.max(0, Math.min(4, level))
    if (player.ringLevel === previousLevel) return
    addAction(
      'ring_level_change',
      playerId,
      player.ringLevel,
      'game.ringLevelChange',
      { name: player.name, level: player.ringLevel },
      undefined,
      undefined,
      previousLevel,
    )
  }

  function changeRadCounters(playerId: string, amount: number) {
    if (!currentGame.value) return
    const player = findPlayerById(playerId)
    if (!player) return
    player.radCounters = Math.max(0, player.radCounters + amount)
    addAction('rad_change', playerId, amount, 'game.counterChange', {
      name: player.name,
      sign: amount > 0 ? '+' : '',
      amount: Math.abs(amount),
      counter: 'rad',
    })
  }

  function changeHourglassTokens(playerId: string, amount: number) {
    if (!currentGame.value) return
    const player = findPlayerById(playerId)
    if (!player) return
    const previousHourglassValue = player.hourglassTokens
    player.hourglassTokens = Math.max(0, player.hourglassTokens + amount)
    addAction(
      'hourglass_change',
      playerId,
      amount,
      'game.counterChange',
      {
        name: player.name,
        sign: amount > 0 ? '+' : '',
        amount: Math.abs(amount),
        counter: 'hourglass',
      },
      undefined,
      undefined,
      previousHourglassValue,
    )
  }

  function setBadgePosition(playerId: string, badgeKey: string, left: number, top: number) {
    if (!currentGame.value) return
    const player = findPlayerById(playerId)
    if (!player) return
    if (!player.badgePositions) player.badgePositions = {}
    player.badgePositions[badgeKey] = { left, top }
  }

  function toggleDayNight() {
    if (!currentGame.value) return
    const currentState = currentGame.value.dayNightState
    if (currentState === null) {
      currentGame.value.dayNightState = 'day'
    } else {
      currentGame.value.dayNightState = currentState === 'day' ? 'night' : 'day'
    }
    // Use first player as action owner for global events
    const firstPlayer = currentGame.value.players[0]
    if (!firstPlayer) return
    addAction(
      'day_night_change',
      firstPlayer.id,
      currentGame.value.dayNightState === 'day' ? 1 : 0,
      currentGame.value.dayNightState === 'day' ? 'game.dayNightDay' : 'game.dayNightNight',
      {},
      undefined,
      undefined,
      currentState === 'day' ? 1 : currentState === 'night' ? 0 : -1,
    )
  }

  function declareGameResult(playerId: string, result: 'winner' | 'eliminated' | 'surrender' | 'draw') {
    if (!currentGame.value) return
    const player = findPlayerById(playerId)
    if (!player) return

    switch (result) {
      case 'winner':
        addAction('game_result', playerId, 1, 'game.resultWinner', { name: player.name })
        endGame()
        break
      case 'eliminated':
        player.lifeTotal = 0
        addAction('game_result', playerId, 0, 'game.resultEliminated', { name: player.name })
        break
      case 'surrender':
        player.lifeTotal = 0
        addAction('game_result', playerId, -1, 'game.resultSurrender', { name: player.name })
        break
      case 'draw':
        addAction('game_result', playerId, 2, 'game.resultDraw', { name: player.name })
        endGame()
        break
    }
  }

  function updatePlayerName(playerId: string, newName: string) {
    if (!currentGame.value) return
    const player = findPlayerById(playerId)
    if (!player) return
    player.name = newName
  }

  function addPlayerCommander(playerId: string, cardName: string, imageUri: string) {
    if (!currentGame.value) return
    const player = findPlayerById(playerId)
    if (!player) return
    player.commanders.push({ id: generateId(), cardName, imageUri, castCount: 0 })
  }

  function removePlayerCommander(playerId: string, commanderIndex: number) {
    if (!currentGame.value) return
    const player = findPlayerById(playerId)
    if (!player) return
    player.commanders.splice(commanderIndex, 1)
  }

  function takePriority(playerId: string) {
    if (!currentGame.value) return
    currentGame.value.priorityPlayerId = playerId
  }

  function releasePriority() {
    if (!currentGame.value) return
    currentGame.value.priorityPlayerId = null
  }

  function advanceTurn() {
    if (!currentGame.value) return
    // Clear any active priority when advancing turn
    currentGame.value.priorityPlayerId = null
    const playerCount = currentGame.value.players.length
    if (playerCount === 0) return

    // Store previous state BEFORE advancing
    const previousTurnIndex = currentGame.value.currentTurnPlayerIndex

    // Update time bank for the current player before advancing
    const settingsStore = useSettingsStore()
    const hourglassSettings = settingsStore.gameSettings
    if (hourglassSettings.hourglassEnabled && hourglassSettings.hourglassMode === 'time_bank' && currentGame.value) {
      const currentPlayer = currentGame.value.players[currentGame.value.currentTurnPlayerIndex]
      if (currentPlayer) {
        const roundTimeMs = currentGame.value.playerRoundTimeMs?.[currentPlayer.id] ?? 0
        const gracePeriodMs = hourglassSettings.hourglassGracePeriodSeconds * 1000
        const currentBank = currentGame.value.hourglassTimeBankRemainingMs[currentPlayer.id] ?? gracePeriodMs

        // Subtract used time, add next turn's credit
        let newBank = Math.max(0, currentBank - roundTimeMs) + gracePeriodMs

        // Apply cap if enabled
        if (hourglassSettings.hourglassTimeBankCapEnabled) {
          newBank = Math.min(newBank, hourglassSettings.hourglassTimeBankCapSeconds * 1000)
        }

        currentGame.value.hourglassTimeBankRemainingMs[currentPlayer.id] = newBank
      }
    }

    let nextIndex = (currentGame.value.currentTurnPlayerIndex + 1) % playerCount
    let turnIncremented = nextIndex === 0

    // Skip dead players, but guard against infinite loop if all players are dead
    let checkedCount = 0
    while (checkedCount < playerCount) {
      const candidatePlayer = currentGame.value.players[nextIndex]
      if (candidatePlayer && !isPlayerDead(candidatePlayer)) {
        break
      }
      checkedCount++
      const previousIndex = nextIndex
      nextIndex = (nextIndex + 1) % playerCount
      if (previousIndex === playerCount - 1 && nextIndex === 0) {
        if (!turnIncremented) {
          turnIncremented = true
        }
      }
    }

    if (turnIncremented) {
      currentGame.value.turnNumber++
    }
    currentGame.value.currentTurnPlayerIndex = nextIndex
    const turnPlayer = currentGame.value.players[nextIndex]
    if (turnPlayer) {
      addAction(
        'turn_advance',
        turnPlayer.id,
        currentGame.value.turnNumber,
        'game.turn',
        { n: currentGame.value.turnNumber },
        undefined,
        undefined,
        previousTurnIndex,
      )
    }
  }

  const canUndo = computed(() => (currentGame.value?.history.length ?? 0) > 0)
  const canRedo = computed(() => redoStack.value.length > 0)
  const nextRedoAction = computed(() => redoStack.value.length > 0 ? redoStack.value[redoStack.value.length - 1] : null)

  function undoLastAction() {
    if (!currentGame.value || currentGame.value.history.length === 0) return
    const lastAction = currentGame.value.history.pop()!
    const gameSettings = useSettingsStore().gameSettings
    applyReverse(currentGame.value.players, lastAction, {
      commanderDamageThreshold: gameSettings.commanderDamageThreshold,
      poisonThreshold: gameSettings.poisonThreshold,
    }, currentGame.value)
    redoStack.value.push(lastAction)
  }

  /** Undo actions until a specific player is no longer dead (max 50 to prevent infinite loop) */
  function undoUntilPlayerAlive(playerId: string) {
    if (!currentGame.value) return
    const player = findPlayerById(playerId)
    if (!player) return
    let safety = 50
    while (isPlayerDead(player) && currentGame.value.history.length > 0 && safety-- > 0) {
      undoLastAction()
    }
  }

  function redoLastAction() {
    if (!currentGame.value || redoStack.value.length === 0) return
    const action = redoStack.value.pop()!
    const gameSettings = useSettingsStore().gameSettings
    applyForward(currentGame.value.players, action, {
      commanderDamageThreshold: gameSettings.commanderDamageThreshold,
      poisonThreshold: gameSettings.poisonThreshold,
    }, currentGame.value)
    currentGame.value.history.push(action)
  }

  function endGame() {
    if (!currentGame.value) return
    currentGame.value.isRunning = false

    // Record game results
    try {
      const statsStore = useStatsStore()
      const gameDurationMs = currentGame.value.elapsedMs

      for (const player of currentGame.value.players) {
        const profileInfo = playerProfileMapping.value[player.id]
        statsStore.recordGame({
          gameId: currentGame.value.id,
          playerId: player.id,
          deckName: player.commanders.map((commander) => commander.cardName).join(' / ') || 'Unknown',
          commanderNames: player.commanders.map((commander) => commander.cardName),
          result: isPlayerDead(player) ? 'loss' : 'win',
          turnsPlayed: currentGame.value.turnNumber,
          gameDurationMs,
          playerPlayTimeMs: currentGame.value.playerPlayTimeMs?.[player.id] ?? 0,
          playedAt: Date.now(),
          playerProfileId: profileInfo?.playerProfileId,
          deckId: profileInfo?.deckId,
        })
      }
    } catch {
      // Stats recording should not block game end
    }
  }

  function setPlayerDetails(playerId: string, details: { name?: string; color?: PlayerState['color'] }) {
    if (!currentGame.value) return
    const player = findPlayerById(playerId)
    if (!player) return
    if (details.name !== undefined) player.name = details.name
    if (details.color !== undefined) player.color = details.color
  }

  function applyRemotePlayerSync(playerId: string, remoteData: Partial<PlayerState>) {
    if (!currentGame.value) return
    const player = findPlayerById(playerId)
    if (!player) return
    Object.assign(player, remoteData)
  }

  function applyRemoteGameSync(remoteState: { currentTurnPlayerIndex?: number; turnNumber?: number; isRunning?: boolean }) {
    if (!currentGame.value) return
    if (remoteState.currentTurnPlayerIndex !== undefined) currentGame.value.currentTurnPlayerIndex = remoteState.currentTurnPlayerIndex
    if (remoteState.turnNumber !== undefined) currentGame.value.turnNumber = remoteState.turnNumber
    if (remoteState.isRunning !== undefined) currentGame.value.isRunning = remoteState.isRunning
  }

  function resetGame() {
    currentGame.value = null
    playerProfileMapping.value = {}
    localStorage.removeItem(PROFILE_MAPPING_KEY)
  }

  onScopeDispose(() => {
    if (saveDebounceTimer !== null) {
      clearTimeout(saveDebounceTimer)
      if (currentGame.value) saveGameState(currentGame.value)
    }
  })

  return {
    currentGame,
    redoStack,
    isGameActive,
    currentTurnPlayer,
    nextTurnPlayer,
    effectivePriorityPlayer,
    canUndo,
    canRedo,
    nextRedoAction,
    startNewGame,
    setGamePhase,
    setCustomPositionMap,
    swapPlayerPositions,
    reorderPlayersForTurnOrder,
    updatePlayerName,
    addPlayerCommander,
    removePlayerCommander,
    takePriority,
    releasePriority,
    changeLife,
    dealCommanderDamage,
    changePoison,
    changeExperience,
    changeEnergy,
    castCommander,
    getCommanderTax,
    isPlayerDeadByCommanderDamage,
    isPlayerDeadByPoison,
    isPlayerDead,
    setBadgePosition,
    toggleMonarch,
    toggleInitiative,
    toggleCityBlessing,
    setRingLevel,
    changeRadCounters,
    changeHourglassTokens,
    toggleDayNight,
    declareGameResult,
    advanceTurn,
    undoLastAction,
    undoUntilPlayerAlive,
    redoLastAction,
    endGame,
    resetGame,
    setPlayerDetails,
    applyRemotePlayerSync,
    applyRemoteGameSync,
    playerProfileMapping,
  }
})
