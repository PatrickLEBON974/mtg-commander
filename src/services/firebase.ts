import {
  FirebaseError,
  getApps,
  initializeApp,
  type FirebaseApp,
} from 'firebase/app'
import {
  CustomProvider,
  getToken as getAppCheckToken,
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from 'firebase/app-check'
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  signInAnonymously,
  type Auth,
  type User,
} from 'firebase/auth'
import {
  getDatabase,
  get,
  increment,
  onDisconnect,
  onValue,
  ref as dbRef,
  serverTimestamp,
  update,
  type Database,
  type OnDisconnect,
} from 'firebase/database'
import { Capacitor } from '@capacitor/core'
import {
  MAX_ROOM_CODE_ATTEMPTS,
  MAX_ROOM_JOIN_ATTEMPTS,
  MAX_ROOM_JOIN_REQUESTS,
  MULTIPLAYER_SCHEMA_VERSION,
  PLAYER_COLORS,
  PLAYER_NAME_MAX_LENGTH,
  ROOM_CODE_LENGTH,
  ROOM_TTL_MS,
} from '@/config/gameConstants'
import type {
  MultiplayerErrorCode,
  MultiplayerGameSettings,
  RoomData,
  RoomJoinRequest,
  RoomMember,
  RoomPlayer,
  SyncedCommander,
  SyncedGameState,
  SyncedGameStatePatch,
  SyncedPlayerState,
} from '@/types/multiplayer'
import type { ChessClockState, GamePhase, PlayerColor, TimerMode } from '@/types/game'

export type Unsubscribe = () => void

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
}

