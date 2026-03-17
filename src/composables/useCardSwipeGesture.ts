import { ref, type Ref } from 'vue'
import { isDragLocked } from '@/composables/useDragLock'
import { useLongPress } from '@/composables/useLongPress'

// Thresholds for gesture detection
const TAP_MAX_DISTANCE = 12
const FLIP_SWIPE_THRESHOLD = 30
const TAP_MAX_DURATION_MS = 300
const LONG_PRESS_MIN_DURATION_MS = 400

export interface CardSwipeCallbacks {
  onTap: (side: 'left' | 'right') => void
  onLongPressStart: (side: 'left' | 'right') => void
  onLongPressEnd: () => void
  onFlip: () => void
}

/** Physical screen-space swipe direction */
export type FlipAxis = 'up' | 'down' | 'left' | 'right'

export interface CardSwipeGestureReturn {
  onTouchStart: (event: TouchEvent, side: 'left' | 'right') => void
  onTouchMove: (event: TouchEvent) => void
  onTouchEnd: (event: TouchEvent) => void
  onTouchCancel: () => void
  /** 0 = idle, progresses toward 1 during swipe. Resets after each flip. */
  flipDragProgress: Ref<number>
  /** The physical screen-space swipe direction (for choosing CSS axis in LifeTracker) */
  flipDirection: Ref<FlipAxis>
  isGestureActive: Ref<boolean>
  cleanup: () => void
}

/**
 * Stateless gesture composable for card flip detection in all 4 directions.
 *
 * Every swipe is treated identically: progress goes 0→1, and onFlip fires
 * when the threshold is reached. The composable does NOT track whether the
 * card is currently flipped — the caller toggles that state in onFlip.
 *
 * Gestures:
 * - Tap (<12px, <300ms) → life change
 * - Long press (>400ms) → life repeat
 * - Swipe any direction → card flip
 */
export function useCardSwipeGesture(
  callbacks: CardSwipeCallbacks,
): CardSwipeGestureReturn {
  let startX = 0
  let startY = 0
  let startTime = 0
  let activeSide: 'left' | 'right' = 'left'
  let gestureDecided = false
  let isFlipGesture = false
  /** Which screen-space axis controls flip progress ('x' or 'y') */
  let progressAxis: 'x' | 'y' = 'y'
  /** Sign multiplier so progress is always positive in the swipe direction */
  let progressSign = -1

  const flipDragProgress = ref(0)
  const flipDirection = ref<FlipAxis>('up')
  const isGestureActive = ref(false)

  const longPress = useLongPress(() => {
    if (!gestureDecided) {
      callbacks.onLongPressStart(activeSide)
    }
  }, LONG_PRESS_MIN_DURATION_MS)

  function onTouchStart(event: TouchEvent, side: 'left' | 'right') {
    const touch = event.touches[0]
    if (!touch) return

    startX = touch.clientX
    startY = touch.clientY
    startTime = Date.now()
    activeSide = side
    gestureDecided = false
    isFlipGesture = false
    isGestureActive.value = true
    flipDragProgress.value = 0

    longPress.reset()
    longPress.start()
  }

  function onTouchMove(event: TouchEvent) {
    if (!isGestureActive.value) return
    const touch = event.touches[0]
    if (!touch) return

    const screenDeltaX = touch.clientX - startX
    const screenDeltaY = touch.clientY - startY
    const distance = Math.hypot(screenDeltaX, screenDeltaY)

    // Cancel long press only if finger moved beyond a generous threshold
    // (fingers naturally drift during a long press on mobile)
    if (distance > FLIP_SWIPE_THRESHOLD) {
      longPress.cancel()
      if (longPress.isTriggered()) {
        callbacks.onLongPressEnd()
        longPress.reset()
      }
    }

    // Classify gesture as flip swipe once the larger threshold is met
    if (!gestureDecided && distance > FLIP_SWIPE_THRESHOLD) {
      gestureDecided = true
      isFlipGesture = true
      isDragLocked.value = true

      // Determine dominant axis and direction
      if (Math.abs(screenDeltaY) >= Math.abs(screenDeltaX)) {
        progressAxis = 'y'
        if (screenDeltaY < 0) {
          flipDirection.value = 'up'
          progressSign = -1
        } else {
          flipDirection.value = 'down'
          progressSign = 1
        }
      } else {
        progressAxis = 'x'
        if (screenDeltaX < 0) {
          flipDirection.value = 'left'
          progressSign = -1
        } else {
          flipDirection.value = 'right'
          progressSign = 1
        }
      }
    }

    // Update flip drag progress (always 0→1)
    if (isFlipGesture) {
      event.preventDefault()
      const container = (event.target as HTMLElement)?.closest('.card-flip-container')
      const cardSize = progressAxis === 'y'
        ? (container?.clientHeight ?? 200)
        : (container?.clientWidth ?? 200)
      const rawDelta = progressAxis === 'y' ? screenDeltaY : screenDeltaX
      const normalizedDelta = progressSign * rawDelta / cardSize

      flipDragProgress.value = Math.max(0, Math.min(1, normalizedDelta))
    }
  }

  function onTouchEnd(_event: TouchEvent) {
    if (!isGestureActive.value) return
    longPress.cancel()

    const elapsed = Date.now() - startTime

    if (longPress.isTriggered()) {
      callbacks.onLongPressEnd()
      reset()
      return
    }

    if (!gestureDecided) {
      if (elapsed <= TAP_MAX_DURATION_MS) {
        callbacks.onTap(activeSide)
      }
      reset()
      return
    }

    if (isFlipGesture && flipDragProgress.value > 0.3) {
      callbacks.onFlip()
    }

    reset()
  }

  function onTouchCancel() {
    longPress.cancel()
    if (longPress.isTriggered()) {
      callbacks.onLongPressEnd()
    }
    reset()
  }

  function reset() {
    isGestureActive.value = false
    gestureDecided = false
    isFlipGesture = false
    longPress.reset()
    isDragLocked.value = false
    flipDragProgress.value = 0
  }

  function cleanup() {
    longPress.cancel()
    reset()
  }

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
    flipDragProgress,
    flipDirection,
    isGestureActive,
    cleanup,
  }
}
