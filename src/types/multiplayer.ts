import type {
  ChessClockState,
  GamePhase,
  GameSettings,
  PlayerColor,
} from '@/types/game'

export type RoomStatus = 'lobby' | 'playing' | 'finished'

export type MultiplayerConnectionState =
  | 'idle'
  | 'connecting'
  | 'waiting-approval'
  | 'connected'
  | 'reconnecting'
  | 'offline'
  | 'error'
  | 'closing'

export type MultiplayerErrorCode =
  | 'not-configured'
  | 'authentication-failed'
  | 'app-check-failed'
  | 'invalid-room-code'
  | 'invalid-player-name'
  | 'invalid-settings'
  | 'room-not-found'
  | 'room-expired'
  | 'room-full'
  | 'room-already-started'
  | 'room-closed'
  | 'join-rejected'
  | 'not-room-member'
  | 'host-only'
  | 'permission-denied'
  | 'network-unavailable'
  | 'session-expired'
  | 'invalid-remote-data'
  | 'conflict'
  | 'unknown'

export interface MultiplayerErrorState {
  code: MultiplayerErrorCode
  recoverable: boolean
  operation?: string
}

export type MultiplayerGameSettings = Pick<
  GameSettings,
  | 'startingLife'
  | 'commanderDamageThreshold'
  | 'poisonThreshold'
  | 'playerCount'
  | 'enableTimer'
  | 'timerMode'
  | 'turnTimerSeconds'
  | 'chessGameDurationMinutes'
  | 'chessExpectedRounds'
  | 'hourglassEnabled'
  | 'hourglassMode'
  | 'hourglassGracePeriodSeconds'
  | 'hourglassLossThreshold'
  | 'hourglassTimeBankCapEnabled'
  | 'hourglassTimeBankCapSeconds'
>

export interface RoomMember {
  uid: string
  connected: boolean
  joinedAt: number
  lastSeenAt: number
}

export interface RoomPlayer {
  id: string
  ownerUid: string
  name: string
  color: PlayerColor
  seat: number
  connected: boolean
  joinedAt: number
}

export type RoomJoinRequestStatus = 'pending' | 'approved' | 'rejected'

export interface RoomJoinRequest {
  uid: string
  playerNames: string[]
  requestedAt: number
  status: RoomJoinRequestStatus
  resolvedAt?: number
}

export interface SyncedCommander {
  id: string
  cardName: string
  imageUri?: string
  castCount: number
}

export interface SyncedPlayerState {
  name: string
  color: PlayerColor
  lifeTotal: number
  commanderDamageReceived: Record<string, number>
  poisonCounters: number
  experienceCounters: number
  energyCounters: number
  isMonarch: boolean
  hasInitiative: boolean
  cityBlessing: boolean
  ringLevel: number
  radCounters: number
  hourglassTokens: number
  commanders: SyncedCommander[]
}

export interface SyncedGameState {
  schemaVersion: number
  revision: number
  updatedAt: number
  updatedBy: string
  id: string
  playerOrder: string[]
  currentTurnPlayerId: string | null
  turnNumber: number
  startedAt: number
  elapsedMs: number
  isRunning: boolean
  playerPlayTimeMs: Record<string, number>
  playerRoundTimeMs: Record<string, number>
  priorityPlayerId: string | null
  gamePhase: GamePhase
  dayNightState: 'day' | 'night' | null
  hourglassTimeBankRemainingMs: Record<string, number>
  chessClock: ChessClockState | null
  players: Record<string, SyncedPlayerState>
}

export interface RoomData {
  schemaVersion: number
  code: string
  hostUid: string
  createdAt: number
  updatedAt: number
  expiresAt: number
  finishedAt?: number
  status: RoomStatus
  settings: MultiplayerGameSettings
  members: Record<string, RoomMember>
  players: Record<string, RoomPlayer>
  joinRequestCount: number
  joinRequests: Record<string, RoomJoinRequest>
  gameState: SyncedGameState | null
}

export interface MultiplayerSession {
  schemaVersion: number
  roomCode: string
  state: 'member' | 'pending'
  previousGameSettings?: MultiplayerGameSettings
}

export type SyncedGameMetaPatch = Partial<
  Omit<
    SyncedGameState,
    'schemaVersion' | 'revision' | 'updatedAt' | 'updatedBy' | 'players'
  >
>

export type SyncedPlayerPatch = Partial<SyncedPlayerState>

export interface SyncedGameStatePatch {
  meta?: SyncedGameMetaPatch
  players?: Record<string, SyncedPlayerPatch>
}
