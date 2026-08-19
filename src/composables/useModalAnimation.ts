import { createAnimation } from '@ionic/vue'
import type { Animation } from '@ionic/vue'
import { getCurrentInstance, onUnmounted } from 'vue'
import gsap from 'gsap'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * Custom Ionic modal enter/leave animations with GSAP content stagger.
 * Replaces the default slide-up with a scale+fade entrance and
 * staggers inner [data-animate] children after the modal opens.
 *
 * With prefers-reduced-motion, only a near-instant opacity fade is applied
 * (no transform), avoiding the visual flash a 1ms scale/translate causes.
 *
 * Note: ion-modal uses shadow DOM, so we must query via baseEl.shadowRoot.
 */
export function useModalAnimation() {
  // Pending [data-animate] stagger tween; killed before a new enter run,
  // when the modal starts leaving, and on component unmount.
  let contentStaggerTween: gsap.core.Tween | null = null

  function killContentStagger() {
    contentStaggerTween?.kill()
    contentStaggerTween = null
  }

  // Only register lifecycle cleanup when called inside a component setup.
  if (getCurrentInstance()) {
    onUnmounted(killContentStagger)
  }

  function enterAnimation(baseEl: HTMLElement): Animation {
    const root = baseEl.shadowRoot ?? baseEl
    const backdropEl = root.querySelector('ion-backdrop')
    const wrapperEl = root.querySelector('.modal-wrapper')
    const reducedMotion = prefersReducedMotion.value
    const enterDurationMs = reducedMotion ? 1 : 400

    const rootAnimation = createAnimation()
      .addElement(baseEl)
      .duration(enterDurationMs)

    if (backdropEl) {
      const backdropAnimation = createAnimation()
        .addElement(backdropEl)
        .fromTo('opacity', '0', 'var(--backdrop-opacity)')
        .duration(enterDurationMs)
      rootAnimation.addAnimation(backdropAnimation)
    }

    if (wrapperEl) {
      const wrapperAnimation = createAnimation()
        .addElement(wrapperEl)
        .fromTo('opacity', '0', '1')
        .duration(enterDurationMs)
      if (!reducedMotion) {
        wrapperAnimation
          .fromTo('transform', 'scale(0.85)', 'scale(1)')
          .easing('cubic-bezier(0.34, 1.56, 0.64, 1)')
      }
      rootAnimation.addAnimation(wrapperAnimation)
    }

    if (!reducedMotion) {
      rootAnimation.onFinish(() => {
        // Stagger inner [data-animate] children after modal opens
        const animateTargets = wrapperEl?.querySelectorAll('[data-animate]')
        if (animateTargets && animateTargets.length > 0) {
          killContentStagger()
          contentStaggerTween = gsap.fromTo(
            animateTargets,
            { opacity: 0, y: 16 },
            {
              opacity: 1,
              y: 0,
              duration: 0.3,
              ease: 'back.out(1.7)',
              stagger: { each: 0.08, from: 'start' },
              delay: 0.05,
              onComplete: () => {
                contentStaggerTween = null
              },
            },
          )
        }
      })
    }

    return rootAnimation
  }

  function leaveAnimation(baseEl: HTMLElement): Animation {
    // If the modal closes while the content stagger is mid-flight, stop it
    // so it cannot keep writing to soon-to-be-detached nodes.
    killContentStagger()

    const root = baseEl.shadowRoot ?? baseEl
    const backdropEl = root.querySelector('ion-backdrop')
    const wrapperEl = root.querySelector('.modal-wrapper')
    const reducedMotion = prefersReducedMotion.value
    const leaveDurationMs = reducedMotion ? 1 : 250

    const rootAnimation = createAnimation()
      .addElement(baseEl)
      .duration(leaveDurationMs)

    if (backdropEl) {
      const backdropAnimation = createAnimation()
        .addElement(backdropEl)
        .fromTo('opacity', 'var(--backdrop-opacity)', '0')
        .duration(leaveDurationMs)
      rootAnimation.addAnimation(backdropAnimation)
    }

    if (wrapperEl) {
      const wrapperAnimation = createAnimation()
        .addElement(wrapperEl)
        .fromTo('opacity', '1', '0')
        .duration(leaveDurationMs)
      if (!reducedMotion) {
        wrapperAnimation
          .fromTo('transform', 'translateY(0%) scale(1)', 'translateY(100%) scale(0.95)')
          .easing('cubic-bezier(0.55, 0.06, 0.68, 0.19)')
      }
      rootAnimation.addAnimation(wrapperAnimation)
    }

    return rootAnimation
  }

  return { enterAnimation, leaveAnimation }
}
