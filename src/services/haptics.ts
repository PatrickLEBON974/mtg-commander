import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

const isNative = Capacitor.isNativePlatform()

/**
 * Haptic feedback is purely cosmetic — on platforms/devices without
 * vibration support the plugin may reject, so every call is swallowed
 * silently to avoid unhandled promise rejections.
 */
async function runSilently(hapticCall: () => Promise<void>): Promise<void> {
  if (!isNative) return
  try {
    await hapticCall()
  } catch {
    // Haptics unsupported or failed — ignore (cosmetic feature)
  }
}

// === IMPACT FEEDBACK (direct interactions) ===

/** Light tap: button press, toggle, tab switch, undo/redo */
export async function tapFeedback() {
  await runSilently(() => Haptics.impact({ style: ImpactStyle.Light }))
}

/** Medium tap: life +/- 1, single counter change */
export async function lifeFeedback() {
  await runSilently(() => Haptics.impact({ style: ImpactStyle.Medium }))
}

/** Heavy tap: life +/- 5/10, long press, bulk actions */
export async function heavyFeedback() {
  await runSilently(() => Haptics.impact({ style: ImpactStyle.Heavy }))
}

// === NOTIFICATION FEEDBACK (state changes) ===

/** Warning: life dropping below 10, approaching lethal */
export async function warningFeedback() {
  await runSilently(() => Haptics.notification({ type: NotificationType.Warning }))
}
