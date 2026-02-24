import { ref } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { tapFeedback } from '@/services/haptics'
import { LONG_PRESS_DURATION_MS } from '@/config/gameConstants'

export type ActionTooltipKey = 'endTurn' | 'startTurn' | 'respond' | 'releasePriority' | 'reclaimPriority'

export function useActionTooltip() {
  const settingsStore = useSettingsStore()

  const activeTooltip = ref<ActionTooltipKey | null>(null)
  let tooltipTimer: ReturnType<typeof setTimeout> | null = null

  function showActionTooltip(key: ActionTooltipKey) {
    tooltipTimer = setTimeout(() => {
      activeTooltip.value = key
      if (settingsStore.hapticFeedback) tapFeedback()
    }, LONG_PRESS_DURATION_MS)
  }

  function hideActionTooltip() {
    if (tooltipTimer) {
      clearTimeout(tooltipTimer)
      tooltipTimer = null
    }
    activeTooltip.value = null
  }

  return {
    activeTooltip,
    showActionTooltip,
    hideActionTooltip,
  }
}
