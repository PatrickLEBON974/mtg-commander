import { ref, watch, onScopeDispose, type Ref } from 'vue'
import gsap from 'gsap'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * Returns a reactive display value that smoothly animates
 * whenever the source number changes (GSAP tween).
 * Falls back to instant snap if prefers-reduced-motion is active.
 */
export function useAnimatedNumber(source: Ref<number> | (() => number)) {
  const resolveValue = typeof source === 'function' ? source : () => source.value
  const displayValue = ref(resolveValue())
  const animationTarget = { value: resolveValue() }

  watch(resolveValue, (newValue) => {
    if (prefersReducedMotion.value) {
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

  onScopeDispose(() => {
    gsap.killTweensOf(animationTarget)
  })

  return displayValue
}
