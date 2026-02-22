import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

const isNative = Capacitor.isNativePlatform()

// === IMPACT FEEDBACK (direct interactions) ===

/** Light tap: button press, toggle, tab switch, undo/redo */
export async function tapFeedback() {
  if (!isNative) return
  await Haptics.impact({ style: ImpactStyle.Light })
}

/** Medium tap: life +/- 1, single counter change */
export async function lifeFeedback() {
  if (!isNative) return
  await Haptics.impact({ style: ImpactStyle.Medium })
}

/** Heavy tap: life +/- 5/10, long press, bulk actions */
export async function heavyFeedback() {
  if (!isNative) return
  await Haptics.impact({ style: ImpactStyle.Heavy })
}

// === NOTIFICATION FEEDBACK (state changes) ===

/** Success: game started, commander assigned */
export async function successFeedback() {
  if (!isNative) return
  await Haptics.notification({ type: NotificationType.Success })
}

/** Warning: life dropping below 10, approaching lethal */
export async function warningFeedback() {
  if (!isNative) return
  await Haptics.notification({ type: NotificationType.Warning })
}

/** Error: player eliminated, lethal poison/commander damage */
export async function errorFeedback() {
  if (!isNative) return
  await Haptics.notification({ type: NotificationType.Error })
}

// === SELECTION FEEDBACK (continuous gestures) ===

/** Tick during continuous selection (e.g., scrubbing a slider) */
export async function selectionChanged() {
  if (!isNative) return
  await Haptics.selectionChanged()
}
