import { describe, expect, it } from 'vitest'
import {
  MultiplayerServiceError,
  normalizePlayerNames,
  normalizeRoomCode,
  sanitizeGameState,
  sanitizeRoomData,
  validateMultiplayerSettings,
} from '@/services/firebase'
import type { MultiplayerGameSettings } from '@/types/multiplayer'

function settingsFixture(): MultiplayerGameSettings {
  return {
    startingLife: 40,
    commanderDamageThreshold: 21,
    poisonThreshold: 10,
    playerCount: 2,
    enableTimer: true,
    timerMode: 'elapsed',
    turnTimerSeconds: 180,
    chessGameDurationMinutes: 120,
    chessExpectedRounds: 10,
    hourglassEnabled: false,
    hourglassMode: 'fixed',
    hourglassGracePeriodSeconds: 120,
    hourglassLossThreshold: 3,
    hourglassTimeBankCapEnabled: false,
    hourglassTimeBankCapSeconds: 600,
  }
}

function syncedPlayerFixture(name: string, color: 'white' | 'blue') {
  return {
    name,
    color,
    lifeTotal: 40,
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

function gameStateFixture() {
  return {
    schemaVersion: 3,
    revision: 1,
    updatedAt: 1_000,
    updatedBy: 'host-user',
    id: 'game-id',
    playerOrder: ['p0', 'p1'],
    currentTurnPlayerId: 'p0',
    turnNumber: 1,
    startedAt: 1_000,
    elapsedMs: 0,
    isRunning: false,
    gamePhase: 'playing',
    players: {
      p0: syncedPlayerFixture('Host', 'white'),
      p1: syncedPlayerFixture('Guest', 'blue'),
    },
  }
}

function roomFixture() {
  return {
    schemaVersion: 3,
    code: 'ABCDEF',
    hostUid: 'host-user',
    createdAt: 1_000,
    updatedAt: 1_000,
    expiresAt: Date.now() + 60_000,
    status: 'playing',
    settings: settingsFixture(),
    members: {
      'host-user': { uid: 'host-user', connected: true, joinedAt: 1_000, lastSeenAt: 1_000 },
      'guest-user': { uid: 'guest-user', connected: true, joinedAt: 1_000, lastSeenAt: 1_000 },
    },
    players: {
      p0: { id: 'p0', ownerUid: 'host-user', name: 'Host', color: 'white', seat: 0, connected: true, joinedAt: 1_000 },
      p1: { id: 'p1', ownerUid: 'guest-user', name: 'Guest', color: 'blue', seat: 1, connected: true, joinedAt: 1_000 },
    },
    joinRequestCount: 0,
    joinRequests: {},
    gameState: gameStateFixture(),
  }
}

function expectServiceError(operation: () => unknown, code: string): void {
  let thrown: unknown

  try {
    operation()
  } catch (error) {
    thrown = error
  }

  expect(thrown).toBeInstanceOf(MultiplayerServiceError)
  expect((thrown as MultiplayerServiceError).code).toBe(code)
}

describe('multiplayer input and remote-data validation', () => {
  it('normalizes valid user input and rejects malformed room codes and names', () => {
    expect(normalizeRoomCode(' abcdef ')).toBe('ABCDEF')
    expect(normalizePlayerNames(['  Alice   Cooper  '])).toEqual(['Alice Cooper'])
    expectServiceError(() => normalizeRoomCode('ABC1EF'), 'invalid-room-code')
    expectServiceError(() => normalizePlayerNames(['bad\nname']), 'invalid-player-name')
  })

  it('requires integral bounded settings and enough seats for local players', () => {
    expect(validateMultiplayerSettings(settingsFixture(), 2)).toEqual(settingsFixture())
    expectServiceError(
      () => validateMultiplayerSettings({ ...settingsFixture(), playerCount: 2.5 }, 1),
      'invalid-settings',
    )
    expectServiceError(
      () => validateMultiplayerSettings({ ...settingsFixture(), playerCount: 2 }, 3),
      'invalid-settings',
    )
  })

  it('rejects duplicate, unknown, or incomplete player rosters', () => {
    const duplicateOrder = gameStateFixture()
    duplicateOrder.playerOrder = ['p0', 'p0']
    expectServiceError(() => sanitizeGameState(duplicateOrder), 'invalid-remote-data')

    const unknownPlayer = gameStateFixture()
    const unknownPlayers = unknownPlayer.players as Record<
      string,
      ReturnType<typeof syncedPlayerFixture>
    >
    unknownPlayers.attacker = syncedPlayerFixture('Attacker', 'blue')
    unknownPlayer.playerOrder = ['p0', 'p1', 'attacker']
    expectServiceError(() => sanitizeGameState(unknownPlayer), 'invalid-remote-data')

    const duplicateMonarch = gameStateFixture()
    duplicateMonarch.players.p0!.isMonarch = true
    duplicateMonarch.players.p1!.isMonarch = true
    expectServiceError(() => sanitizeGameState(duplicateMonarch), 'invalid-remote-data')
  })

  it('clamps defensive numeric fields and bounds nested collections', () => {
    const raw = gameStateFixture()
    raw.players.p1!.lifeTotal = 100_000
    Object.assign(raw.players.p1!, {
      commanderDamageReceived: Object.fromEntries(
        Array.from({ length: 80 }, (_, index) => [`source-${index}`, index]),
      ),
      commanders: Array.from({ length: 20 }, (_, index) => ({
        id: `commander-${index}`,
        cardName: `Commander ${index}`,
        castCount: index,
      })),
    })

    const sanitized = sanitizeGameState(raw)
    expect(sanitized.players.p1?.lifeTotal).toBe(40)
    expect(Object.keys(sanitized.players.p1?.commanderDamageReceived ?? {})).toHaveLength(60)
    expect(sanitized.players.p1?.commanders).toHaveLength(10)
  })

  it('requires fixed seat identities and an exact room/game roster', () => {
    const invalidSeat = roomFixture()
    invalidSeat.players.p1!.seat = 4
    expectServiceError(() => sanitizeRoomData(invalidSeat, 'ABCDEF'), 'invalid-remote-data')

    const mismatchedRoster = roomFixture()
    delete (mismatchedRoster.gameState.players as Partial<
      typeof mismatchedRoster.gameState.players
    >).p1
    mismatchedRoster.gameState.playerOrder = ['p0']
    expectServiceError(() => sanitizeRoomData(mismatchedRoster, 'ABCDEF'), 'invalid-remote-data')

    const lobbyWithGame = roomFixture()
    lobbyWithGame.status = 'lobby'
    expectServiceError(() => sanitizeRoomData(lobbyWithGame, 'ABCDEF'), 'invalid-remote-data')

    const unfinishedFinishedRoom = roomFixture()
    unfinishedFinishedRoom.status = 'finished'
    expectServiceError(
      () => sanitizeRoomData(unfinishedFinishedRoom, 'ABCDEF'),
      'invalid-remote-data',
    )

    const runningFinishedRoom = roomFixture()
    runningFinishedRoom.status = 'finished'
    Object.assign(runningFinishedRoom, { finishedAt: 2_000 })
    runningFinishedRoom.gameState.isRunning = true
    expectServiceError(
      () => sanitizeRoomData(runningFinishedRoom, 'ABCDEF'),
      'invalid-remote-data',
    )
  })
})
