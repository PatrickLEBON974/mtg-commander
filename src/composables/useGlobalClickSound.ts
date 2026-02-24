import { onMounted, onUnmounted } from 'vue'
import { playUiClick } from '@/services/sounds'

/**
 * Composable that adds a global click sound to all interactive elements.
 * Elements (or ancestors) with [data-sound="none"] are skipped —
 * use this on buttons that already play their own game-specific sound.
 */

const INTERACTIVE_SELECTORS = [
  'button',
  'ion-button',
  'ion-toggle',
  'ion-select',
  'ion-select-option',
  'ion-segment-button',
  'ion-checkbox',
  'ion-radio',
  '[role="button"]',
  '.btn-press',
].join(',')

function handleGlobalClick(event: Event) {
  const target = event.target as HTMLElement
  if (!target) return

  // Find the nearest interactive element (the click might be on a child like an icon or span)
  const interactiveElement = target.closest(INTERACTIVE_SELECTORS)
  if (!interactiveElement) return

  // Skip if this element (or an ancestor) opts out with data-sound="none"
  if (interactiveElement.closest('[data-sound="none"]')) return

  playUiClick()
}

export function useGlobalClickSound() {
  onMounted(() => {
    document.addEventListener('click', handleGlobalClick, { capture: true })
  })

  onUnmounted(() => {
    document.removeEventListener('click', handleGlobalClick, { capture: true })
  })
}
