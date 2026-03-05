import { ref, watch } from 'vue'
import gsap from 'gsap'
import { isDragLocked } from '@/composables/useDragLock'
import { tapFeedback, heavyFeedback } from '@/services/haptics'
import { useSettingsStore } from '@/stores/settingsStore'
import { prefersReducedMotion } from '@/utils/motion'

const DRAG_THRESHOLD = 10
const GHOST_INTERVAL = 3
const MAX_GHOSTS = 10
const INDICATOR_SIZE = 52
const INDICATOR_HALF = INDICATOR_SIZE / 2

interface UseCommanderDragDropOptions {
  playerId: () => string
  targetIdProp: () => string | null | undefined
  onDragDrop: (targetPlayerId: string) => void
  onStateChanged: () => void
}

export function useCommanderDragDrop(options: UseCommanderDragDropOptions) {
  const { playerId, targetIdProp, onDragDrop, onStateChanged } = options

  const showCommanderDamage = ref(false)
  const commanderDamageInitialTargetId = ref<string | null>(null)

  let commanderDragActive = false
  let commanderDragStartX = 0
  let commanderDragStartY = 0
  let commanderDragIndicator: HTMLElement | null = null
  let ghostFrameCounter = 0
  const activeGhosts: HTMLElement[] = []

  // Watch external prop to open modal with pre-selected target
  watch(targetIdProp, (targetId) => {
    if (targetId) {
      commanderDamageInitialTargetId.value = targetId
      showCommanderDamage.value = true
    }
  })

  function onCommanderClick() {
    if (!commanderDragActive) {
      commanderDamageInitialTargetId.value = null
      showCommanderDamage.value = true
    }
  }

  function onCommanderTouchStart(event: TouchEvent) {
    const touch = event.touches[0]
    if (!touch) return
    commanderDragActive = false
    commanderDragStartX = touch.clientX
    commanderDragStartY = touch.clientY
    ghostFrameCounter = 0
  }

  function onCommanderTouchMove(event: TouchEvent) {
    const touch = event.touches[0]
    if (!touch) return

    const deltaX = touch.clientX - commanderDragStartX
    const deltaY = touch.clientY - commanderDragStartY

    if (!commanderDragActive && Math.hypot(deltaX, deltaY) > DRAG_THRESHOLD) {
      commanderDragActive = true
      isDragLocked.value = true
      createCommanderDragIndicator()
      const settingsStore = useSettingsStore()
      if (settingsStore.hapticFeedback) tapFeedback()
    }

    if (commanderDragActive) {
      event.preventDefault()
      moveCommanderDragIndicator(touch.clientX, touch.clientY)
      highlightDropTarget(touch.clientX, touch.clientY)

      // Ghost trail
      if (!prefersReducedMotion.value) {
        ghostFrameCounter++
        if (ghostFrameCounter % GHOST_INTERVAL === 0) {
          spawnGhostTrail(touch.clientX, touch.clientY)
        }
      }
    }
  }

  function onCommanderTouchEnd(event: TouchEvent) {
    if (commanderDragActive) {
      const touch = event.changedTouches[0]
      if (touch) {
        const targetPlayerId = findDropTarget(touch.clientX, touch.clientY)
        if (targetPlayerId && targetPlayerId !== playerId()) {
          onDragDrop(targetPlayerId)

          // Impact flash on the drop target
          if (!prefersReducedMotion.value) {
            const targetElement = document.querySelector(
              `[data-commander-player="${targetPlayerId}"]`,
            ) as HTMLElement | null
            if (targetElement) {
              gsap.fromTo(targetElement,
                { boxShadow: '0 0 30px rgba(245, 158, 11, 0.6), inset 0 0 20px rgba(245, 158, 11, 0.3)' },
                { boxShadow: '', duration: 0.6, ease: 'power2.out' },
              )
            }
          }

          const settingsStore = useSettingsStore()
          if (settingsStore.hapticFeedback) heavyFeedback()
        }
      }
      clearDropHighlights()
      removeCommanderDragIndicator()
      commanderDragActive = false
      isDragLocked.value = false
      return
    }
    commanderDragActive = false
  }

  function onCommanderTouchCancel() {
    clearDropHighlights()
    removeCommanderDragIndicator()
    commanderDragActive = false
    isDragLocked.value = false
  }

  function onCommanderDamageClose() {
    showCommanderDamage.value = false
    // Don't clear initialTargetId here — visibleRows would flash all players
    // during the close animation. It gets set correctly on next open:
    // onCommanderClick sets it to null, targetIdProp watcher sets it to the target.
    onStateChanged()
  }

  // --- SVG indicator ---

  function createSwordSvg(): SVGSVGElement {
    const svgNS = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(svgNS, 'svg')
    svg.setAttribute('width', '28')
    svg.setAttribute('height', '28')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('fill', 'none')
    svg.classList.add('commander-drag-sword')

    const blade = document.createElementNS(svgNS, 'path')
    blade.setAttribute('d', 'M12 2l2 10-2 2-2-2 2-10z')
    blade.setAttribute('fill', 'white')
    blade.setAttribute('opacity', '0.15')

    const shaft = document.createElementNS(svgNS, 'path')
    shaft.setAttribute('d', 'M12 2v12')
    shaft.setAttribute('stroke', 'white')
    shaft.setAttribute('stroke-width', '1.5')
    shaft.setAttribute('stroke-linecap', 'round')

    const guard = document.createElementNS(svgNS, 'path')
    guard.setAttribute('d', 'M8 14h8')
    guard.setAttribute('stroke', 'white')
    guard.setAttribute('stroke-width', '2')
    guard.setAttribute('stroke-linecap', 'round')

    const handle = document.createElementNS(svgNS, 'path')
    handle.setAttribute('d', 'M12 14v5')
    handle.setAttribute('stroke', 'white')
    handle.setAttribute('stroke-width', '2')
    handle.setAttribute('stroke-linecap', 'round')

    const pommel = document.createElementNS(svgNS, 'circle')
    pommel.setAttribute('cx', '12')
    pommel.setAttribute('cy', '20')
    pommel.setAttribute('r', '1.2')
    pommel.setAttribute('fill', 'white')

    svg.append(blade, shaft, guard, handle, pommel)
    return svg
  }

  /**
   * Positioning uses left/top (not transform) so GSAP can freely
   * animate scale + rotation on the transform property without conflicts.
   */
  function createCommanderDragIndicator() {
    commanderDragIndicator = document.createElement('div')
    const swordSvg = createSwordSvg()
    commanderDragIndicator.appendChild(swordSvg)
    Object.assign(commanderDragIndicator.style, {
      position: 'fixed',
      zIndex: '100',
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: `${INDICATOR_SIZE}px`,
      height: `${INDICATOR_SIZE}px`,
      borderRadius: '50%',
      backgroundColor: 'rgba(245, 158, 11, 0.9)',
      boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4), 0 2px 8px rgba(0,0,0,0.5)',
      willChange: 'left, top',
    })
    document.body.appendChild(commanderDragIndicator)

    // GSAP pulse + sword rotation (uses transform — no conflict with left/top)
    if (!prefersReducedMotion.value) {
      gsap.to(commanderDragIndicator, {
        scale: 1.1,
        boxShadow: '0 4px 28px rgba(245, 158, 11, 0.6), 0 2px 8px rgba(0,0,0,0.5)',
        duration: 0.6,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      })

      gsap.to(swordSvg, {
        rotation: 15,
        duration: 0.5,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        transformOrigin: '50% 50%',
      })
    }
  }

  function moveCommanderDragIndicator(x: number, y: number) {
    if (commanderDragIndicator) {
      commanderDragIndicator.style.left = `${x - INDICATOR_HALF}px`
      commanderDragIndicator.style.top = `${y - INDICATOR_HALF}px`
    }
  }

  function spawnGhostTrail(x: number, y: number) {
    if (activeGhosts.length >= MAX_GHOSTS) {
      const oldest = activeGhosts.shift()
      oldest?.remove()
    }

    const ghost = document.createElement('div')
    Object.assign(ghost.style, {
      position: 'fixed',
      left: `${x - INDICATOR_HALF}px`,
      top: `${y - INDICATOR_HALF}px`,
      zIndex: '99',
      pointerEvents: 'none',
      width: `${INDICATOR_SIZE}px`,
      height: `${INDICATOR_SIZE}px`,
      borderRadius: '50%',
      backgroundColor: 'rgba(245, 158, 11, 0.35)',
    })
    document.body.appendChild(ghost)
    activeGhosts.push(ghost)

    gsap.to(ghost, {
      opacity: 0,
      scale: 0.5,
      duration: 0.4,
      ease: 'power2.out',
      onComplete: () => {
        ghost.remove()
        const ghostIndex = activeGhosts.indexOf(ghost)
        if (ghostIndex > -1) activeGhosts.splice(ghostIndex, 1)
      },
    })
  }

  function removeCommanderDragIndicator() {
    if (commanderDragIndicator) {
      gsap.killTweensOf(commanderDragIndicator)
      const swordSvg = commanderDragIndicator.querySelector('.commander-drag-sword')
      if (swordSvg) gsap.killTweensOf(swordSvg)
    }
    commanderDragIndicator?.remove()
    commanderDragIndicator = null

    for (const ghost of activeGhosts) {
      gsap.killTweensOf(ghost)
      ghost.remove()
    }
    activeGhosts.length = 0
  }

  function findDropTarget(x: number, y: number): string | null {
    if (commanderDragIndicator) commanderDragIndicator.style.display = 'none'
    const element = document.elementFromPoint(x, y)
    if (commanderDragIndicator) commanderDragIndicator.style.display = ''

    const commanderButton = element?.closest('[data-commander-player]') as HTMLElement | null
    return commanderButton?.dataset.commanderPlayer ?? null
  }

  function highlightDropTarget(x: number, y: number) {
    clearDropHighlights()
    if (commanderDragIndicator) commanderDragIndicator.style.display = 'none'
    const element = document.elementFromPoint(x, y)
    if (commanderDragIndicator) commanderDragIndicator.style.display = ''

    const playerPanel = element?.closest('[data-commander-player]') as HTMLElement | null
    if (playerPanel && playerPanel.dataset.commanderPlayer !== playerId()) {
      playerPanel.style.boxShadow = 'inset 0 0 0 3px var(--color-commander-damage), 0 0 32px rgba(245, 158, 11, 0.4), inset 0 0 16px rgba(245, 158, 11, 0.1)'
      playerPanel.style.transition = 'box-shadow 0.15s ease'
    }
  }

  function clearDropHighlights() {
    document.querySelectorAll('[data-commander-player]').forEach((el) => {
      const htmlElement = el as HTMLElement
      htmlElement.style.boxShadow = ''
      htmlElement.style.transition = ''
    })
  }

  function cleanup() {
    clearDropHighlights()
    removeCommanderDragIndicator()
    isDragLocked.value = false
  }

  return {
    showCommanderDamage,
    commanderDamageInitialTargetId,
    onCommanderClick,
    onCommanderTouchStart,
    onCommanderTouchMove,
    onCommanderTouchEnd,
    onCommanderTouchCancel,
    onCommanderDamageClose,
    cleanup,
  }
}
