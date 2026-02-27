/**
 * Reusable long-press gesture handler.
 * Manages setTimeout/clearTimeout lifecycle for pointer-based long-press detection.
 */
export function useLongPress(onLongPress: () => void, delayMs = 500) {
  let longPressTimer: ReturnType<typeof setTimeout> | null = null
  let triggered = false

  function start() {
    triggered = false
    longPressTimer = setTimeout(() => {
      triggered = true
      onLongPress()
    }, delayMs)
  }

  function cancel() {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }

  function isTriggered(): boolean {
    return triggered
  }

  function reset() {
    cancel()
    triggered = false
  }

  return { start, cancel, isTriggered, reset }
}
