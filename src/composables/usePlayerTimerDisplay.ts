import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { formatMsToTimer } from '@/utils/time'
import {
  formatSignedTimer,
  getChessClockRemainingMs,
  getChessClockRemainingRatio,
} from '@/utils/chessClock'

interface UsePlayerTimerDisplayOptions {
  playerId: () => string
  isCurrentTurn: () => boolean
}

export function usePlayerTimerDisplay(options: UsePlayerTimerDisplayOptions) {
  const { playerId, isCurrentTurn } = options
  const gameStore = useGameStore()
  const settingsStore = useSettingsStore()

  // Total play time — cumulative time across the entire game (never resets)
  const totalPlayTimeMs = computed(() =>
    gameStore.currentGame?.playerPlayTimeMs?.[playerId()] ?? 0,
  )
  const chessClock = computed(() => gameStore.currentGame?.chessClock ?? null)
  const isChessClockMode = computed(() => chessClock.value !== null)
  const globalTimeRemainingMs = computed(() => {
    const budget = chessClock.value?.playerBudgetMs
    if (budget === undefined) return 0
    return getChessClockRemainingMs(budget, totalPlayTimeMs.value)
  })
  const globalBudgetRemainingRatio = computed(() => {
    const budget = chessClock.value?.playerBudgetMs
    if (budget === undefined) return 1
    return getChessClockRemainingRatio(budget, totalPlayTimeMs.value)
  })
  const formattedTotalPlayTime = computed(() => isChessClockMode.value
    ? formatSignedTimer(globalTimeRemainingMs.value)
    : formatMsToTimer(totalPlayTimeMs.value),
  )

  // Round time — per-turn timer that resets each turn
  const currentRoundTimeMs = computed(() =>
    gameStore.currentGame?.playerRoundTimeMs?.[playerId()] ?? 0,
  )
  const turnTimerLimitSeconds = computed(() => settingsStore.gameSettings.turnTimerSeconds)
  const roundTimeRemainingSeconds = computed(() =>
    turnTimerLimitSeconds.value - (currentRoundTimeMs.value / 1000),
  )

  const formattedRoundTime = computed(() => {
    if (settingsStore.gameSettings.timerMode !== 'turn') {
      return formatMsToTimer(currentRoundTimeMs.value)
    }
    const remaining = roundTimeRemainingSeconds.value
    if (remaining >= 0) {
      const minutes = Math.floor(remaining / 60)
      const seconds = Math.floor(remaining % 60)
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
    const overtime = Math.abs(remaining)
    const minutes = Math.floor(overtime / 60)
    const seconds = Math.floor(overtime % 60)
    return `-${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  })

  // Clock owner: does this player currently "own the clock"?
  const isClockOwner = computed(() =>
    playerId() === gameStore.effectivePriorityPlayer?.id,
  )

  // Active turn: should both timers be visible?
  const hasActiveTurn = computed(() =>
    isClockOwner.value || isCurrentTurn(),
  )

  const isRoundClockActive = computed(() =>
    isChessClockMode.value ? isCurrentTurn() : isClockOwner.value,
  )

  const globalTimeDisplayClass = computed(() => {
    if (!isChessClockMode.value) {
      return hasActiveTurn.value ? 'text-white/50' : 'text-white/30'
    }
    if (globalTimeRemainingMs.value <= 0) return 'text-life-negative animate-pulse font-bold'
    if (globalBudgetRemainingRatio.value <= 0.1) return 'text-life-negative font-bold'
    if (globalBudgetRemainingRatio.value <= 0.25) return 'text-commander-damage font-bold'
    return isClockOwner.value ? 'text-arena-gold-light' : 'text-white/55'
  })

  // Round time display styling (priority-aware)
  const roundTimeDisplayClass = computed(() => {
    if (!isRoundClockActive.value) return 'text-white/25'
    if (settingsStore.gameSettings.timerMode !== 'turn') return 'text-white/60'
    if (roundTimeRemainingSeconds.value <= 0) return 'text-life-negative animate-pulse font-bold'
    if (roundTimeRemainingSeconds.value <= 60) return 'text-life-negative'
    return 'text-arena-gold-light'
  })

  // Overtime state — native UI feature (no longer driven by behavior rules)
  const isOvertime = computed(() =>
    settingsStore.gameSettings.timerMode === 'turn' && roundTimeRemainingSeconds.value <= 0,
  )

  const isGlobalOvertime = computed(() =>
    isChessClockMode.value && globalTimeRemainingMs.value <= 0,
  )

  // Timer flash effect — triggered by rules engine when time is critical
  const hasTimerFlashEffect = computed(() =>
    gameStore.currentGame?.activeFlashPlayerIds?.includes(playerId()) ?? false,
  )

  return {
    formattedTotalPlayTime,
    formattedRoundTime,
    hasActiveTurn,
    isChessClockMode,
    isClockOwner,
    isOvertime,
    isGlobalOvertime,
    globalTimeDisplayClass,
    globalBudgetRemainingRatio,
    roundTimeDisplayClass,
    hasTimerFlashEffect,
  }
}
