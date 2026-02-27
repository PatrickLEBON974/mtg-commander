import { ref, watch } from 'vue'
import { isDragLocked } from '@/composables/useDragLock'

const DRAG_THRESHOLD = 10

interface UseCommanderDragDropOptions {
  playerId: () => string
  attackerIdProp: () => string | null | undefined
  onDragDrop: (targetPlayerId: string) => void
  onStateChanged: () => void
}

export function useCommanderDragDrop(options: UseCommanderDragDropOptions) {
  const { playerId, attackerIdProp, onDragDrop, onStateChanged } = options

  const showCommanderDamage = ref(false)
  const commanderDamageInitialAttackerId = ref<string | null>(null)

  let commanderDragActive = false
  let commanderDragStartX = 0
  let commanderDragStartY = 0
  let commanderDragIndicator: HTMLElement | null = null

  // Watch external prop to open modal with pre-selected attacker
  watch(attackerIdProp, (attackerId) => {
    if (attackerId) {
      commanderDamageInitialAttackerId.value = attackerId
      showCommanderDamage.value = true
    }
  })

  function onCommanderClick() {
    if (!commanderDragActive) {
      commanderDamageInitialAttackerId.value = null
      showCommanderDamage.value = true
    }
  }

  function onCommanderTouchStart(event: TouchEvent) {
    const touch = event.touches[0]
    if (!touch) return
    commanderDragActive = false
    commanderDragStartX = touch.clientX
    commanderDragStartY = touch.clientY
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
    }

    if (commanderDragActive) {
      event.preventDefault()
      moveCommanderDragIndicator(touch.clientX, touch.clientY)
      highlightDropTarget(touch.clientX, touch.clientY)
    }
  }

  function onCommanderTouchEnd(event: TouchEvent) {
    if (commanderDragActive) {
      const touch = event.changedTouches[0]
      if (touch) {
        const targetPlayerId = findDropTarget(touch.clientX, touch.clientY)
        if (targetPlayerId && targetPlayerId !== playerId()) {
          onDragDrop(targetPlayerId)
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
    commanderDamageInitialAttackerId.value = null
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

  function createCommanderDragIndicator() {
    commanderDragIndicator = document.createElement('div')
    const swordSvg = createSwordSvg()
    swordSvg.style.transform = 'translateY(-2px)'
    commanderDragIndicator.appendChild(swordSvg)
    Object.assign(commanderDragIndicator.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: '100',
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '52px',
      height: '52px',
      borderRadius: '50%',
      backgroundColor: 'rgba(245, 158, 11, 0.9)',
      boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4), 0 2px 8px rgba(0,0,0,0.5)',
      willChange: 'transform',
    })
    document.body.appendChild(commanderDragIndicator)
  }

  function moveCommanderDragIndicator(x: number, y: number) {
    if (commanderDragIndicator) {
      commanderDragIndicator.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
    }
  }

  function removeCommanderDragIndicator() {
    commanderDragIndicator?.remove()
    commanderDragIndicator = null
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
      playerPanel.style.boxShadow = 'inset 0 0 0 3px var(--color-commander-damage), 0 0 24px rgba(245, 158, 11, 0.3)'
    }
  }

  function clearDropHighlights() {
    document.querySelectorAll('[data-commander-player]').forEach((el) => {
      ;(el as HTMLElement).style.boxShadow = ''
    })
  }

  function cleanup() {
    clearDropHighlights()
    removeCommanderDragIndicator()
    isDragLocked.value = false
  }

  return {
    showCommanderDamage,
    commanderDamageInitialAttackerId,
    onCommanderClick,
    onCommanderTouchStart,
    onCommanderTouchMove,
    onCommanderTouchEnd,
    onCommanderTouchCancel,
    onCommanderDamageClose,
    cleanup,
  }
}
