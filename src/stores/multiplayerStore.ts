import { computed, onScopeDispose, ref, toRaw, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  approveJoinRequest,
  cancelJoinRequest,
  commitGameStatePatch,
  createRoom,
  finishRoomGame,
  getAuthenticatedUid,
  leaveRoom,
  listenToJoinRequest,
  listenToRoom,
  monitorRoomPresence,
  rejectJoinRequest,
  requestRoomJoin,
  restoreRoomSession,
  startRoomGame,
  toMultiplayerServiceError,
  validateMultiplayerSettings,
  type MultiplayerServiceError,
  type Unsubscribe,
} from '@/services/firebase'
import {
  applyPatchToSyncedState,
  buildGameStatePatch,
  toSyncedGameState,
} from '@/services/multiplayerSync'
import { useGameStore } from './gameStore'
import { useSettingsStore } from './settingsStore'
import type { PlayerState } from '@/types/game'
import type {
  MultiplayerConnectionState,
  MultiplayerErrorCode,
  MultiplayerErrorState,
  MultiplayerGameSettings,
  MultiplayerSession,
  RoomData,
  RoomJoinRequest,
  SyncedGameState,
} from '@/types/multiplayer'
import {
  LEGACY_MULTIPLAYER_SESSION_STORAGE_KEY,
  MULTIPLAYER_SCHEMA_VERSION,
  MULTIPLAYER_REMOTE_OPERATION_TIMEOUT_MS,
  MULTIPLAYER_SESSION_STORAGE_KEY,
  MULTIPLAYER_SYNC_INTERVAL_MS,
  PLAYER_NAME_MAX_LENGTH,
} from '@/config/gameConstants'
import i18n from '@/i18n'

const ERROR_TRANSLATION_KEYS: Record<MultiplayerErrorCode, string> = {
  'not-configured': 'multiplayer.errors.notConfigured',
  'authentication-failed': 'multiplayer.errors.authenticationFailed',
  'app-check-failed': 'multiplayer.errors.appCheckFailed',
  'invalid-room-code': 'multiplayer.errors.invalidRoomCode',
  'invalid-player-name': 'multiplayer.errors.invalidPlayerName',
  'invalid-settings': 'multiplayer.errors.invalidSettings',
  'room-not-found': 'multiplayer.roomNotFound',
  'room-expired': 'multiplayer.roomExpired',
  'room-full': 'multiplayer.errors.roomFull',
  'room-already-started': 'multiplayer.errors.roomAlreadyStarted',
  'room-closed': 'multiplayer.roomClosed',
  'join-rejected': 'multiplayer.errors.joinRejected',
  'not-room-member': 'multiplayer.errors.notRoomMember',
  'host-only': 'multiplayer.errors.hostOnly',
  'permission-denied': 'multiplayer.errors.permissionDenied',
  'network-unavailable': 'multiplayer.errors.networkUnavailable',
  'session-expired': 'multiplayer.errors.sessionExpired',
  'invalid-remote-data': 'multiplayer.errors.invalidRemoteData',
  'conflict': 'multiplayer.errors.conflict',
  'unknown': 'multiplayer.connectionError',
}

const CONNECTION_ERROR_OPERATIONS = new Set([
  'initialize',
  'listen-room',
  'presence',
  'reconnect',
  'restore-session',
  'create-room',
  'request-room-join',
  'listen-join-request',
  'leave-room',
])

async function withRemoteOperationTimeout<T>(
  promise: Promise<T>,
  operation: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(toMultiplayerServiceError({ code: 'network-unavailable' }, operation))
    }, MULTIPLAYER_REMOTE_OPERATION_TIMEOUT_MS)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId)
  }
}

function copyMultiplayerSettings(settings: MultiplayerGameSettings): MultiplayerGameSettings {
  return {
    startingLife: settings.startingLife,
    commanderDamageThreshold: settings.commanderDamageThreshold,
    poisonThreshold: settings.poisonThreshold,
    playerCount: settings.playerCount,
    enableTimer: settings.enableTimer,
    timerMode: settings.timerMode,
    turnTimerSeconds: settings.turnTimerSeconds,
    chessGameDurationMinutes: settings.chessGameDurationMinutes,
    chessExpectedRounds: settings.chessExpectedRounds,
    hourglassEnabled: settings.hourglassEnabled,
    hourglassMode: settings.hourglassMode,
    hourglassGracePeriodSeconds: settings.hourglassGracePeriodSeconds,
    hourglassLossThreshold: settings.hourglassLossThreshold,
    hourglassTimeBankCapEnabled: settings.hourglassTimeBankCapEnabled,
    hourglassTimeBankCapSeconds: settings.hourglassTimeBankCapSeconds,
  }
}

