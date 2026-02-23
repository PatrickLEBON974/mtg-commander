import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type {
  GameState,
  PlayerState,
  GameAction,
  GameActionType,
  GameSettings,
  ManaColor,
} from '@/types/game'
import { DEFAULT_GAME_SETTINGS, EMPTY_PLAYER_COUNTERS } from '@/types/game'
import { COMMANDER_TAX_PER_CAST, GAME_STATE_SAVE_DEBOUNCE_MS } from '@/config/gameConstants'
import { saveGameState, loadGameState } from '@/services/persistence'
import { useStatsStore } from '@/stores/statsStore'
import i18n from '@/i18n'

const PLAYER_COLORS: ManaColor[] = ['white', 'blue', 'black', 'red', 'green', 'gold'] as const

function generateId(): string {
  return crypto.randomUUID()
}

function createPlayer(index: number, settings: GameSettings): PlayerState {
  const { t } = i18n.global
  return {
    id: generateId(),
    name: t('game.defaultPlayerName', { index: index + 1 }),
    color: PLAYER_COLORS[index % PLAYER_COLORS.length]!,
    lifeTotal: settings.startingLife,
    ...EMPTY_PLAYER_COUNTERS,
  }
}

export const useGameStore = defineStore('game', () => {
  const currentGame = ref<GameState | null>(null)
  const settings = ref<GameSettings>({ ...DEFAULT_GAME_SETTINGS })
  const redoStack = ref<GameAction[]>([])

  // Restore saved game on init
  const savedGame = loadGameState()
  if (savedGame) {
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
      return currentGame.value.players.find((p) => p.id === currentGame.value!.priorityPlayerId) ?? null
    }
    return currentTurnPlayer.value
  })

  function isPlayerDead(player: PlayerState): boolean {
    if (player.lifeTotal <= 0) return true
    if (settings.value.poisonThreshold > 0 && player.poisonCounters >= settings.value.poisonThreshold) return true
    for (const damage of Object.values(player.commanderDamageReceived)) {
      if (damage >= settings.value.commanderDamageThreshold) return true
    }
    return false
  }

  function startNewGame() {
    const players = Array.from({ length: settings.value.playerCount }, (_, index) =>
      createPlayer(index, settings.value),
    )

    currentGame.value = {
      id: generateId(),
      players,
      currentTurnPlayerIndex: 0,
      turnNumber: 1,
      startedAt: Date.now(),
      elapsedMs: 0,
      isRunning: true,
      history: [],
      playerPlayTimeMs: {},
      playerTurnTimeMs: {},
      priorityPlayerId: null,
    }
  }

  function addAction(
    type: GameActionType,
    playerId: string,
    value: number,
    description: string,
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
      description,
      previousValue,
    }
    currentGame.value.history.push(action)
    redoStack.value = [] // Clear redo on new action
  }

  function changeLife(playerId: string, amount: number) {
    if (!currentGame.value) return
    const player = currentGame.value.players.find((p) => p.id === playerId)
    if (!player) return

    const { t } = i18n.global
    player.lifeTotal += amount
    addAction('life_change', playerId, amount, t('game.lifeChange', { name: player.name, sign: amount > 0 ? '+' : '', amount: Math.abs(amount) }))
  }

  function dealCommanderDamage(targetPlayerId: string, commanderId: string, amount: number) {
    if (!currentGame.value) return
    const targetPlayer = currentGame.value.players.find((p) => p.id === targetPlayerId)
    if (!targetPlayer) return

    const currentDamage = targetPlayer.commanderDamageReceived[commanderId] ?? 0
    targetPlayer.commanderDamageReceived[commanderId] = currentDamage + amount
    targetPlayer.lifeTotal -= amount

    const { t } = i18n.global
    addAction(
      'commander_damage',
      targetPlayerId,
      amount,
      t('game.commanderDamage', { name: targetPlayer.name, amount }),
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
    const player = currentGame.value.players.find((p) => p.id === playerId)
    if (!player) return

    const { t } = i18n.global
    player[counterKey] = Math.max(0, player[counterKey] + amount)
    addAction(actionType, playerId, amount, t('game.counterChange', { name: player.name, sign: amount > 0 ? '+' : '', amount: Math.abs(amount), counter: counterLabel }))
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
    const player = currentGame.value.players.find((p) => p.id === playerId)
    if (!player || !player.commanders[commanderIndex]) return

    const { t } = i18n.global
    player.commanders[commanderIndex].castCount++
    addAction(
      'commander_cast',
      playerId,
      commanderIndex,
      t('game.commanderCast', { name: player.name, cardName: player.commanders[commanderIndex].cardName, tax: (player.commanders[commanderIndex].castCount - 1) * COMMANDER_TAX_PER_CAST }),
    )
  }

  function getCommanderTax(player: PlayerState, commanderIndex: number): number {
    const commander = player.commanders[commanderIndex]
    if (!commander) return 0
    return Math.max(0, (commander.castCount - 1) * COMMANDER_TAX_PER_CAST)
  }

  function isPlayerDeadByCommanderDamage(player: PlayerState): string | null {
    for (const [commanderId, damage] of Object.entries(player.commanderDamageReceived)) {
      if (damage >= settings.value.commanderDamageThreshold) {
        return commanderId
      }
    }
    return null
  }

  function isPlayerDeadByPoison(player: PlayerState): boolean {
    if (settings.value.poisonThreshold <= 0) return false
    return player.poisonCounters >= settings.value.poisonThreshold
  }

  function toggleExclusiveStatus(
    playerId: string,
    statusKey: 'isMonarch' | 'hasInitiative',
    actionType: GameActionType,
    gainKey: string,
    loseKey: string,
  ) {
    if (!currentGame.value) return
    const player = currentGame.value.players.find((p) => p.id === playerId)
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
    const { t } = i18n.global
    addAction(
      actionType,
      playerId,
      hadStatus ? 0 : 1,
      hadStatus
        ? t(loseKey, { name: player.name })
        : t(gainKey, { name: player.name }),
      previousHolderId,
    )
  }

  function toggleMonarch(playerId: string) {
    toggleExclusiveStatus(playerId, 'isMonarch', 'monarch_change', 'game.monarchGain', 'game.monarchLose')
  }

  function toggleInitiative(playerId: string) {
    toggleExclusiveStatus(playerId, 'hasInitiative', 'initiative_change', 'game.initiativeGain', 'game.initiativeLose')
  }

  function updatePlayerName(playerId: string, newName: string) {
    if (!currentGame.value) return
    const player = currentGame.value.players.find((p) => p.id === playerId)
    if (!player) return
    player.name = newName
  }

  function addPlayerCommander(playerId: string, cardName: string, imageUri: string) {
    if (!currentGame.value) return
    const player = currentGame.value.players.find((p) => p.id === playerId)
    if (!player) return
    player.commanders.push({ id: generateId(), cardName, imageUri, castCount: 0 })
  }

  function removePlayerCommander(playerId: string, commanderIndex: number) {
    if (!currentGame.value) return
    const player = currentGame.value.players.find((p) => p.id === playerId)
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
      const { t } = i18n.global
      addAction('turn_advance', turnPlayer.id, currentGame.value.turnNumber, t('game.turn', { n: currentGame.value.turnNumber }), undefined, undefined, previousTurnIndex)
    }
  }

  const canUndo = computed(() => (currentGame.value?.history.length ?? 0) > 0)
  const canRedo = computed(() => redoStack.value.length > 0)
  const nextRedoAction = computed(() => redoStack.value.length > 0 ? redoStack.value[redoStack.value.length - 1] : null)

  function applyActionReverse(action: GameAction) {
    if (!currentGame.value) return
    const player = currentGame.value.players.find((p) => p.id === action.playerId)
    if (!player) return

    switch (action.type) {
      case 'life_change':
        player.lifeTotal -= action.value
        break
      case 'commander_damage':
        if (action.commanderId) {
          const previousDamage = player.commanderDamageReceived[action.commanderId] ?? 0
          player.commanderDamageReceived[action.commanderId] = Math.max(0, previousDamage - action.value)
          player.lifeTotal += action.value
        }
        break
      case 'poison_change':
        player.poisonCounters = Math.max(0, player.poisonCounters - action.value)
        break
      case 'experience_change':
        player.experienceCounters = Math.max(0, player.experienceCounters - action.value)
        break
      case 'energy_change':
        player.energyCounters = Math.max(0, player.energyCounters - action.value)
        break
      case 'commander_cast': {
        const commander = player.commanders[action.value]
        if (commander) {
          commander.castCount = Math.max(0, commander.castCount - 1)
        }
        break
      }
      case 'turn_advance': {
        if (action.previousValue !== undefined) {
          currentGame.value.currentTurnPlayerIndex = action.previousValue
        } else {
          // Fallback for old actions without previousValue
          const playerCount = currentGame.value.players.length
          currentGame.value.currentTurnPlayerIndex = (currentGame.value.currentTurnPlayerIndex - 1 + playerCount) % playerCount
        }
        currentGame.value.turnNumber = Math.max(1, currentGame.value.turnNumber - 1)
        break
      }
      case 'monarch_change':
        if (action.value === 1) {
          // Was toggled ON -> undo by toggling OFF
          player.isMonarch = false
          // Restore previous monarch if one existed
          if (action.targetPlayerId) {
            const previousMonarch = currentGame.value.players.find((p) => p.id === action.targetPlayerId)
            if (previousMonarch) previousMonarch.isMonarch = true
          }
        } else {
          // Was toggled OFF -> undo by toggling ON
          player.isMonarch = true
        }
        break
      case 'initiative_change':
        if (action.value === 1) {
          // Was toggled ON -> undo by toggling OFF
          player.hasInitiative = false
          // Restore previous initiative holder if one existed
          if (action.targetPlayerId) {
            const previousHolder = currentGame.value.players.find((p) => p.id === action.targetPlayerId)
            if (previousHolder) previousHolder.hasInitiative = true
          }
        } else {
          // Was toggled OFF -> undo by toggling ON
          player.hasInitiative = true
        }
        break
      default: {
        const _exhaustiveCheck: never = action.type
        console.warn('Unhandled action type:', _exhaustiveCheck)
      }
    }
  }

  function applyActionForward(action: GameAction) {
    if (!currentGame.value) return
    const player = currentGame.value.players.find((p) => p.id === action.playerId)
    if (!player) return

    switch (action.type) {
      case 'life_change':
        player.lifeTotal += action.value
        break
      case 'commander_damage':
        if (action.commanderId) {
          const currentDamage = player.commanderDamageReceived[action.commanderId] ?? 0
          player.commanderDamageReceived[action.commanderId] = currentDamage + action.value
          player.lifeTotal -= action.value
        }
        break
      case 'poison_change':
        player.poisonCounters = Math.max(0, player.poisonCounters + action.value)
        break
      case 'experience_change':
        player.experienceCounters = Math.max(0, player.experienceCounters + action.value)
        break
      case 'energy_change':
        player.energyCounters = Math.max(0, player.energyCounters + action.value)
        break
      case 'commander_cast': {
        const commander = player.commanders[action.value]
        if (commander) {
          commander.castCount++
        }
        break
      }
      case 'turn_advance': {
        const playerCount = currentGame.value.players.length
        if (playerCount === 0) break
        let nextIndex = (currentGame.value.currentTurnPlayerIndex + 1) % playerCount
        let checkedCount = 0
        while (checkedCount < playerCount) {
          const candidate = currentGame.value.players[nextIndex]
          if (candidate && !isPlayerDead(candidate)) break
          checkedCount++
          nextIndex = (nextIndex + 1) % playerCount
        }
        currentGame.value.currentTurnPlayerIndex = nextIndex
        currentGame.value.turnNumber = action.value // restore the turn number from the action
        break
      }
      case 'monarch_change':
        if (action.value === 1) {
          // Re-apply toggling ON: clear all, set this player
          for (const otherPlayer of currentGame.value.players) {
            otherPlayer.isMonarch = false
          }
          player.isMonarch = true
        } else {
          // Re-apply toggling OFF
          player.isMonarch = false
        }
        break
      case 'initiative_change':
        if (action.value === 1) {
          for (const otherPlayer of currentGame.value.players) {
            otherPlayer.hasInitiative = false
          }
          player.hasInitiative = true
        } else {
          player.hasInitiative = false
        }
        break
      default: {
        const _exhaustiveCheck: never = action.type
        console.warn('Unhandled action type:', _exhaustiveCheck)
      }
    }
  }

  function undoLastAction() {
    if (!currentGame.value || currentGame.value.history.length === 0) return
    const lastAction = currentGame.value.history.pop()!
    applyActionReverse(lastAction)
    redoStack.value.push(lastAction)
  }

  /** Undo actions until a specific player is no longer dead (max 50 to prevent infinite loop) */
  function undoUntilPlayerAlive(playerId: string) {
    if (!currentGame.value) return
    const player = currentGame.value.players.find((p) => p.id === playerId)
    if (!player) return
    let safety = 50
    while (isPlayerDead(player) && currentGame.value.history.length > 0 && safety-- > 0) {
      undoLastAction()
    }
  }

  function redoLastAction() {
    if (!currentGame.value || redoStack.value.length === 0) return
    const action = redoStack.value.pop()!
    applyActionForward(action)
    currentGame.value.history.push(action)
  }

  function endGame() {
    if (!currentGame.value) return
    currentGame.value.isRunning = false

    // Record game results
    try {
      const statsStore = useStatsStore()
      const gameDurationMs = Date.now() - currentGame.value.startedAt

      for (const player of currentGame.value.players) {
        statsStore.recordGame({
          gameId: currentGame.value.id,
          playerId: player.id,
          deckName: player.commanders.map((commander) => commander.cardName).join(' / ') || 'Unknown',
          commanderNames: player.commanders.map((commander) => commander.cardName),
          result: isPlayerDead(player) ? 'loss' : 'win',
          turnsPlayed: currentGame.value.turnNumber,
          gameDurationMs,
          playedAt: Date.now(),
        })
      }
    } catch {
      // Stats recording should not block game end
    }
  }

  function resetGame() {
    currentGame.value = null
  }

  return {
    currentGame,
    settings,
    redoStack,
    isGameActive,
    currentTurnPlayer,
    nextTurnPlayer,
    effectivePriorityPlayer,
    canUndo,
    canRedo,
    nextRedoAction,
    startNewGame,
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
    toggleMonarch,
    toggleInitiative,
    advanceTurn,
    undoLastAction,
    undoUntilPlayerAlive,
    redoLastAction,
    endGame,
    resetGame,
  }
})
