import { ref, onBeforeUnmount } from 'vue'
import gsap from 'gsap'
import { isDragLocked } from '@/composables/useDragLock'
import { tapFeedback, heavyFeedback } from '@/services/haptics'
import { useSettingsStore } from '@/stores/settingsStore'
import { prefersReducedMotion } from '@/utils/motion'
import { DRAG_MOVEMENT_THRESHOLD_PX } from '@/config/gameConstants'
import { rotateScreenDeltaToLocal } from '@/utils/rotateScreenDeltaToLocal'
import { findTouchById } from '@/utils/trackedTouch'
import { usePlayerDropTarget } from '@/composables/usePlayerDropTarget'

interface UseBadgeDragOptions {
  /** Source player ID — used to distinguish reposition vs transfer */
  playerId: () => string
  /** Card container element for percentage coordinate conversion */
  cardElement: () => HTMLElement | undefined
  /** Card CSS rotation in degrees (0, 90, 180, 270) */
  cardRotation: () => number
  /** Called when a badge is dropped on the same card (reposition) */
  onReposition: (badgeKey: string, left: number, top: number) => void
  /** Called when a badge is dropped on a different player's card (transfer) */
  onTransfer: (badgeKey: string, targetPlayerId: string) => void
}

/** Rotate screen-space deltas into the card's local coordinate system ({x,y} shape) */
function screenToLocal(screenDx: number, screenDy: number, rotation: number): { x: number; y: number } {
  const [x, y] = rotateScreenDeltaToLocal(screenDx, screenDy, rotation)
  return { x, y }
}

/** Convert a screen touch point to a percentage within the element's local coordinate space */
function screenToLocalPercent(
  touchX: number, touchY: number,
  element: HTMLElement, rotation: number,
): { left: number; top: number } {
  const rect = element.getBoundingClientRect()
  const local = screenToLocal(
    touchX - (rect.left + rect.width / 2),
    touchY - (rect.top + rect.height / 2),
    rotation,
  )
  return {
    left: 50 + (local.x / element.offsetWidth) * 100,
    top: 50 + (local.y / element.offsetHeight) * 100,
  }
}

/**
 * Unified badge drag: reposition within the card OR transfer to another player.
 *
 * - All badges can be dragged to a new position on the card.
 * - Monarch (or any transferable badge) can be dragged to another player's card.
 * - Drop target detection uses [data-commander-player] attribute.
 */
export function useBadgeDrag(options: UseBadgeDragOptions) {
  const { playerId, cardElement, cardRotation, onReposition, onTransfer } = options

  const { findDropTarget, highlightDropTarget, clearDropHighlights } = usePlayerDropTarget({
    sourcePlayerId: playerId,
    highlightBoxShadow:
      'inset 0 0 0 3px rgba(212, 168, 67, 0.8), 0 0 32px rgba(212, 168, 67, 0.4), inset 0 0 16px rgba(212, 168, 67, 0.1)',
  })

  const draggedBadgeKey = ref<string | null>(null)
  const dragOffset = ref({ x: 0, y: 0 })

  let startX = 0
  let startY = 0
  let dragActive = false
  let trackedTouchId: number | null = null
  let badgeElement: HTMLElement | null = null

  function onBadgeTouchStart(event: TouchEvent, badgeKey: string) {
    // Ignore additional fingers while a drag is in progress (multi-player safety)
    if (trackedTouchId !== null) return
    const touch = event.changedTouches[0]
    if (!touch) return

    trackedTouchId = touch.identifier
    startX = touch.clientX
    startY = touch.clientY
    dragActive = false
    badgeElement = (event.currentTarget as HTMLElement) ?? null
    draggedBadgeKey.value = badgeKey
    dragOffset.value = { x: 0, y: 0 }

    window.addEventListener('touchmove', onWindowTouchMove, { passive: false })
    window.addEventListener('touchend', onWindowTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onWindowTouchCancel, { passive: true })
  }

  function onWindowTouchMove(event: TouchEvent) {
    if (trackedTouchId === null) return
    const touch = findTouchById(event.touches, trackedTouchId)
    if (!touch) return

    const screenDeltaX = touch.clientX - startX
    const screenDeltaY = touch.clientY - startY

    if (!dragActive && Math.hypot(screenDeltaX, screenDeltaY) > DRAG_MOVEMENT_THRESHOLD_PX) {
      dragActive = true
      isDragLocked.value = true
      const settingsStore = useSettingsStore()
      if (settingsStore.hapticFeedback) tapFeedback()
    }

    if (dragActive) {
      event.preventDefault()
      // Badge follows finger in card-local coords
      dragOffset.value = screenToLocal(screenDeltaX, screenDeltaY, cardRotation())
      // Highlight other player cards as potential transfer targets
      highlightDropTarget(touch.clientX, touch.clientY)
    }
  }

  function onWindowTouchEnd(event: TouchEvent) {
    if (trackedTouchId === null) return
    // Another player's finger lifting must not conclude OUR drag
    const trackedTouch = findTouchById(event.changedTouches, trackedTouchId)
    if (!trackedTouch) return
    removeWindowListeners()

    if (dragActive && draggedBadgeKey.value) {
      const targetId = findDropTarget(trackedTouch.clientX, trackedTouch.clientY)

      if (targetId && targetId !== playerId()) {
        // Dropped on another player → transfer
        onTransfer(draggedBadgeKey.value, targetId)

        if (!prefersReducedMotion.value) {
          const targetElement = document.querySelector(
            `[data-commander-player="${targetId}"]`,
          ) as HTMLElement | null
          if (targetElement) {
            gsap.fromTo(targetElement,
              { boxShadow: '0 0 30px rgba(212, 168, 67, 0.6), inset 0 0 20px rgba(212, 168, 67, 0.3)' },
              { boxShadow: '', duration: 0.6, ease: 'power2.out' },
            )
          }
        }
        const settingsStore = useSettingsStore()
        if (settingsStore.hapticFeedback) heavyFeedback()
      } else {
        // Dropped on same card (or no target) → reposition
        // Use badge element's visual center (includes drag transform) for exact drop position
        const container = cardElement()
        if (container && badgeElement) {
          const badgeRect = badgeElement.getBoundingClientRect()
          const badgeCenterX = badgeRect.left + badgeRect.width / 2
          const badgeCenterY = badgeRect.top + badgeRect.height / 2
          const { left, top } = screenToLocalPercent(
            badgeCenterX, badgeCenterY, container, cardRotation(),
          )
          onReposition(draggedBadgeKey.value, left, top)
        }
      }
    }

    cleanup()
  }

  function onWindowTouchCancel() {
    removeWindowListeners()
    cleanup()
  }

  // ── Drop target detection (shared via usePlayerDropTarget) ──

  // ── Cleanup ──

  function removeWindowListeners() {
    window.removeEventListener('touchmove', onWindowTouchMove)
    window.removeEventListener('touchend', onWindowTouchEnd)
    window.removeEventListener('touchcancel', onWindowTouchCancel)
  }

  function cleanup() {
    clearDropHighlights()
    dragActive = false
    trackedTouchId = null
    badgeElement = null
    draggedBadgeKey.value = null
    dragOffset.value = { x: 0, y: 0 }
    isDragLocked.value = false
  }

  onBeforeUnmount(() => {
    removeWindowListeners()
    cleanup()
  })

  return {
    onBadgeTouchStart,
    draggedBadgeKey,
    dragOffset,
    cleanup,
  }
}
