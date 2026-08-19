import { MULTIPLAYER_SCHEMA_VERSION } from '@/config/gameConstants'
import type { GameState, PlayerState } from '@/types/game'
import type {
  SyncedGameMetaPatch,
  SyncedGameState,
  SyncedGameStatePatch,
  SyncedPlayerPatch,
  SyncedPlayerState,
} from '@/types/multiplayer'

const META_KEYS = [
  'id',
  'playerOrder',
  'currentTurnPlayerId',
  'turnNumber',
  'startedAt',
  'elapsedMs',
  'isRunning',
  'playerPlayTimeMs',
  'playerRoundTimeMs',
  'priorityPlayerId',
  'gamePhase',
  'dayNightState',
  'hourglassTimeBankRemainingMs',
  'chessClock',
] as const satisfies readonly (keyof SyncedGameMetaPatch)[]

const PLAYER_KEYS = [
  'name',
  'color',
  'lifeTotal',
  'commanderDamageReceived',
  'poisonCounters',
  'experienceCounters',
  'energyCounters',
  'isMonarch',
  'hasInitiative',
  'cityBlessing',
  'ringLevel',
  'radCounters',
  'hourglassTokens',
  'commanders',
] as const satisfies readonly (keyof SyncedPlayerState)[]

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) {
    return false
  }
  return JSON.stringify(left) === JSON.stringify(right)
}

export function toSyncedPlayerState(player: PlayerState): SyncedPlayerState {
  return {
    name: player.name,
    color: player.color,
    lifeTotal: player.lifeTotal,
    commanderDamageReceived: { ...player.commanderDamageReceived },
    poisonCounters: player.poisonCounters,
    experienceCounters: player.experienceCounters,
    energyCounters: player.energyCounters,
    isMonarch: player.isMonarch,
    hasInitiative: player.hasInitiative,
    cityBlessing: player.cityBlessing,
    ringLevel: player.ringLevel,
    radCounters: player.radCounters,
    hourglassTokens: player.hourglassTokens,
    commanders: player.commanders.map((commander) => {
      const syncedCommander = {
        id: commander.id,
        cardName: commander.cardName,
        castCount: commander.castCount,
      } as SyncedPlayerState['commanders'][number]
      if (commander.imageUri) syncedCommander.imageUri = commander.imageUri
      return syncedCommander
    }),
  }
}

export function toSyncedGameState(
  gameState: GameState,
  actorUid: string,
  revision = 1,
): SyncedGameState {
  const players = Object.fromEntries(
    gameState.players.map((player) => [player.id, toSyncedPlayerState(player)]),
  )
  const currentTurnPlayerId = gameState.players[gameState.currentTurnPlayerIndex]?.id ?? null

  return {
    schemaVersion: MULTIPLAYER_SCHEMA_VERSION,
    revision,
    updatedAt: Date.now(),
    updatedBy: actorUid,
    id: gameState.id,
    playerOrder: gameState.players.map((player) => player.id),
    currentTurnPlayerId,
    turnNumber: gameState.turnNumber,
    startedAt: gameState.startedAt,
    elapsedMs: Math.round(gameState.elapsedMs),
    isRunning: gameState.isRunning,
    playerPlayTimeMs: { ...gameState.playerPlayTimeMs },
    playerRoundTimeMs: { ...gameState.playerRoundTimeMs },
    priorityPlayerId: gameState.priorityPlayerId,
    gamePhase: gameState.gamePhase,
    dayNightState: gameState.dayNightState,
    hourglassTimeBankRemainingMs: { ...gameState.hourglassTimeBankRemainingMs },
    chessClock: gameState.chessClock ? { ...gameState.chessClock } : null,
    players,
  }
}

export function buildGameStatePatch(
  baseline: SyncedGameState,
  current: SyncedGameState,
): SyncedGameStatePatch | null {
  const meta: SyncedGameMetaPatch = {}
  for (const key of META_KEYS) {
    if (!valuesEqual(baseline[key], current[key])) {
      ;(meta as Record<string, unknown>)[key] = structuredClone(current[key])
    }
  }

  const players: Record<string, SyncedPlayerPatch> = {}
  for (const [playerId, currentPlayer] of Object.entries(current.players)) {
    const baselinePlayer = baseline.players[playerId]
    if (!baselinePlayer) {
      players[playerId] = structuredClone(currentPlayer)
      continue
    }

    const playerPatch: SyncedPlayerPatch = {}
    for (const key of PLAYER_KEYS) {
      if (!valuesEqual(baselinePlayer[key], currentPlayer[key])) {
        ;(playerPatch as Record<string, unknown>)[key] = structuredClone(currentPlayer[key])
      }
    }
    if (Object.keys(playerPatch).length > 0) players[playerId] = playerPatch
  }

  if (Object.keys(meta).length === 0 && Object.keys(players).length === 0) return null
  const patch: SyncedGameStatePatch = {}
  if (Object.keys(meta).length > 0) patch.meta = meta
  if (Object.keys(players).length > 0) patch.players = players
  return patch
}

export function applyPatchToSyncedState(
  baseline: SyncedGameState,
  patch: SyncedGameStatePatch,
): SyncedGameState {
  const players = structuredClone(baseline.players)
  for (const [playerId, playerPatch] of Object.entries(patch.players ?? {})) {
    const currentPlayer = players[playerId]
    if (!currentPlayer) continue
    players[playerId] = { ...currentPlayer, ...structuredClone(playerPatch) }
  }
  return {
    ...structuredClone(baseline),
    ...structuredClone(patch.meta ?? {}),
    players,
  }
}
