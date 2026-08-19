import { ref, onBeforeUnmount } from 'vue'
import { isDragLocked } from '@/composables/useDragLock'
import { DRAG_MOVEMENT_THRESHOLD_PX } from '@/config/gameConstants'
import { rotateScreenDeltaToLocal } from '@/utils/rotateScreenDeltaToLocal'
import { findTouchById } from '@/utils/trackedTouch'

const LIFE_DRAG_PIXELS_PER_POINT = 25

interface UseLifeDragGestureOptions {
  onLifeChange: (amount: number) => void
  /** Card CSS rotation (0/90/180/270°) — used to interpret drag direction in card-local space */
  cardRotation?: () => number
}

export function useLifeDragGesture(options: UseLifeDragGestureOptions) {
  const { onLifeChange } = options

  let dragActive = false
  let dragStartX = 0
  let dragStartY = 0
  let trackedTouchId: number | null = null
  const pendingAmount = ref(0)

  function onTouchStart(event: TouchEvent) {
    // Ignore additional fingers while a drag is in progress (multi-player safety)
    if (trackedTouchId !== null) return
    const touch = event.changedTouches[0]
    if (!touch) return
    trackedTouchId = touch.identifier
    dragActive = false
    dragStartX = touch.clientX
    dragStartY = touch.clientY
    pendingAmount.value = 0
  }

  function onTouchMove(event: TouchEvent) {
    if (trackedTouchId === null) return
    const touch = findTouchById(event.touches, trackedTouchId)
    if (!touch) return

    const deltaX = touch.clientX - dragStartX
    const deltaY = touch.clientY - dragStartY

    if (!dragActive && Math.hypot(deltaX, deltaY) > DRAG_MOVEMENT_THRESHOLD_PX) {
      dragActive = true
      isDragLocked.value = true
    }

    if (dragActive) {
      event.preventDefault()
      // Transform screen delta to card-local space (accounts for card rotation)
      const rotation = options.cardRotation?.() ?? 0
      const [localDeltaX, localDeltaY] = rotateScreenDeltaToLocal(deltaX, deltaY, rotation)
      // Dominant axis: card-right/card-up = gain, card-left/card-down = loss
      const rawAmount = Math.abs(localDeltaX) > Math.abs(localDeltaY)
        ? localDeltaX / LIFE_DRAG_PIXELS_PER_POINT
        : -localDeltaY / LIFE_DRAG_PIXELS_PER_POINT
      pendingAmount.value = Math.round(rawAmount)
    }
  }

  function onTouchEnd(event: TouchEvent) {
    if (trackedTouchId === null) return
    // Only conclude the drag when OUR finger lifts, not another player's
    if (!findTouchById(event.changedTouches, trackedTouchId)) return
    if (dragActive && pendingAmount.value !== 0) {
      onLifeChange(pendingAmount.value)
    }
    resetDragState()
  }

  function onTouchCancel() {
    resetDragState()
  }

  function resetDragState() {
    dragActive = false
    trackedTouchId = null
    isDragLocked.value = false
    pendingAmount.value = 0
  }

  /** Whether a drag gesture is currently active (used to suppress tap actions) */
  function isDragging() {
    return dragActive
  }

  onBeforeUnmount(() => {
    resetDragState()
  })

  return {
    lifeDragPendingAmount: pendingAmount,
    isDragging,
    onLifeTouchStart: onTouchStart,
    onLifeTouchMove: onTouchMove,
    onLifeTouchEnd: onTouchEnd,
    onLifeTouchCancel: onTouchCancel,
  }
}
