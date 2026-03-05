import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth'
import {
  getDatabase,
  ref as dbRef,
  set,
  get,
  onValue,
  onDisconnect,
  remove,
  update,
  runTransaction,
  type Database,
} from 'firebase/database'
import i18n from '@/i18n'
import { MAX_ROOM_CODE_ATTEMPTS, ROOM_CODE_LENGTH } from '@/config/gameConstants'

export type Unsubscribe = () => void

// Replace with your Firebase project config
// Create a project at https://console.firebase.google.com
// Enable Realtime Database (not Firestore)
// Enable Anonymous Authentication in the Firebase console
//
// Recommended Firebase Security Rules:
// {
//   "rules": {
//     "rooms": {
//       "$roomCode": {
//         ".read": "auth != null",
//         ".write": "auth != null"
//       }
//     }
//   }
// }
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
}

let firebaseApp: FirebaseApp | null = null
let database: Database | null = null
let auth: Auth | null = null

export async function initFirebase(): Promise<Database> {
  if (database) return database

  if (!firebaseConfig.databaseURL) {
    throw new Error(i18n.global.t('errors.firebaseNotConfigured'))
  }

  firebaseApp = initializeApp(firebaseConfig)
  auth = getAuth(firebaseApp)
  try {
    await signInAnonymously(auth)
  } catch (error) {
    console.error('[Firebase] Anonymous auth failed:', error)
    throw error
  }
  database = getDatabase(firebaseApp)
  return database
}

export async function getDb(): Promise<Database> {
  if (!database) return await initFirebase()
  return database
}

// --- Room code generation ---

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const randomValues = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH))
  return Array.from(randomValues, (byte) => chars[byte % chars.length]).join('')
}

// --- Room management ---

export interface RoomData {
  code: string
  hostId: string
  createdAt: number
  settings: {
    startingLife: number
    commanderDamageThreshold: number
    poisonThreshold: number
    playerCount: number
  }
  players: Record<string, RoomPlayer>
  gameState: SyncedGameState | null
}

export interface RoomPlayer {
  id: string
  deviceId: string
  name: string
  color: string
  connected: boolean
  joinedAt: number
}

export interface SyncedGameState {
  currentTurnPlayerIndex: number
  turnNumber: number
  startedAt: number
  elapsedMs: number
  isRunning: boolean
  players: Record<string, SyncedPlayerState>
}

export interface SyncedPlayerState {
  lifeTotal: number
  commanderDamageReceived: Record<string, number>
  poisonCounters: number
  experienceCounters: number
  energyCounters: number
  isMonarch: boolean
  hasInitiative: boolean
  commanders: Array<{
    id?: string
    cardName: string
    imageUri?: string
    castCount: number
  }>
}

const PLAYER_COLORS = ['white', 'blue', 'black', 'red', 'green', 'gold']

const ROOM_TTL_MS = 4 * 60 * 60 * 1000 // 4 hours

function isRoomExpired(roomData: RoomData): boolean {
  return Date.now() - roomData.createdAt > ROOM_TTL_MS
}

// --- Input validation helpers ---

/**
 * Validates a room code to prevent path traversal attacks in Firebase paths.
 * Room codes must be alphanumeric (uppercase letters + digits), matching the
 * format produced by generateRoomCode().
 */
function validateRoomCode(code: string): boolean {
  return /^[A-Z0-9]{1,20}$/.test(code)
}

/**
 * Validates a player ID to ensure it matches the expected UUID format.
 * Prevents injection of unexpected keys from remote Firebase data.
 */
function isValidPlayerId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,50}$/.test(id)
}

/**
 * Validates an image URI to ensure it uses HTTPS protocol only.
 * Prevents javascript: or data: URI injection from malicious remote data.
 */
