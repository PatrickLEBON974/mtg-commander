import type { ChessClockState } from '@/types/game'
import { formatMsToTimer } from '@/utils/time'

export const MILLISECONDS_PER_MINUTE = 60_000

function positiveInteger(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback
  return Math.max(1, Math.round(value))
}

/** Build the fixed per-player allocation captured at game start. */
export function createChessClockState(
  gameDurationMinutes: number,
  playerCount: number,
  expectedRounds: number,
): ChessClockState {
  const safeDurationMinutes = positiveInteger(gameDurationMinutes, 120)
  const safePlayerCount = positiveInteger(playerCount, 1)
  const safeExpectedRounds = positiveInteger(expectedRounds, 10)
  const totalGameDurationMs = safeDurationMinutes * MILLISECONDS_PER_MINUTE
  const playerBudgetMs = Math.floor(totalGameDurationMs / safePlayerCount)

  return {
    totalGameDurationMs,
    playerBudgetMs,
    theoreticalTurnMs: Math.floor(playerBudgetMs / safeExpectedRounds),
    expectedRounds: safeExpectedRounds,
  }
}

export function getChessClockRemainingMs(playerBudgetMs: number, usedMs: number): number {
  const safeBudgetMs = Number.isFinite(playerBudgetMs) ? Math.max(0, playerBudgetMs) : 0
  const safeUsedMs = Number.isFinite(usedMs) ? Math.max(0, usedMs) : 0
  return safeBudgetMs - safeUsedMs
}

export function getChessClockRemainingRatio(playerBudgetMs: number, usedMs: number): number {
  if (!Number.isFinite(playerBudgetMs) || playerBudgetMs <= 0) return 0
  return Math.min(1, Math.max(0, getChessClockRemainingMs(playerBudgetMs, usedMs) / playerBudgetMs))
}

/** Timer formatter that keeps overtime visible instead of clamping it to zero. */
export function formatSignedTimer(milliseconds: number): string {
  const safeMilliseconds = Number.isFinite(milliseconds) ? milliseconds : 0
  const prefix = safeMilliseconds < 0 ? '-' : ''
  return `${prefix}${formatMsToTimer(Math.abs(safeMilliseconds))}`
}
