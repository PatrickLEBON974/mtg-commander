import { onUnmounted } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { lifeFeedback, heavyFeedback, warningFeedback } from '@/services/haptics'
import { playLifeChange, playLargeLifeChange, playDamageHit } from '@/services/sounds'
import { LARGE_LIFE_CHANGE_THRESHOLD, FLOAT_ANIMATION_DELAY_MS } from '@/config/gameConstants'

/**
 * Feedback source set synchronously by the calling component before store calls.
 * - 'commit': batched tap commit (per-tap sounds already played during accumulation)
 * - 'direct': drag, numpad, or other single-shot life change (full sound + haptic)
 */
export type LifeChangeSource = 'commit' | 'direct'

interface UseLifeFeedbackOptions {
  playerId: () => string
  getLifeTotal: () => number
  triggerDamageShake: (damageAmount: number) => void
  setFlashType: (type: 'positive' | 'negative') => void
  addFloat: (amount: number, type: string) => void
}

/**
 * Centralises all life-change feedback (shake, flash, float, sound, haptic)
 * via a Pinia $onAction subscription — replaces watchers + boolean flags.
 *
 * Intercepts two store actions:
 * - changeLife          → feedback varies by source (commit vs direct)
 * - dealCommanderDamage → always shake + flash + hit sound
 */
export function useLifeFeedback(options: UseLifeFeedbackOptions) {
  const gameStore = useGameStore()
  const settingsStore = useSettingsStore()

  let pendingSource: LifeChangeSource | null = null

  /** Call before a store action so $onAction knows the feedback context */
  function setSource(source: LifeChangeSource) {
    pendingSource = source
  }

  const unsubscribe = gameStore.$onAction(({ name, args, after }) => {
    // ── changeLife(playerId, amount) ──
    if (name === 'changeLife') {
      const [actionPlayerId, amount] = args as [string, number]
      if (actionPlayerId !== options.playerId()) return

      // Capture and reset source synchronously (before action runs)
      const source = pendingSource
      pendingSource = null

      after(() => {
        applyLifeChangeFeedback(amount, source)
      })
    }

    // ── dealCommanderDamage(targetPlayerId, commanderId, amount) ──
    if (name === 'dealCommanderDamage') {
      const [targetPlayerId] = args as [string, string, number]
      if (targetPlayerId !== options.playerId()) return

      // Snapshot life before so we can detect clamped-to-zero cases
      const lifeBefore = options.getLifeTotal()

      after(() => {
        const actualDamage = lifeBefore - options.getLifeTotal()
        if (actualDamage <= 0) return

        options.triggerDamageShake(actualDamage)
        options.setFlashType('negative')
        playDamageHit(actualDamage)
      })
    }
  })

  function applyLifeChangeFeedback(amount: number, source: LifeChangeSource | null) {
    // Always: visual flash + floating number
    options.setFlashType(amount > 0 ? 'positive' : 'negative')
    setTimeout(() => options.addFloat(amount, 'life'), FLOAT_ANIMATION_DELAY_MS)

    // Always: shake + hit sound on damage
    if (amount < 0) {
      options.triggerDamageShake(Math.abs(amount))
      playDamageHit(Math.abs(amount))
    }

    // Sound + haptic varies by source
    if (source === 'commit') {
      // Batched tap commit — per-tap sounds already played during accumulation.
      // Only add large-change feedback if the total is significant.
      if (Math.abs(amount) >= LARGE_LIFE_CHANGE_THRESHOLD) {
        if (settingsStore.hapticFeedback) heavyFeedback()
        playLargeLifeChange(amount > 0)
      }
      if (settingsStore.hapticFeedback && options.getLifeTotal() <= 0) warningFeedback()
    } else if (source === 'direct') {
      // Drag / numpad — full sound + haptic
      if (settingsStore.hapticFeedback) {
        if (options.getLifeTotal() <= 0) warningFeedback()
        else if (Math.abs(amount) >= LARGE_LIFE_CHANGE_THRESHOLD) heavyFeedback()
        else lifeFeedback()
      }
      if (Math.abs(amount) >= LARGE_LIFE_CHANGE_THRESHOLD) {
        playLargeLifeChange(amount > 0)
      } else {
        playLifeChange(amount > 0)
      }
    }
    // source === null → unknown external caller, visual-only FX (flash + float + shake)
  }

  onUnmounted(() => {
    unsubscribe()
  })

  return { setSource }
}
