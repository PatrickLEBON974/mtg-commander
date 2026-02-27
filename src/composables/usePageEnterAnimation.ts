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
    gsap.set(targets, { opacity: 0, y: 20 })

    timeline = gsap.timeline()
    timeline.to(targets, {
      opacity: 1,
      y: 0,
      duration: 0.35,
      ease: 'power2.out',
      stagger: { each: 0.08, from: 'start' },
    })
  }

  function replay() {
    timeline?.kill()
    play()
  }

  onMounted(() => {
    // Small delay to let DOM settle after Ionic page transitions
    requestAnimationFrame(() => play())
  })

  onUnmounted(() => {
    timeline?.kill()
    timeline = null
  })

  return { replay }
}
