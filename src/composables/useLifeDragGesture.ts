import { ref } from 'vue'
import { isDragLocked } from '@/composables/useDragLock'

const LIFE_DRAG_PIXELS_PER_POINT = 25
const LIFE_DRAG_THRESHOLD = 10

interface UseLifeDragGestureOptions {
  onLifeChange: (amount: number) => void
  /** Card CSS rotation (0/90/180/270°) — used to interpret drag direction in card-local space */
  cardRotation?: () => number
}

/**
 * Transform screen-space touch delta into card-local delta,
 * so "up" always means "gain" from the player's perspective
 * regardless of card CSS rotation.
 */
function screenToLocalDelta(screenDeltaX: number, screenDeltaY: number, rotation: number): [number, number] {
  switch (rotation) {
    case 90:  return [screenDeltaY, -screenDeltaX]
    case 180: return [-screenDeltaX, -screenDeltaY]
    case 270: return [-screenDeltaY, screenDeltaX]
    default:  return [screenDeltaX, screenDeltaY]
  }
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
      // Transform screen delta to card-local space (accounts for card rotation)
      const rotation = options.cardRotation?.() ?? 0
      const [localDeltaX, localDeltaY] = screenToLocalDelta(deltaX, deltaY, rotation)
      // Dominant axis: card-right/card-up = gain, card-left/card-down = loss
      const rawAmount = Math.abs(localDeltaX) > Math.abs(localDeltaY)
        ? localDeltaX / LIFE_DRAG_PIXELS_PER_POINT
        : -localDeltaY / LIFE_DRAG_PIXELS_PER_POINT
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
