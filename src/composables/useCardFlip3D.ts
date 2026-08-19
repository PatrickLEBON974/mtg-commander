import { computed, ref, type Ref } from 'vue'
import type { FlipAxis } from '@/composables/useCardSwipeGesture'

/**
 * Lookup table for CSS 3D rotation axis and angle sign based on card rotation
 * and swipe direction. Replaces trig-based computation — the card only ever has
 * 4 discrete orientations (0/90/180/270°).
 *
 * Each entry maps a SCREEN-space swipe direction to the correct LOCAL CSS
 * rotation axis/sign so the card visually "follows the finger" (the edge in
 * the swipe direction tips away from the viewer) regardless of card rotation.
 */
export const FLIP_AXIS_MAP: Record<string, Record<string, { axis: 'rotateX' | 'rotateY'; sign: number }>> = {
  '0':   { up: { axis: 'rotateX', sign: 1 },  down: { axis: 'rotateX', sign: -1 }, left: { axis: 'rotateY', sign: -1 }, right: { axis: 'rotateY', sign: 1 } },
  '90':  { up: { axis: 'rotateY', sign: -1 }, down: { axis: 'rotateY', sign: 1 },  left: { axis: 'rotateX', sign: -1 }, right: { axis: 'rotateX', sign: 1 } },
  '180': { up: { axis: 'rotateX', sign: -1 }, down: { axis: 'rotateX', sign: 1 },  left: { axis: 'rotateY', sign: 1 },  right: { axis: 'rotateY', sign: -1 } },
  '270': { up: { axis: 'rotateY', sign: 1 },  down: { axis: 'rotateY', sign: -1 }, left: { axis: 'rotateX', sign: 1 },  right: { axis: 'rotateX', sign: -1 } },
}

export interface UseCardFlip3DOptions {
  /** Card CSS rotation in degrees (0/90/180/270) */
  cardRotation: () => number
  /** Whether the card currently rests on its back face */
  isFlipped: Ref<boolean>
  /** Live gesture state from useCardSwipeGesture */
  isGestureActive: Ref<boolean>
  flipDragProgress: Ref<number>
  flipDirection: Ref<FlipAxis>
}

/**
 * Pure 3D flip styling logic for a player card.
 *
 * - During an active drag, the flip angle tracks the finger on the live axis.
 * - `commitFlipAxis()` MUST be called before toggling `isFlipped` on a forward
 *   flip: it freezes the axis/sign used for the resting flipped transform so
 *   the release transition continues on the same axis as the drag.
 * - The back face is pre-rotated 180° on the same axis, so the resting flipped
 *   composite (inner 180° + back 180°) is the identity — back content always
 *   reads correctly from the player's seat, whatever the swipe direction.
 */
export function useCardFlip3D(options: UseCardFlip3DOptions) {
  const { cardRotation, isFlipped, isGestureActive, flipDragProgress, flipDirection } = options

  const flipAxisAndSign = computed(() => {
    const rotation = String(cardRotation())
    const direction = flipDirection.value ?? 'down'
    return FLIP_AXIS_MAP[rotation]?.[direction] ?? { axis: 'rotateX' as const, sign: -1 }
  })

  /** Stored axis/sign — set on each forward flip, used for resting state */
  const storedFlipAxis = ref<'rotateX' | 'rotateY'>('rotateX')
  const storedFlipSign = ref(-1)

  /** Freeze the current axis/sign for the resting flipped transform. */
  function commitFlipAxis() {
    storedFlipAxis.value = flipAxisAndSign.value.axis
    storedFlipSign.value = flipAxisAndSign.value.sign
  }

  const flipInlineStyle = computed(() => {
    const { axis, sign } = flipAxisAndSign.value

    // During active drag: use live swipe axis for interactive feedback
    if (isGestureActive.value && flipDragProgress.value > 0) {
      // Forward: sign as-is. Flip-back: invert sign so the card follows the finger.
      const effectiveSign = isFlipped.value ? -sign : sign
      const angle = isFlipped.value
        ? (1 - flipDragProgress.value) * 180 * effectiveSign
        : flipDragProgress.value * 180 * effectiveSign
      return { transform: `${axis}(${angle}deg)`, transition: 'none' }
    }

    // Resting flipped state
    if (isFlipped.value) {
      return { transform: `${storedFlipAxis.value}(${180 * storedFlipSign.value}deg)` }
    }

    return {}
  })

  /** Card back pre-rotation — matches whichever axis is active */
  const cardBackTransform = computed(() => {
    // During drag, use live axis so both inner+back switch together (no jump at 180°)
    if (isGestureActive.value && flipDragProgress.value > 0) {
      const { axis, sign } = flipAxisAndSign.value
      const effectiveSign = isFlipped.value ? -sign : sign
      return { transform: `${axis}(${180 * effectiveSign}deg)` }
    }
    if (isFlipped.value) {
      return { transform: `${storedFlipAxis.value}(${180 * storedFlipSign.value}deg)` }
    }
    const { axis, sign } = flipAxisAndSign.value
    return { transform: `${axis}(${180 * sign}deg)` }
  })

  return {
    flipAxisAndSign,
    flipInlineStyle,
    cardBackTransform,
    commitFlipAxis,
  }
}
