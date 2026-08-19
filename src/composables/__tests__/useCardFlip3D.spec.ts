import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useCardFlip3D, FLIP_AXIS_MAP } from '../useCardFlip3D'
import type { FlipAxis } from '../useCardSwipeGesture'
import { rotateScreenDeltaToLocal } from '@/utils/rotateScreenDeltaToLocal'

/** Screen-space unit vector for each swipe direction */
const SCREEN_DIRECTION_VECTORS: Record<FlipAxis, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

/**
 * Independent derivation of the expected flip axis/sign:
 * 1. Convert the screen swipe direction into the card's local frame
 *    (reuses rotateScreenDeltaToLocal — a separate code path from FLIP_AXIS_MAP).
 * 2. In local space, the edge in the swipe direction must tip AWAY from the
 *    viewer (CSS: positive rotateX pushes the top edge away, positive rotateY
 *    pushes the right edge away).
 */
function expectedAxisAndSign(rotation: number, direction: FlipAxis) {
  const [screenX, screenY] = SCREEN_DIRECTION_VECTORS[direction]
  const [localX, localY] = rotateScreenDeltaToLocal(screenX, screenY, rotation)

  if (localY < 0) return { axis: 'rotateX', sign: 1 }   // local up → top edge away
  if (localY > 0) return { axis: 'rotateX', sign: -1 }  // local down → bottom edge away
  if (localX < 0) return { axis: 'rotateY', sign: -1 }  // local left → left edge away
  return { axis: 'rotateY', sign: 1 }                   // local right → right edge away
}

function createFlip3DHarness(rotation: number) {
  const isFlipped = ref(false)
  const isGestureActive = ref(false)
  const flipDragProgress = ref(0)
  const flipDirection = ref<FlipAxis>('up')
  const flip3D = useCardFlip3D({
    cardRotation: () => rotation,
    isFlipped,
    isGestureActive,
    flipDragProgress,
    flipDirection,
  })
  return { isFlipped, isGestureActive, flipDragProgress, flipDirection, ...flip3D }
}

describe('FLIP_AXIS_MAP', () => {
  const rotations = [0, 90, 180, 270]
  const directions: FlipAxis[] = ['up', 'down', 'left', 'right']

  it.each(rotations.flatMap(rotation => directions.map(direction => [rotation, direction] as const)))(
    'rotation %d° + swipe %s tips the swiped edge away from the viewer',
    (rotation, direction) => {
      const mapEntry = FLIP_AXIS_MAP[String(rotation)]![direction]!
      expect(mapEntry).toEqual(expectedAxisAndSign(rotation, direction))
    },
  )
})

describe('useCardFlip3D', () => {
  it('rests with no transform when not flipped', () => {
    const harness = createFlip3DHarness(0)
    expect(harness.flipInlineStyle.value).toEqual({})
  })

  it('tracks the finger during a forward drag (no transition)', () => {
    const harness = createFlip3DHarness(0)
    harness.flipDirection.value = 'up'
    harness.isGestureActive.value = true
    harness.flipDragProgress.value = 0.5
    expect(harness.flipInlineStyle.value).toEqual({ transform: 'rotateX(90deg)', transition: 'none' })
  })

  it('uses the committed axis for the resting flipped state', () => {
    const harness = createFlip3DHarness(0)
    harness.flipDirection.value = 'left'
    harness.commitFlipAxis()
    harness.isFlipped.value = true
    expect(harness.flipInlineStyle.value).toEqual({ transform: 'rotateY(-180deg)' })
  })

  it('keeps inner and back transforms identical at flipped rest (back content reads upright)', () => {
    // inner(180·s) ∘ back(180·s) on the same axis = identity → the back panel
    // is always upright from the player's seat, whatever the swipe direction.
    for (const rotation of [0, 90, 180, 270]) {
      for (const direction of ['up', 'down', 'left', 'right'] as FlipAxis[]) {
        const harness = createFlip3DHarness(rotation)
        harness.flipDirection.value = direction
        harness.commitFlipAxis()
        harness.isFlipped.value = true
        expect(harness.cardBackTransform.value).toEqual(harness.flipInlineStyle.value)
      }
    }
  })

  it('inverts the sign during a flip-back drag so the card follows the finger', () => {
    const harness = createFlip3DHarness(0)
    harness.flipDirection.value = 'up'
    harness.commitFlipAxis()
    harness.isFlipped.value = true
    harness.isGestureActive.value = true
    harness.flipDragProgress.value = 0.25
    // effectiveSign = -1, angle = (1 - 0.25) * 180 * -1 = -135
    expect(harness.flipInlineStyle.value).toEqual({ transform: 'rotateX(-135deg)', transition: 'none' })
  })

  it('falls back to a sane default for unexpected rotations', () => {
    const harness = createFlip3DHarness(45)
    expect(harness.flipAxisAndSign.value).toEqual({ axis: 'rotateX', sign: -1 })
  })
})
