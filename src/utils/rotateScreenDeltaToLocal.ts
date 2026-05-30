/**
 * Rotate a screen-space delta (or point offset) into a rotated card's
 * local coordinate system, so "up" means "up" from the player's seat
 * regardless of the card's CSS rotation (0/90/180/270°).
 *
 * Shared by useLifeDragGesture (life drag) and useBadgeDrag (badge drag).
 */
export function rotateScreenDeltaToLocal(
  screenDeltaX: number,
  screenDeltaY: number,
  rotation: number,
): [localX: number, localY: number] {
  switch (rotation) {
    case 90:  return [screenDeltaY, -screenDeltaX]
    case 180: return [-screenDeltaX, -screenDeltaY]
    case 270: return [-screenDeltaY, screenDeltaX]
    default:  return [screenDeltaX, screenDeltaY]
  }
}
