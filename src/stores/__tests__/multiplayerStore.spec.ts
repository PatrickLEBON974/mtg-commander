import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { toRaw } from 'vue'
import type {
  MultiplayerGameSettings,
  RoomData,
  RoomJoinRequest,
} from '@/types/multiplayer'

const firebaseMocks = vi.hoisted(() => ({
  approveJoinRequest: vi.fn<typeof import('@/services/firebase').approveJoinRequest>(),
  cancelJoinRequest: vi.fn<typeof import('@/services/firebase').cancelJoinRequest>(),
  commitGameStatePatch: vi.fn<typeof import('@/services/firebase').commitGameStatePatch>(),
  createRoom: vi.fn<typeof import('@/services/firebase').createRoom>(),
  finishRoomGame: vi.fn<typeof import('@/services/firebase').finishRoomGame>(),
  getAuthenticatedUid: vi.fn<typeof import('@/services/firebase').getAuthenticatedUid>(),
  leaveRoom: vi.fn<typeof import('@/services/firebase').leaveRoom>(),
  listenToJoinRequest: vi.fn<typeof import('@/services/firebase').listenToJoinRequest>(),
  listenToRoom: vi.fn<typeof import('@/services/firebase').listenToRoom>(),
  monitorRoomPresence: vi.fn<typeof import('@/services/firebase').monitorRoomPresence>(),
  rejectJoinRequest: vi.fn<typeof import('@/services/firebase').rejectJoinRequest>(),
  requestRoomJoin: vi.fn<typeof import('@/services/firebase').requestRoomJoin>(),
  restoreRoomSession: vi.fn<typeof import('@/services/firebase').restoreRoomSession>(),
  startRoomGame: vi.fn<typeof import('@/services/firebase').startRoomGame>(),
}))

vi.mock('@/services/firebase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/firebase')>()
  return { ...actual, ...firebaseMocks }
})

import { MultiplayerServiceError } from '@/services/firebase'
import { useGameStore } from '@/stores/gameStore'
import { useMultiplayerStore } from '@/stores/multiplayerStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { MULTIPLAYER_REMOTE_OPERATION_TIMEOUT_MS } from '@/config/gameConstants'

let emitRoomError: (error: MultiplayerServiceError) => void = () => undefined
let emitJoinRequest: (request: RoomJoinRequest | null) => void = () => undefined

