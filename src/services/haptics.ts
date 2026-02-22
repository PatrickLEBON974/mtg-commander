import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

const isNative = Capacitor.isNativePlatform()

export async function tapFeedback() {
  if (!isNative) return
  await Haptics.impact({ style: ImpactStyle.Light })
}

export async function lifeFeedback() {
  if (!isNative) return
  await Haptics.impact({ style: ImpactStyle.Medium })
}

export async function warningFeedback() {
  if (!isNative) return
  await Haptics.impact({ style: ImpactStyle.Heavy })
}
