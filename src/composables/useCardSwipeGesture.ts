import { ref, type Ref } from 'vue'
import { isDragLocked } from '@/composables/useDragLock'

// Thresholds for gesture detection
const TAP_MAX_DISTANCE = 10
const TAP_MAX_DURATION_MS = 300
const LONG_PRESS_MIN_DURATION_MS = 400

export interface CardSwipeCallbacks {
  onTap: (side: 'left' | 'right') => void
  onLongPressStart: (side: 'left' | 'right') => void
  onLongPressEnd: () => void
  onFlip: () => void
  onFlipBack: () => void
}

/** Physical screen-space swipe direction */
export type FlipAxis = 'up' | 'down' | 'left' | 'right'

export interface CardSwipeGestureReturn {
  onTouchStart: (event: TouchEvent, side: 'left' | 'right') => void
  onTouchMove: (event: TouchEvent) => void
  onTouchEnd: (event: TouchEvent) => void
  onTouchCancel: () => void
  /** 0 = front face, 1 = back face. Tracks finger during drag. */
  flipDragProgress: Ref<number>
  /** The physical screen-space swipe direction (for choosing CSS axis in LifeTracker) */
  flipDirection: Ref<FlipAxis>
  isGestureActive: Ref<boolean>
  cleanup: () => void
}

/**
 * Gesture composable for card flip detection in all 4 directions.
 *
 * All gesture classification and drag progress use SCREEN-SPACE coordinates,
 * ensuring consistent behavior regardless of card CSS rotation (0/90/180/270°).
 *
 * The calling component (LifeTracker) translates the physical swipe direction
 * into the correct CSS 3D rotation axis/sign based on card rotation.
 *
 * Gestures:
 * - Tap (<10px, <300ms) → life change
 * - Long press (>400ms) → life repeat
 * - Swipe any direction → 3D card flip (up/down/left/right)
 */
export function useCardSwipeGesture(
  callbacks: CardSwipeCallbacks,
  isFlipped: Ref<boolean>,
): CardSwipeGestureReturn {
  let startX = 0
  let startY = 0
  let startTime = 0
  let activeSide: 'left' | 'right' = 'left'
  let gestureDecided = false
  let isFlipGesture = false
  let longPressTimer: ReturnType<typeof setTimeout> | null = null
  let longPressTriggered = false
  /** Which screen-space axis controls flip progress ('x' or 'y') */
  let progressAxis: 'x' | 'y' = 'y'
  /** Sign multiplier so progress is always positive in the swipe direction */
  let progressSign = -1

  const flipDragProgress = ref(0)
  const flipDirection = ref<FlipAxis>('up')
  const isGestureActive = ref(false)

  function clearLongPressTimer() {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }

  function onTouchStart(event: TouchEvent, side: 'left' | 'right') {
    const touch = event.touches[0]
    if (!touch) return

    startX = touch.clientX
    startY = touch.clientY
    startTime = Date.now()
    activeSide = side
    gestureDecided = false
    isFlipGesture = false
    longPressTriggered = false
    isGestureActive.value = true
    flipDragProgress.value = isFlipped.value ? 1 : 0

    clearLongPressTimer()
    longPressTimer = setTimeout(() => {
      if (!gestureDecided) {
        longPressTriggered = true
        callbacks.onLongPressStart(activeSide)
      }
      longPressTimer = null
    }, LONG_PRESS_MIN_DURATION_MS)
  }

  function onTouchMove(event: TouchEvent) {
    if (!isGestureActive.value) return
    const touch = event.touches[0]
    if (!touch) return

    const screenDeltaX = touch.clientX - startX
    const screenDeltaY = touch.clientY - startY
    const distance = Math.hypot(screenDeltaX, screenDeltaY)

    // Cancel long press if moved enough
    if (distance > TAP_MAX_DISTANCE) {
      clearLongPressTimer()
      if (longPressTriggered) {
        callbacks.onLongPressEnd()
        longPressTriggered = false
      }
    }

    // Classify gesture in SCREEN-SPACE once threshold is met
    if (!gestureDecided && distance > TAP_MAX_DISTANCE) {
      gestureDecided = true
      isFlipGesture = true
      isDragLocked.value = true

      // Determine dominant axis and direction
      if (Math.abs(screenDeltaY) >= Math.abs(screenDeltaX)) {
        progressAxis = 'y'
        if (screenDeltaY < 0) {
          flipDirection.value = 'up'
          progressSign = -1 // deltaY is negative for up → multiply by -1 to get positive
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

    // Update flip drag progress
    if (isFlipGesture) {
      event.preventDefault()
      const container = (event.target as HTMLElement)?.closest('.card-flip-container')
      const cardSize = progressAxis === 'y'
        ? (container?.clientHeight ?? 200)
        : (container?.clientWidth ?? 200)
      const rawDelta = progressAxis === 'y' ? screenDeltaY : screenDeltaX
      // normalizedDelta is always positive when swiping in the initial direction
      const normalizedDelta = progressSign * rawDelta / cardSize

      if (isFlipped.value) {
        // Flipped → flip back: progress decreases from 1 toward 0
        flipDragProgress.value = Math.max(0, Math.min(1, 1 - normalizedDelta))
      } else {
        // Not flipped → flip forward: progress increases from 0 toward 1
        flipDragProgress.value = Math.max(0, Math.min(1, normalizedDelta))
      }
    }
  }

  function onTouchEnd(_event: TouchEvent) {
    if (!isGestureActive.value) return
    clearLongPressTimer()

    const elapsed = Date.now() - startTime

    if (longPressTriggered) {
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

    if (isFlipGesture) {
      const progress = flipDragProgress.value
      if (!isFlipped.value && progress > 0.3) {
        callbacks.onFlip()
      } else if (isFlipped.value && progress < 0.7) {
        callbacks.onFlipBack()
      }
    }

    reset()
  }

  function onTouchCancel() {
    clearLongPressTimer()
    if (longPressTriggered) {
      callbacks.onLongPressEnd()
    }
    reset()
  }

  function reset() {
    isGestureActive.value = false
    gestureDecided = false
    isFlipGesture = false
    longPressTriggered = false
    isDragLocked.value = false
    flipDragProgress.value = isFlipped.value ? 1 : 0
  }

  function cleanup() {
    clearLongPressTimer()
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