function loadPersistedSession(): MultiplayerSession | null {
  localStorage.removeItem(LEGACY_MULTIPLAYER_SESSION_STORAGE_KEY)
  const storedSession = localStorage.getItem(MULTIPLAYER_SESSION_STORAGE_KEY)
  if (!storedSession) return null
  try {
    const parsed = JSON.parse(storedSession) as Partial<MultiplayerSession>
    if (
      parsed.schemaVersion !== MULTIPLAYER_SCHEMA_VERSION
      || typeof parsed.roomCode !== 'string'
      || parsed.roomCode.length === 0
      || (parsed.state !== 'member' && parsed.state !== 'pending')
    ) {
      localStorage.removeItem(MULTIPLAYER_SESSION_STORAGE_KEY)
      return null
    }
    let previousGameSettings: MultiplayerGameSettings | undefined
    if (parsed.previousGameSettings) {
      try {
        previousGameSettings = copyMultiplayerSettings(
          validateMultiplayerSettings(parsed.previousGameSettings, 1),
        )
      } catch {
        // A malformed local backup must never prevent room recovery.
      }
    }
    return {
      schemaVersion: MULTIPLAYER_SCHEMA_VERSION,
      roomCode: parsed.roomCode,
      state: parsed.state,
      previousGameSettings,
    }
  } catch {
    localStorage.removeItem(MULTIPLAYER_SESSION_STORAGE_KEY)
    return null
  }
}

function persistSession(
  code: string,
  state: MultiplayerSession['state'],
  previousGameSettings: MultiplayerGameSettings,
): void {
  const session: MultiplayerSession = {
    schemaVersion: MULTIPLAYER_SCHEMA_VERSION,
    roomCode: code,
    state,
    previousGameSettings: copyMultiplayerSettings(previousGameSettings),
  }
  localStorage.setItem(MULTIPLAYER_SESSION_STORAGE_KEY, JSON.stringify(session))
}

