import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import type { LayoutMode } from '@/services/persistence'

// ─── Grid templates ─────────────────────────────────────────────────
// Slot names (p0, p1, …) represent grid positions, not player indices.
// The positionMap in each LayoutEntry maps player index → slot number.

const GRIDS = {
  '1x2':             { areas: '"p0" "p1"',                       columns: '1fr',     rows: '1fr 1fr' },
  '2x1':             { areas: '"p0 p1"',                         columns: '1fr 1fr', rows: '1fr' },
  '2x2':             { areas: '"p0 p1" "p2 p3"',                 columns: '1fr 1fr', rows: '1fr 1fr' },
  '2x2_span_bottom': { areas: '"p0 p1" "p2 p2"',                 columns: '1fr 1fr', rows: '2fr 1fr' },
  '2x2_span_left':   { areas: '"p0 p1" "p0 p2"',                 columns: '1fr 2fr', rows: '1fr 1fr' },
  '2x3':             { areas: '"p0 p1" "p2 p3" "p4 p5"',         columns: '1fr 1fr', rows: '1fr 1fr 1fr' },
  '2x3_span_bottom': { areas: '"p0 p1" "p2 p3" "p4 p4"',         columns: '1fr 1fr', rows: '2fr 2fr 1fr' },
} as const

type GridType = keyof typeof GRIDS

// ─── Layout config ──────────────────────────────────────────────────

interface LayoutEntry {
  gridType: GridType
  positionMap?: number[]
  slotRotations?: number[]
}

// Base layout per player count (shared across all modes).
// 4 players use a clockwise position map: TL(0) TR(1) BR(2) BL(3).
const BASE_LAYOUTS: Record<number, LayoutEntry> = {
  2: { gridType: '1x2' },
  3: { gridType: '2x2_span_bottom' },
  4: { gridType: '2x2', positionMap: [0, 1, 3, 2] },
  5: { gridType: '2x3_span_bottom' },
  6: { gridType: '2x3' },
}

// Mode-specific overrides (spread-merged on top of base).
// Only specify what differs — gridType/positionMap inherit from base.
const MODE_OVERRIDES: Partial<Record<LayoutMode, Partial<Record<number, Partial<LayoutEntry>>>>> = {
  faceToFace: {
    2: { slotRotations: [180, 0] },
    3: { slotRotations: [180, 180, 0] },
    4: { slotRotations: [180, 180, 0, 0] },
    6: { slotRotations: [180, 180, 0, 0, 0, 0] },
  },
  faceToFaceSide: {
    2: { gridType: '2x1', slotRotations: [90, 270] },
    3: { gridType: '2x2_span_left', slotRotations: [90, 270, 270] },
    4: { slotRotations: [90, 270, 90, 270] },
    5: { positionMap: [0, 1, 3, 4, 2], slotRotations: [90, 270, 90, 270, 0] },
    6: { slotRotations: [90, 270, 90, 270, 90, 270] },
  },
  star: {
    4: { slotRotations: [180, 270, 90, 0] },
  },
}

function resolveLayout(mode: LayoutMode, count: number): LayoutEntry {
  const base = BASE_LAYOUTS[count] ?? BASE_LAYOUTS[4]!
  if (mode === 'default') return base
  const override = MODE_OVERRIDES[mode]?.[count]
  if (!override) return base
  return { ...base, ...override }
}

// ─── Composable ─────────────────────────────────────────────────────

export function usePlayerGridLayout() {
  const gameStore = useGameStore()
  const settingsStore = useSettingsStore()

  const playerCount = computed(() => gameStore.currentGame?.players.length ?? 4)
  const layoutMode = computed(() => settingsStore.layoutMode)

  const layout = computed(() => resolveLayout(layoutMode.value, playerCount.value))

  const gridStyle = computed<Record<string, string>>(() => {
    const grid = GRIDS[layout.value.gridType]
    return {
      gridTemplateAreas: grid.areas,
      gridTemplateColumns: grid.columns,
      gridTemplateRows: grid.rows,
    }
  })

  function getSlot(playerIndex: number): number {
    const customMap = gameStore.currentGame?.customPositionMap
    if (customMap) return customMap[playerIndex] ?? playerIndex
    return layout.value.positionMap?.[playerIndex] ?? playerIndex
  }

  function getCardRotation(playerIndex: number): number {
    const slot = getSlot(playerIndex)
    return layout.value.slotRotations?.[slot] ?? 0
  }

  function cardOuterClasses(playerIndex: number): string[] {
    const rotation = getCardRotation(playerIndex)
    if (rotation === 90 || rotation === 270) {
      return ['flex', 'items-center', 'justify-center']
    }
    return []
  }

  function cardOuterStyle(playerIndex: number): Record<string, string> {
    const style: Record<string, string> = {}
    style.gridArea = `p${getSlot(playerIndex)}`

    const rotation = getCardRotation(playerIndex)
    if (rotation === 90 || rotation === 270) {
      style.containerType = 'size'
    }
    return style
  }

  function cardRotationStyle(playerIndex: number): Record<string, string> {
    const rotation = getCardRotation(playerIndex)
    if (rotation === 0) return {}
    if (rotation === 180) return { transform: 'rotate(180deg)' }

    return {
      width: '100cqh',
      height: '100cqw',
      flexShrink: '0',
      transform: `rotate(${rotation}deg)`,
    }
  }

  return {
    playerGridClass: computed(() => ''),
    gridStyle,
    getSlot,
    cardOuterClasses,
    cardOuterStyle,
    cardRotationStyle,
  }
}
