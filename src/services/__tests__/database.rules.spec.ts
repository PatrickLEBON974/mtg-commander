import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { get, increment, ref, set, update } from 'firebase/database'

const PROJECT_ID = 'demo-mtg-commander'
const ROOM_CODE = 'ABCDEF'
const HOST_UID = 'host-user'
const GUEST_UID = 'guest-user'
const OUTSIDER_UID = 'outsider-user'
const HOST_PLAYER_ID = 'p0'
const GUEST_PLAYER_ID = 'p1'

let testEnvironment: RulesTestEnvironment

function settingsFixture(playerCount = 2) {
  return {
    startingLife: 40,
    commanderDamageThreshold: 21,
    poisonThreshold: 10,
    playerCount,
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

function memberFixture(uid: string) {
  const now = Date.now()
  return {
    uid,
    connected: false,
    joinedAt: now,
    lastSeenAt: now,
  }
}

function roomPlayerFixture(id: string, ownerUid: string, seat: number) {
  return {
    id,
    ownerUid,
    name: seat === 0 ? 'Host' : 'Guest',
    color: seat === 0 ? 'white' : 'blue',
    seat,
    connected: false,
    joinedAt: Date.now(),
  }
}

function syncedPlayerFixture(name: string, color: 'white' | 'blue') {
  return {
    name,
    color,
    lifeTotal: 40,
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
    commanders: [] as Array<{ id: string; cardName: string; castCount: number }>,
  }
}

function gameStateFixture(revision: number, updatedBy: string) {
  return {
    schemaVersion: 3,
    revision,
    updatedAt: Date.now(),
    updatedBy,
    id: 'game-id',
    playerOrder: [HOST_PLAYER_ID, GUEST_PLAYER_ID],
    currentTurnPlayerId: HOST_PLAYER_ID,
    turnNumber: 1,
    startedAt: Date.now(),
    elapsedMs: 0,
    isRunning: false,
    gamePhase: 'seating',
    players: {
      [HOST_PLAYER_ID]: syncedPlayerFixture('Host', 'white'),
      [GUEST_PLAYER_ID]: syncedPlayerFixture('Guest', 'blue'),
    },
  }
}

async function seedLobby(playerCount = 2) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const now = Date.now()
    await set(ref(context.database(), `rooms/${ROOM_CODE}`), {
      schemaVersion: 3,
      code: ROOM_CODE,
      hostUid: HOST_UID,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + 4 * 60 * 60 * 1000,
      status: 'lobby',
      settings: settingsFixture(playerCount),
      members: {
        [HOST_UID]: memberFixture(HOST_UID),
      },
      players: {
        [HOST_PLAYER_ID]: roomPlayerFixture(HOST_PLAYER_ID, HOST_UID, 0),
      },
      joinRequestCount: 0,
    })
  })
}

function joinRequestFixture(uid: string, names = ['Guest']) {
  return {
    uid,
    playerNames: names,
    requestedAt: Date.now(),
    status: 'pending',
  }
}

async function requestAdmission(
  uid = GUEST_UID,
  names = ['Guest'],
) {
  const database = testEnvironment.authenticatedContext(uid).database()
  const request = joinRequestFixture(uid, names)
  await update(ref(database), {
    [`rooms/${ROOM_CODE}/joinRequests/${uid}`]: request,
    [`rooms/${ROOM_CODE}/joinRequestCount`]: increment(1),
  })
  return request
}

async function addGuestWithoutRules() {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await update(ref(context.database()), {
      [`rooms/${ROOM_CODE}/members/${GUEST_UID}`]: memberFixture(GUEST_UID),
      [`rooms/${ROOM_CODE}/players/${GUEST_PLAYER_ID}`]: roomPlayerFixture(
        GUEST_PLAYER_ID,
        GUEST_UID,
        1,
      ),
    })
  })
}

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    database: {
      host: '127.0.0.1',
      port: 9000,
      rules: readFileSync('database.rules.json', 'utf8'),
    },
  })
})

