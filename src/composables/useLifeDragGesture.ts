import { ref } from 'vue'
import { isDragLocked } from '@/composables/useDragLock'

const LIFE_DRAG_PIXELS_PER_POINT = 25
const LIFE_DRAG_THRESHOLD = 10

interface UseLifeDragGestureOptions {
  onLifeChange: (amount: number) => void
}

export function useLifeDragGesture(options: UseLifeDragGestureOptions) {
  const { onLifeChange } = options

  let dragActive = false
  let dragStartX = 0
  let dragStartY = 0
  const pendingAmount = ref(0)

  function onTouchStart(event: TouchEvent) {
    const touch = event.touches[0]
    if (!touch) return
    dragActive = false
    dragStartX = touch.clientX
    dragStartY = touch.clientY
    pendingAmount.value = 0
  }

  function onTouchMove(event: TouchEvent) {
    const touch = event.touches[0]
    if (!touch) return

    const deltaX = touch.clientX - dragStartX
    const deltaY = touch.clientY - dragStartY

    if (!dragActive && Math.hypot(deltaX, deltaY) > LIFE_DRAG_THRESHOLD) {
      dragActive = true
      isDragLocked.value = true
    }

    if (dragActive) {
      event.preventDefault()
      // Use dominant axis: right/up = gain, left/down = loss
      const rawAmount = Math.abs(deltaX) > Math.abs(deltaY)
        ? deltaX / LIFE_DRAG_PIXELS_PER_POINT
        : -deltaY / LIFE_DRAG_PIXELS_PER_POINT
      pendingAmount.value = Math.round(rawAmount)
    }
  }

  function onTouchEnd() {
    if (dragActive && pendingAmount.value !== 0) {
      onLifeChange(pendingAmount.value)
    }
    dragActive = false
    isDragLocked.value = false
    pendingAmount.value = 0
  }

  function onTouchCancel() {
    dragActive = false
    isDragLocked.value = false
    pendingAmount.value = 0
  }

  /** Whether a drag gesture is currently active (used to suppress tap actions) */
  function isDragging() {
    return dragActive
  }

  return {
    lifeDragPendingAmount: pendingAmount,
    isDragging,
    onLifeTouchStart: onTouchStart,
    onLifeTouchMove: onTouchMove,
    onLifeTouchEnd: onTouchEnd,
    onLifeTouchCancel: onTouchCancel,
  }
}
