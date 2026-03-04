import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import {
  SLOT_INNER_SCREEN_CORNER,
  resolveLayout,
  screenToLocalCorner,
  cornerToStyle,
} from './usePlayerGridLayout'

/**
 * Single source of truth for a card's rotation context.
 * The card resolves everything internally from its player ID —
 * no rotation props needed from the parent.
 */
export function useCardRotationContext(playerId: () => string) {
  const gameStore = useGameStore()
  const settingsStore = useSettingsStore()

  const playerIndex = computed(() => {
    const players = gameStore.currentGame?.players
    if (!players) return 0
    const foundIndex = players.findIndex(player => player.id === playerId())
    return foundIndex >= 0 ? foundIndex : 0
  })

  const resolvedLayout = computed(() =>
    resolveLayout(settingsStore.layoutMode, gameStore.currentGame?.players.length ?? 4),
  )

  function getResolvedSlot(index: number): number {
    const customPositionMap = gameStore.currentGame?.customPositionMap
    if (customPositionMap) return customPositionMap[index] ?? index
    return resolvedLayout.value.positionMap?.[index] ?? index
  }

  const cardRotation = computed(() => {
    const slotIndex = getResolvedSlot(playerIndex.value)
    return resolvedLayout.value.slotRotations?.[slotIndex] ?? 0
  })

  const cardRotationStyle = computed<Record<string, string>>(() => {
    const rotationDegrees = cardRotation.value
    if (rotationDegrees === 0) return {}
    if (rotationDegrees === 180) return { transform: 'rotate(180deg)' }
    return {
      width: '100cqh',
      height: '100cqw',
      flexShrink: '0',
      transform: `rotate(${rotationDegrees}deg)`,
    }
  })

  const innerCornerStyle = computed<Record<string, string>>(() => {
    const slotIndex = getResolvedSlot(playerIndex.value)
    const gridType = resolvedLayout.value.gridType
    const rotationDegrees = cardRotation.value
    const screenCorner = SLOT_INNER_SCREEN_CORNER[gridType]?.[slotIndex] ?? 'br'
    const localCorner = screenToLocalCorner(screenCorner, rotationDegrees)
    return cornerToStyle(localCorner)
  })

  return {
    cardRotation,
    cardRotationStyle,
    innerCornerStyle,
  }
}
