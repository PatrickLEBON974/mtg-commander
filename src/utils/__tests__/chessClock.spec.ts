import { describe, expect, it } from 'vitest'
import {
  createChessClockState,
  formatSignedTimer,
  getChessClockRemainingMs,
  getChessClockRemainingRatio,
} from '@/utils/chessClock'

describe('chessClock', () => {
  it('splits the target game duration evenly and derives a per-turn target', () => {
    const state = createChessClockState(120, 4, 10)

    expect(state).toEqual({
      totalGameDurationMs: 7_200_000,
      playerBudgetMs: 1_800_000,
      theoreticalTurnMs: 180_000,
      expectedRounds: 10,
    })
  })

  it('keeps overtime negative instead of ending or clamping the clock', () => {
    expect(getChessClockRemainingMs(1_800_000, 1_950_000)).toBe(-150_000)
    expect(formatSignedTimer(-150_000)).toBe('-02:30')
    expect(getChessClockRemainingRatio(1_800_000, 1_950_000)).toBe(0)
  })

  it('reports a stable progress ratio throughout the available budget', () => {
    expect(getChessClockRemainingRatio(1_000, 0)).toBe(1)
    expect(getChessClockRemainingRatio(1_000, 250)).toBe(0.75)
    expect(getChessClockRemainingRatio(1_000, 1_000)).toBe(0)
  })

  it('normalizes invalid setup input to safe final values', () => {
    const state = createChessClockState(Number.NaN, 0, -4)

    expect(state.totalGameDurationMs).toBe(7_200_000)
    expect(state.playerBudgetMs).toBe(7_200_000)
    expect(state.theoreticalTurnMs).toBe(720_000)
    expect(state.expectedRounds).toBe(10)
  })
})
