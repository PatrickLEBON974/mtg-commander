import { onScopeDispose } from 'vue'
import confetti from 'canvas-confetti'
import { prefersReducedMotion } from '@/utils/motion'

export function useCelebration() {
  let victoryTimer: ReturnType<typeof setTimeout> | null = null

  function monarchCrown() {
    if (prefersReducedMotion.value) return
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#CBAC5E', '#f5d998', '#c9a93e'],
    })
  }

  function playerEliminated() {
    if (prefersReducedMotion.value) return
    confetti({
      particleCount: 30,
      spread: 120,
      startVelocity: 15,
      gravity: 2,
      colors: ['#ef4444', '#991b1b', '#450a0a'],
      shapes: ['circle'],
      scalar: 0.6,
    })
  }

  function victory() {
    if (prefersReducedMotion.value) return
    // Big celebratory burst
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#CBAC5E', '#f5d998', '#ffffff', '#e8600a', '#4a90e2'],
    })
    // Follow-up side bursts
    victoryTimer = setTimeout(() => {
      confetti({ particleCount: 40, angle: 60, spread: 50, origin: { x: 0, y: 0.7 }, colors: ['#CBAC5E', '#f5d998'] })
      confetti({ particleCount: 40, angle: 120, spread: 50, origin: { x: 1, y: 0.7 }, colors: ['#CBAC5E', '#f5d998'] })
    }, 250)
  }

  onScopeDispose(() => {
    if (victoryTimer) {
      clearTimeout(victoryTimer)
      victoryTimer = null
    }
  })

  return { monarchCrown, playerEliminated, victory }
}
