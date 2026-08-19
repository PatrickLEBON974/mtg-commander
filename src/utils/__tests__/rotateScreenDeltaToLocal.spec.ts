import { describe, it, expect } from 'vitest'
import { rotateScreenDeltaToLocal } from '../rotateScreenDeltaToLocal'

describe('rotateScreenDeltaToLocal', () => {
  it('is the identity for rotation 0', () => {
    expect(rotateScreenDeltaToLocal(12, -7, 0)).toEqual([12, -7])
  })

  it('maps screen-down to local-right for a 90° card (player seated at screen-left)', () => {
    // Screen delta (0, +1) = finger moving toward screen bottom
    expect(rotateScreenDeltaToLocal(0, 1, 90)).toEqual([1, -0])
  })

  it('negates both axes for a 180° card (player seated opposite)', () => {
    expect(rotateScreenDeltaToLocal(5, 9, 180)).toEqual([-5, -9])
  })

  it('maps screen-down to local-left for a 270° card (player seated at screen-right)', () => {
    expect(rotateScreenDeltaToLocal(0, 1, 270)).toEqual([-1, 0])
  })

  it('falls back to identity for unexpected rotation values', () => {
    expect(rotateScreenDeltaToLocal(3, 4, 45)).toEqual([3, 4])
  })

  it('composes to identity with the complementary rotation', () => {
    // Converting with rotation r then with (360 - r) undoes the transform
    const screenDelta: [number, number] = [17, -23]
    for (const rotation of [90, 180, 270]) {
      const [localX, localY] = rotateScreenDeltaToLocal(screenDelta[0], screenDelta[1], rotation)
      const [roundTripX, roundTripY] = rotateScreenDeltaToLocal(localX, localY, 360 - rotation)
      expect([roundTripX, roundTripY]).toEqual(screenDelta)
    }
  })
})
