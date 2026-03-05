import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { tapFeedback } from '@/services/haptics'
import { playTurnAdvance } from '@/services/sounds'

interface UseTurnActionsOptions {
  playerId: () => string
  onStateChanged: () => void
  onTurnAdvanced: () => void
}

export function useTurnActions(options: UseTurnActionsOptions) {
  const { playerId, onStateChanged, onTurnAdvanced } = options
  const gameStore = useGameStore()
  const settingsStore = useSettingsStore()

  // Priority system
  const isActivePlayer = computed(() => playerId() === gameStore.currentTurnPlayer?.id)
  const isNextPlayer = computed(() => playerId() === gameStore.nextTurnPlayer?.id)
  const isPriorityTaken = computed(() =>
    gameStore.currentGame?.priorityPlayerId != null,
  )
  const hasPriority = computed(() => {
    const effectiveId = gameStore.currentGame?.priorityPlayerId ?? gameStore.currentTurnPlayer?.id
    return playerId() === effectiveId
  })

  // Turn / priority border + rotating glow
  const showMarchingBorder = computed(() => hasPriority.value && isPriorityTaken.value && !isActivePlayer.value)
  const turnBorderClass = computed(() => {
    if (isActivePlayer.value) return 'border-arena-orange/70'
    if (showMarchingBorder.value) return 'border-transparent'
    return 'border-white/[0.04]'
  })

  // Button visibility
  const showEndTurnButton = computed(() => isActivePlayer.value)
  const showStartTurnButton = computed(() => isNextPlayer.value && !isActivePlayer.value && !isPriorityTaken.value)
  const showRespondButton = computed(() =>
    !isActivePlayer.value && !hasPriority.value,
  )
  const showReleasePriorityButton = computed(() =>
    isPriorityTaken.value && hasPriority.value && !isActivePlayer.value,
  )
  const showReclaimTurnButton = computed(() =>
    isActivePlayer.value && isPriorityTaken.value,
  )
  const showAnyActionButton = computed(() =>
    showRespondButton.value || showReleasePriorityButton.value ||
    showReclaimTurnButton.value,
  )

  function handleAdvanceTurn() {
    gameStore.advanceTurn()
    playTurnAdvance()
    if (settingsStore.hapticFeedback) tapFeedback()
    onTurnAdvanced()
    onStateChanged()
  }

  function handleRespond() {
    gameStore.takePriority(playerId())
    if (settingsStore.hapticFeedback) tapFeedback()
    onStateChanged()
  }

  function handleReleasePriority() {
    gameStore.releasePriority()
    if (settingsStore.hapticFeedback) tapFeedback()
    onStateChanged()
  }

  return {
    isActivePlayer,
    isPriorityTaken,
    hasPriority,
    showMarchingBorder,
    turnBorderClass,
    showEndTurnButton,
    showStartTurnButton,
    showRespondButton,
    showReleasePriorityButton,
    showReclaimTurnButton,
    showAnyActionButton,
    handleAdvanceTurn,
    handleRespond,
    handleReleasePriority,
  }
}
