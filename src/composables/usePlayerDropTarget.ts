/**
 * Shared drop-target detection for player cards (the `[data-commander-player]`
 * panels). Used by both badge drag (useBadgeDrag) and commander drag
 * (useCommanderDragDrop) — the single source of truth for the drop selector,
 * hit-testing and highlight glow.
 */

const DROP_TARGET_SELECTOR = '[data-commander-player]'

export interface PlayerDropTargetOptions {
  /** ID of the player owning this drag — never highlights its own panel. */
  sourcePlayerId: () => string
  /** box-shadow applied to the hovered drop target (drag-type specific glow). */
  highlightBoxShadow: string
  /**
   * Optional element to hide during elementFromPoint hit-tests so it doesn't
   * occlude the panel underneath (e.g. the floating commander drag indicator).
   */
  elementToHideDuringHitTest?: () => HTMLElement | null | undefined
}

export function usePlayerDropTarget(options: PlayerDropTargetOptions) {
  function elementAtPoint(x: number, y: number): Element | null {
    const occluder = options.elementToHideDuringHitTest?.()
    const previousDisplay = occluder?.style.display
    if (occluder) occluder.style.display = 'none'
    const element = document.elementFromPoint(x, y)
    if (occluder) occluder.style.display = previousDisplay ?? ''
    return element
  }

  function findDropTarget(x: number, y: number): string | null {
    const panel = elementAtPoint(x, y)?.closest(DROP_TARGET_SELECTOR) as HTMLElement | null
    return panel?.dataset.commanderPlayer ?? null
  }

  function highlightDropTarget(x: number, y: number) {
    clearDropHighlights()
    const panel = elementAtPoint(x, y)?.closest(DROP_TARGET_SELECTOR) as HTMLElement | null
    if (panel && panel.dataset.commanderPlayer !== options.sourcePlayerId()) {
      panel.style.boxShadow = options.highlightBoxShadow
      panel.style.transition = 'box-shadow 0.15s ease'
    }
  }

  function clearDropHighlights() {
    document.querySelectorAll(DROP_TARGET_SELECTOR).forEach((element) => {
      const panel = element as HTMLElement
      panel.style.boxShadow = ''
      panel.style.transition = ''
    })
  }

  return { findDropTarget, highlightDropTarget, clearDropHighlights }
}
