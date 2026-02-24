import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'

/**
 * Composable that encapsulates the player grid layout logic for the game view.
 * Handles grid template areas, card rotation, outer classes, and styles based
 * on the current player count and layout mode (default, faceToFace, faceToFaceSide, star).
 */
export function usePlayerGridLayout() {
  const gameStore = useGameStore()
  const settingsStore = useSettingsStore()

  // --- Derived state ---

  const playerCount = computed(() => gameStore.currentGame?.players.length ?? 4)

  const isStarLayout = computed(
    () => settingsStore.layoutMode === 'star' && playerCount.value === 4,
  )

  // --- Grid container computeds ---

  const playerGridClass = computed(() => {
    // 4 players and star use inline grid-template-areas
    if (isStarLayout.value || playerCount.value === 4) return ''

    if (playerCount.value <= 2) return 'grid-cols-1 grid-rows-2'
    if (playerCount.value === 3) return 'grid-cols-2 grid-rows-2'
    return 'grid-cols-2 grid-rows-3'
  })

  const gridStyle = computed(() => {
    if (isStarLayout.value) {
      return {
        gridTemplateAreas: '". north ." "west . east" ". south ."',
        gridTemplateColumns: '1fr 1fr 1fr',
        gridTemplateRows: '1fr 1fr 1fr',
      }
    }

    // 4 players: clockwise order TL(0) -> TR(1) -> BR(2) -> BL(3)
    if (playerCount.value === 4) {
      return {
        gridTemplateAreas: '"p0 p1" "p3 p2"',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
      }
    }

    return {}
  })

  // --- Per-card helpers ---

  function getGridArea(index: number): string | undefined {
    if (isStarLayout.value) {
      return ['north', 'east', 'south', 'west'][index]
    }

    if (playerCount.value === 4) {
      return `p${index}`
    }

    return undefined
  }

  function getCardRotation(index: number): number {
    const layoutMode = settingsStore.layoutMode

    if (layoutMode === 'default') return 0

    // Star with 4 players: N=180, E=270, S=0, W=90
    if (layoutMode === 'star' && playerCount.value === 4) {
      return [180, 270, 0, 90][index] ?? 0
    }

    // Face-to-face side (4 players clockwise): TL=90, TR=270, BR=270, BL=90
    if (layoutMode === 'faceToFaceSide') {
      if (playerCount.value === 4) return [90, 270, 270, 90][index] ?? 90
      return index % 2 === 0 ? 90 : 270
    }

    // Face-to-face: top row (first half) -> 180deg, bottom row -> 0deg
    const halfPlayerCount = Math.ceil(playerCount.value / 2)
    return index < halfPlayerCount ? 180 : 0
  }

  function cardOuterClasses(index: number): string[] {
    const classes: string[] = []
    const rotation = getCardRotation(index)

    // 3-player col-span
    if (playerCount.value === 3 && index === 2 && !isStarLayout.value) {
      classes.push('col-span-2')
    }

    // Side cards need flex centering for dimension swap
    if (rotation === 90 || rotation === 270) {
      classes.push('flex', 'items-center', 'justify-center')
    }

    return classes
  }

  function cardOuterStyle(index: number): Record<string, string> {
    const style: Record<string, string> = {}

    const gridArea = getGridArea(index)
    if (gridArea) style.gridArea = gridArea

    // Side cards need size containment for cqw/cqh units
    const rotation = getCardRotation(index)
    if (rotation === 90 || rotation === 270) {
      style.containerType = 'size'
    }

    return style
  }

  function cardRotationStyle(index: number): Record<string, string> {
    const rotation = getCardRotation(index)
    if (rotation === 0) return {}
    if (rotation === 180) return { transform: 'rotate(180deg)' }

    // 90 or 270: swap dimensions using container query units
    // Parent has container-type: size, so cqw = parent width, cqh = parent height
    // After rotation, visual width = original height and vice versa
    return {
      width: '100cqh',
      height: '100cqw',
      flexShrink: '0',
      transform: `rotate(${rotation}deg)`,
    }
  }

  return {
    isStarLayout,
    playerGridClass,
    gridStyle,
    getGridArea,
    getCardRotation,
    cardOuterClasses,
    cardOuterStyle,
    cardRotationStyle,
  }
}
