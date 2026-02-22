import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  getDatabase,
  ref as dbRef,
  set,
  get,
  onValue,
  onDisconnect,
  remove,
  update,
  type Database,
} from 'firebase/database'

export type Unsubscribe = () => void

// TODO: Replace with your Firebase project config
// Create a project at https://console.firebase.google.com
// Enable Realtime Database (not Firestore)
// Set rules to: { ".read": true, ".write": true } for dev
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

export function initFirebase(): Database {
  if (database) return database

  if (!firebaseConfig.databaseURL) {
    throw new Error('Firebase non configure. Ajoutez les variables VITE_FIREBASE_* dans .env')
  }

  firebaseApp = initializeApp(firebaseConfig)
  database = getDatabase(firebaseApp)
  return database
}

export function getDb(): Database {
  if (!database) return initFirebase()
  return database
}

// --- Room code generation ---

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
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
    cardName: string
    imageUri?: string
    castCount: number
  }>
}

const PLAYER_COLORS = ['white', 'blue', 'black', 'red', 'green', 'gold', 'colorless']

export async function createRoom(
  deviceId: string,
  playerNames: string[],
  settings: RoomData['settings'],
): Promise<{ code: string; playerIds: string[] }> {
  const db = getDb()

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode()
    const roomRef = dbRef(db, `rooms/${code}`)

    const snapshot = await get(roomRef)
    if (snapshot.exists()) continue

    const players: Record<string, RoomPlayer> = {}
    const playerIds: string[] = []

    for (let i = 0; i < playerNames.length; i++) {
      const playerId = crypto.randomUUID()
      playerIds.push(playerId)
      players[playerId] = {
        id: playerId,
        deviceId,
        name: playerNames[i]!,
        color: PLAYER_COLORS[i] ?? 'colorless',
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

    await set(roomRef, roomData)

    // Auto-cleanup on disconnect for all local players
    for (const playerId of playerIds) {
      onDisconnect(dbRef(db, `rooms/${code}/players/${playerId}/connected`)).set(false)
    }

    return { code, playerIds }
  }

  throw new Error('Impossible de generer un code unique')
}

export async function joinRoom(
  code: string,
  deviceId: string,
  playerNames: string[],
): Promise<{ roomData: RoomData; playerIds: string[] }> {
  const db = getDb()
  const roomRef = dbRef(db, `rooms/${code}`)

  const snapshot = await get(roomRef)
  if (!snapshot.exists()) {
    throw new Error('Room introuvable')
  }

  const roomData = snapshot.val() as RoomData
  const existingCount = Object.keys(roomData.players).length
  const slotsLeft = roomData.settings.playerCount - existingCount

  if (playerNames.length > slotsLeft) {
    throw new Error(`Pas assez de places (${slotsLeft} restante${slotsLeft > 1 ? 's' : ''})`)
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
      color: PLAYER_COLORS[colorIndex] ?? 'colorless',
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

export function listenToRoom(code: string, callback: (data: RoomData | null) => void): Unsubscribe {
  const db = getDb()
  const roomRef = dbRef(db, `rooms/${code}`)

  return onValue(roomRef, (snapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as RoomData) : null)
  })
}

export async function updateGameState(code: string, gameState: SyncedGameState): Promise<void> {
  const db = getDb()
  await set(dbRef(db, `rooms/${code}/gameState`), gameState)
}

export async function updatePlayerState(
  code: string,
  playerId: string,
  playerState: SyncedPlayerState,
): Promise<void> {
  const db = getDb()
  await set(dbRef(db, `rooms/${code}/gameState/players/${playerId}`), playerState)
}

export async function updatePartialGameState(
  code: string,
  updates: Record<string, unknown>,
): Promise<void> {
  const db = getDb()
  await update(dbRef(db, `rooms/${code}/gameState`), updates)
}

export async function leaveRoom(code: string, playerIds: string[]): Promise<void> {
  const db = getDb()
  const updates: Record<string, null> = {}
  for (const playerId of playerIds) {
    updates[`rooms/${code}/players/${playerId}`] = null
  }
  await update(dbRef(db), updates)
}

export async function deleteRoom(code: string): Promise<void> {
  const db = getDb()
  await remove(dbRef(db, `rooms/${code}`))
}
