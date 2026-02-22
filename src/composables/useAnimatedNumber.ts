import { ref, watch, type Ref } from 'vue'
import gsap from 'gsap'

/**
 * Returns a reactive display value that smoothly animates
 * whenever the source number changes (GSAP tween).
 * Falls back to instant snap if prefers-reduced-motion is active.
 */
export function useAnimatedNumber(source: Ref<number> | (() => number)) {
  const resolveValue = typeof source === 'function' ? source : () => source.value
  const displayValue = ref(resolveValue())
  const animationTarget = { value: resolveValue() }

  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  watch(resolveValue, (newValue) => {
    if (prefersReducedMotion) {
      displayValue.value = newValue
      return
    }

    gsap.to(animationTarget, {
      value: newValue,
      duration: 0.35,
      ease: 'power2.out',
      onUpdate: () => {
        displayValue.value = Math.round(animationTarget.value)
      },
    })
  })

  return displayValue
}