function settingsFixture(startingLife = 40): MultiplayerGameSettings {
  return {
    startingLife,
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

function roomFixture(settings = settingsFixture()): RoomData {
  return {
    schemaVersion: 3,
    code: 'ABCDEF',
    hostUid: 'host-user',
    createdAt: 1_000,
    updatedAt: 1_000,
    expiresAt: Date.now() + 60_000,
    status: 'lobby',
    settings,
    members: {
      'host-user': {
        uid: 'host-user',
        connected: true,
        joinedAt: 1_000,
        lastSeenAt: 1_000,
      },
      'guest-user': {
        uid: 'guest-user',
        connected: true,
        joinedAt: 1_000,
        lastSeenAt: 1_000,
      },
    },
    players: {
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
    },
    joinRequestCount: 0,
    joinRequests: {},
    gameState: null,
  }
}

function setupSuccessfulConnection(room = roomFixture()) {
  firebaseMocks.getAuthenticatedUid.mockResolvedValue('host-user')
  firebaseMocks.createRoom.mockResolvedValue({
    roomData: room,
    playerIds: ['p0'],
  })
  firebaseMocks.requestRoomJoin.mockResolvedValue({
    roomCode: room.code,
    request: {
      uid: 'guest-user',
      playerNames: ['Guest'],
      requestedAt: Date.now(),
      status: 'pending',
    },
  })
  firebaseMocks.restoreRoomSession.mockResolvedValue({ roomData: room, playerIds: ['p0'] })
  firebaseMocks.listenToJoinRequest.mockImplementation(async (_code, onRequest) => {
    emitJoinRequest = onRequest
    return () => undefined
  })
  firebaseMocks.listenToRoom.mockImplementation(async (_code, _onRoomData, onError) => {
    emitRoomError = onError
    return () => undefined
  })
  firebaseMocks.monitorRoomPresence.mockImplementation(async (_code, _playerIds, onChange) => {
    onChange(true)
    return () => undefined
  })
  firebaseMocks.leaveRoom.mockResolvedValue(undefined)
  firebaseMocks.cancelJoinRequest.mockResolvedValue(undefined)
  firebaseMocks.approveJoinRequest.mockResolvedValue(room)
  firebaseMocks.rejectJoinRequest.mockResolvedValue(undefined)
  firebaseMocks.finishRoomGame.mockResolvedValue(undefined)
  firebaseMocks.startRoomGame.mockImplementation(async (_code, initialState) => initialState)
}

describe('multiplayerStore session safety', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    for (const mock of Object.values(firebaseMocks)) mock.mockReset()
    setupSuccessfulConnection()
  })

  it('restores the previous reactive game when remote start fails', async () => {
    const gameStore = useGameStore()
    gameStore.startNewGame(2)
    gameStore.changeLife(gameStore.currentGame!.players[0]!.id, -3)
    const previousGame = structuredClone(toRaw(gameStore.currentGame!))
    firebaseMocks.startRoomGame.mockRejectedValue(
      new MultiplayerServiceError('conflict', { recoverable: true }),
    )
    const multiplayerStore = useMultiplayerStore()
    await multiplayerStore.hostRoom(['Host'], settingsFixture())

    await expect(multiplayerStore.startGame()).rejects.toMatchObject({ code: 'conflict' })

    expect(gameStore.currentGame).toEqual(previousGame)
    expect(multiplayerStore.errorState).toMatchObject({
      code: 'conflict',
      recoverable: true,
      operation: 'start-game',
    })
  })

  it('rolls an unauthorized optimistic change back to the authoritative baseline', async () => {
    const multiplayerStore = useMultiplayerStore()
    await multiplayerStore.hostRoom(['Host'], settingsFixture())
    await multiplayerStore.startGame()
    const gameStore = useGameStore()
    const hostPlayer = gameStore.currentGame!.players[0]!
    gameStore.changeLife(hostPlayer.id, -5)
    firebaseMocks.commitGameStatePatch.mockRejectedValue(
      new MultiplayerServiceError('permission-denied'),
    )

    await multiplayerStore.pushFullGameState()

    expect(firebaseMocks.commitGameStatePatch).toHaveBeenCalledWith(
      'ABCDEF',
      expect.objectContaining({
        players: expect.objectContaining({
          p0: expect.objectContaining({ lifeTotal: 35 }),
        }),
      }),
    )
    expect(gameStore.currentGame?.players[0]?.lifeTotal).toBe(40)
    expect(multiplayerStore.errorState?.code).toBe('permission-denied')
  })

  it('clears a stale game-sync error after the next accepted update', async () => {
    const multiplayerStore = useMultiplayerStore()
    await multiplayerStore.hostRoom(['Host'], settingsFixture())
    await multiplayerStore.startGame()
    const gameStore = useGameStore()
    const hostPlayer = gameStore.currentGame!.players[0]!

    firebaseMocks.commitGameStatePatch.mockRejectedValueOnce(
      new MultiplayerServiceError('permission-denied'),
    )
    gameStore.changeLife(hostPlayer.id, -5)
    await multiplayerStore.pushFullGameState()
    expect(multiplayerStore.errorState).toMatchObject({
      code: 'permission-denied',
      operation: 'sync-game-state',
    })

    const acceptedState = structuredClone(firebaseMocks.startRoomGame.mock.calls[0]![1])
    acceptedState.revision += 1
    acceptedState.updatedAt = Date.now()
    acceptedState.players.p0!.lifeTotal = 39
    firebaseMocks.commitGameStatePatch.mockResolvedValueOnce(acceptedState)
    gameStore.changeLife(hostPlayer.id, -1)
    await multiplayerStore.pushFullGameState()

    expect(multiplayerStore.errorState).toBeNull()
    expect(gameStore.currentGame?.players[0]?.lifeTotal).toBe(39)
  })

  it('clears a remote game when the room listener is revoked', async () => {
    const multiplayerStore = useMultiplayerStore()
    await multiplayerStore.hostRoom(['Host'], settingsFixture())
    await multiplayerStore.startGame()
    const gameStore = useGameStore()
    expect(gameStore.currentGame).not.toBeNull()

    emitRoomError(new MultiplayerServiceError('room-closed', { operation: 'listen-room' }))

    expect(gameStore.currentGame).toBeNull()
    expect(multiplayerStore.isMultiplayer).toBe(false)
    expect(multiplayerStore.errorState).toMatchObject({
      code: 'room-closed',
      recoverable: false,
    })
  })

  it('restores personal settings after a clean room departure', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.updateGameSettings(settingsFixture(25))
    const remoteRoom = roomFixture(settingsFixture(40))
    setupSuccessfulConnection(remoteRoom)
    firebaseMocks.getAuthenticatedUid.mockResolvedValue('guest-user')
    firebaseMocks.restoreRoomSession.mockResolvedValue({ roomData: remoteRoom, playerIds: ['p1'] })
    const multiplayerStore = useMultiplayerStore()

    await multiplayerStore.joinExistingRoom('ABCDEF', ['Guest'])
    expect(multiplayerStore.isAwaitingApproval).toBe(true)
    emitJoinRequest({
      uid: 'guest-user',
      playerNames: ['Guest'],
      requestedAt: Date.now(),
      status: 'approved',
      resolvedAt: Date.now(),
    })
    await vi.waitFor(() => expect(multiplayerStore.isMultiplayer).toBe(true))
    expect(settingsStore.gameSettings.startingLife).toBe(40)

    await multiplayerStore.disconnect()

    expect(settingsStore.gameSettings.startingLife).toBe(25)
    expect(multiplayerStore.isMultiplayer).toBe(false)
    expect(localStorage.getItem('mtg_multiplayer_session_v3')).toBeNull()
  })

  it('persists only a pending session until the host approves access', async () => {
    firebaseMocks.getAuthenticatedUid.mockResolvedValue('guest-user')
    firebaseMocks.restoreRoomSession.mockResolvedValue({ roomData: roomFixture(), playerIds: ['p1'] })
    const multiplayerStore = useMultiplayerStore()

    await multiplayerStore.joinExistingRoom('ABCDEF', ['Guest'])

    expect(multiplayerStore.isMultiplayer).toBe(false)
    expect(multiplayerStore.isAwaitingApproval).toBe(true)
    expect(JSON.parse(localStorage.getItem('mtg_multiplayer_session_v3') ?? '{}')).toMatchObject({
      roomCode: 'ABCDEF',
      state: 'pending',
    })
    expect(firebaseMocks.listenToRoom).not.toHaveBeenCalled()
  })

  it('stops a stalled access request and exposes a recoverable network error', async () => {
    vi.useFakeTimers()
    firebaseMocks.requestRoomJoin.mockImplementation(() => new Promise(() => undefined))
    const multiplayerStore = useMultiplayerStore()

    const joinResult = multiplayerStore
      .joinExistingRoom('ABCDEF', ['Guest'])
      .catch((error: unknown) => error)

    await vi.advanceTimersByTimeAsync(MULTIPLAYER_REMOTE_OPERATION_TIMEOUT_MS)
    await expect(joinResult).resolves.toMatchObject({
      code: 'network-unavailable',
      recoverable: true,
      operation: 'request-room-join',
    })

    expect(multiplayerStore.connectionState).toBe('offline')
    expect(multiplayerStore.isConnecting).toBe(false)
    expect(multiplayerStore.errorState).toMatchObject({
      code: 'network-unavailable',
      recoverable: true,
    })
  })

  it('clears a rejected request without ever exposing room data', async () => {
    firebaseMocks.getAuthenticatedUid.mockResolvedValue('guest-user')
    const multiplayerStore = useMultiplayerStore()
    await multiplayerStore.joinExistingRoom('ABCDEF', ['Guest'])

    emitJoinRequest(null)

    await vi.waitFor(() => expect(multiplayerStore.errorState?.code).toBe('join-rejected'))
    expect(multiplayerStore.isMultiplayer).toBe(false)
    expect(multiplayerStore.roomData).toBeNull()
    expect(localStorage.getItem('mtg_multiplayer_session_v3')).toBeNull()
    expect(firebaseMocks.listenToRoom).not.toHaveBeenCalled()
  })

  it('prevents starting while an access request awaits a host decision', async () => {
    const room = roomFixture()
    room.joinRequestCount = 1
    room.joinRequests['waiting-user'] = {
      uid: 'waiting-user',
      playerNames: ['Waiting player'],
      requestedAt: Date.now(),
      status: 'pending',
    }
    setupSuccessfulConnection(room)
    const multiplayerStore = useMultiplayerStore()
    await multiplayerStore.hostRoom(['Host'], settingsFixture())

    expect(multiplayerStore.isRoomReady).toBe(false)
    await expect(multiplayerStore.startGame()).rejects.toMatchObject({ code: 'conflict' })
    expect(firebaseMocks.startRoomGame).not.toHaveBeenCalled()
  })

  it('keeps a recoverable session when remote leave fails offline', async () => {
    const multiplayerStore = useMultiplayerStore()
    await multiplayerStore.hostRoom(['Host'], settingsFixture())
    await multiplayerStore.startGame()
    firebaseMocks.leaveRoom.mockRejectedValue(
      new MultiplayerServiceError('network-unavailable', { recoverable: true }),
    )

    await expect(multiplayerStore.disconnect()).rejects.toMatchObject({
      code: 'network-unavailable',
    })

    expect(multiplayerStore.isMultiplayer).toBe(true)
    expect(multiplayerStore.roomCode).toBe('ABCDEF')
    expect(useGameStore().currentGame).not.toBeNull()
    expect(localStorage.getItem('mtg_multiplayer_session_v3')).not.toBeNull()
  })
})
