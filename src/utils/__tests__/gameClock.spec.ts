import { describe, expect, it } from 'vitest'
import { accrueGameClockDelta } from '@/utils/gameClock'

function emptyClockMaps() {
  return {
    playerPlayTimeMs: {} as Record<string, number>,
    playerRoundTimeMs: {} as Record<string, number>,
  }
}

describe('accrueGameClockDelta', () => {
  it('keeps legacy aggregate and round clocks on the priority owner', () => {
    const game = emptyClockMaps()

    accrueGameClockDelta(game, 'responder', 'turn-player', 750, false)

    expect(game.playerPlayTimeMs).toEqual({ responder: 750 })
    expect(game.playerRoundTimeMs).toEqual({ responder: 750 })
  })

  it('charges the chess budget to priority while preserving the active turn clock', () => {
    const game = emptyClockMaps()

    accrueGameClockDelta(game, 'responder', 'turn-player', 750, true)
    accrueGameClockDelta(game, 'responder', 'turn-player', 250, true)

    expect(game.playerPlayTimeMs).toEqual({ responder: 1_000 })
    expect(game.playerRoundTimeMs).toEqual({ 'turn-player': 1_000 })
  })

  it('ignores invalid deltas and missing clock owners', () => {
    const game = emptyClockMaps()

    accrueGameClockDelta(game, null, 'turn-player', 500, true)
    accrueGameClockDelta(game, 'responder', 'turn-player', -1, true)

    expect(game.playerPlayTimeMs).toEqual({})
    expect(game.playerRoundTimeMs).toEqual({})
  })
})
