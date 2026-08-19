import type { GameState } from '@/types/game'

type ClockMaps = Pick<GameState, 'playerPlayTimeMs' | 'playerRoundTimeMs'>

/**
 * Apply one clock delta. In chess mode, aggregate time belongs to the player
 * holding priority while the informational turn clock stays with the turn
 * player. Legacy modes keep both clocks on the priority owner.
 */
export function accrueGameClockDelta(
  game: ClockMaps,
  clockOwnerId: string | null,
  turnPlayerId: string | null,
  deltaMs: number,
  isChessClock: boolean,
): void {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0 || !clockOwnerId) return

  game.playerPlayTimeMs[clockOwnerId] =
    (game.playerPlayTimeMs[clockOwnerId] ?? 0) + deltaMs

  const roundClockOwnerId = isChessClock ? turnPlayerId : clockOwnerId
  if (!roundClockOwnerId) return

  game.playerRoundTimeMs[roundClockOwnerId] =
    (game.playerRoundTimeMs[roundClockOwnerId] ?? 0) + deltaMs
}
