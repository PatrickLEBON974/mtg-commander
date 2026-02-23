import { useSettingsStore } from '@/stores/settingsStore'

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

function isSoundEnabled(): boolean {
  try {
    const settingsStore = useSettingsStore()
    return settingsStore.soundEnabled
  } catch {
    return false
  }
}

function getVolume(): number {
  try {
    const settingsStore = useSettingsStore()
    return settingsStore.soundVolume
  } catch {
    return 0.5
  }
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
  if (!isSoundEnabled()) return

  const context = getAudioContext()
  const oscillator = context.createOscillator()
  const gainNode = context.createGain()

  oscillator.type = type
  oscillator.frequency.value = frequency
  gainNode.gain.value = getVolume() * 0.3

  // Fade out to avoid clicks
  gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration)

  oscillator.connect(gainNode)
  gainNode.connect(context.destination)

  oscillator.start(context.currentTime)
  oscillator.stop(context.currentTime + duration)
}

// --- Public sound effects ---

/** Short click sound for life +1/-1 */
export function playLifeChange(isPositive: boolean) {
  playTone(isPositive ? 880 : 440, 0.08, 'sine')
}

/** Deeper sound for large life changes (+5/+10/-5/-10) */
export function playLargeLifeChange(isPositive: boolean) {
  playTone(isPositive ? 660 : 330, 0.12, 'triangle')
}

/** Ominous low tone for poison */
export function playPoisonChange() {
  playTone(220, 0.15, 'sawtooth')
}

/** Dramatic chord for player death */
export function playPlayerDeath() {
  playTone(150, 0.4, 'sawtooth')
  setTimeout(() => playTone(110, 0.5, 'square'), 100)
}

/** Bright ascending tone for turn advance */
export function playTurnAdvance() {
  playTone(523, 0.06, 'sine')
  setTimeout(() => playTone(659, 0.06, 'sine'), 60)
}

/** Royal fanfare for becoming monarch */
export function playMonarchCrown() {
  playTone(523, 0.1, 'triangle')
  setTimeout(() => playTone(659, 0.1, 'triangle'), 100)
  setTimeout(() => playTone(784, 0.15, 'triangle'), 200)
}
