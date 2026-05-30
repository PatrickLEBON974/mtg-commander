import { computed, inject, ref } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { gameDisplayModeKey } from '@/types/injectionKeys'
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
  const gameDisplayMode = inject(gameDisplayModeKey, ref<'grid' | 'list'>('grid'))

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
    if (gameDisplayMode.value === 'list') return 0
    const slotIndex = getResolvedSlot(playerIndex.value)
    return resolvedLayout.value.slotRotations?.[slotIndex] ?? 0
  })

  const cardRotationStyle = computed<Record<string, string>>(() => {
    const rotationDegrees = cardRotation.value
    const rotationStyle: Record<string, string> = {}
    if (rotationDegrees === 0) return rotationStyle
    rotationStyle.transform = `rotate(${rotationDegrees}deg)`
    // 90/270 swap the card's box, so re-map width/height to container query units
    if (rotationDegrees !== 180) {
      rotationStyle.width = '100cqh'
      rotationStyle.height = '100cqw'
      rotationStyle.flexShrink = '0'
    }
    return rotationStyle
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
