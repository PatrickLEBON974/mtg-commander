import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'

/**
 * Player grid layout composable.
 *
 * Handles grid structure, card rotation, and dimension swap for all
 * combinations of player count (2–6) and layout mode.
 *
 * Layout modes:
 *  - default:         all cards face up (0°)
 *  - faceToFace:      top row(s) 180°, bottom row(s) 0°
 *  - faceToFaceSide:  left column 90°, right column 270°
 *  - star:            each card faces center (4 players only, falls back to default otherwise)
 *
 * Grid rules:
 *  - Zero empty cells — every pixel is used
 *  - Balanced sizes — col-span / row-span only when odd player count requires it
 *  - Rotations are consistent per row (faceToFace) or per column (faceToFaceSide)
 */
export function usePlayerGridLayout() {
  const gameStore = useGameStore()
  const settingsStore = useSettingsStore()

  const playerCount = computed(() => gameStore.currentGame?.players.length ?? 4)
  const layoutMode = computed(() => settingsStore.layoutMode)

  // ─── Grid areas flag ──────────────────────────────────────────────
  // 3, 4, 5 players need grid-template-areas for col-span / row-span / clockwise order.
  // 2 and 6 use simple Tailwind grid classes.

  const needsGridAreas = computed(() => {
    const count = playerCount.value
    if (count === 3 || count === 4 || count === 5) return true
    // 2-player faceToFaceSide also needs areas (switches to 2 cols × 1 row)
    // Actually no — just a different Tailwind class suffices.
    return false
  })

  // ─── Grid container ───────────────────────────────────────────────

  const playerGridClass = computed(() => {
    if (needsGridAreas.value) return ''

    const count = playerCount.value

    if (count <= 2) {
      // faceToFaceSide: 2 columns side by side
      if (layoutMode.value === 'faceToFaceSide') return 'grid-cols-2'
      // default / faceToFace: stacked vertically
      return 'grid-cols-1 grid-rows-2'
    }

    // 6+ players: simple 2×3
    return 'grid-cols-2 grid-rows-3'
  })

  const gridStyle = computed<Record<string, string>>(() => {
    if (!needsGridAreas.value) return {}

    const count = playerCount.value
    const mode = layoutMode.value

    // ── 3 players ──
    if (count === 3) {
      if (mode === 'faceToFaceSide') {
        // P0 left (row-span-2), P1 top-right, P2 bottom-right
        return {
          gridTemplateAreas: '"p0 p1" "p0 p2"',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
        }
      }
      // default / faceToFace / star: P0+P1 top, P2 full-width bottom
      return {
        gridTemplateAreas: '"p0 p1" "p2 p2"',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
      }
    }

    // ── 4 players — always clockwise: TL(0) TR(1) BR(2) BL(3) ──
    if (count === 4) {
      return {
        gridTemplateAreas: '"p0 p1" "p3 p2"',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
      }
    }

    // ── 5 players ──
    if (count === 5) {
      // P0+P1 top, P2+P3 middle, P4 full-width bottom
      return {
        gridTemplateAreas: '"p0 p1" "p2 p3" "p4 p4"',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr 1fr',
      }
    }

    return {}
  })

  // ─── Rotation helpers ─────────────────────────────────────────────

  function getFaceToFaceRotation(index: number, count: number): number {
    // 5 players: faceToFace disabled — fall back to default
    if (count === 5) return 0
    // Split by rows: top row ↓ (180°), remaining rows ↑ (0°)
    // For all counts, row 0 = indices 0–1 face down.
    // This ensures no mixed directions on any row.
    if (count <= 2) return index === 0 ? 180 : 0
    // 3 players: P0,P1 (row 0) ↓, P2 (row 1) ↑
    // 4 players: P0,P1 (row 0) ↓, P2,P3 (row 1) ↑
    // 6 players: P0,P1 (row 0) ↓, P2,P3,P4,P5 (rows 1–2) ↑
    return index < 2 ? 180 : 0
  }

  function getFaceToFaceSideRotation(index: number, count: number): number {
    // Left column → (90°), right column ← (270°)
    if (count <= 2) return index === 0 ? 90 : 270

    if (count === 3) {
      // P0 = left (row-span-2) →, P1/P2 = right ←
      return index === 0 ? 90 : 270
    }

    if (count === 4) {
      // Clockwise grid: TL→, TR←, BR←, BL→
      return [90, 270, 270, 90][index] ?? 90
    }

    // 5 players: grid "p0 p1" / "p2 p3" / "p4 p4"
    // Left column (P0,P2) →, right column (P1,P3) ←
    // P4 (full-width bottom) faces outward toward the bottom-edge player (0°)
    if (count === 5) {
      return [90, 270, 90, 270, 0][index] ?? 90
    }

    // 6 players: left column →, right column ←
    return index % 2 === 0 ? 90 : 270
  }

  function getStarRotation(index: number, count: number): number {
    // Star only works for 4 players. Each card faces center.
    // Clockwise grid: TL=180°(N), TR=270°(E), BR=0°(S), BL=90°(W)
    if (count !== 4) return 0
    return [180, 270, 0, 90][index] ?? 0
  }

  // ─── Card rotation (main entry point) ─────────────────────────────

  function getCardRotation(index: number): number {
    const mode = layoutMode.value
    const count = playerCount.value

    if (mode === 'default') return 0
    if (mode === 'faceToFace') return getFaceToFaceRotation(index, count)
    if (mode === 'faceToFaceSide') return getFaceToFaceSideRotation(index, count)
    if (mode === 'star') return getStarRotation(index, count)

    return 0
  }

  // ─── Per-card helpers ─────────────────────────────────────────────

  function cardOuterClasses(index: number): string[] {
    const classes: string[] = []
    const rotation = getCardRotation(index)

    // Side cards need flex centering for the dimension-swapped child
    if (rotation === 90 || rotation === 270) {
      classes.push('flex', 'items-center', 'justify-center')
    }

    return classes
  }

  function cardOuterStyle(index: number): Record<string, string> {
    const style: Record<string, string> = {}

    // Assign grid area when using grid-template-areas
    if (needsGridAreas.value) {
      style.gridArea = `p${index}`
    }

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

    // 90° or 270°: swap dimensions using container query units.
    // Parent has container-type: size → cqw = parent width, cqh = parent height.
    // After rotation, visual width = original height and vice versa.
    return {
      width: '100cqh',
      height: '100cqw',
      flexShrink: '0',
      transform: `rotate(${rotation}deg)`,
    }
  }

  return {
    playerGridClass,
    gridStyle,
    cardOuterClasses,
    cardOuterStyle,
    cardRotationStyle,
  }
}
