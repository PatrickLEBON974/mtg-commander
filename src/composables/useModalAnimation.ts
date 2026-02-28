import { createAnimation } from '@ionic/vue'
import type { Animation } from '@ionic/vue'
import gsap from 'gsap'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * Custom Ionic modal enter/leave animations with GSAP content stagger.
 * Replaces the default slide-up with a scale+fade entrance and
 * staggers inner [data-animate] children after the modal opens.
 *
 * Note: ion-modal uses shadow DOM, so we must query via baseEl.shadowRoot.
 */
export function useModalAnimation() {
  function enterAnimation(baseEl: HTMLElement): Animation {
    const root = baseEl.shadowRoot ?? baseEl
    const backdropEl = root.querySelector('ion-backdrop')
    const wrapperEl = root.querySelector('.modal-wrapper')

    const rootAnimation = createAnimation()
      .addElement(baseEl)
      .duration(prefersReducedMotion.value ? 1 : 400)

    if (backdropEl) {
      const backdropAnimation = createAnimation()
        .addElement(backdropEl)
        .fromTo('opacity', '0', 'var(--backdrop-opacity)')
        .duration(prefersReducedMotion.value ? 1 : 400)
      rootAnimation.addAnimation(backdropAnimation)
    }

    if (wrapperEl) {
      const wrapperAnimation = createAnimation()
        .addElement(wrapperEl)
        .fromTo('opacity', '0', '1')
        .fromTo('transform', 'scale(0.85)', 'scale(1)')
        .duration(prefersReducedMotion.value ? 1 : 400)
        .easing('cubic-bezier(0.34, 1.56, 0.64, 1)')
      rootAnimation.addAnimation(wrapperAnimation)
    }

    if (!prefersReducedMotion.value) {
      rootAnimation.onFinish(() => {
        // Stagger inner [data-animate] children after modal opens
        const animateTargets = wrapperEl?.querySelectorAll('[data-animate]')
        if (animateTargets && animateTargets.length > 0) {
          gsap.fromTo(
            animateTargets,
            { opacity: 0, y: 16 },
            {
              opacity: 1,
              y: 0,
              duration: 0.3,
              ease: 'back.out(1.7)',
              stagger: { each: 0.08, from: 'start' },
              delay: 0.05,
            },
          )
        }
      })
    }

    return rootAnimation
  }

  function leaveAnimation(baseEl: HTMLElement): Animation {
    const root = baseEl.shadowRoot ?? baseEl
    const backdropEl = root.querySelector('ion-backdrop')
    const wrapperEl = root.querySelector('.modal-wrapper')

    const rootAnimation = createAnimation()
      .addElement(baseEl)
      .duration(prefersReducedMotion.value ? 1 : 250)

    if (backdropEl) {
      const backdropAnimation = createAnimation()
        .addElement(backdropEl)
        .fromTo('opacity', 'var(--backdrop-opacity)', '0')
        .duration(prefersReducedMotion.value ? 1 : 250)
      rootAnimation.addAnimation(backdropAnimation)
    }

    if (wrapperEl) {
      const wrapperAnimation = createAnimation()
        .addElement(wrapperEl)
        .fromTo('opacity', '1', '0')
        .fromTo('transform', 'translateY(0%) scale(1)', 'translateY(100%) scale(0.95)')
        .duration(prefersReducedMotion.value ? 1 : 250)
        .easing('cubic-bezier(0.55, 0.06, 0.68, 0.19)')
      rootAnimation.addAnimation(wrapperAnimation)
    }

    return rootAnimation
  }

  return { enterAnimation, leaveAnimation }
}