function isValidImageUri(uri: string): boolean {
  try {
    const parsedUrl = new URL(uri)
    return parsedUrl.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Asserts that a room code is valid, throwing an error if not.
 * Call before using any room code to construct Firebase database paths.
 */
function assertValidRoomCode(code: string): void {
  if (!validateRoomCode(code)) {
    throw new Error('Invalid room code format')
  }
}

/**
 * Sanitizes a SyncedPlayerState received from Firebase, validating
 * commanderDamageReceived keys and commander image URIs.
 */
function sanitizeSyncedPlayerState(playerState: SyncedPlayerState): SyncedPlayerState {
  // Validate commanderDamageReceived keys: only keep entries with valid player IDs and numeric values
  const sanitizedCommanderDamage: Record<string, number> = {}
  if (playerState.commanderDamageReceived) {
    for (const [sourceId, damageValue] of Object.entries(playerState.commanderDamageReceived)) {
      if (!isValidPlayerId(sourceId) || typeof damageValue !== 'number' || !Number.isFinite(damageValue)) {
        continue
      }
      sanitizedCommanderDamage[sourceId] = damageValue
    }
  }

  // Validate commander image URIs: strip invalid URIs to prevent XSS
  const sanitizedCommanders = (playerState.commanders ?? []).map((commander) => ({
    ...commander,
    imageUri: commander.imageUri && isValidImageUri(commander.imageUri) ? commander.imageUri : undefined,
  }))

  return {
    ...playerState,
    commanderDamageReceived: sanitizedCommanderDamage,
    commanders: sanitizedCommanders,
  }
}

/**
 * Sanitizes an entire SyncedGameState received from Firebase.
 */
export function sanitizeGameState(gameState: SyncedGameState): SyncedGameState {
  const sanitizedPlayers: Record<string, SyncedPlayerState> = {}
  if (gameState.players) {
    for (const [playerId, playerState] of Object.entries(gameState.players)) {
      if (!isValidPlayerId(playerId)) continue
      sanitizedPlayers[playerId] = sanitizeSyncedPlayerState(playerState)
    }
  }
  return {
    ...gameState,
    players: sanitizedPlayers,
  }
}

export async function createRoom(
  deviceId: string,
  playerNames: string[],
  settings: RoomData['settings'],
): Promise<{ code: string; playerIds: string[] }> {
  const db = await getDb()

  cleanupExpiredRooms().catch(() => {}) // Best-effort cleanup

  for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt++) {
    const code = generateRoomCode()
    const roomRef = dbRef(db, `rooms/${code}`)

    const players: Record<string, RoomPlayer> = {}
    const playerIds: string[] = []

    for (let i = 0; i < playerNames.length; i++) {
      const playerId = crypto.randomUUID()
      playerIds.push(playerId)
      players[playerId] = {
        id: playerId,
        deviceId,
        name: playerNames[i]!,
        color: PLAYER_COLORS[i] ?? 'gold',
        connected: true,
        joinedAt: Date.now(),
      }
    }

    const roomData: RoomData = {
      code,
      hostId: deviceId,
      createdAt: Date.now(),
      settings,
      players,
      gameState: null,
    }

    const { committed } = await runTransaction(roomRef, (currentData) => {
      if (currentData !== null) {
        // Room already exists, abort the transaction
        return undefined
      }
      return roomData
    })

    if (!committed) continue

    // Auto-cleanup on disconnect for all local players
    for (const playerId of playerIds) {
      onDisconnect(dbRef(db, `rooms/${code}/players/${playerId}/connected`)).set(false)
    }

    return { code, playerIds }
  }

  throw new Error(i18n.global.t('multiplayer.cannotGenerateCode'))
}

export async function joinRoom(
  code: string,
  deviceId: string,
  playerNames: string[],
): Promise<{ roomData: RoomData; playerIds: string[] }> {
  assertValidRoomCode(code)
  const db = await getDb()
  const roomRef = dbRef(db, `rooms/${code}`)

  const snapshot = await get(roomRef)
  if (!snapshot.exists()) {
    throw new Error(i18n.global.t('multiplayer.roomNotFound'))
  }

  const roomData = snapshot.val() as RoomData

  if (isRoomExpired(roomData)) {
    await remove(roomRef)
    throw new Error(i18n.global.t('multiplayer.roomExpired'))
  }

  const existingCount = Object.keys(roomData.players).length
  const slotsLeft = roomData.settings.playerCount - existingCount

  if (playerNames.length > slotsLeft) {
    throw new Error(i18n.global.t('multiplayer.roomFull', { remaining: slotsLeft, plural: slotsLeft > 1 ? 's' : '' }))
  }

  const newPlayers: Record<string, RoomPlayer> = {}
  const playerIds: string[] = []

  for (let i = 0; i < playerNames.length; i++) {
    const playerId = crypto.randomUUID()
    playerIds.push(playerId)
    const colorIndex = existingCount + i
    newPlayers[playerId] = {
      id: playerId,
      deviceId,
      name: playerNames[i]!,
      color: PLAYER_COLORS[colorIndex] ?? 'gold',
      connected: true,
      joinedAt: Date.now(),
    }
  }

  // Write all new players at once
  const updates: Record<string, RoomPlayer> = {}
  for (const [id, player] of Object.entries(newPlayers)) {
    updates[`rooms/${code}/players/${id}`] = player
  }
  await update(dbRef(db), updates)

  // Auto-mark disconnected
  for (const playerId of playerIds) {
    onDisconnect(dbRef(db, `rooms/${code}/players/${playerId}/connected`)).set(false)
  }

  return {
    roomData: { ...roomData, players: { ...roomData.players, ...newPlayers } },
    playerIds,
  }
}

export async function listenToRoom(code: string, callback: (data: RoomData | null) => void): Promise<Unsubscribe> {
  assertValidRoomCode(code)
  const db = await getDb()
  const roomRef = dbRef(db, `rooms/${code}`)

  return onValue(roomRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null)
      return
    }
    const rawData = snapshot.val() as RoomData
    // Sanitize game state received from Firebase to validate player IDs and image URIs
    if (rawData.gameState) {
      rawData.gameState = sanitizeGameState(rawData.gameState)
    }
    callback(rawData)
  })
}

