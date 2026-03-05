import { onUnmounted } from 'vue'
import gsap from 'gsap'
import { prefersReducedMotion } from '@/utils/motion'

const MAX_ACTIVE_FLOATS = 5
const activeFloats: HTMLElement[] = []

/** Read a CSS custom property once and cache the result */
function getCSSColor(variableName: string, fallback: string): string {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim()
    return value || fallback
  } catch {
    return fallback
  }
}

const LIFE_POSITIVE_COLOR = getCSSColor('--color-life-positive', '#22c55e')
const LIFE_NEGATIVE_COLOR = getCSSColor('--color-life-negative', '#ef4444')
const POISON_COLOR = getCSSColor('--color-poison', '#a855f7')
const COMMANDER_DAMAGE_COLOR = getCSSColor('--color-commander-damage', '#f59e0b')

interface FloatingNumberOptions {
  /** Container element to position the float relative to */
  containerRef: () => HTMLElement | null | undefined
}

/**
 * Hearthstone/RPG-style floating +N/-N damage indicators.
 * Numbers arc upward and fade out. Object-pooled to max 5 active.
 *
 * Colors: green=positive, red=negative, purple=poison, amber=commander
 */
export function useFloatingNumbers(options: FloatingNumberOptions) {
  const localFloats: HTMLElement[] = []

  function addFloat(value: number, variant: 'life' | 'poison' | 'commander' = 'life') {
    if (prefersReducedMotion.value) return

    const container = options.containerRef()
    if (!container) return

    // Recycle oldest if at max
    if (activeFloats.length >= MAX_ACTIVE_FLOATS) {
      const oldest = activeFloats.shift()
      oldest?.remove()
    }

    const colorMap = {
      life: value > 0 ? LIFE_POSITIVE_COLOR : LIFE_NEGATIVE_COLOR,
      poison: POISON_COLOR,
      commander: COMMANDER_DAMAGE_COLOR,
    }

    const prefix = value > 0 ? '+' : ''
    const floatEl = document.createElement('span')
    floatEl.textContent = `${prefix}${value}`
    floatEl.setAttribute('aria-hidden', 'true')

    Object.assign(floatEl.style, {
      position: 'absolute',
      left: '50%',
      top: '40%',
      transform: 'translateX(-50%)',
      color: colorMap[variant],
      fontSize: '24px',
      fontWeight: '800',
      fontVariantNumeric: 'tabular-nums',
      pointerEvents: 'none',
      zIndex: '30',
      textShadow: '0 2px 8px rgba(0,0,0,0.6)',
      whiteSpace: 'nowrap',
    })

    container.appendChild(floatEl)
    activeFloats.push(floatEl)
    localFloats.push(floatEl)

    gsap.fromTo(
      floatEl,
      { y: 0, opacity: 1, scale: 0.8 },
      {
        y: -60,
        opacity: 0,
        scale: 1.2,
        duration: 0.9,
        ease: 'power2.out',
        onComplete: () => {
          floatEl.remove()
          const activeIndex = activeFloats.indexOf(floatEl)
          if (activeIndex > -1) activeFloats.splice(activeIndex, 1)
          const localIndex = localFloats.indexOf(floatEl)
          if (localIndex > -1) localFloats.splice(localIndex, 1)
        },
      },
    )
  }

  onUnmounted(() => {
    localFloats.forEach((el) => {
      gsap.killTweensOf(el)
      el.remove()
      const activeIndex = activeFloats.indexOf(el)
      if (activeIndex > -1) activeFloats.splice(activeIndex, 1)
    })
    localFloats.length = 0
  })

  return { addFloat }
}
