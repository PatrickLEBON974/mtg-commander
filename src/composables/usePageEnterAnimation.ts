import { onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * Choreographed page-enter animation using GSAP timeline.
 * Selects all [data-animate] children inside the given root and staggers them
 * in with opacity + y offset. Call in any view's setup to get automatic
 * entry animation on mount.
 *
 * @param rootSelector - CSS selector for the container (default: 'ion-content')
 */
export function usePageEnterAnimation(rootSelector = 'ion-content') {
  let timeline: gsap.core.Timeline | null = null
  let pendingEnterFrameId: number | null = null

  function play(root?: Element | null) {
    const container = root ?? document.querySelector(rootSelector)
    if (!container) return

    const targets = container.querySelectorAll('[data-animate]')
    if (targets.length === 0) return

    if (prefersReducedMotion.value) {
      gsap.set(targets, { opacity: 1, y: 0 })
      return
    }

    // Reset before playing
    gsap.set(targets, { opacity: 0, y: 20, scale: 0.97 })

    timeline?.kill()
    timeline = gsap.timeline()
    timeline.to(targets, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.4,
      ease: 'back.out(1.4)',
      stagger: { each: 0.08, from: 'start' },
    })
  }

  function replay() {
    timeline?.kill()
    play()
  }

  onMounted(() => {
    // Small delay to let DOM settle after Ionic page transitions
    pendingEnterFrameId = requestAnimationFrame(() => {
      pendingEnterFrameId = null
      play()
    })
  })

  onUnmounted(() => {
    // Cancel the deferred mount animation so it cannot start (and tween
    // detached nodes) after the component is gone, then kill any live tween.
    if (pendingEnterFrameId !== null) {
      cancelAnimationFrame(pendingEnterFrameId)
      pendingEnterFrameId = null
    }
    timeline?.kill()
    timeline = null
  })

  return { replay }
}
