import { computed } from 'vue'
import gsap from 'gsap'

interface UseSheetAnimationOptions {
  /** Reactive getter for the current rotation in degrees (0, 90, 180, 270). */
  rotation: () => number
  /** Reactive getter for the popup frame element (from GameFrame ref). */
  getFrameElement: () => HTMLElement | undefined | null
  /**
   * Dimension constraints applied when the popup is rotated sideways.
   * maxWidth / maxHeight are swapped vs the normal orientation.
   * Defaults: maxWidth = 'calc(100vh - 80px)', maxHeight = 'calc(100vw - 32px)'
   */
  sidewaysConstraints?: { maxWidth?: string; maxHeight?: string }
  /**
   * Optional vertical offset for enter/leave animation (e.g. DiceRollerSheet uses y: -20).
   * Defaults to 0 (no vertical movement).
   */
  verticalOffset?: number
  /**
   * Easing for the leave animation on the popup frame.
   * Defaults to 'power3.in'.
   */
  leaveEase?: string
}

export function useSheetAnimation(options: UseSheetAnimationOptions) {
  const defaultSidewaysMaxWidth = options.sidewaysConstraints?.maxWidth ?? 'calc(100vh - 80px)'
  const defaultSidewaysMaxHeight = options.sidewaysConstraints?.maxHeight ?? 'calc(100vw - 32px)'
  const verticalOffset = options.verticalOffset ?? 0
  const leaveEase = options.leaveEase ?? 'power3.in'

  const isSideways = computed(() => {
    const rotationValue = options.rotation()
    return rotationValue === 90 || rotationValue === 270
  })

  const popupRotationStyle = computed(() => {
    const rotationValue = options.rotation()
    const style: Record<string, string> = {}
    if (rotationValue !== 0) style.transform = `rotate(${rotationValue}deg)`
    if (isSideways.value) {
      style.maxWidth = defaultSidewaysMaxWidth
      style.maxHeight = defaultSidewaysMaxHeight
    }
    return style
  })

  function onEnter(element: Element, done: () => void) {
    const overlayElement = element as HTMLElement
    overlayElement.style.pointerEvents = 'none'

    const popupElement = options.getFrameElement()
    const rotationValue = options.rotation()

    gsap.fromTo(overlayElement, { opacity: 0 }, { opacity: 1, duration: 0.2 })

    if (popupElement) {
      const fromProps: gsap.TweenVars = { scale: 0.85, opacity: 0, rotation: rotationValue }
      const toProps: gsap.TweenVars = {
        scale: 1,
        opacity: 1,
        rotation: rotationValue,
        duration: 0.3,
        ease: 'back.out(1.7)',
        onComplete: () => {
          overlayElement.style.pointerEvents = ''
          done()
        },
      }

      if (verticalOffset !== 0) {
        fromProps.y = verticalOffset
        toProps.y = 0
      }

      gsap.fromTo(popupElement, fromProps, toProps)
    } else {
      overlayElement.style.pointerEvents = ''
      done()
    }
  }

  function onLeave(element: Element, done: () => void) {
    const popupElement = options.getFrameElement()
    const rotationValue = options.rotation()

    if (popupElement) {
      const leaveProps: gsap.TweenVars = {
        scale: 0.8,
        opacity: 0,
        rotation: rotationValue,
        duration: 0.2,
        ease: leaveEase,
      }

      if (verticalOffset !== 0) {
        leaveProps.y = verticalOffset / 2
      }

      gsap.to(popupElement, leaveProps)
    }

    gsap.to(element, { opacity: 0, duration: 0.2, onComplete: done })
  }

  return { popupRotationStyle, isSideways, onEnter, onLeave }
}
