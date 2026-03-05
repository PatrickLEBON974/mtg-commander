import { ref, onBeforeUnmount } from 'vue'
import gsap from 'gsap'
import { isDragLocked } from '@/composables/useDragLock'
import { tapFeedback, heavyFeedback } from '@/services/haptics'
import { useSettingsStore } from '@/stores/settingsStore'
import { prefersReducedMotion } from '@/utils/motion'

const DRAG_THRESHOLD = 10

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

/** Rotate screen-space deltas into the card's local coordinate system */
function screenToLocal(screenDx: number, screenDy: number, rotation: number): { x: number; y: number } {
  switch (rotation) {
    case 90:  return { x:  screenDy, y: -screenDx }
    case 180: return { x: -screenDx, y: -screenDy }
    case 270: return { x: -screenDy, y:  screenDx }
    default:  return { x:  screenDx, y:  screenDy }
  }
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

  const draggedBadgeKey = ref<string | null>(null)
  const dragOffset = ref({ x: 0, y: 0 })

  let startX = 0
  let startY = 0
  let dragActive = false
  let badgeElement: HTMLElement | null = null

  function onBadgeTouchStart(event: TouchEvent, badgeKey: string) {
    const touch = event.touches[0]
    if (!touch) return

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
    const touch = event.touches[0]
    if (!touch) return

    const screenDeltaX = touch.clientX - startX
    const screenDeltaY = touch.clientY - startY

    if (!dragActive && Math.hypot(screenDeltaX, screenDeltaY) > DRAG_THRESHOLD) {
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
    removeWindowListeners()

    if (dragActive && draggedBadgeKey.value) {
      const touch = event.changedTouches[0]
      if (touch) {
        const targetId = findDropTarget(touch.clientX, touch.clientY)

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
    }

    cleanup()
  }

  function onWindowTouchCancel() {
    removeWindowListeners()
    cleanup()
  }

  // ── Drop target detection ──

  function findDropTarget(x: number, y: number): string | null {
    const element = document.elementFromPoint(x, y)
    const panel = element?.closest('[data-commander-player]') as HTMLElement | null
    return panel?.dataset.commanderPlayer ?? null
  }

  function highlightDropTarget(x: number, y: number) {
    clearDropHighlights()
    const element = document.elementFromPoint(x, y)
    const panel = element?.closest('[data-commander-player]') as HTMLElement | null
    if (panel && panel.dataset.commanderPlayer !== playerId()) {
      panel.style.boxShadow = 'inset 0 0 0 3px rgba(212, 168, 67, 0.8), 0 0 32px rgba(212, 168, 67, 0.4), inset 0 0 16px rgba(212, 168, 67, 0.1)'
      panel.style.transition = 'box-shadow 0.15s ease'
    }
  }

  function clearDropHighlights() {
    document.querySelectorAll('[data-commander-player]').forEach((element) => {
      const htmlElement = element as HTMLElement
      htmlElement.style.boxShadow = ''
      htmlElement.style.transition = ''
    })
  }

  // ── Cleanup ──

  function removeWindowListeners() {
    window.removeEventListener('touchmove', onWindowTouchMove)
    window.removeEventListener('touchend', onWindowTouchEnd)
    window.removeEventListener('touchcancel', onWindowTouchCancel)
  }

  function cleanup() {
    clearDropHighlights()
    dragActive = false
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
