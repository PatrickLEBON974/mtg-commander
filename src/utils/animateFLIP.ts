import { nextTick } from 'vue'

interface FLIPOptions {
  /** Animation duration in seconds. Default: 0.4 */
  duration?: number
  /** CSS easing string. Default: 'cubic-bezier(0.22, 1, 0.36, 1)' */
  ease?: string
  /** Extra style resets to clear after animation (e.g. 'zIndex'). */
  additionalResets?: string[]
}

/**
 * Performs a FLIP (First-Last-Invert-Play) animation on a set of elements.
 *
 * 1. Captures current bounding rects (First)
 * 2. Executes the DOM mutation
 * 3. Waits for Vue to flush updates (nextTick)
 * 4. Calculates positional deltas (Invert)
 * 5. Applies CSS translate from old position, then transitions to new (Play)
 */
export async function animateFLIP(
  elements: HTMLElement[],
  mutation: () => void,
  options: FLIPOptions = {}
): Promise<void> {
  const {
    duration = 0.4,
    ease = 'cubic-bezier(0.22, 1, 0.36, 1)',
    additionalResets = [],
  } = options

  // First: capture current positions
  elements.forEach(element => {
    element.style.transition = 'none'
    element.style.translate = ''
  })

  // Force layout so we read clean rects
  elements[0]?.parentElement?.getBoundingClientRect()

  const firstRects = elements.map(element => element.getBoundingClientRect())

  // Mutation: apply the DOM change
  mutation()

  // Wait for Vue to flush
  await nextTick()

  // Invert: set each element to its old position via translate
  elements.forEach((element, index) => {
    const lastRect = element.getBoundingClientRect()
    const deltaX = firstRects[index]!.left - lastRect.left
    const deltaY = firstRects[index]!.top - lastRect.top

    if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return

    element.style.transition = 'none'
    element.style.translate = `${deltaX}px ${deltaY}px`
  })

  // Force layout before enabling transition
  elements[0]?.parentElement?.getBoundingClientRect()

  // Play: animate from inverted position to final position
  const durationMs = duration * 1000

  elements.forEach(element => {
    if (element.style.translate && element.style.translate !== '0px 0px') {
      element.style.transition = `translate ${duration}s ${ease}`
      element.style.translate = '0 0'
    }
  })

  // Clean up inline styles after animation completes
  setTimeout(() => {
    elements.forEach(element => {
      element.style.transition = ''
      element.style.translate = ''
      for (const property of additionalResets) {
        ;(element.style as Record<string, string>)[property] = ''
      }
    })
  }, durationMs + 50)
}