export async function updateGameState(code: string, gameState: SyncedGameState): Promise<void> {
  assertValidRoomCode(code)
  const db = await getDb()
  await set(dbRef(db, `rooms/${code}/gameState`), gameState)
}

export async function updatePlayerState(
  code: string,
  playerId: string,
  playerState: SyncedPlayerState,
): Promise<void> {
  assertValidRoomCode(code)
  if (!isValidPlayerId(playerId)) {
    throw new Error('Invalid player ID format')
  }
  const db = await getDb()
  await set(dbRef(db, `rooms/${code}/gameState/players/${playerId}`), playerState)
}

export async function updatePartialGameState(
  code: string,
  updates: Partial<Omit<SyncedGameState, 'players'>>,
): Promise<void> {
  assertValidRoomCode(code)
  const db = await getDb()
  await update(dbRef(db, `rooms/${code}/gameState`), updates)
}

export async function leaveRoom(code: string, playerIds: string[]): Promise<void> {
  assertValidRoomCode(code)
  const db = await getDb()
  const updates: Record<string, null> = {}
  for (const playerId of playerIds) {
    if (!isValidPlayerId(playerId)) continue
    updates[`rooms/${code}/players/${playerId}`] = null
  }
  await update(dbRef(db), updates)
}

export async function deleteRoom(code: string): Promise<void> {
  assertValidRoomCode(code)
  const db = await getDb()
  await remove(dbRef(db, `rooms/${code}`))
}

export async function cleanupExpiredRooms(): Promise<void> {
  const db = await getDb()

  // Only authenticated users may clean up rooms
  if (!auth?.currentUser) return

  const roomsRef = dbRef(db, 'rooms')
  const snapshot = await get(roomsRef)
  if (!snapshot.exists()) return

  const rooms = snapshot.val() as Record<string, RoomData>
  const currentTimestamp = Date.now()

  const expiredCodes = Object.entries(rooms)
    .filter(([code, room]) => {
      // Validate the room code format to avoid constructing invalid paths
      if (!validateRoomCode(code)) return false
      // Validate createdAt is a finite number in the past (not a future or bogus timestamp)
      if (typeof room.createdAt !== 'number' || !Number.isFinite(room.createdAt)) return false
      if (room.createdAt > currentTimestamp) return false
      // Only delete rooms that are genuinely expired
      return currentTimestamp - room.createdAt > ROOM_TTL_MS
    })
    .map(([code]) => code)

  if (expiredCodes.length === 0) return

  const updates: Record<string, null> = {}
  for (const code of expiredCodes) {
    updates[`rooms/${code}`] = null
  }
  await update(dbRef(db), updates)
}
