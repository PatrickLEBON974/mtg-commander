import { onBeforeUnmount } from 'vue'
import gsap from 'gsap'
import { prefersReducedMotion } from '@/utils/motion'

interface DamageShakeOptions {
  containerRef: () => HTMLElement | null | undefined
}

/**
 * Shake intensity tiers based on damage amount.
 * Each tier has a distinct feel:
 *   1-2  = subtle bump (barely noticed, doesn't annoy during normal play)
 *   3-4  = noticeable thud
 *   5-9  = heavy impact
 *   10+  = major trauma with recoil
 */
function getShakeParams(damageAmount: number) {
  if (damageAmount <= 2) {
    return { duration: 0.25, maxDistance: 3, oscillations: 2 }
  }
  if (damageAmount <= 4) {
    return { duration: 0.32, maxDistance: 7, oscillations: 3 }
  }
  if (damageAmount <= 9) {
    return { duration: 0.4, maxDistance: 11, oscillations: 4 }
  }
  return { duration: 0.5, maxDistance: 15, oscillations: 5 }
}

/**
 * Generate randomised oscillation keyframes so the shake
 * feels organic (not robotic back-and-forth).
 * Amplitude decays progressively toward zero.
 */
function buildShakeKeyframes(maxDistance: number, oscillations: number) {
  const keyframes: { x: number; y: number; duration: number; ease: string }[] = []

  for (let i = 0; i < oscillations; i++) {
    const decay = 1 - (i / oscillations) * 0.6
    const angle = Math.random() * Math.PI * 2
    const distance = maxDistance * decay

    keyframes.push({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      duration: 0.07,
      ease: 'power1.inOut',
    })

    // Snap back toward center between oscillations
    if (i < oscillations - 1) {
      keyframes.push({ x: 0, y: 0, duration: 0.04, ease: 'power2.out' })
    }
  }

  // Final settle to exact origin
  keyframes.push({ x: 0, y: 0, duration: 0.1, ease: 'power2.out' })
  return keyframes
}

export function useDamageShake(options: DamageShakeOptions) {
  let activeTween: gsap.core.Timeline | null = null

  function triggerDamageShake(damageAmount: number) {
    if (prefersReducedMotion.value) return

    const container = options.containerRef()
    if (!container) return

    // Kill any in-flight shake and reset
    if (activeTween) {
      activeTween.kill()
      gsap.set(container, { x: 0, y: 0 })
    }

    const { maxDistance, oscillations } = getShakeParams(damageAmount)
    const keyframes = buildShakeKeyframes(maxDistance, oscillations)

    const timeline = gsap.timeline({
      onComplete() { activeTween = null },
    })

    for (const kf of keyframes) {
      timeline.to(container, {
        x: kf.x,
        y: kf.y,
        duration: kf.duration,
        ease: kf.ease,
      })
    }

    activeTween = timeline
  }

  onBeforeUnmount(() => {
    if (activeTween) {
      activeTween.kill()
      activeTween = null
    }
    const container = options.containerRef()
    if (container) {
      gsap.set(container, { x: 0, y: 0 })
    }
  })

  return { triggerDamageShake }
}
