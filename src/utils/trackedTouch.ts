/**
 * Multi-touch-safe touch tracking.
 *
 * `event.touches[0]` is the FIRST finger on the whole screen, not the finger
 * that started the current gesture. On a shared tabletop device (4-6 players
 * around one screen), simultaneous touches are common: reading `touches[0]`
 * makes one player's gesture compute deltas from another player's finger.
 *
 * Gestures must capture `touch.identifier` on touchstart and look that
 * identifier up in subsequent events.
 */

/** Find a touch by identifier in a TouchList (returns undefined if absent). */
export function findTouchById(touchList: TouchList, identifier: number): Touch | undefined {
  for (let touchIndex = 0; touchIndex < touchList.length; touchIndex++) {
    const touch = touchList.item(touchIndex)
    if (touch && touch.identifier === identifier) return touch
  }
  return undefined
}