beforeEach(async () => {
  await testEnvironment.clearDatabase()
})

afterAll(async () => {
  await testEnvironment.cleanup()
})

describe('Realtime Database multiplayer rules', () => {
  it('allows an authenticated host to create a valid room', async () => {
    const database = testEnvironment.authenticatedContext(HOST_UID).database()
    const now = Date.now()

    await assertSucceeds(set(ref(database, `rooms/${ROOM_CODE}`), {
      schemaVersion: 3,
      code: ROOM_CODE,
      hostUid: HOST_UID,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + 4 * 60 * 60 * 1000,
      status: 'lobby',
      settings: settingsFixture(),
      members: { [HOST_UID]: memberFixture(HOST_UID) },
      players: {
        [HOST_PLAYER_ID]: roomPlayerFixture(HOST_PLAYER_ID, HOST_UID, 0),
      },
      joinRequestCount: 0,
    }))
  })

  it('denies room discovery to unauthenticated users and authenticated outsiders', async () => {
    await seedLobby()
    const anonymousDatabase = testEnvironment.unauthenticatedContext().database()
    const outsiderDatabase = testEnvironment.authenticatedContext(OUTSIDER_UID).database()

    await assertFails(get(ref(anonymousDatabase, `rooms/${ROOM_CODE}`)))
    await assertFails(get(ref(outsiderDatabase, `rooms/${ROOM_CODE}`)))
    await assertFails(get(ref(outsiderDatabase, 'rooms')))
  })

  it('hides an expired lobby from outsiders while keeping it readable by its member', async () => {
    await seedLobby()
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await set(ref(context.database(), `rooms/${ROOM_CODE}/expiresAt`), Date.now() - 1)
    })
    const hostDatabase = testEnvironment.authenticatedContext(HOST_UID).database()
    const outsiderDatabase = testEnvironment.authenticatedContext(OUTSIDER_UID).database()

    await assertSucceeds(get(ref(hostDatabase, `rooms/${ROOM_CODE}`)))
    await assertFails(get(ref(outsiderDatabase, `rooms/${ROOM_CODE}`)))
  })

  it('denies direct membership claims and admits a guest only after host approval', async () => {
    await seedLobby()
    const guestDatabase = testEnvironment.authenticatedContext(GUEST_UID).database()
    const hostDatabase = testEnvironment.authenticatedContext(HOST_UID).database()

    await assertFails(update(ref(guestDatabase), {
      [`rooms/${ROOM_CODE}/members/${GUEST_UID}`]: memberFixture(GUEST_UID),
      [`rooms/${ROOM_CODE}/players/${GUEST_PLAYER_ID}`]: roomPlayerFixture(
        GUEST_PLAYER_ID,
        GUEST_UID,
        1,
      ),
    }))

    const request = await requestAdmission()
    await assertFails(get(ref(guestDatabase, `rooms/${ROOM_CODE}`)))
    await assertSucceeds(get(ref(guestDatabase, `rooms/${ROOM_CODE}/joinRequests/${GUEST_UID}`)))

    await assertSucceeds(update(ref(hostDatabase), {
      [`rooms/${ROOM_CODE}/members/${GUEST_UID}`]: memberFixture(GUEST_UID),
      [`rooms/${ROOM_CODE}/players/${GUEST_PLAYER_ID}`]: roomPlayerFixture(
        GUEST_PLAYER_ID,
        GUEST_UID,
        1,
      ),
      [`rooms/${ROOM_CODE}/joinRequests/${GUEST_UID}`]: {
        uid: GUEST_UID,
        playerNames: request.playerNames,
        requestedAt: request.requestedAt,
        status: 'approved',
        resolvedAt: Date.now(),
      },
      [`rooms/${ROOM_CODE}/joinRequestCount`]: increment(-1),
    }))
    await assertSucceeds(get(ref(guestDatabase, `rooms/${ROOM_CODE}`)))
    await assertSucceeds(set(
      ref(guestDatabase, `rooms/${ROOM_CODE}/joinRequests/${GUEST_UID}`),
      null,
    ))
  })

  it('accepts a six-letter-code request without exposing the room or other requests', async () => {
    await seedLobby(3)
    const guestDatabase = testEnvironment.authenticatedContext(GUEST_UID).database()
    const outsiderDatabase = testEnvironment.authenticatedContext(OUTSIDER_UID).database()
    const unauthenticatedDatabase = testEnvironment.unauthenticatedContext().database()

    await assertFails(update(ref(unauthenticatedDatabase), {
      [`rooms/${ROOM_CODE}/joinRequests/${GUEST_UID}`]: joinRequestFixture(GUEST_UID),
      [`rooms/${ROOM_CODE}/joinRequestCount`]: increment(1),
    }))
    await assertFails(update(ref(outsiderDatabase), {
      [`rooms/${ROOM_CODE}/joinRequests/${GUEST_UID}`]: joinRequestFixture(GUEST_UID),
      [`rooms/${ROOM_CODE}/joinRequestCount`]: increment(1),
    }))

    await requestAdmission()
    await assertFails(get(ref(guestDatabase, `rooms/${ROOM_CODE}`)))
    await assertFails(get(
      ref(outsiderDatabase, `rooms/${ROOM_CODE}/joinRequests/${GUEST_UID}`),
    ))
  })

  it('blocks every new request after the host starts the game', async () => {
    await seedLobby()
    await addGuestWithoutRules()
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await update(ref(context.database()), {
        [`rooms/${ROOM_CODE}/status`]: 'playing',
        [`rooms/${ROOM_CODE}/gameState`]: gameStateFixture(1, HOST_UID),
      })
    })
    const outsiderDatabase = testEnvironment.authenticatedContext(OUTSIDER_UID).database()

    await assertFails(update(ref(outsiderDatabase), {
      [`rooms/${ROOM_CODE}/joinRequests/${OUTSIDER_UID}`]: joinRequestFixture(OUTSIDER_UID),
      [`rooms/${ROOM_CODE}/joinRequestCount`]: increment(1),
    }))
    await assertFails(get(ref(outsiderDatabase, `rooms/${ROOM_CODE}`)))
  })

  it('rejects requests for missing and expired rooms', async () => {
    const guestDatabase = testEnvironment.authenticatedContext(GUEST_UID).database()
    await assertFails(update(ref(guestDatabase), {
      [`rooms/${ROOM_CODE}/joinRequests/${GUEST_UID}`]: joinRequestFixture(GUEST_UID),
      [`rooms/${ROOM_CODE}/joinRequestCount`]: increment(1),
    }))

    await seedLobby()
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await set(ref(context.database(), `rooms/${ROOM_CODE}/expiresAt`), Date.now() - 1)
    })
    await assertFails(update(ref(guestDatabase), {
      [`rooms/${ROOM_CODE}/joinRequests/${GUEST_UID}`]: joinRequestFixture(GUEST_UID),
      [`rooms/${ROOM_CODE}/joinRequestCount`]: increment(1),
    }))
  })

  it('allows the host to reject a request atomically and releases its capacity', async () => {
    await seedLobby()
    await requestAdmission()
    const hostDatabase = testEnvironment.authenticatedContext(HOST_UID).database()
    const guestDatabase = testEnvironment.authenticatedContext(GUEST_UID).database()

    await assertSucceeds(update(ref(hostDatabase), {
      [`rooms/${ROOM_CODE}/joinRequests/${GUEST_UID}`]: null,
      [`rooms/${ROOM_CODE}/joinRequestCount`]: increment(-1),
    }))
    await assertSucceeds(get(ref(guestDatabase, `rooms/${ROOM_CODE}/joinRequests/${GUEST_UID}`)))
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      expect((await get(ref(context.database(), `rooms/${ROOM_CODE}/joinRequestCount`))).val()).toBe(0)
    })
  })

  it('allows a guest to cancel its own pending request atomically', async () => {
    await seedLobby()
    await requestAdmission()
    const guestDatabase = testEnvironment.authenticatedContext(GUEST_UID).database()

    await assertSucceeds(update(ref(guestDatabase), {
      [`rooms/${ROOM_CODE}/joinRequests/${GUEST_UID}`]: null,
      [`rooms/${ROOM_CODE}/joinRequestCount`]: increment(-1),
    }))
  })

  it('keeps lobby membership and seat ownership consistent', async () => {
    await seedLobby()
    await addGuestWithoutRules()
    const guestDatabase = testEnvironment.authenticatedContext(GUEST_UID).database()

    await assertFails(set(
      ref(guestDatabase, `rooms/${ROOM_CODE}/members/${GUEST_UID}`),
      null,
    ))
    await assertSucceeds(update(ref(guestDatabase), {
      [`rooms/${ROOM_CODE}/members/${GUEST_UID}`]: null,
      [`rooms/${ROOM_CODE}/players/${GUEST_PLAYER_ID}`]: null,
    }))
  })

  it('enforces room capacity during concurrent-style player claims', async () => {
    await seedLobby(2)
    await addGuestWithoutRules()
    const outsiderDatabase = testEnvironment.authenticatedContext(OUTSIDER_UID).database()

    await assertFails(update(ref(outsiderDatabase), {
      [`rooms/${ROOM_CODE}/members/${OUTSIDER_UID}`]: memberFixture(OUTSIDER_UID),
      [`rooms/${ROOM_CODE}/players/p2`]: roomPlayerFixture(
        'p2',
        OUTSIDER_UID,
        2,
      ),
    }))
  })

  it('caps simultaneous admission requests even under concurrent writes', async () => {
    await seedLobby(6)
    const requesters = Array.from({ length: 13 }, (_, index) => `requester-${index}`)
    const results = await Promise.allSettled(requesters.map((uid) => {
      const database = testEnvironment.authenticatedContext(uid).database()
      return update(ref(database), {
        [`rooms/${ROOM_CODE}/joinRequests/${uid}`]: joinRequestFixture(uid),
        [`rooms/${ROOM_CODE}/joinRequestCount`]: increment(1),
      })
    }))

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(12)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
  })

  it('rejects invalid settings and unsafe player names without blocking Unicode', async () => {
    await seedLobby(3)
    const hostDatabase = testEnvironment.authenticatedContext(HOST_UID).database()
    const guestDatabase = testEnvironment.authenticatedContext(GUEST_UID).database()

    await assertFails(set(
      ref(hostDatabase, `rooms/${ROOM_CODE}/settings/playerCount`),
      2.5,
    ))
    for (const invalidName of ['Bad\nName', 'Bad\bName', '   ']) {
      await assertFails(update(ref(guestDatabase), {
        [`rooms/${ROOM_CODE}/joinRequests/${GUEST_UID}`]: joinRequestFixture(
          GUEST_UID,
          [invalidName],
        ),
        [`rooms/${ROOM_CODE}/joinRequestCount`]: increment(1),
      }))
    }
    await assertSucceeds(update(ref(guestDatabase), {
      [`rooms/${ROOM_CODE}/joinRequests/${GUEST_UID}`]: joinRequestFixture(
        GUEST_UID,
        ['Éowyn'],
      ),
      [`rooms/${ROOM_CODE}/joinRequestCount`]: increment(1),
    }))
  })

  it('prevents a non-host from starting, finishing, or deleting a room', async () => {
    await seedLobby()
    await addGuestWithoutRules()
    const guestDatabase = testEnvironment.authenticatedContext(GUEST_UID).database()

    await assertFails(set(ref(guestDatabase, `rooms/${ROOM_CODE}/status`), 'playing'))
    await assertFails(set(ref(guestDatabase, `rooms/${ROOM_CODE}/finishedAt`), Date.now()))
    await assertFails(set(ref(guestDatabase, `rooms/${ROOM_CODE}`), null))
  })

  it('requires the host to resolve every pending request before starting', async () => {
    await seedLobby(3)
    await addGuestWithoutRules()
    await requestAdmission(OUTSIDER_UID, ['Waiting player'])
    const hostDatabase = testEnvironment.authenticatedContext(HOST_UID).database()

    await assertFails(update(ref(hostDatabase), {
      [`rooms/${ROOM_CODE}/status`]: 'playing',
      [`rooms/${ROOM_CODE}/updatedAt`]: Date.now(),
      [`rooms/${ROOM_CODE}/gameState`]: gameStateFixture(1, HOST_UID),
    }))
    await assertSucceeds(update(ref(hostDatabase), {
      [`rooms/${ROOM_CODE}/joinRequests/${OUTSIDER_UID}`]: null,
      [`rooms/${ROOM_CODE}/joinRequestCount`]: increment(-1),
    }))
    await assertSucceeds(update(ref(hostDatabase), {
      [`rooms/${ROOM_CODE}/status`]: 'playing',
      [`rooms/${ROOM_CODE}/updatedAt`]: Date.now(),
      [`rooms/${ROOM_CODE}/gameState`]: gameStateFixture(1, HOST_UID),
    }))
  })

  it('allows only the host to initialize game state', async () => {
    await seedLobby()
    await addGuestWithoutRules()
    const hostDatabase = testEnvironment.authenticatedContext(HOST_UID).database()
    const guestDatabase = testEnvironment.authenticatedContext(GUEST_UID).database()

    await assertFails(set(
      ref(guestDatabase, `rooms/${ROOM_CODE}/gameState`),
      gameStateFixture(1, GUEST_UID),
    ))
    await assertFails(set(
      ref(hostDatabase, `rooms/${ROOM_CODE}/gameState`),
      gameStateFixture(1, HOST_UID),
    ))
    await assertFails(set(ref(hostDatabase, `rooms/${ROOM_CODE}/status`), 'playing'))
    await assertSucceeds(update(ref(hostDatabase), {
      [`rooms/${ROOM_CODE}/status`]: 'playing',
      [`rooms/${ROOM_CODE}/updatedAt`]: Date.now(),
      [`rooms/${ROOM_CODE}/gameState`]: gameStateFixture(1, HOST_UID),
    }))
    await assertFails(set(ref(hostDatabase, `rooms/${ROOM_CODE}/status`), 'finished'))
    await assertFails(update(ref(hostDatabase), {
      [`rooms/${ROOM_CODE}/status`]: 'finished',
      [`rooms/${ROOM_CODE}/finishedAt`]: 0,
      [`rooms/${ROOM_CODE}/updatedAt`]: Date.now(),
    }))
    await assertSucceeds(update(ref(hostDatabase), {
      [`rooms/${ROOM_CODE}/status`]: 'finished',
      [`rooms/${ROOM_CODE}/finishedAt`]: Date.now(),
      [`rooms/${ROOM_CODE}/updatedAt`]: Date.now(),
    }))
  })

  it('allows a member revision update but rejects stale and invalid state', async () => {
    await seedLobby()
    await addGuestWithoutRules()
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await update(ref(context.database()), {
        [`rooms/${ROOM_CODE}/status`]: 'playing',
        [`rooms/${ROOM_CODE}/gameState`]: gameStateFixture(1, HOST_UID),
      })
    })
    const guestDatabase = testEnvironment.authenticatedContext(GUEST_UID).database()

    await assertSucceeds(update(ref(guestDatabase, `rooms/${ROOM_CODE}/gameState`), {
      revision: increment(1),
      updatedAt: Date.now(),
      updatedBy: GUEST_UID,
      [`players/${GUEST_PLAYER_ID}/lifeTotal`]: 37,
    }))

    await assertFails(update(ref(guestDatabase, `rooms/${ROOM_CODE}/gameState`), {
      revision: 2,
      updatedAt: Date.now(),
      updatedBy: GUEST_UID,
      [`players/${GUEST_PLAYER_ID}/lifeTotal`]: 36,
    }))

    await assertFails(update(ref(guestDatabase, `rooms/${ROOM_CODE}/gameState`), {
      revision: 3,
      updatedAt: Date.now(),
      updatedBy: GUEST_UID,
      [`players/${GUEST_PLAYER_ID}/lifeTotal`]: 1_000_000,
    }))

    await assertFails(update(ref(guestDatabase, `rooms/${ROOM_CODE}/gameState`), {
      revision: 3,
      updatedAt: Date.now(),
      updatedBy: GUEST_UID,
      [`players/${HOST_PLAYER_ID}/lifeTotal`]: 1,
    }))
  })

  it('accepts damage only from commanders registered in the shared game', async () => {
    await seedLobby()
    await addGuestWithoutRules()
    const commanderOwnerIds = [HOST_PLAYER_ID, GUEST_PLAYER_ID] as const
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const gameState = gameStateFixture(1, HOST_UID)
      for (const playerId of commanderOwnerIds) {
        gameState.players[playerId]!.commanders = Array.from(
          { length: 10 },
          (_, index) => ({
            id: `${playerId}_commander_${index}`,
            cardName: `Commander ${index}`,
            castCount: 0,
          }),
        )
      }
      await update(ref(context.database()), {
        [`rooms/${ROOM_CODE}/status`]: 'playing',
        [`rooms/${ROOM_CODE}/gameState`]: gameState,
      })
    })
    const guestDatabase = testEnvironment.authenticatedContext(GUEST_UID).database()
    const registeredDamage = Object.fromEntries(
      commanderOwnerIds.flatMap((playerId) =>
        Array.from({ length: 10 }, (_, index) => [`${playerId}_commander_${index}`, 1]),
      ),
    )

    await assertSucceeds(update(ref(guestDatabase, `rooms/${ROOM_CODE}/gameState`), {
      revision: increment(1),
      updatedAt: Date.now(),
      updatedBy: GUEST_UID,
      [`players/${GUEST_PLAYER_ID}/commanderDamageReceived`]: registeredDamage,
    }))
    await assertFails(update(ref(guestDatabase, `rooms/${ROOM_CODE}/gameState`), {
      revision: increment(1),
      updatedAt: Date.now(),
      updatedBy: GUEST_UID,
      [`players/${GUEST_PLAYER_ID}/commanderDamageReceived/unregistered_source`]: 1,
    }))
  })

  it('keeps the shared clock host-authoritative', async () => {
    await seedLobby()
    await addGuestWithoutRules()
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await update(ref(context.database()), {
        [`rooms/${ROOM_CODE}/status`]: 'playing',
        [`rooms/${ROOM_CODE}/gameState`]: gameStateFixture(1, HOST_UID),
      })
    })
    const guestDatabase = testEnvironment.authenticatedContext(GUEST_UID).database()
    const hostDatabase = testEnvironment.authenticatedContext(HOST_UID).database()
    const clockPatch = {
      revision: 2,
      updatedAt: Date.now(),
      updatedBy: GUEST_UID,
      elapsedMs: 1_000,
    }

    await assertFails(update(ref(guestDatabase, `rooms/${ROOM_CODE}/gameState`), clockPatch))
    await assertSucceeds(update(ref(hostDatabase, `rooms/${ROOM_CODE}/gameState`), {
      ...clockPatch,
      updatedBy: HOST_UID,
    }))
  })

  it('allows an atomic Monarch transfer while enforcing a single holder', async () => {
    await seedLobby()
    await addGuestWithoutRules()
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const gameState = gameStateFixture(1, HOST_UID)
      gameState.players[HOST_PLAYER_ID]!.isMonarch = true
      await update(ref(context.database()), {
        [`rooms/${ROOM_CODE}/status`]: 'playing',
        [`rooms/${ROOM_CODE}/gameState`]: gameState,
      })
    })
    const guestDatabase = testEnvironment.authenticatedContext(GUEST_UID).database()

    await assertSucceeds(update(ref(guestDatabase, `rooms/${ROOM_CODE}/gameState`), {
      revision: 2,
      updatedAt: Date.now(),
      updatedBy: GUEST_UID,
      [`players/${HOST_PLAYER_ID}/isMonarch`]: false,
      [`players/${GUEST_PLAYER_ID}/isMonarch`]: true,
    }))
    await assertFails(update(ref(guestDatabase, `rooms/${ROOM_CODE}/gameState`), {
      revision: 3,
      updatedAt: Date.now(),
      updatedBy: GUEST_UID,
      [`players/${HOST_PLAYER_ID}/isMonarch`]: true,
    }))
  })

  it('keeps pregame order and phase host-authoritative, including the playing transition', async () => {
    await seedLobby()
    await addGuestWithoutRules()
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await update(ref(context.database()), {
        [`rooms/${ROOM_CODE}/status`]: 'playing',
        [`rooms/${ROOM_CODE}/gameState`]: gameStateFixture(1, HOST_UID),
      })
    })
    const guestDatabase = testEnvironment.authenticatedContext(GUEST_UID).database()
    const hostDatabase = testEnvironment.authenticatedContext(HOST_UID).database()

    await assertFails(update(ref(guestDatabase, `rooms/${ROOM_CODE}/gameState`), {
      revision: 2,
      updatedAt: Date.now(),
      updatedBy: GUEST_UID,
      gamePhase: 'initiative',
    }))
    await assertFails(update(ref(guestDatabase, `rooms/${ROOM_CODE}/gameState`), {
      revision: 2,
      updatedAt: Date.now(),
      updatedBy: GUEST_UID,
      playerOrder: [GUEST_PLAYER_ID, HOST_PLAYER_ID],
    }))
    await assertSucceeds(update(ref(hostDatabase, `rooms/${ROOM_CODE}/gameState`), {
      revision: 2,
      updatedAt: Date.now(),
      updatedBy: HOST_UID,
      gamePhase: 'initiative',
    }))
    await assertSucceeds(update(ref(hostDatabase, `rooms/${ROOM_CODE}/gameState`), {
      revision: 3,
      updatedAt: Date.now(),
      updatedBy: HOST_UID,
      gamePhase: 'playing',
      startedAt: Date.now(),
      isRunning: true,
    }))
    await assertFails(update(ref(hostDatabase, `rooms/${ROOM_CODE}/gameState`), {
      revision: 4,
      updatedAt: Date.now(),
      updatedBy: HOST_UID,
      gamePhase: 'initiative',
      playerOrder: [GUEST_PLAYER_ID, HOST_PLAYER_ID],
      startedAt: Date.now() + 1,
    }))
  })

  it('prevents one guest from modifying another owner’s lobby player', async () => {
    await seedLobby(3)
    await addGuestWithoutRules()
    const outsiderDatabase = testEnvironment.authenticatedContext(OUTSIDER_UID).database()

    await assertFails(set(
      ref(outsiderDatabase, `rooms/${ROOM_CODE}/players/${GUEST_PLAYER_ID}/connected`),
      true,
    ))
  })

  it('rejects unknown fields and lets the host delete its room', async () => {
    await seedLobby()
    const hostDatabase = testEnvironment.authenticatedContext(HOST_UID).database()

    await assertFails(set(ref(hostDatabase, `rooms/${ROOM_CODE}/unexpected`), true))
    await assertFails(set(ref(hostDatabase, `roomSecrets/${ROOM_CODE}`), {
      token: 'legacy-secret',
    }))
    await assertSucceeds(set(ref(hostDatabase, `rooms/${ROOM_CODE}`), null))
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      expect((await get(ref(context.database(), `rooms/${ROOM_CODE}`))).exists()).toBe(false)
    })
  })
})