export const useMultiplayerStore = defineStore('multiplayer', () => {
  const isMultiplayer = ref(false)
  const roomCode = ref<string | null>(null)
  const authUid = ref<string | null>(null)
  const localPlayerIds = ref<string[]>([])
  const isHost = ref(false)
  const roomData = ref<RoomData | null>(null)
  const pendingJoinRequest = ref<RoomJoinRequest | null>(null)
  const connectionState = ref<MultiplayerConnectionState>('idle')
  const errorState = ref<MultiplayerErrorState | null>(null)
  const isInitialized = ref(false)

  let roomUnsubscribe: Unsubscribe | null = null
  let presenceUnsubscribe: Unsubscribe | null = null
  let joinRequestUnsubscribe: Unsubscribe | null = null
  let joinActivationInFlight = false
  let syncTimer: ReturnType<typeof setTimeout> | null = null
  let syncInFlight = false
  let syncRequestedWhileBusy = false
  let baselineGameState: SyncedGameState | null = null
  let isApplyingRemoteState = false
  let initializationPromise: Promise<void> | null = null
  let appLifecycleCleanup: (() => void) | null = null
  let previousGameSettings: MultiplayerGameSettings | null = null
  let sessionGeneration = 0
  let subscriptionGeneration = 0

  const isConnecting = computed(() =>
    connectionState.value === 'connecting' || connectionState.value === 'reconnecting',
  )
  const isAwaitingApproval = computed(() => connectionState.value === 'waiting-approval')
  const isConnected = computed(() => connectionState.value === 'connected')
  const connectionError = computed(() => {
    if (!errorState.value) return null
    return i18n.global.t(ERROR_TRANSLATION_KEYS[errorState.value.code])
  })
  const connectedPlayerCount = computed(() =>
    roomData.value
      ? Object.values(roomData.value.players).filter((player) => player.connected).length
      : 0,
  )
  const allPlayers = computed(() =>
    roomData.value
      ? Object.values(roomData.value.players).sort((left, right) => left.seat - right.seat)
      : [],
  )
  const pendingJoinRequests = computed(() =>
    roomData.value
      ? Object.values(roomData.value.joinRequests)
        .filter((request) => request.status === 'pending')
        .sort((left, right) => left.requestedAt - right.requestedAt)
      : [],
  )
  const isRoomReady = computed(() =>
    roomData.value?.status === 'lobby'
    && connectedPlayerCount.value >= 2
    && pendingJoinRequests.value.length === 0,
  )
  const roomStatus = computed(() => roomData.value?.status ?? null)
  const gameStarted = computed(() =>
    (roomData.value?.status === 'playing' || roomData.value?.status === 'finished')
    && roomData.value.gameState !== null,
  )
  const gameFinished = computed(() => roomData.value?.status === 'finished')
  const availableSlots = computed(() => {
    if (!roomData.value) return 0
    return Math.max(0, roomData.value.settings.playerCount - Object.keys(roomData.value.players).length)
  })

  function isLocalPlayer(playerId: string): boolean {
    return localPlayerIds.value.includes(playerId)
  }

  function clearError(): void {
    errorState.value = null
    if (connectionState.value === 'error') {
      connectionState.value = isMultiplayer.value ? 'reconnecting' : 'idle'
    }
  }

  function recordError(error: unknown, operation?: string): MultiplayerServiceError {
    const serviceError = toMultiplayerServiceError(error, operation)
    errorState.value = {
      code: serviceError.code,
      recoverable: serviceError.recoverable,
      operation: serviceError.operation ?? operation,
    }
    if (serviceError.code === 'network-unavailable') {
      connectionState.value = 'offline'
    } else if (
      !isMultiplayer.value
      || CONNECTION_ERROR_OPERATIONS.has(serviceError.operation ?? operation ?? '')
    ) {
      connectionState.value = 'error'
    }
    return serviceError
  }

  function applyRoomSettings(settings: MultiplayerGameSettings): void {
    useSettingsStore().updateGameSettings(settings)
  }

  function stopRealtimeSubscriptions(): void {
    subscriptionGeneration++
    roomUnsubscribe?.()
    roomUnsubscribe = null
    presenceUnsubscribe?.()
    presenceUnsubscribe = null
  }

  function stopJoinRequestSubscription(): void {
    joinRequestUnsubscribe?.()
    joinRequestUnsubscribe = null
  }

  function cancelScheduledSync(): void {
    if (syncTimer !== null) {
      clearTimeout(syncTimer)
      syncTimer = null
    }
    syncRequestedWhileBusy = false
  }

  function resetLocalSession(options: {
    preserveError?: boolean
    preserveConnectionState?: boolean
    clearRemoteGame?: boolean
  } = {}): void {
    const settingsToRestore = previousGameSettings
    sessionGeneration++
    stopRealtimeSubscriptions()
    stopJoinRequestSubscription()
    joinActivationInFlight = false
    cancelScheduledSync()
    baselineGameState = null
    syncInFlight = false
    isApplyingRemoteState = false
    isMultiplayer.value = false
    roomCode.value = null
    localPlayerIds.value = []
    isHost.value = false
    roomData.value = null
    pendingJoinRequest.value = null
    authUid.value = null
    localStorage.removeItem(MULTIPLAYER_SESSION_STORAGE_KEY)
    localStorage.removeItem(LEGACY_MULTIPLAYER_SESSION_STORAGE_KEY)
    previousGameSettings = null
    if (settingsToRestore) {
      useSettingsStore().updateGameSettings(settingsToRestore)
    }
    if (options.clearRemoteGame) {
      useGameStore().resetGame()
    }
    if (!options.preserveError) errorState.value = null
    if (!options.preserveConnectionState) connectionState.value = 'idle'
  }

  function currentLocalSnapshot(): SyncedGameState | null {
    const game = useGameStore().currentGame
    if (!game || !authUid.value) return null
    return toSyncedGameState(game, authUid.value, baselineGameState?.revision ?? 1)
  }

  function reconcileRemoteGameState(remoteState: SyncedGameState, players = roomData.value?.players): void {
    if (!players) return
    if (
      baselineGameState
      && baselineGameState.id === remoteState.id
      && remoteState.revision <= baselineGameState.revision
    ) {
      return
    }

    const localSnapshot = baselineGameState ? currentLocalSnapshot() : null
    const pendingLocalPatch = baselineGameState && localSnapshot
      ? buildGameStatePatch(baselineGameState, localSnapshot)
      : null

    baselineGameState = structuredClone(remoteState)
    isApplyingRemoteState = true
    try {
      const gameStore = useGameStore()
      gameStore.applyRemoteGameSync(remoteState, players)
      if (pendingLocalPatch) {
        const rebasedLocalState = applyPatchToSyncedState(remoteState, pendingLocalPatch)
        gameStore.applyRemoteGameSync(rebasedLocalState, players)
      }
    } finally {
      isApplyingRemoteState = false
    }

    if (pendingLocalPatch) scheduleGameStateSync()
  }

  function restoreAuthoritativeBaseline(): void {
    if (!baselineGameState || !roomData.value) return
    isApplyingRemoteState = true
    try {
      useGameStore().applyRemoteGameSync(baselineGameState, roomData.value.players)
    } finally {
      isApplyingRemoteState = false
    }
  }

  function handleRoomUpdate(data: RoomData | null): void {
    if (!data) {
      const hadRemoteGame = baselineGameState !== null || roomData.value?.gameState !== null
      errorState.value = {
        code: 'room-closed',
        recoverable: false,
        operation: 'listen-room',
      }
      connectionState.value = 'error'
      resetLocalSession({
        preserveError: true,
        preserveConnectionState: true,
        clearRemoteGame: hadRemoteGame,
      })
      return
    }

    roomData.value = data
    isHost.value = authUid.value === data.hostUid
    if (authUid.value) {
      localPlayerIds.value = Object.values(data.players)
        .filter((player) => player.ownerUid === authUid.value)
        .map((player) => player.id)
    }
    applyRoomSettings(data.settings)
    if (data.gameState) reconcileRemoteGameState(data.gameState, data.players)
  }

  function handleRealtimeError(error: MultiplayerServiceError): void {
    if (error.code === 'room-closed') {
      handleRoomUpdate(null)
      return
    }
    recordError(error, error.operation)
  }

  function handlePresenceChange(connected: boolean): void {
    if (!isMultiplayer.value) return
    if (connected) {
      const currentError = errorState.value
      if (currentError?.code === 'network-unavailable') {
        errorState.value = null
      } else if (
        currentError
        && CONNECTION_ERROR_OPERATIONS.has(currentError.operation ?? '')
      ) {
        connectionState.value = 'error'
        return
      }
      connectionState.value = 'connected'
      scheduleGameStateSync()
    } else if (connectionState.value !== 'connecting') {
      connectionState.value = 'offline'
    }
  }

  async function startRealtimeSubscriptions(code: string): Promise<void> {
    stopRealtimeSubscriptions()
    const currentSubscriptionGeneration = subscriptionGeneration
    const isCurrentSubscription = () =>
      currentSubscriptionGeneration === subscriptionGeneration && roomCode.value === code

    try {
      const nextRoomUnsubscribe = await listenToRoom(
        code,
        (data) => {
          if (isCurrentSubscription()) handleRoomUpdate(data)
        },
        (error) => {
          if (isCurrentSubscription()) handleRealtimeError(error)
        },
      )
      if (!isCurrentSubscription()) {
        nextRoomUnsubscribe()
        return
      }
      roomUnsubscribe = nextRoomUnsubscribe

      const nextPresenceUnsubscribe = await monitorRoomPresence(
        code,
        localPlayerIds.value,
        (connected) => {
          if (isCurrentSubscription()) handlePresenceChange(connected)
        },
        (error) => {
          if (isCurrentSubscription()) handleRealtimeError(error)
        },
      )
      if (!isCurrentSubscription()) {
        nextPresenceUnsubscribe()
        return
      }
      presenceUnsubscribe = nextPresenceUnsubscribe
    } catch (error) {
      if (isCurrentSubscription()) stopRealtimeSubscriptions()
      throw error
    }
  }

  async function activateSession(
    data: RoomData,
    playerIds: string[],
    settingsBackup?: MultiplayerGameSettings,
  ): Promise<void> {
    if (!previousGameSettings) {
      previousGameSettings = copyMultiplayerSettings(
        settingsBackup ?? useSettingsStore().gameSettings,
      )
    }
    const uid = await getAuthenticatedUid()
    const sessionIsHost = data.hostUid === uid

    stopJoinRequestSubscription()
    authUid.value = uid
    roomCode.value = data.code
    roomData.value = data
    pendingJoinRequest.value = null
    localPlayerIds.value = [...playerIds]
    isHost.value = sessionIsHost
    isMultiplayer.value = true
    errorState.value = null
    connectionState.value = 'reconnecting'
    persistSession(data.code, 'member', previousGameSettings)
    applyRoomSettings(data.settings)
    if (data.gameState) {
      reconcileRemoteGameState(data.gameState, data.players)
    } else {
      baselineGameState = null
    }
    await startRealtimeSubscriptions(data.code)
  }

  async function hostRoom(
    playerNames: string[],
    settings: MultiplayerGameSettings,
  ): Promise<string> {
    connectionState.value = 'connecting'
    errorState.value = null
    try {
      resetLocalSession({ preserveConnectionState: true })
      connectionState.value = 'connecting'
      const result = await withRemoteOperationTimeout(
        createRoom(playerNames, settings),
        'create-room',
      )
      await activateSession(result.roomData, result.playerIds)
      return result.roomData.code
    } catch (error) {
      throw recordError(error, 'create-room')
    }
  }

  async function completeApprovedJoin(code: string, generation: number): Promise<void> {
    if (joinActivationInFlight || generation !== sessionGeneration) return
    joinActivationInFlight = true
    try {
      const result = await withRemoteOperationTimeout(
        restoreRoomSession(code),
        'restore-session',
      )
      if (generation !== sessionGeneration || roomCode.value !== code) return
      await activateSession(result.roomData, result.playerIds)
      try {
        await withRemoteOperationTimeout(
          cancelJoinRequest(code),
          'cancel-join-request',
        )
      } catch {
        // The approved request contains no credential and expires with the room.
      }
    } catch (error) {
      if (generation === sessionGeneration && roomCode.value === code) {
        recordError(error, 'restore-session')
      }
    } finally {
      joinActivationInFlight = false
    }
  }

  async function handleJoinRequestUpdate(
    code: string,
    request: RoomJoinRequest | null,
    generation: number,
  ): Promise<void> {
    if (generation !== sessionGeneration || roomCode.value !== code) return
    if (!request) {
      errorState.value = {
        code: 'join-rejected',
        recoverable: false,
        operation: 'listen-join-request',
      }
      connectionState.value = 'error'
      resetLocalSession({ preserveError: true, preserveConnectionState: true })
      return
    }

    pendingJoinRequest.value = request
    if (request.status === 'pending') {
      errorState.value = null
      connectionState.value = 'waiting-approval'
      return
    }
    if (request.status === 'rejected') {
      localStorage.removeItem(MULTIPLAYER_SESSION_STORAGE_KEY)
      recordError({ code: 'join-rejected' }, 'listen-join-request')
      return
    }

    await completeApprovedJoin(code, generation)
  }

  async function startJoinRequestSubscription(code: string): Promise<void> {
    stopJoinRequestSubscription()
    const generation = sessionGeneration
    const unsubscribe = await listenToJoinRequest(
      code,
      (request) => {
        void handleJoinRequestUpdate(code, request, generation)
      },
      (error) => {
        if (generation === sessionGeneration && roomCode.value === code) {
          recordError(error, 'listen-join-request')
        }
      },
    )
    if (generation !== sessionGeneration || roomCode.value !== code) {
      unsubscribe()
      return
    }
    joinRequestUnsubscribe = unsubscribe
  }

  async function enterPendingSession(
    code: string,
    request: RoomJoinRequest,
    settingsBackup?: MultiplayerGameSettings,
  ): Promise<void> {
    if (!previousGameSettings) {
      previousGameSettings = copyMultiplayerSettings(
        settingsBackup ?? useSettingsStore().gameSettings,
      )
    }
    authUid.value = await getAuthenticatedUid()
    roomCode.value = code
    roomData.value = null
    pendingJoinRequest.value = request
    localPlayerIds.value = []
    isHost.value = false
    isMultiplayer.value = false
    errorState.value = null
    connectionState.value = request.status === 'pending' ? 'waiting-approval' : 'connecting'
    persistSession(code, 'pending', previousGameSettings)
    await startJoinRequestSubscription(code)
    if (request.status === 'approved') {
      await completeApprovedJoin(code, sessionGeneration)
    }
  }

  async function joinExistingRoom(code: string, playerNames: string[]): Promise<void> {
    connectionState.value = 'connecting'
    errorState.value = null
    try {
      resetLocalSession({ preserveConnectionState: true })
      connectionState.value = 'connecting'
      previousGameSettings = copyMultiplayerSettings(useSettingsStore().gameSettings)
      const result = await withRemoteOperationTimeout(
        requestRoomJoin(code, playerNames),
        'request-room-join',
      )
      await enterPendingSession(result.roomCode, result.request, previousGameSettings)
    } catch (error) {
      throw recordError(error, 'request-room-join')
    }
  }

  async function restoreSession(): Promise<boolean> {
    const session = loadPersistedSession()
    if (!session) return false

    if (!previousGameSettings) {
      previousGameSettings = copyMultiplayerSettings(
        session.previousGameSettings ?? useSettingsStore().gameSettings,
      )
    }

    connectionState.value = isMultiplayer.value ? 'reconnecting' : 'connecting'
    errorState.value = null
    try {
      if (session.state === 'pending') {
        const uid = await getAuthenticatedUid()
        authUid.value = uid
        roomCode.value = session.roomCode
        roomData.value = null
        localPlayerIds.value = []
        isHost.value = false
        isMultiplayer.value = false
        pendingJoinRequest.value = null
        connectionState.value = 'waiting-approval'
        await startJoinRequestSubscription(session.roomCode)
        return true
      }
      const result = await withRemoteOperationTimeout(
        restoreRoomSession(session.roomCode),
        'restore-session',
      )
      await activateSession(result.roomData, result.playerIds, session.previousGameSettings)
      return true
    } catch (error) {
      const mappedError = recordError(error, 'restore-session')
      if (!mappedError.recoverable) {
        resetLocalSession({ preserveError: true, preserveConnectionState: true })
      }
      return false
    }
  }

  async function setupAppLifecycle(): Promise<void> {
    if (appLifecycleCleanup) return
    try {
      const { App } = await import('@capacitor/app')
      const resumeHandle = await App.addListener('resume', () => {
        if (loadPersistedSession()) void retryConnection()
      })
      appLifecycleCleanup = () => {
        void resumeHandle.remove()
      }
    } catch {
      // Web and test environments do not expose native lifecycle events.
    }
  }

  async function initialize(): Promise<void> {
    if (isInitialized.value) return
    if (initializationPromise) return initializationPromise

    initializationPromise = (async () => {
      await setupAppLifecycle()
      await restoreSession()
      isInitialized.value = true
    })()
    try {
      await initializationPromise
    } finally {
      initializationPromise = null
    }
  }

  async function retryConnection(): Promise<boolean> {
    const session = loadPersistedSession()
    const activeCode = roomCode.value ?? session?.roomCode
    if (!activeCode) return false
    connectionState.value = 'reconnecting'
    errorState.value = null
    try {
      if (session?.state === 'pending' || pendingJoinRequest.value) {
        stopJoinRequestSubscription()
        connectionState.value = 'waiting-approval'
        await startJoinRequestSubscription(activeCode)
        return true
      }
      stopRealtimeSubscriptions()
      const result = await withRemoteOperationTimeout(
        restoreRoomSession(activeCode),
        'reconnect',
      )
      await activateSession(result.roomData, result.playerIds)
      return true
    } catch (error) {
      recordError(error, 'reconnect')
      return false
    }
  }

  function createMultiplayerGame(): PlayerState[] {
    if (!roomData.value) return []
    return Object.values(roomData.value.players)
      .sort((left, right) => left.seat - right.seat)
      .map((roomPlayer) => ({
        id: roomPlayer.id,
        name: roomPlayer.name.slice(0, PLAYER_NAME_MAX_LENGTH),
        color: roomPlayer.color,
        lifeTotal: roomData.value!.settings.startingLife,
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
      }))
  }

  async function approveAdmission(requesterUid: string): Promise<void> {
    if (!roomCode.value || !isHost.value) {
      throw recordError({ code: 'host-only' }, 'approve-join-request')
    }
    try {
      const updatedRoom = await withRemoteOperationTimeout(
        approveJoinRequest(roomCode.value, requesterUid),
        'approve-join-request',
      )
      handleRoomUpdate(updatedRoom)
    } catch (error) {
      throw recordError(error, 'approve-join-request')
    }
  }

  async function rejectAdmission(requesterUid: string): Promise<void> {
    if (!roomCode.value || !isHost.value) {
      throw recordError({ code: 'host-only' }, 'reject-join-request')
    }
    try {
      await withRemoteOperationTimeout(
        rejectJoinRequest(roomCode.value, requesterUid),
        'reject-join-request',
      )
    } catch (error) {
      throw recordError(error, 'reject-join-request')
    }
  }

  async function cancelPendingJoin(): Promise<void> {
    const activeCode = roomCode.value
    connectionState.value = 'closing'
    stopJoinRequestSubscription()
    let cancellationError: MultiplayerServiceError | null = null
    if (activeCode) {
      try {
        await withRemoteOperationTimeout(
          cancelJoinRequest(activeCode),
          'cancel-join-request',
        )
      } catch (error) {
        cancellationError = recordError(error, 'cancel-join-request')
      }
    }
    if (cancellationError?.recoverable) {
      throw cancellationError
    }
    resetLocalSession({
      preserveError: cancellationError !== null,
      preserveConnectionState: cancellationError !== null,
    })
    if (cancellationError) throw cancellationError
  }

  async function startGame(): Promise<void> {
    if (!roomCode.value || !roomData.value || !authUid.value || !isHost.value) {
      throw recordError({ code: 'host-only' }, 'start-game')
    }
    if (!isConnected.value) {
      throw recordError({ code: 'network-unavailable' }, 'start-game')
    }
    if (!isRoomReady.value) throw recordError({ code: 'conflict' }, 'start-game')

    const gameStore = useGameStore()
    const previousGame = gameStore.currentGame
      ? structuredClone(toRaw(gameStore.currentGame))
      : null
    const previousRedoStack = structuredClone(toRaw(gameStore.redoStack))
    let localGameInitialized = false
    try {
      const players = createMultiplayerGame()
      isApplyingRemoteState = true
      try {
        gameStore.startNewGame(players.length)
        localGameInitialized = true
        if (!gameStore.currentGame) throw new Error('Game initialization failed')
        gameStore.currentGame.players = players
      } finally {
        isApplyingRemoteState = false
      }

      const initialState = toSyncedGameState(gameStore.currentGame, authUid.value, 1)
      const committedState = await withRemoteOperationTimeout(
        startRoomGame(roomCode.value, initialState),
        'start-game',
      )
      baselineGameState = structuredClone(committedState)
      roomData.value = {
        ...roomData.value,
        status: 'playing',
        gameState: committedState,
      }
    } catch (error) {
      if (localGameInitialized) {
        gameStore.$patch({
          currentGame: previousGame,
          redoStack: previousRedoStack,
        })
      }
      throw recordError(error, 'start-game')
    }
  }

  function scheduleGameStateSync(): void {
    if (
      isApplyingRemoteState
      || !isMultiplayer.value
      || !roomCode.value
      || roomData.value?.status !== 'playing'
      || !baselineGameState
      || !isConnected.value
    ) {
      return
    }
    if (syncTimer !== null) return
    syncTimer = setTimeout(() => {
      syncTimer = null
      void flushGameStateSync()
    }, MULTIPLAYER_SYNC_INTERVAL_MS)
  }

  async function flushGameStateSync(): Promise<void> {
    if (syncTimer !== null) {
      clearTimeout(syncTimer)
      syncTimer = null
    }
    if (syncInFlight) {
      syncRequestedWhileBusy = true
      return
    }
    if (
      !roomCode.value
      || roomData.value?.status !== 'playing'
      || !baselineGameState
      || !isConnected.value
    ) {
      return
    }

    const activeRoomCode = roomCode.value
    const activeSessionGeneration = sessionGeneration
    const currentState = currentLocalSnapshot()
    if (!currentState || currentState.id !== baselineGameState.id) return
    const patch = buildGameStatePatch(baselineGameState, currentState)
    if (!patch) return

    syncInFlight = true
    try {
      const committedState = await withRemoteOperationTimeout(
        commitGameStatePatch(activeRoomCode, patch),
        'sync-game-state',
      )
      if (
        activeSessionGeneration !== sessionGeneration
        || roomCode.value !== activeRoomCode
        || !isMultiplayer.value
      ) {
        return
      }
      reconcileRemoteGameState(committedState)
      if (errorState.value?.operation === 'sync-game-state') errorState.value = null
    } catch (error) {
      if (activeSessionGeneration !== sessionGeneration || roomCode.value !== activeRoomCode) {
        return
      }
      const serviceError = recordError(error, 'sync-game-state')
      if (
        serviceError.code === 'permission-denied'
        || serviceError.code === 'invalid-remote-data'
        || !serviceError.recoverable
      ) {
        restoreAuthoritativeBaseline()
      }
    } finally {
      if (activeSessionGeneration === sessionGeneration && roomCode.value === activeRoomCode) {
        syncInFlight = false
        if (syncRequestedWhileBusy) {
          syncRequestedWhileBusy = false
          scheduleGameStateSync()
        }
      }
    }
  }

  function pushLocalPlayerState(): void {
    scheduleGameStateSync()
  }

  function pushRemotePlayerState(_playerId: string): void {
    scheduleGameStateSync()
  }

  function pushRemotePlayerIfNeeded(_action: { type: string; playerId: string }): void {
    scheduleGameStateSync()
  }

  function syncAfterAction(): void {
    scheduleGameStateSync()
  }

  function syncTurnAdvance(): void {
    scheduleGameStateSync()
  }

  async function pushFullGameState(): Promise<void> {
    await flushGameStateSync()
  }

  async function pushTurnAdvance(): Promise<void> {
    await flushGameStateSync()
  }

  async function finishGame(): Promise<void> {
    if (!roomCode.value || !isHost.value) {
      throw recordError({ code: 'host-only' }, 'finish-game')
    }
    try {
      await flushGameStateSync()
      await withRemoteOperationTimeout(
        finishRoomGame(roomCode.value),
        'finish-game',
      )
    } catch (error) {
      throw recordError(error, 'finish-game')
    }
  }

  async function disconnect(): Promise<void> {
    if (connectionState.value === 'closing') return
    if (!isMultiplayer.value && (pendingJoinRequest.value || connectionState.value === 'waiting-approval')) {
      await cancelPendingJoin()
      return
    }
    const activeCode = roomCode.value
    const activePlayerIds = [...localPlayerIds.value]
    const hadRemoteGame = baselineGameState !== null || roomData.value?.gameState !== null
    connectionState.value = 'closing'
    cancelScheduledSync()
    stopRealtimeSubscriptions()

    let disconnectError: MultiplayerServiceError | null = null
    if (activeCode) {
      try {
        await withRemoteOperationTimeout(
          leaveRoom(activeCode, activePlayerIds),
          'leave-room',
        )
      } catch (error) {
        const mappedError = toMultiplayerServiceError(error, 'leave-room')
        if (!['room-not-found', 'room-closed', 'room-expired', 'session-expired'].includes(mappedError.code)) {
          disconnectError = recordError(mappedError, 'leave-room')
        }
      }
    }

    if (disconnectError?.recoverable) {
      throw disconnectError
    }

    resetLocalSession({
      preserveError: disconnectError !== null,
      preserveConnectionState: disconnectError !== null,
      clearRemoteGame: hadRemoteGame,
    })
    if (disconnectError) throw disconnectError
  }

  const gameStore = useGameStore()
  const stopGameSyncWatch = watch(
    () => gameStore.currentGame,
    () => scheduleGameStateSync(),
    { deep: true, flush: 'sync' },
  )

  onScopeDispose(() => {
    stopGameSyncWatch()
    stopRealtimeSubscriptions()
    stopJoinRequestSubscription()
    cancelScheduledSync()
    appLifecycleCleanup?.()
    appLifecycleCleanup = null
  })

  return {
    isMultiplayer,
    roomCode,
    localPlayerIds,
    isHost,
    roomData,
    pendingJoinRequest,
    connectionState,
    errorState,
    connectionError,
    isConnecting,
    isAwaitingApproval,
    isConnected,
    isInitialized,
    connectedPlayerCount,
    allPlayers,
    pendingJoinRequests,
    isRoomReady,
    roomStatus,
    gameStarted,
    gameFinished,
    availableSlots,
    isLocalPlayer,
    clearError,
    initialize,
    restoreSession,
    retryConnection,
    hostRoom,
    joinExistingRoom,
    approveAdmission,
    rejectAdmission,
    cancelPendingJoin,
    startGame,
    finishGame,
    pushLocalPlayerState,
    pushRemotePlayerState,
    pushRemotePlayerIfNeeded,
    pushFullGameState,
    pushTurnAdvance,
    syncAfterAction,
    syncTurnAdvance,
    createMultiplayerGame,
    disconnect,
  }
})
