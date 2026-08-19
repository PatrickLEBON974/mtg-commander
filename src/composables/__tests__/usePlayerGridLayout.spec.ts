import { describe, it, expect } from 'vitest'
import {
  resolveLayout,
  screenToLocalCorner,
  cornerToStyle,
  SLOT_INNER_SCREEN_CORNER,
  type Corner,
} from '../usePlayerGridLayout'

describe('resolveLayout', () => {
  it('returns the base layout for default mode', () => {
    const layout = resolveLayout('default', 4)
    expect(layout.gridType).toBe('2x2')
    expect(layout.positionMap).toEqual([0, 1, 3, 2]) // clockwise TL TR BR BL
    expect(layout.slotRotations).toBeUndefined()
  })

  it('merges mode overrides on top of the base layout', () => {
    const layout = resolveLayout('faceToFace', 4)
    expect(layout.gridType).toBe('2x2') // inherited from base
    expect(layout.positionMap).toEqual([0, 1, 3, 2]) // inherited from base
    expect(layout.slotRotations).toEqual([180, 180, 0, 0])
  })

  it('lets overrides replace the grid type (2-player side mode)', () => {
    const layout = resolveLayout('faceToFaceSide', 2)
    expect(layout.gridType).toBe('2x1')
    expect(layout.slotRotations).toEqual([90, 270])
  })

  it('only uses 90/180/270 rotations covered by FLIP_AXIS_MAP', () => {
    const modes = ['default', 'faceToFace', 'faceToFaceSide', 'star'] as const
    for (const mode of modes) {
      for (let playerCount = 2; playerCount <= 6; playerCount++) {
        const layout = resolveLayout(mode, playerCount)
        for (const rotation of layout.slotRotations ?? []) {
          expect([0, 90, 180, 270]).toContain(rotation)
        }
      }
    }
  })

  it('falls back to the 4-player base for unsupported player counts', () => {
    expect(resolveLayout('default', 9).gridType).toBe('2x2')
  })
})

describe('screenToLocalCorner', () => {
  const corners: Corner[] = ['tl', 'tr', 'bl', 'br']

  it('is the identity at rotation 0', () => {
    for (const corner of corners) {
      expect(screenToLocalCorner(corner, 0)).toBe(corner)
    }
  })

  it('maps screen corners to the diagonally opposite local corner at 180°', () => {
    expect(screenToLocalCorner('tl', 180)).toBe('br')
    expect(screenToLocalCorner('br', 180)).toBe('tl')
    expect(screenToLocalCorner('tr', 180)).toBe('bl')
    expect(screenToLocalCorner('bl', 180)).toBe('tr')
  })

  it('stays a bijection over the 4 corners for every rotation', () => {
    for (const rotation of [0, 90, 180, 270]) {
      const mappedCorners = corners.map(corner => screenToLocalCorner(corner, rotation))
      expect(new Set(mappedCorners).size).toBe(4)
    }
  })

  it('round-trips through opposite rotations (90 then 270)', () => {
    for (const corner of corners) {
      expect(screenToLocalCorner(screenToLocalCorner(corner, 90), 270)).toBe(corner)
    }
  })
})

describe('cornerToStyle', () => {
  it('anchors each corner with the right inset pair', () => {
    expect(cornerToStyle('tl')).toEqual({ top: '8px', left: '8px' })
    expect(cornerToStyle('br')).toEqual({ bottom: '8px', right: '8px' })
  })
})

describe('SLOT_INNER_SCREEN_CORNER', () => {
  it('defines an inner corner for every slot of every grid type', () => {
    const slotsPerGrid: Record<string, number> = {
      '1x2': 2, '2x1': 2, '2x2': 4, '2x2_span_bottom': 3,
      '2x2_span_left': 3, '2x3': 6, '2x3_span_bottom': 5,
    }
    for (const [gridType, slotCount] of Object.entries(slotsPerGrid)) {
      expect(SLOT_INNER_SCREEN_CORNER[gridType]).toHaveLength(slotCount)
    }
  })
})
