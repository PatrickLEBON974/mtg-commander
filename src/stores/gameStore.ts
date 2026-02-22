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
import { DEFAULT_GAME_SETTINGS } from '@/types/game'
import { saveGameState, loadGameState } from '@/services/persistence'

const PLAYER_COLORS: ManaColor[] = ['white', 'blue', 'black', 'red', 'green', 'gold'] as const

function generateId(): string {
  return crypto.randomUUID()
}

function createPlayer(index: number, settings: GameSettings): PlayerState {
  return {
    id: generateId(),
    name: `Joueur ${index + 1}`,
    color: PLAYER_COLORS[index % PLAYER_COLORS.length]!,
    lifeTotal: settings.startingLife,
    commanders: [],
    commanderDamageReceived: {},
    poisonCounters: 0,
    experienceCounters: 0,
    energyCounters: 0,
    isMonarch: false,
    hasInitiative: false,
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

  // Persist game state on every change
  watch(currentGame, (gameState) => saveGameState(gameState), { deep: true })

  const isGameActive = computed(() => currentGame.value !== null)
  const currentTurnPlayer = computed(() => {
    if (!currentGame.value) return null
    return currentGame.value.players[currentGame.value.currentTurnPlayerIndex]
  })

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
    }
  }

  function addAction(
    type: GameActionType,
    playerId: string,
    value: number,
    description: string,
    targetPlayerId?: string,
    commanderId?: string,
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
    }
    currentGame.value.history.push(action)
    redoStack.value = [] // Clear redo on new action
  }

  function changeLife(playerId: string, amount: number) {
    if (!currentGame.value) return
    const player = currentGame.value.players.find((p) => p.id === playerId)
    if (!player) return

    player.lifeTotal += amount
    addAction('life_change', playerId, amount, `${player.name}: ${amount > 0 ? '+' : ''}${amount} PV`)
  }

  function dealCommanderDamage(targetPlayerId: string, commanderId: string, amount: number) {
    if (!currentGame.value) return
    const targetPlayer = currentGame.value.players.find((p) => p.id === targetPlayerId)
    if (!targetPlayer) return

    const currentDamage = targetPlayer.commanderDamageReceived[commanderId] ?? 0
    targetPlayer.commanderDamageReceived[commanderId] = currentDamage + amount
    targetPlayer.lifeTotal -= amount

    addAction(
      'commander_damage',
      targetPlayerId,
      amount,
      `${targetPlayer.name} recoit ${amount} degats de commandant`,
      targetPlayerId,
      commanderId,
    )
  }

  function changePoison(playerId: string, amount: number) {
    if (!currentGame.value) return
    const player = currentGame.value.players.find((p) => p.id === playerId)
    if (!player) return

    player.poisonCounters = Math.max(0, player.poisonCounters + amount)
    addAction('poison_change', playerId, amount, `${player.name}: ${amount > 0 ? '+' : ''}${amount} poison`)
  }

  function changeExperience(playerId: string, amount: number) {
    if (!currentGame.value) return
    const player = currentGame.value.players.find((p) => p.id === playerId)
    if (!player) return

    player.experienceCounters = Math.max(0, player.experienceCounters + amount)
    addAction('experience_change', playerId, amount, `${player.name}: ${amount > 0 ? '+' : ''}${amount} experience`)
  }

  function changeEnergy(playerId: string, amount: number) {
    if (!currentGame.value) return
    const player = currentGame.value.players.find((p) => p.id === playerId)
    if (!player) return

    player.energyCounters = Math.max(0, player.energyCounters + amount)
    addAction('energy_change', playerId, amount, `${player.name}: ${amount > 0 ? '+' : ''}${amount} energie`)
  }

  function castCommander(playerId: string, commanderIndex: number) {
    if (!currentGame.value) return
    const player = currentGame.value.players.find((p) => p.id === playerId)
    if (!player || !player.commanders[commanderIndex]) return

    player.commanders[commanderIndex].castCount++
    addAction(
      'commander_cast',
      playerId,
      player.commanders[commanderIndex].castCount,
      `${player.name} lance ${player.commanders[commanderIndex].cardName} (taxe: ${(player.commanders[commanderIndex].castCount - 1) * 2})`,
    )
  }

  function getCommanderTax(player: PlayerState, commanderIndex: number): number {
    const commander = player.commanders[commanderIndex]
    if (!commander) return 0
    return Math.max(0, (commander.castCount - 1) * 2)
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
    return player.poisonCounters >= settings.value.poisonThreshold
  }

  function advanceTurn() {
    if (!currentGame.value) return
    const nextIndex = (currentGame.value.currentTurnPlayerIndex + 1) % currentGame.value.players.length
    if (nextIndex === 0) {
      currentGame.value.turnNumber++
    }
    currentGame.value.currentTurnPlayerIndex = nextIndex
    const turnPlayer = currentGame.value.players[nextIndex]
    if (turnPlayer) {
      addAction('turn_advance', turnPlayer.id, currentGame.value.turnNumber, `Tour ${currentGame.value.turnNumber}`)
    }
  }

  const canUndo = computed(() => (currentGame.value?.history.length ?? 0) > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

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
    }
  }

  function undoLastAction() {
    if (!currentGame.value || currentGame.value.history.length === 0) return
    const lastAction = currentGame.value.history.pop()!
    applyActionReverse(lastAction)
    redoStack.value.push(lastAction)
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
    canUndo,
    canRedo,
    startNewGame,
    changeLife,
    dealCommanderDamage,
    changePoison,
    changeExperience,
    changeEnergy,
    castCommander,
    getCommanderTax,
    isPlayerDeadByCommanderDamage,
    isPlayerDeadByPoison,
    advanceTurn,
    undoLastAction,
    redoLastAction,
    endGame,
    resetGame,
  }
})
