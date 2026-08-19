import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '@/stores/gameStore'
import type {
  RoomPlayer,
  SyncedGameState,
  SyncedPlayerState,
} from '@/types/multiplayer'

function roomPlayersFixture(): Record<string, RoomPlayer> {
  return {
    p0: {
      id: 'p0',
      ownerUid: 'host-user',
      name: 'Host',
      color: 'white',
      seat: 0,
      connected: true,
      joinedAt: 1_000,
    },
    p1: {
      id: 'p1',
      ownerUid: 'guest-user',
      name: 'Guest',
      color: 'blue',
      seat: 1,
      connected: true,
      joinedAt: 1_000,
    },
  }
}

function syncedPlayerFixture(
  name: string,
  color: SyncedPlayerState['color'],
): SyncedPlayerState {
  return {
    name,
    color,
    lifeTotal: 37,
    commanderDamageReceived: { commander_1: 6 },
    poisonCounters: 2,
    experienceCounters: 3,
    energyCounters: 4,
    isMonarch: true,
    hasInitiative: false,
    cityBlessing: true,
    ringLevel: 2,
    radCounters: 5,
    hourglassTokens: 1,
    commanders: [{
      id: 'commander_1',
      cardName: 'Atraxa, Praetors’ Voice',
      imageUri: 'https://cards.example/atraxa.jpg',
      castCount: 2,
    }],
  }
}

function gameStateFixture(overrides: Partial<SyncedGameState> = {}): SyncedGameState {
  return {
    schemaVersion: 3,
    revision: 3,
    updatedAt: 2_000,
    updatedBy: 'host-user',
    id: 'remote-game',
    playerOrder: ['p0', 'p1'],
    currentTurnPlayerId: 'p1',
    turnNumber: 4,
    startedAt: 1_000,
    elapsedMs: 42_000,
    isRunning: true,
    playerPlayTimeMs: { p0: 21_000, p1: 20_000 },
    playerRoundTimeMs: { p0: 0, p1: 8_000 },
    priorityPlayerId: 'p0',
    gamePhase: 'playing',
    dayNightState: 'night',
    hourglassTimeBankRemainingMs: { p0: 90_000, p1: 80_000 },
    chessClock: {
      totalGameDurationMs: 7_200_000,
      playerBudgetMs: 3_600_000,
      theoreticalTurnMs: 360_000,
      expectedRounds: 10,
    },
    players: {
      p0: syncedPlayerFixture('Host', 'white'),
      p1: { ...syncedPlayerFixture('Guest', 'blue'), isMonarch: false },
    },
    ...overrides,
  }
}

describe('gameStore multiplayer hydration', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('hydrates every shared player and global game field', () => {
    const gameStore = useGameStore()

    gameStore.applyRemoteGameSync(gameStateFixture(), roomPlayersFixture())

    const game = gameStore.currentGame
    expect(game).not.toBeNull()
    expect(game?.players.map((player) => player.id)).toEqual(['p0', 'p1'])
    expect(game?.currentTurnPlayerIndex).toBe(1)
    expect(game).toMatchObject({
      id: 'remote-game',
      turnNumber: 4,
      startedAt: 1_000,
      elapsedMs: 42_000,
      isRunning: true,
      playerPlayTimeMs: { p0: 21_000, p1: 20_000 },
      playerRoundTimeMs: { p0: 0, p1: 8_000 },
      priorityPlayerId: 'p0',
      gamePhase: 'playing',
      dayNightState: 'night',
      hourglassTimeBankRemainingMs: { p0: 90_000, p1: 80_000 },
      chessClock: {
        totalGameDurationMs: 7_200_000,
        playerBudgetMs: 3_600_000,
        theoreticalTurnMs: 360_000,
        expectedRounds: 10,
      },
    })
    expect(game?.players[0]).toMatchObject({
      name: 'Host',
      lifeTotal: 37,
      commanderDamageReceived: { commander_1: 6 },
      poisonCounters: 2,
      experienceCounters: 3,
      energyCounters: 4,
      isMonarch: true,
      cityBlessing: true,
      ringLevel: 2,
      radCounters: 5,
      hourglassTokens: 1,
      commanders: [{ id: 'commander_1', castCount: 2 }],
    })
    expect(game?.history).toEqual([])
    expect(game?.activeFlashPlayerIds).toEqual([])
  })

  it('preserves local-only UI/history data while applying a remote reorder', () => {
    const gameStore = useGameStore()
    const roomPlayers = roomPlayersFixture()
    const initialState = gameStateFixture()
    gameStore.applyRemoteGameSync(initialState, roomPlayers)
    gameStore.setBadgePosition('p0', 'monarch', 15, 25)
    gameStore.changeLife('p0', -1)
    gameStore.currentGame!.customPositionMap = [1, 0]

    const nextPlayers = structuredClone(initialState.players)
    nextPlayers.p0!.lifeTotal = 31
    gameStore.applyRemoteGameSync(gameStateFixture({
      revision: 4,
      playerOrder: ['p1', 'p0'],
      currentTurnPlayerId: 'p0',
      players: nextPlayers,
    }), roomPlayers)

    const game = gameStore.currentGame!
    expect(game.players.map((player) => player.id)).toEqual(['p1', 'p0'])
    expect(game.currentTurnPlayerIndex).toBe(1)
    expect(game.players[1]?.lifeTotal).toBe(31)
    expect(game.players[1]?.badgePositions?.monarch).toEqual({ left: 15, top: 25 })
    expect(game.history).toHaveLength(1)
    expect(game.customPositionMap).toBeNull()
  })

  it('keeps identity local and clamps a defensive partial player merge', () => {
    const gameStore = useGameStore()
    gameStore.applyRemoteGameSync(gameStateFixture(), roomPlayersFixture())
    gameStore.setBadgePosition('p0', 'initiative', 10, 20)

    gameStore.applyRemotePlayerSync('p0', {
      lifeTotal: Number.POSITIVE_INFINITY,
      poisonCounters: -12,
      ringLevel: 99,
      radCounters: 2.6,
    })

    expect(gameStore.currentGame?.players[0]).toMatchObject({
      id: 'p0',
      lifeTotal: 37,
      poisonCounters: 0,
      ringLevel: 4,
      radCounters: 3,
      badgePositions: { initiative: { left: 10, top: 20 } },
    })
  })
})
