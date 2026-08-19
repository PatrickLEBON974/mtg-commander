import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'

describe('gameStore chess clock integration', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('captures a fixed per-player budget when the game starts', () => {
    const settingsStore = useSettingsStore()
    settingsStore.updateGameSettings({
      enableTimer: true,
      timerMode: 'chess',
      playerCount: 4,
      chessGameDurationMinutes: 120,
      chessExpectedRounds: 10,
    })
    const gameStore = useGameStore()

    gameStore.startNewGame()

    expect(gameStore.currentGame?.chessClock).toEqual({
      totalGameDurationMs: 7_200_000,
      playerBudgetMs: 1_800_000,
      theoreticalTurnMs: 180_000,
      expectedRounds: 10,
    })

    settingsStore.gameSettings.chessGameDurationMinutes = 240
    expect(gameStore.currentGame?.chessClock?.playerBudgetMs).toBe(1_800_000)
  })

  it('allows a player over budget to continue and advance the turn', () => {
    const settingsStore = useSettingsStore()
    settingsStore.updateGameSettings({
      enableTimer: true,
      timerMode: 'chess',
      playerCount: 2,
      chessGameDurationMinutes: 30,
      chessExpectedRounds: 6,
    })
    const gameStore = useGameStore()
    gameStore.startNewGame()
    const game = gameStore.currentGame!
    const firstPlayer = game.players[0]!
    game.gamePhase = 'playing'
    game.isRunning = true
    game.playerPlayTimeMs[firstPlayer.id] = game.chessClock!.playerBudgetMs + 60_000

    gameStore.advanceTurn()

    expect(game.isRunning).toBe(true)
    expect(game.currentTurnPlayerIndex).toBe(1)
    expect(game.players).toHaveLength(2)
  })

  it('restores a legacy game without a chess clock as a regular game', () => {
    localStorage.setItem('mtg_commander_game_state', JSON.stringify({
      id: 'legacy-game',
      players: [],
      currentTurnPlayerIndex: 0,
      turnNumber: 1,
      startedAt: 0,
      elapsedMs: 0,
      isRunning: false,
      history: [],
      playerPlayTimeMs: {},
      playerRoundTimeMs: {},
      priorityPlayerId: null,
      activeFlashPlayerIds: [],
      gamePhase: 'playing',
      customPositionMap: null,
      dayNightState: null,
      hourglassTimeBankRemainingMs: {},
    }))

    const gameStore = useGameStore()

    expect(gameStore.currentGame?.chessClock).toBeNull()
  })
})
