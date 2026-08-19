import { describe, expect, it } from 'vitest'
import {
  applyPatchToSyncedState,
  buildGameStatePatch,
  toSyncedGameState,
} from '@/services/multiplayerSync'
import type { GameState, PlayerState } from '@/types/game'

function playerFixture(id: string, name: string): PlayerState {
  return {
    id,
    name,
    color: id === 'p0' ? 'white' : 'blue',
    lifeTotal: 40,
    commanders: [{ id: `${id}-commander`, cardName: `${name} Commander`, castCount: 1 }],
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
    badgePositions: { poison: { left: 20, top: 30 } },
  }
}

function gameFixture(): GameState {
  return {
    id: 'game-id',
    players: [playerFixture('p0', 'Host'), playerFixture('p1', 'Guest')],
    currentTurnPlayerIndex: 1,
    turnNumber: 3,
    startedAt: 1_000,
    elapsedMs: 12_345.6,
    isRunning: true,
    history: [{
      id: 'local-history',
      timestamp: 2_000,
      type: 'life_change',
      playerId: 'p1',
      value: -1,
      descriptionKey: 'game.lifeChange',
    }],
    playerPlayTimeMs: { p0: 5_000, p1: 7_000 },
    playerRoundTimeMs: { p0: 0, p1: 1_000 },
    priorityPlayerId: 'p1',
    activeFlashPlayerIds: ['p1'],
    gamePhase: 'playing',
    customPositionMap: [1, 0],
    dayNightState: 'night',
    hourglassTimeBankRemainingMs: { p0: 9_000, p1: 8_000 },
    chessClock: {
      totalGameDurationMs: 120_000,
      playerBudgetMs: 60_000,
      theoreticalTurnMs: 10_000,
      expectedRounds: 6,
    },
  }
}

describe('multiplayer state serialization', () => {
  it('serializes every shared game field and excludes device-only state', () => {
    const snapshot = toSyncedGameState(gameFixture(), 'host-user', 7)

    expect(snapshot).toMatchObject({
      schemaVersion: 3,
      revision: 7,
      updatedBy: 'host-user',
      currentTurnPlayerId: 'p1',
      turnNumber: 3,
      elapsedMs: 12_346,
      priorityPlayerId: 'p1',
      gamePhase: 'playing',
      dayNightState: 'night',
    })
    expect(snapshot.players.p0?.commanders[0]).toEqual({
      id: 'p0-commander',
      cardName: 'Host Commander',
      castCount: 1,
    })
    expect(snapshot.players.p0).not.toHaveProperty('badgePositions')
    expect(snapshot).not.toHaveProperty('history')
    expect(snapshot).not.toHaveProperty('activeFlashPlayerIds')
    expect(snapshot).not.toHaveProperty('customPositionMap')
  })

  it('creates a field-level patch and returns null when nothing shared changed', () => {
    const baseline = toSyncedGameState(gameFixture(), 'host-user', 1)
    const unchanged = structuredClone(baseline)
    unchanged.updatedAt += 10
    unchanged.updatedBy = 'guest-user'
    unchanged.revision = 2
    expect(buildGameStatePatch(baseline, unchanged)).toBeNull()

    const current = structuredClone(unchanged)
    current.elapsedMs = 15_000
    current.players.p1!.lifeTotal = 34
    current.players.p1!.cityBlessing = true

    expect(buildGameStatePatch(baseline, current)).toEqual({
      meta: { elapsedMs: 15_000 },
      players: { p1: { lifeTotal: 34, cityBlessing: true } },
    })
  })

  it('rebases local fields over a newer remote snapshot without losing concurrent changes', () => {
    const baseline = toSyncedGameState(gameFixture(), 'host-user', 1)
    const local = structuredClone(baseline)
    local.players.p1!.lifeTotal = 31
    const localPatch = buildGameStatePatch(baseline, local)!

    const newerRemote = structuredClone(baseline)
    newerRemote.revision = 2
    newerRemote.players.p0!.poisonCounters = 2
    const rebased = applyPatchToSyncedState(newerRemote, localPatch)

    expect(rebased.revision).toBe(2)
    expect(rebased.players.p0?.poisonCounters).toBe(2)
    expect(rebased.players.p1?.lifeTotal).toBe(31)
    expect(newerRemote.players.p1?.lifeTotal).toBe(40)
  })
})
