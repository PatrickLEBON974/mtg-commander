/**
 * Shared reduced-motion detection.
 * Reactive ref that updates when the user changes their OS preference.
 * Replaces the duplicated module-level const in 7+ files.
 */
import { ref } from 'vue'

const mediaQuery =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null

export const prefersReducedMotion = ref(mediaQuery?.matches ?? false)

if (mediaQuery) {
  mediaQuery.addEventListener('change', (event) => {
    prefersReducedMotion.value = event.matches
  })
}