const REQUIRED_FIREBASE_CONFIG_KEYS = [
  'apiKey',
  'authDomain',
  'databaseURL',
  'projectId',
  'appId',
] as const

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const ROOM_CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`)
const PLAYER_ID_PATTERN = /^[a-zA-Z0-9_-]{1,50}$/
const ROOM_PLAYER_ID_PATTERN = /^p[0-5]$/
const FIREBASE_UID_PATTERN = /^[a-zA-Z0-9:_-]{1,128}$/
const CONTROL_CHARACTER_PATTERN = /\p{Cc}/u
const MAX_LOCAL_PLAYERS = 3
const MAX_COUNTER_VALUE = 999
const MAX_LIFE_TOTAL = 9999
const MIN_LIFE_TOTAL = -999
const MAX_COMMANDERS = 10
const MAX_COMMANDER_DAMAGE_ENTRIES = MAX_COMMANDERS * PLAYER_COLORS.length
const MAX_CARD_NAME_LENGTH = 200
const MAX_GAME_DURATION_MS = 7 * 24 * 60 * 60 * 1000
const APP_CHECK_TOKEN_TIMEOUT_MS = 15_000

const VALID_PLAYER_COLORS = new Set<string>(PLAYER_COLORS)
const VALID_GAME_PHASES = new Set<GamePhase>(['seating', 'initiative', 'playing'])
const VALID_TIMER_MODES = new Set<TimerMode>(['elapsed', 'turn', 'chess'])
const MULTIPLAYER_ERROR_CODES = new Set<MultiplayerErrorCode>([
  'not-configured',
  'authentication-failed',
  'app-check-failed',
  'invalid-room-code',
  'invalid-player-name',
  'invalid-settings',
  'room-not-found',
  'room-expired',
  'room-full',
  'room-already-started',
  'room-closed',
  'join-rejected',
  'not-room-member',
  'host-only',
  'permission-denied',
  'network-unavailable',
  'session-expired',
  'invalid-remote-data',
  'conflict',
  'unknown',
])

let firebaseApp: FirebaseApp | null = null
let database: Database | null = null
let auth: Auth | null = null
let initializationPromise: Promise<{ database: Database; user: User }> | null = null
let appCheckInitializationPromise: Promise<void> | null = null
let appCheckInstance: AppCheck | null = null
let nativeAppCheckInitialized = false

export class MultiplayerServiceError extends Error {
  readonly code: MultiplayerErrorCode
  readonly recoverable: boolean
  readonly operation?: string
  readonly cause?: unknown

  constructor(
    code: MultiplayerErrorCode,
    options: { recoverable?: boolean; operation?: string; cause?: unknown } = {},
  ) {
    super(code)
    this.name = 'MultiplayerServiceError'
    this.code = code
    this.recoverable = options.recoverable ?? false
    this.operation = options.operation
    this.cause = options.cause
  }
}

function serviceError(
  code: MultiplayerErrorCode,
  operation?: string,
  recoverable = false,
  cause?: unknown,
): MultiplayerServiceError {
  return new MultiplayerServiceError(code, { operation, recoverable, cause })
}

async function withAppCheckTimeout<T>(promise: Promise<T>, operation: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(serviceError('app-check-failed', operation))
    }, APP_CHECK_TOKEN_TIMEOUT_MS)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId)
  }
}

function getOrInitializeAppCheck(app: FirebaseApp, provider: CustomProvider | ReCaptchaEnterpriseProvider): AppCheck {
  if (appCheckInstance) return appCheckInstance
  const initializedAppCheck = initializeAppCheck(app, {
    provider,
    isTokenAutoRefreshEnabled: true,
  })
  appCheckInstance = initializedAppCheck
  return initializedAppCheck
}

export function toMultiplayerServiceError(
  error: unknown,
  operation?: string,
  fallbackCode: MultiplayerErrorCode = 'unknown',
): MultiplayerServiceError {
  if (error instanceof MultiplayerServiceError) return error

  const firebaseCode = error instanceof FirebaseError
    ? error.code
    : typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : ''

  if (MULTIPLAYER_ERROR_CODES.has(firebaseCode as MultiplayerErrorCode)) {
    const code = firebaseCode as MultiplayerErrorCode
    return serviceError(
      code,
      operation,
      code === 'network-unavailable' || code === 'conflict' || code === 'unknown',
      error,
    )
  }

  if (firebaseCode.includes('permission-denied') || firebaseCode === 'PERMISSION_DENIED') {
    return serviceError('permission-denied', operation, false, error)
  }
  if (
    firebaseCode.includes('network-request-failed')
    || firebaseCode.includes('disconnected')
    || firebaseCode.includes('network-error')
    || firebaseCode === 'NETWORK_ERROR'
  ) {
    return serviceError('network-unavailable', operation, true, error)
  }
  if (
    firebaseCode.includes('operation-not-allowed')
    || firebaseCode.includes('invalid-api-key')
    || firebaseCode.includes('app-not-authorized')
  ) {
    return serviceError('authentication-failed', operation, false, error)
  }
  if (firebaseCode.includes('app-check') || firebaseCode.includes('recaptcha')) {
    return serviceError('app-check-failed', operation, false, error)
  }

  return serviceError(fallbackCode, operation, fallbackCode === 'unknown', error)
}

async function initializeAppCheckProtection(app: FirebaseApp): Promise<void> {
  if (appCheckInitializationPromise) return appCheckInitializationPromise

  appCheckInitializationPromise = (async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const { FirebaseAppCheck } = await import('@capacitor-firebase/app-check')
        const useNativeDebugProvider = import.meta.env.DEV
          || (import.meta.env.VITE_FIREBASE_APPCHECK_NATIVE_DEBUG ?? '').trim() === 'true'
        if (!nativeAppCheckInitialized) {
          await FirebaseAppCheck.initialize({
            debugToken: useNativeDebugProvider,
            isTokenAutoRefreshEnabled: true,
          })
          nativeAppCheckInitialized = true
        }
        const getNativeToken = async () => {
          const result = await withAppCheckTimeout(
            FirebaseAppCheck.getToken({ forceRefresh: false }),
            'get-native-app-check-token',
          )
          if (!result.token || !result.expireTimeMillis || result.expireTimeMillis <= Date.now()) {
            throw serviceError('app-check-failed', 'get-native-app-check-token')
          }
          return {
            token: result.token,
            expireTimeMillis: result.expireTimeMillis,
          }
        }
        await getNativeToken()
        const provider = new CustomProvider({
          getToken: getNativeToken,
        })
        getOrInitializeAppCheck(app, provider)
        return
      }

      const siteKey = (import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY ?? '').trim()
      if (!siteKey) throw serviceError('app-check-failed', 'initialize-app-check')

      const debugToken = (import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN ?? '').trim()
      if (import.meta.env.DEV && debugToken) {
        ;(globalThis as typeof globalThis & {
          FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string
        }).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken === 'true' ? true : debugToken
      }

      const activeAppCheck = getOrInitializeAppCheck(
        app,
        new ReCaptchaEnterpriseProvider(siteKey),
      )
      await withAppCheckTimeout(
        getAppCheckToken(activeAppCheck, false),
        'get-web-app-check-token',
      )
    } catch (error) {
      const firebaseCode = error instanceof FirebaseError ? error.code : ''
      if (firebaseCode === 'app-check/already-initialized') return
      throw toMultiplayerServiceError(error, 'initialize-app-check', 'app-check-failed')
    }
  })()

  try {
    await appCheckInitializationPromise
  } catch (error) {
    appCheckInitializationPromise = null
    throw error
  }
}

function assertFirebaseConfigured(): void {
  const isMissingRequiredValue = REQUIRED_FIREBASE_CONFIG_KEYS.some(
    (key) => firebaseConfig[key].trim().length === 0,
  )
  if (isMissingRequiredValue) {
    throw serviceError('not-configured', 'initialize')
  }
}

async function initializeFirebase(): Promise<{ database: Database; user: User }> {
  if (database && auth?.currentUser) {
    return { database, user: auth.currentUser }
  }
  if (initializationPromise) return initializationPromise

  initializationPromise = (async () => {
    assertFirebaseConfigured()

    try {
      firebaseApp = getApps().find((app) => app.name === '[DEFAULT]')
        ?? initializeApp(firebaseConfig)
      await initializeAppCheckProtection(firebaseApp)
      auth = getAuth(firebaseApp)
      await setPersistence(auth, browserLocalPersistence)
      await auth.authStateReady()

      const user = auth.currentUser ?? (await signInAnonymously(auth)).user
      assertFirebaseUid(user.uid)
      database = getDatabase(firebaseApp)
      return { database, user }
    } catch (error) {
      database = null
      auth = null
      throw toMultiplayerServiceError(error, 'initialize', 'authentication-failed')
    }
  })()

  try {
    return await initializationPromise
  } finally {
    initializationPromise = null
  }
}

async function getContext(): Promise<{ database: Database; user: User }> {
  return initializeFirebase()
}

export async function getAuthenticatedUid(): Promise<string> {
  return (await getContext()).user.uid
}

export function normalizeRoomCode(code: string): string {
  const normalizedCode = code.trim().toUpperCase()
  if (!ROOM_CODE_PATTERN.test(normalizedCode)) {
    throw serviceError('invalid-room-code', 'validate-room-code')
  }
  return normalizedCode
}

function assertRoomPlayerId(playerId: string): void {
  if (!ROOM_PLAYER_ID_PATTERN.test(playerId)) {
    throw serviceError('invalid-remote-data', 'validate-player-id')
  }
}

function assertFirebaseUid(uid: string): void {
  if (!FIREBASE_UID_PATTERN.test(uid)) {
    throw serviceError('invalid-remote-data', 'validate-user-id')
  }
}

export function normalizePlayerNames(playerNames: string[]): string[] {
  if (!Array.isArray(playerNames) || playerNames.length < 1 || playerNames.length > MAX_LOCAL_PLAYERS) {
    throw serviceError('invalid-player-name', 'validate-player-names')
  }

  return playerNames.map((rawName) => {
    if (typeof rawName !== 'string' || CONTROL_CHARACTER_PATTERN.test(rawName)) {
      throw serviceError('invalid-player-name', 'validate-player-names')
    }
    const name = rawName.trim().replace(/\s+/g, ' ')
    if (
      name.length < 1
      || name.length > PLAYER_NAME_MAX_LENGTH
      || CONTROL_CHARACTER_PATTERN.test(name)
    ) {
      throw serviceError('invalid-player-name', 'validate-player-names')
    }
    return name
  })
}

function isIntegerBetween(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum
}

function isFiniteBetween(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
}

export function validateMultiplayerSettings(
  settings: MultiplayerGameSettings,
  localPlayerCount = 1,
): MultiplayerGameSettings {
  const isValid =
    isIntegerBetween(settings.startingLife, 1, 999)
    && isIntegerBetween(settings.commanderDamageThreshold, 1, 99)
    && isIntegerBetween(settings.poisonThreshold, 1, 99)
    && isIntegerBetween(settings.playerCount, 2, PLAYER_COLORS.length)
    && settings.playerCount >= localPlayerCount
    && typeof settings.enableTimer === 'boolean'
    && VALID_TIMER_MODES.has(settings.timerMode)
    && isIntegerBetween(settings.turnTimerSeconds, 10, 3600)
    && isIntegerBetween(settings.chessGameDurationMinutes, 15, 720)
    && isIntegerBetween(settings.chessExpectedRounds, 4, 30)
    && typeof settings.hourglassEnabled === 'boolean'
    && (settings.hourglassMode === 'fixed' || settings.hourglassMode === 'time_bank')
    && isIntegerBetween(settings.hourglassGracePeriodSeconds, 0, 3600)
    && isIntegerBetween(settings.hourglassLossThreshold, 1, 99)
    && typeof settings.hourglassTimeBankCapEnabled === 'boolean'
    && isIntegerBetween(settings.hourglassTimeBankCapSeconds, 0, 86_400)

  if (!isValid) {
    throw serviceError('invalid-settings', 'validate-settings')
  }

  return structuredClone(settings)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function clampInteger(value: unknown, fallback: number, minimum: number, maximum: number): number {
  if (!isFiniteBetween(value, minimum, maximum)) return fallback
  return Math.round(value)
}

function sanitizeString(value: unknown, maximumLength: number): string | null {
  if (typeof value !== 'string' || value.length < 1 || value.length > maximumLength) return null
  if (CONTROL_CHARACTER_PATTERN.test(value)) return null
  return value
}

function sanitizeImageUri(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2048) return undefined
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' ? parsed.toString() : undefined
  } catch {
    return undefined
  }
}

function sanitizeCommander(value: unknown): SyncedCommander | null {
  const commander = asRecord(value)
  if (!commander) return null
  const id = sanitizeString(commander.id, 50)
  const cardName = sanitizeString(commander.cardName, MAX_CARD_NAME_LENGTH)
  if (!id || !PLAYER_ID_PATTERN.test(id) || !cardName) return null

  const sanitized: SyncedCommander = {
    id,
    cardName,
    castCount: clampInteger(commander.castCount, 0, 0, MAX_COUNTER_VALUE),
  }
  const imageUri = sanitizeImageUri(commander.imageUri)
  if (imageUri) sanitized.imageUri = imageUri
  return sanitized
}

function sanitizeNumberRecord(
  value: unknown,
  validKeys: Set<string>,
  maximumValue: number,
): Record<string, number> {
  const rawRecord = asRecord(value)
  if (!rawRecord) return {}
  const sanitized: Record<string, number> = {}
  for (const key of validKeys) {
    const rawValue = rawRecord[key]
    if (!isFiniteBetween(rawValue, 0, maximumValue)) continue
    sanitized[key] = Math.round(rawValue)
  }
  return sanitized
}

function sanitizeSyncedPlayerState(value: unknown): SyncedPlayerState | null {
  const player = asRecord(value)
  if (!player) return null
  const name = sanitizeString(player.name, PLAYER_NAME_MAX_LENGTH)
  const color = typeof player.color === 'string' && VALID_PLAYER_COLORS.has(player.color)
    ? player.color as PlayerColor
    : null
  if (!name || !color) return null

  const rawDamage = asRecord(player.commanderDamageReceived)
  const commanderDamageReceived: Record<string, number> = {}
  if (rawDamage) {
    for (const [sourceId, rawDamageValue] of Object.entries(rawDamage).slice(0, MAX_COMMANDER_DAMAGE_ENTRIES)) {
      if (!PLAYER_ID_PATTERN.test(sourceId)) continue
      if (!isFiniteBetween(rawDamageValue, 0, MAX_COUNTER_VALUE)) continue
      commanderDamageReceived[sourceId] = Math.round(rawDamageValue)
    }
  }

  const commanders = Array.isArray(player.commanders)
    ? player.commanders
        .slice(0, MAX_COMMANDERS)
        .map(sanitizeCommander)
        .filter((commander): commander is SyncedCommander => commander !== null)
    : []

  return {
    name,
    color,
    lifeTotal: clampInteger(player.lifeTotal, 40, MIN_LIFE_TOTAL, MAX_LIFE_TOTAL),
    commanderDamageReceived,
    poisonCounters: clampInteger(player.poisonCounters, 0, 0, MAX_COUNTER_VALUE),
    experienceCounters: clampInteger(player.experienceCounters, 0, 0, MAX_COUNTER_VALUE),
    energyCounters: clampInteger(player.energyCounters, 0, 0, MAX_COUNTER_VALUE),
    isMonarch: player.isMonarch === true,
    hasInitiative: player.hasInitiative === true,
    cityBlessing: player.cityBlessing === true,
    ringLevel: clampInteger(player.ringLevel, 0, 0, 4),
    radCounters: clampInteger(player.radCounters, 0, 0, MAX_COUNTER_VALUE),
    hourglassTokens: clampInteger(player.hourglassTokens, 0, 0, MAX_COUNTER_VALUE),
    commanders,
  }
}

function sanitizeChessClock(value: unknown): ChessClockState | null {
  if (value === null || value === undefined) return null
  const clock = asRecord(value)
  if (!clock) return null
  if (
    !isFiniteBetween(clock.totalGameDurationMs, 1, MAX_GAME_DURATION_MS)
    || !isFiniteBetween(clock.playerBudgetMs, 1, MAX_GAME_DURATION_MS)
    || !isFiniteBetween(clock.theoreticalTurnMs, 1, MAX_GAME_DURATION_MS)
    || !isIntegerBetween(clock.expectedRounds, 1, 100)
  ) {
    return null
  }
  return {
    totalGameDurationMs: Math.round(clock.totalGameDurationMs),
    playerBudgetMs: Math.round(clock.playerBudgetMs),
    theoreticalTurnMs: Math.round(clock.theoreticalTurnMs),
    expectedRounds: clock.expectedRounds,
  }
}

export function sanitizeGameState(value: unknown): SyncedGameState {
  const gameState = asRecord(value)
  if (!gameState || gameState.schemaVersion !== MULTIPLAYER_SCHEMA_VERSION) {
    throw serviceError('invalid-remote-data', 'sanitize-game-state')
  }

  const id = sanitizeString(gameState.id, 50)
  const updatedBy = sanitizeString(gameState.updatedBy, 128)
  if (!id || !PLAYER_ID_PATTERN.test(id) || !updatedBy || !FIREBASE_UID_PATTERN.test(updatedBy)) {
    throw serviceError('invalid-remote-data', 'sanitize-game-state')
  }

  const rawPlayers = asRecord(gameState.players)
  if (!rawPlayers) throw serviceError('invalid-remote-data', 'sanitize-game-state')
  const rawPlayerEntries = Object.entries(rawPlayers)
  if (
    rawPlayerEntries.length < 2
    || rawPlayerEntries.length > PLAYER_COLORS.length
    || rawPlayerEntries.some(([playerId]) => !ROOM_PLAYER_ID_PATTERN.test(playerId))
  ) {
    throw serviceError('invalid-remote-data', 'sanitize-game-state')
  }
  const players: Record<string, SyncedPlayerState> = {}
  for (const [playerId, rawPlayer] of rawPlayerEntries) {
    const player = sanitizeSyncedPlayerState(rawPlayer)
    if (player) players[playerId] = player
  }
  if (
    Object.values(players).filter((player) => player.isMonarch).length > 1
    || Object.values(players).filter((player) => player.hasInitiative).length > 1
  ) {
    throw serviceError('invalid-remote-data', 'sanitize-game-state')
  }

  const validPlayerIds = new Set(Object.keys(players))
  if (!Array.isArray(gameState.playerOrder)) {
    throw serviceError('invalid-remote-data', 'sanitize-game-state')
  }
  const playerOrder = gameState.playerOrder.filter(
    (playerId): playerId is string => typeof playerId === 'string' && validPlayerIds.has(playerId),
  )
  if (
    playerOrder.length < 2
    || playerOrder.length !== gameState.playerOrder.length
    || playerOrder.length !== validPlayerIds.size
    || new Set(playerOrder).size !== playerOrder.length
  ) {
    throw serviceError('invalid-remote-data', 'sanitize-game-state')
  }

  const currentTurnPlayerId = typeof gameState.currentTurnPlayerId === 'string'
    && validPlayerIds.has(gameState.currentTurnPlayerId)
    ? gameState.currentTurnPlayerId
    : null
  const priorityPlayerId = typeof gameState.priorityPlayerId === 'string'
    && validPlayerIds.has(gameState.priorityPlayerId)
    ? gameState.priorityPlayerId
    : null
  const gamePhase = typeof gameState.gamePhase === 'string' && VALID_GAME_PHASES.has(gameState.gamePhase as GamePhase)
    ? gameState.gamePhase as GamePhase
    : 'playing'
  const dayNightState = gameState.dayNightState === 'day' || gameState.dayNightState === 'night'
    ? gameState.dayNightState
    : null

  return {
    schemaVersion: MULTIPLAYER_SCHEMA_VERSION,
    revision: clampInteger(gameState.revision, 1, 1, Number.MAX_SAFE_INTEGER),
    updatedAt: clampInteger(gameState.updatedAt, Date.now(), 0, Number.MAX_SAFE_INTEGER),
    updatedBy,
    id,
    playerOrder,
    currentTurnPlayerId: currentTurnPlayerId ?? playerOrder[0] ?? null,
    turnNumber: clampInteger(gameState.turnNumber, 1, 1, 100_000),
    startedAt: clampInteger(gameState.startedAt, Date.now(), 0, Number.MAX_SAFE_INTEGER),
    elapsedMs: clampInteger(gameState.elapsedMs, 0, 0, MAX_GAME_DURATION_MS),
    isRunning: gameState.isRunning === true,
    playerPlayTimeMs: sanitizeNumberRecord(gameState.playerPlayTimeMs, validPlayerIds, MAX_GAME_DURATION_MS),
    playerRoundTimeMs: sanitizeNumberRecord(gameState.playerRoundTimeMs, validPlayerIds, MAX_GAME_DURATION_MS),
    priorityPlayerId,
    gamePhase,
    dayNightState,
    hourglassTimeBankRemainingMs: sanitizeNumberRecord(
      gameState.hourglassTimeBankRemainingMs,
      validPlayerIds,
      MAX_GAME_DURATION_MS,
    ),
    chessClock: sanitizeChessClock(gameState.chessClock),
    players,
  }
}

function sanitizeSettings(value: unknown): MultiplayerGameSettings {
  const settings = asRecord(value)
  if (!settings) throw serviceError('invalid-remote-data', 'sanitize-settings')
  return validateMultiplayerSettings({
    startingLife: Number(settings.startingLife),
    commanderDamageThreshold: Number(settings.commanderDamageThreshold),
    poisonThreshold: Number(settings.poisonThreshold),
    playerCount: Number(settings.playerCount),
    enableTimer: settings.enableTimer === true,
    timerMode: settings.timerMode as TimerMode,
    turnTimerSeconds: Number(settings.turnTimerSeconds),
    chessGameDurationMinutes: Number(settings.chessGameDurationMinutes),
    chessExpectedRounds: Number(settings.chessExpectedRounds),
    hourglassEnabled: settings.hourglassEnabled === true,
    hourglassMode: settings.hourglassMode as 'fixed' | 'time_bank',
    hourglassGracePeriodSeconds: Number(settings.hourglassGracePeriodSeconds),
    hourglassLossThreshold: Number(settings.hourglassLossThreshold),
    hourglassTimeBankCapEnabled: settings.hourglassTimeBankCapEnabled === true,
    hourglassTimeBankCapSeconds: Number(settings.hourglassTimeBankCapSeconds),
  })
}

function sanitizeMember(uid: string, value: unknown): RoomMember | null {
  const member = asRecord(value)
  if (!member || !FIREBASE_UID_PATTERN.test(uid) || member.uid !== uid) return null
  return {
    uid,
    connected: member.connected === true,
    joinedAt: clampInteger(member.joinedAt, 0, 0, Number.MAX_SAFE_INTEGER),
    lastSeenAt: clampInteger(member.lastSeenAt, 0, 0, Number.MAX_SAFE_INTEGER),
  }
}

function sanitizeRoomPlayer(playerId: string, value: unknown): RoomPlayer | null {
  const player = asRecord(value)
  if (!player || !ROOM_PLAYER_ID_PATTERN.test(playerId) || player.id !== playerId) return null
  const ownerUid = sanitizeString(player.ownerUid, 128)
  const name = sanitizeString(player.name, PLAYER_NAME_MAX_LENGTH)
  const color = typeof player.color === 'string' && VALID_PLAYER_COLORS.has(player.color)
    ? player.color as PlayerColor
    : null
  if (!ownerUid || !FIREBASE_UID_PATTERN.test(ownerUid) || !name || !color) return null
  const seat = Number(playerId.slice(1))
  if (player.seat !== seat) return null
  return {
    id: playerId,
    ownerUid,
    name,
    color,
    seat,
    connected: player.connected === true,
    joinedAt: clampInteger(player.joinedAt, 0, 0, Number.MAX_SAFE_INTEGER),
  }
}

function sanitizeJoinRequest(uid: string, value: unknown): RoomJoinRequest | null {
  const request = asRecord(value)
  if (!request || !FIREBASE_UID_PATTERN.test(uid) || request.uid !== uid) return null

  const rawNames = request.playerNames
  let playerNames: string[]
  try {
    if (Array.isArray(rawNames)) {
      playerNames = normalizePlayerNames(rawNames)
    } else {
      const namesRecord = asRecord(rawNames)
      if (!namesRecord) return null
      const keys = Object.keys(namesRecord).sort()
      if (
        keys.length < 1
        || keys.length > MAX_LOCAL_PLAYERS
        || keys.some((key, index) => key !== String(index))
      ) {
        return null
      }
      playerNames = normalizePlayerNames(keys.map((key) => String(namesRecord[key] ?? '')))
    }
  } catch {
    return null
  }

  const requestedAt = clampInteger(request.requestedAt, -1, 0, Number.MAX_SAFE_INTEGER)
  if (requestedAt < 0) return null
  if (request.status === 'pending') {
    return { uid, playerNames, requestedAt, status: 'pending' }
  }
  if (request.status !== 'approved' && request.status !== 'rejected') return null
  const resolvedAt = clampInteger(request.resolvedAt, -1, requestedAt, Number.MAX_SAFE_INTEGER)
  if (resolvedAt < requestedAt) return null
  return {
    uid,
    playerNames,
    requestedAt,
    status: request.status,
    resolvedAt,
  }
}

export function sanitizeRoomData(value: unknown, expectedCode?: string): RoomData {
  const room = asRecord(value)
  if (!room || room.schemaVersion !== MULTIPLAYER_SCHEMA_VERSION) {
    throw serviceError('invalid-remote-data', 'sanitize-room')
  }
  const code = normalizeRoomCode(String(room.code ?? ''))
  if (expectedCode && code !== expectedCode) {
    throw serviceError('invalid-remote-data', 'sanitize-room')
  }
  const hostUid = sanitizeString(room.hostUid, 128)
  if (!hostUid || !FIREBASE_UID_PATTERN.test(hostUid)) {
    throw serviceError('invalid-remote-data', 'sanitize-room')
  }
  const settings = sanitizeSettings(room.settings)

  const rawMembers = asRecord(room.members) ?? {}
  if (Object.keys(rawMembers).length > PLAYER_COLORS.length) {
    throw serviceError('invalid-remote-data', 'sanitize-room')
  }
  const members: Record<string, RoomMember> = {}
  for (const [uid, rawMember] of Object.entries(rawMembers).slice(0, PLAYER_COLORS.length)) {
    const member = sanitizeMember(uid, rawMember)
    if (member) members[uid] = member
  }

  const rawPlayers = asRecord(room.players) ?? {}
  if (Object.keys(rawPlayers).length > PLAYER_COLORS.length) {
    throw serviceError('invalid-remote-data', 'sanitize-room')
  }
  const players: Record<string, RoomPlayer> = {}
  for (const [playerId, rawPlayer] of Object.entries(rawPlayers).slice(0, PLAYER_COLORS.length)) {
    const player = sanitizeRoomPlayer(playerId, rawPlayer)
    if (player) players[playerId] = player
  }
  if (
    Object.values(players).some((player) => player.seat >= settings.playerCount)
    || !Object.values(players).some((player) => player.ownerUid === hostUid)
  ) {
    throw serviceError('invalid-remote-data', 'sanitize-room')
  }

  const rawJoinRequests = asRecord(room.joinRequests) ?? {}
  if (Object.keys(rawJoinRequests).length > MAX_ROOM_JOIN_REQUESTS + PLAYER_COLORS.length) {
    throw serviceError('invalid-remote-data', 'sanitize-room')
  }
  const joinRequestCount = clampInteger(
    room.joinRequestCount,
    -1,
    0,
    MAX_ROOM_JOIN_REQUESTS,
  )
  if (joinRequestCount < 0) {
    throw serviceError('invalid-remote-data', 'sanitize-room')
  }
  const joinRequests: Record<string, RoomJoinRequest> = {}
  for (const [uid, rawRequest] of Object.entries(rawJoinRequests)) {
    const request = sanitizeJoinRequest(uid, rawRequest)
    if (!request) throw serviceError('invalid-remote-data', 'sanitize-room')
    joinRequests[uid] = request
  }
  const pendingJoinRequestCount = Object.values(joinRequests)
    .filter((request) => request.status === 'pending')
    .length
  if (pendingJoinRequestCount !== joinRequestCount) {
    throw serviceError('invalid-remote-data', 'sanitize-room')
  }

  const status = room.status === 'lobby' || room.status === 'playing' || room.status === 'finished'
    ? room.status
    : null
  if (!status || !members[hostUid]) {
    throw serviceError('invalid-remote-data', 'sanitize-room')
  }

  const gameState = room.gameState === null || room.gameState === undefined
    ? null
    : sanitizeGameState(room.gameState)
  if (
    (status === 'lobby' && gameState)
    || ((status === 'playing' || status === 'finished') && !gameState)
    || (status === 'finished' && gameState?.isRunning)
  ) {
    throw serviceError('invalid-remote-data', 'sanitize-room')
  }
  if (gameState) {
    const roomPlayerIds = Object.keys(players).sort()
    const gamePlayerIds = Object.keys(gameState.players).sort()
    if (
      roomPlayerIds.length !== gamePlayerIds.length
      || roomPlayerIds.some((playerId, index) => playerId !== gamePlayerIds[index])
    ) {
      throw serviceError('invalid-remote-data', 'sanitize-room')
    }
  }

  const finishedAt = isFiniteBetween(room.finishedAt, 0, Number.MAX_SAFE_INTEGER)
    ? Math.round(room.finishedAt)
    : null
  const hasValidFinishedAt = finishedAt !== null
  if ((status === 'finished') !== hasValidFinishedAt) {
    throw serviceError('invalid-remote-data', 'sanitize-room')
  }

  const sanitized: RoomData = {
    schemaVersion: MULTIPLAYER_SCHEMA_VERSION,
    code,
    hostUid,
    createdAt: clampInteger(room.createdAt, 0, 0, Number.MAX_SAFE_INTEGER),
    updatedAt: clampInteger(room.updatedAt, 0, 0, Number.MAX_SAFE_INTEGER),
    expiresAt: clampInteger(room.expiresAt, 0, 0, Number.MAX_SAFE_INTEGER),
    status,
    settings,
    members,
    players,
    joinRequestCount,
    joinRequests,
    gameState,
  }
  if (hasValidFinishedAt) {
    sanitized.finishedAt = finishedAt
  }
  return sanitized
}

function isRoomExpired(room: RoomData): boolean {
  return Date.now() >= room.expiresAt
}

function generateRoomCode(): string {
  const alphabetLength = ROOM_CODE_ALPHABET.length
  const unbiasedUpperBound = Math.floor(256 / alphabetLength) * alphabetLength
  let code = ''

  while (code.length < ROOM_CODE_LENGTH) {
    const randomValues = crypto.getRandomValues(
      new Uint8Array((ROOM_CODE_LENGTH - code.length) * 2),
    )
    for (const randomValue of randomValues) {
      if (randomValue >= unbiasedUpperBound) continue
      code += ROOM_CODE_ALPHABET[randomValue % alphabetLength]
      if (code.length === ROOM_CODE_LENGTH) break
    }
  }

  return code
}

function createRoomPlayers(
  uid: string,
  playerNames: string[],
  seatIndices: number[],
): Record<string, RoomPlayer> {
  const players: Record<string, RoomPlayer> = {}
  const now = Date.now()
  for (let index = 0; index < playerNames.length; index++) {
    const seat = seatIndices[index]
    if (seat === undefined || seat < 0 || seat >= PLAYER_COLORS.length) {
      throw serviceError('room-full', 'allocate-player-seats')
    }
    const playerId = `p${seat}`
    players[playerId] = {
      id: playerId,
      ownerUid: uid,
      name: playerNames[index]!,
      color: PLAYER_COLORS[seat % PLAYER_COLORS.length]!,
      seat,
      connected: false,
      joinedAt: now,
    }
  }
  return players
}

export async function createRoom(
  playerNames: string[],
  requestedSettings: MultiplayerGameSettings,
): Promise<{ roomData: RoomData; playerIds: string[] }> {
  const names = normalizePlayerNames(playerNames)
  const settings = validateMultiplayerSettings(requestedSettings, names.length)
  const { database: activeDatabase, user } = await getContext()
  assertFirebaseUid(user.uid)

  for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt++) {
    const code = generateRoomCode()
    const now = Date.now()
    const players = createRoomPlayers(
      user.uid,
      names,
      names.map((_, index) => index),
    )
    const member: RoomMember = {
      uid: user.uid,
      connected: false,
      joinedAt: now,
      lastSeenAt: now,
    }
    const roomData: RoomData = {
      schemaVersion: MULTIPLAYER_SCHEMA_VERSION,
      code,
      hostUid: user.uid,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + ROOM_TTL_MS,
      status: 'lobby',
      settings,
      members: { [user.uid]: member },
      players,
      joinRequestCount: 0,
      joinRequests: {},
      gameState: null,
    }
    try {
      await update(dbRef(activeDatabase), { [`rooms/${code}`]: roomData })
      return {
        roomData,
        playerIds: Object.keys(players),
      }
    } catch (error) {
      const mappedError = toMultiplayerServiceError(error, 'create-room')
      if (mappedError.code === 'conflict' || mappedError.code === 'permission-denied') continue
      throw mappedError
    }
  }

  throw serviceError('conflict', 'create-room', true)
}

async function readRoom(
  code: string,
  operation: string,
  permissionFallback?: MultiplayerErrorCode,
): Promise<RoomData> {
  const normalizedCode = normalizeRoomCode(code)
  const { database: activeDatabase } = await getContext()
  try {
    const snapshot = await get(dbRef(activeDatabase, `rooms/${normalizedCode}`))
    if (!snapshot.exists()) throw serviceError('room-not-found', operation)
    return sanitizeRoomData(snapshot.val(), normalizedCode)
  } catch (error) {
    if (error instanceof MultiplayerServiceError) throw error
    const mappedError = toMultiplayerServiceError(error, operation)
    if (mappedError.code === 'permission-denied' && permissionFallback) {
      throw serviceError(permissionFallback, operation)
    }
    throw mappedError
  }
}

export async function restoreRoomSession(
  code: string,
): Promise<{ roomData: RoomData; playerIds: string[] }> {
  const normalizedCode = normalizeRoomCode(code)
  const { user } = await getContext()
  const roomData = await readRoom(normalizedCode, 'restore-session', 'session-expired')
  if (isRoomExpired(roomData)) throw serviceError('room-expired', 'restore-session')
  if (!roomData.members[user.uid]) throw serviceError('session-expired', 'restore-session')
  const playerIds = Object.values(roomData.players)
    .filter((player) => player.ownerUid === user.uid)
    .map((player) => player.id)
  if (playerIds.length === 0) throw serviceError('session-expired', 'restore-session')
  return { roomData, playerIds }
}

export async function requestRoomJoin(
  code: string,
  playerNames: string[],
): Promise<{ roomCode: string; request: RoomJoinRequest }> {
  const roomCode = normalizeRoomCode(code)
  const names = normalizePlayerNames(playerNames)
  const { database: activeDatabase, user } = await getContext()
  assertFirebaseUid(user.uid)
  const requestReference = dbRef(
    activeDatabase,
    `rooms/${roomCode}/joinRequests/${user.uid}`,
  )

  try {
    const existingSnapshot = await get(requestReference)
    if (existingSnapshot.exists()) {
      const existingRequest = sanitizeJoinRequest(user.uid, existingSnapshot.val())
      if (!existingRequest) throw serviceError('invalid-remote-data', 'request-room-join')
      if (existingRequest.status !== 'rejected') {
        return { roomCode, request: existingRequest }
      }
      await update(dbRef(activeDatabase), {
        [`rooms/${roomCode}/joinRequests/${user.uid}`]: null,
      })
    }

    const now = Date.now()
    const rawRequest = {
      uid: user.uid,
      playerNames: names,
      requestedAt: now,
      status: 'pending',
    }
    await update(dbRef(activeDatabase), {
      [`rooms/${roomCode}/joinRequests/${user.uid}`]: rawRequest,
      [`rooms/${roomCode}/joinRequestCount`]: increment(1),
    })
    return {
      roomCode,
      request: {
        uid: user.uid,
        playerNames: names,
        requestedAt: now,
        status: 'pending',
      },
    }
  } catch (error) {
    if (error instanceof MultiplayerServiceError) throw error
    const mappedError = toMultiplayerServiceError(error, 'request-room-join')
    if (mappedError.code === 'permission-denied') {
      throw serviceError('room-not-found', 'request-room-join')
    }
    throw mappedError
  }
}

export async function listenToJoinRequest(
  code: string,
  onRequest: (request: RoomJoinRequest | null) => void,
  onError: (error: MultiplayerServiceError) => void,
): Promise<Unsubscribe> {
  const normalizedCode = normalizeRoomCode(code)
  const { database: activeDatabase, user } = await getContext()
  const requestReference = dbRef(
    activeDatabase,
    `rooms/${normalizedCode}/joinRequests/${user.uid}`,
  )
  return onValue(
    requestReference,
    (snapshot) => {
      if (!snapshot.exists()) {
        onRequest(null)
        return
      }
      const request = sanitizeJoinRequest(user.uid, snapshot.val())
      if (!request) {
        onError(serviceError('invalid-remote-data', 'listen-join-request'))
        return
      }
      onRequest(request)
    },
    (error) => onError(toMultiplayerServiceError(error, 'listen-join-request')),
  )
}

export async function cancelJoinRequest(code: string): Promise<void> {
  const normalizedCode = normalizeRoomCode(code)
  const { database: activeDatabase, user } = await getContext()
  try {
    const requestSnapshot = await get(
      dbRef(activeDatabase, `rooms/${normalizedCode}/joinRequests/${user.uid}`),
    )
    if (!requestSnapshot.exists()) {
      return
    }
    const request = sanitizeJoinRequest(user.uid, requestSnapshot.val())
    if (!request) throw serviceError('invalid-remote-data', 'cancel-join-request')
    const updates: Record<string, unknown> = {
      [`rooms/${normalizedCode}/joinRequests/${user.uid}`]: null,
    }
    if (request.status === 'pending') {
      updates[`rooms/${normalizedCode}/joinRequestCount`] = increment(-1)
    }
    await update(dbRef(activeDatabase), updates)
  } catch (error) {
    const mappedError = toMultiplayerServiceError(error, 'cancel-join-request')
    if (mappedError.code !== 'permission-denied') throw mappedError
  }
}

export async function approveJoinRequest(code: string, requesterUid: string): Promise<RoomData> {
  const normalizedCode = normalizeRoomCode(code)
  assertFirebaseUid(requesterUid)
  const { database: activeDatabase, user } = await getContext()

  for (let attempt = 0; attempt < MAX_ROOM_JOIN_ATTEMPTS; attempt++) {
    const room = await readRoom(normalizedCode, 'approve-join-request')
    if (room.hostUid !== user.uid) throw serviceError('host-only', 'approve-join-request')
    if (isRoomExpired(room)) throw serviceError('room-expired', 'approve-join-request')
    if (room.status !== 'lobby') {
      throw serviceError('room-already-started', 'approve-join-request')
    }
    if (room.members[requesterUid]) return room

    const request = room.joinRequests[requesterUid]
    if (!request || request.status !== 'pending') {
      throw serviceError('conflict', 'approve-join-request', true)
    }
    const availableSeats = Array.from(
      { length: room.settings.playerCount },
      (_, seat) => seat,
    ).filter((seat) => !room.players[`p${seat}`])
    if (request.playerNames.length > availableSeats.length) {
      throw serviceError('room-full', 'approve-join-request')
    }

    const now = Date.now()
    const newPlayers = createRoomPlayers(
      requesterUid,
      request.playerNames,
      availableSeats.slice(0, request.playerNames.length),
    )
    const updates: Record<string, unknown> = {
      [`rooms/${normalizedCode}/members/${requesterUid}`]: {
        uid: requesterUid,
        connected: false,
        joinedAt: now,
        lastSeenAt: now,
      } satisfies RoomMember,
      [`rooms/${normalizedCode}/joinRequests/${requesterUid}`]: {
        uid: requesterUid,
        playerNames: request.playerNames,
        requestedAt: request.requestedAt,
        status: 'approved',
        resolvedAt: now,
      } satisfies RoomJoinRequest,
      [`rooms/${normalizedCode}/joinRequestCount`]: room.joinRequestCount - 1,
    }
    for (const [playerId, player] of Object.entries(newPlayers)) {
      updates[`rooms/${normalizedCode}/players/${playerId}`] = player
    }

    try {
      await update(dbRef(activeDatabase), updates)
      return await readRoom(normalizedCode, 'approve-join-request')
    } catch (error) {
      const mappedError = toMultiplayerServiceError(error, 'approve-join-request')
      if (mappedError.code !== 'permission-denied' && mappedError.code !== 'conflict') {
        throw mappedError
      }
      const latestRoom = await readRoom(normalizedCode, 'approve-join-request')
      if (latestRoom.members[requesterUid]) return latestRoom
    }
  }

  throw serviceError('conflict', 'approve-join-request', true)
}

export async function rejectJoinRequest(code: string, requesterUid: string): Promise<void> {
  const normalizedCode = normalizeRoomCode(code)
  assertFirebaseUid(requesterUid)
  const { database: activeDatabase, user } = await getContext()

  for (let attempt = 0; attempt < MAX_ROOM_JOIN_ATTEMPTS; attempt++) {
    const room = await readRoom(normalizedCode, 'reject-join-request')
    if (room.hostUid !== user.uid) throw serviceError('host-only', 'reject-join-request')
    const request = room.joinRequests[requesterUid]
    if (!request || request.status !== 'pending') return

    try {
      await update(dbRef(activeDatabase), {
        [`rooms/${normalizedCode}/joinRequests/${requesterUid}`]: null,
        [`rooms/${normalizedCode}/joinRequestCount`]: room.joinRequestCount - 1,
      })
      return
    } catch (error) {
      const mappedError = toMultiplayerServiceError(error, 'reject-join-request')
      if (mappedError.code !== 'permission-denied' && mappedError.code !== 'conflict') {
        throw mappedError
      }
    }
  }

  throw serviceError('conflict', 'reject-join-request', true)
}

export async function listenToRoom(
  code: string,
  onRoomData: (data: RoomData | null) => void,
  onError: (error: MultiplayerServiceError) => void,
): Promise<Unsubscribe> {
  const normalizedCode = normalizeRoomCode(code)
  const { database: activeDatabase } = await getContext()
  const roomReference = dbRef(activeDatabase, `rooms/${normalizedCode}`)

  return onValue(
    roomReference,
    (snapshot) => {
      if (!snapshot.exists()) {
        onRoomData(null)
        return
      }
      try {
        onRoomData(sanitizeRoomData(snapshot.val(), normalizedCode))
      } catch (error) {
        onError(toMultiplayerServiceError(error, 'listen-room', 'invalid-remote-data'))
      }
    },
    (error) => {
      const mappedError = toMultiplayerServiceError(error, 'listen-room')
      onError(
        mappedError.code === 'permission-denied'
          ? serviceError('room-closed', 'listen-room')
          : mappedError,
      )
    },
  )
}

async function cancelDisconnectOperations(operations: OnDisconnect[]): Promise<void> {
  await Promise.all(operations.map((operation) => operation.cancel().catch(() => undefined)))
}

export async function monitorRoomPresence(
  code: string,
  playerIds: string[],
  onConnectionChange: (connected: boolean) => void,
  onError: (error: MultiplayerServiceError) => void,
): Promise<Unsubscribe> {
  const normalizedCode = normalizeRoomCode(code)
  playerIds.forEach(assertRoomPlayerId)
  const { database: activeDatabase, user } = await getContext()
  let disposed = false
  let disconnectOperations: OnDisconnect[] = []
  let registrationSequence = 0

  const connectionReference = dbRef(activeDatabase, '.info/connected')
  const unsubscribe = onValue(
    connectionReference,
    (snapshot) => {
      const connected = snapshot.val() === true
      if (!connected) {
        onConnectionChange(false)
        return
      }

      const currentSequence = ++registrationSequence
      void (async () => {
        try {
          await cancelDisconnectOperations(disconnectOperations)
          if (disposed || currentSequence !== registrationSequence) return

          const memberReference = dbRef(activeDatabase, `rooms/${normalizedCode}/members/${user.uid}`)
          const memberDisconnect = onDisconnect(memberReference)
          const playerDisconnects = playerIds.map((playerId) =>
            onDisconnect(dbRef(activeDatabase, `rooms/${normalizedCode}/players/${playerId}/connected`)),
          )
          disconnectOperations = [memberDisconnect, ...playerDisconnects]

          await memberDisconnect.update({
            connected: false,
            lastSeenAt: serverTimestamp(),
          })
          await Promise.all(playerDisconnects.map((operation) => operation.set(false)))
          if (disposed || currentSequence !== registrationSequence) return

          const now = Date.now()
          const onlineUpdates: Record<string, unknown> = {
            [`rooms/${normalizedCode}/members/${user.uid}/connected`]: true,
            [`rooms/${normalizedCode}/members/${user.uid}/lastSeenAt`]: now,
          }
          for (const playerId of playerIds) {
            onlineUpdates[`rooms/${normalizedCode}/players/${playerId}/connected`] = true
          }
          await update(dbRef(activeDatabase), onlineUpdates)
          if (!disposed && currentSequence === registrationSequence) onConnectionChange(true)
        } catch (error) {
          if (!disposed) {
            onConnectionChange(false)
            onError(toMultiplayerServiceError(error, 'presence', 'network-unavailable'))
          }
        }
      })()
    },
    (error) => onError(toMultiplayerServiceError(error, 'presence')),
  )

  return () => {
    disposed = true
    registrationSequence++
    unsubscribe()
    // Keep already-registered server hooks armed. Explicit leave either deletes
    // the room/seat or writes the same offline state; if that write cannot reach
    // Firebase, the hook is the only reliable stale-presence cleanup.
    disconnectOperations = []
  }
}

function stripUndefinedValues<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(stripUndefinedValues) as T
  }
  if (typeof value !== 'object' || value === null) return value
  const cleaned: Record<string, unknown> = {}
  for (const [key, childValue] of Object.entries(value as Record<string, unknown>)) {
    if (childValue !== undefined) cleaned[key] = stripUndefinedValues(childValue)
  }
  return cleaned as T
}

function mergeGameStatePatch(
  currentState: SyncedGameState,
  patch: SyncedGameStatePatch,
  uid: string,
): SyncedGameState {
  const players = { ...currentState.players }
  for (const [playerId, playerPatch] of Object.entries(patch.players ?? {})) {
    if (!players[playerId]) continue
    players[playerId] = {
      ...players[playerId],
      ...stripUndefinedValues(playerPatch),
    }
  }

  return sanitizeGameState({
    ...currentState,
    ...stripUndefinedValues(patch.meta ?? {}),
    players,
    revision: currentState.revision + 1,
    updatedAt: Date.now(),
    updatedBy: uid,
  })
}

export async function startRoomGame(code: string, initialState: SyncedGameState): Promise<SyncedGameState> {
  const normalizedCode = normalizeRoomCode(code)
  const { database: activeDatabase, user } = await getContext()
  const room = await readRoom(normalizedCode, 'start-game')
  if (room.hostUid !== user.uid) throw serviceError('host-only', 'start-game')
  if (room.status !== 'lobby') throw serviceError('room-already-started', 'start-game')
  if (Object.values(room.joinRequests).some((request) => request.status === 'pending')) {
    throw serviceError('conflict', 'start-game', true)
  }

  const now = Date.now()
  const sanitizedState = sanitizeGameState({
    ...initialState,
    schemaVersion: MULTIPLAYER_SCHEMA_VERSION,
    revision: 1,
    updatedAt: now,
    updatedBy: user.uid,
  })
  try {
    await update(dbRef(activeDatabase), {
      [`rooms/${normalizedCode}/status`]: 'playing',
      [`rooms/${normalizedCode}/updatedAt`]: now,
      [`rooms/${normalizedCode}/gameState`]: stripUndefinedValues(sanitizedState),
    })
    return sanitizedState
  } catch (error) {
    throw toMultiplayerServiceError(error, 'start-game')
  }
}

export async function commitGameStatePatch(
  code: string,
  patch: SyncedGameStatePatch,
): Promise<SyncedGameState> {
  const normalizedCode = normalizeRoomCode(code)
  const { database: activeDatabase, user } = await getContext()
  const gameStateReference = dbRef(activeDatabase, `rooms/${normalizedCode}/gameState`)

  try {
    const currentSnapshot = await get(gameStateReference)
    if (!currentSnapshot.exists()) {
      throw serviceError('conflict', 'sync-game-state', true)
    }
    const currentState = sanitizeGameState(currentSnapshot.val())
    const nextState = mergeGameStatePatch(currentState, patch, user.uid)
    const updates: Record<string, unknown> = {
      revision: increment(1),
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    }

    for (const key of Object.keys(patch.meta ?? {}) as Array<keyof NonNullable<SyncedGameStatePatch['meta']>>) {
      updates[key] = stripUndefinedValues(nextState[key])
    }
    for (const [playerId, playerPatch] of Object.entries(patch.players ?? {})) {
      assertRoomPlayerId(playerId)
      const nextPlayer = nextState.players[playerId]
      if (!nextPlayer) throw serviceError('invalid-remote-data', 'sync-game-state')
      for (const key of Object.keys(playerPatch) as Array<keyof SyncedPlayerState>) {
        updates[`players/${playerId}/${key}`] = stripUndefinedValues(nextPlayer[key])
      }
    }

    await update(gameStateReference, updates)
    const committedSnapshot = await get(gameStateReference)
    if (!committedSnapshot.exists()) throw serviceError('conflict', 'sync-game-state', true)
    return sanitizeGameState(committedSnapshot.val())
  } catch (error) {
    if (error instanceof MultiplayerServiceError) throw error
    throw toMultiplayerServiceError(error, 'sync-game-state')
  }
}

export async function finishRoomGame(code: string): Promise<void> {
  const normalizedCode = normalizeRoomCode(code)
  const { database: activeDatabase, user } = await getContext()
  const room = await readRoom(normalizedCode, 'finish-game')
  if (room.hostUid !== user.uid) throw serviceError('host-only', 'finish-game')
  if (room.status !== 'playing') return

  if (room.gameState?.isRunning) {
    await commitGameStatePatch(normalizedCode, { meta: { isRunning: false } })
  }
  const now = Date.now()
  try {
    await update(dbRef(activeDatabase), {
      [`rooms/${normalizedCode}/status`]: 'finished',
      [`rooms/${normalizedCode}/finishedAt`]: now,
      [`rooms/${normalizedCode}/updatedAt`]: now,
    })
  } catch (error) {
    throw toMultiplayerServiceError(error, 'finish-game')
  }
}

export async function leaveRoom(code: string, playerIds: string[]): Promise<void> {
  const normalizedCode = normalizeRoomCode(code)
  playerIds.forEach(assertRoomPlayerId)
  const { database: activeDatabase, user } = await getContext()
  const room = await readRoom(normalizedCode, 'leave-room', 'room-closed')
  if (room.hostUid === user.uid) {
    await deleteRoom(normalizedCode)
    return
  }

  const updates: Record<string, unknown> = {
    [`rooms/${normalizedCode}/members/${user.uid}`]: null,
  }
  const joinRequest = room.joinRequests[user.uid]
  if (joinRequest) {
    updates[`rooms/${normalizedCode}/joinRequests/${user.uid}`] = null
    if (joinRequest.status === 'pending') {
      updates[`rooms/${normalizedCode}/joinRequestCount`] = increment(-1)
    }
  }
  for (const playerId of playerIds) {
    const player = room.players[playerId]
    if (!player || player.ownerUid !== user.uid) continue
    updates[`rooms/${normalizedCode}/players/${playerId}`] = room.status === 'lobby' ? null : {
      ...player,
      connected: false,
    }
  }

  try {
    await update(dbRef(activeDatabase), updates)
  } catch (error) {
    throw toMultiplayerServiceError(error, 'leave-room')
  }
}

export async function deleteRoom(code: string): Promise<void> {
  const normalizedCode = normalizeRoomCode(code)
  const { database: activeDatabase, user } = await getContext()
  const room = await readRoom(normalizedCode, 'delete-room')
  if (room.hostUid !== user.uid) throw serviceError('host-only', 'delete-room')
  try {
    await update(dbRef(activeDatabase), { [`rooms/${normalizedCode}`]: null })
  } catch (error) {
    throw toMultiplayerServiceError(error, 'delete-room')
  }
}
