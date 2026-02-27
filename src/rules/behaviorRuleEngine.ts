import { ref, computed, watch, onUnmounted } from 'vue'
import type { ActiveRuleState, BehaviorRule, BehaviorRuleEffect } from '@/types/game'
import { evaluateRules } from './behaviorRuleEvaluator'
import type { TurnTimerState, RuleEvaluationResult } from './behaviorRuleEvaluator'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { playTimerWarning, playTimerUrgent } from '@/services/sounds'
import { warningFeedback } from '@/services/haptics'

// ─── Counter type to store method mapping ────────────────────────────
// `changeCounter` is internal to gameStore and not exported.
// We map each counterType to the corresponding exported convenience method.

type CounterType = 'poisonCounters' | 'experienceCounters' | 'energyCounters'

function applyCounterChange(
  gameStore: ReturnType<typeof useGameStore>,
  playerId: string,
  counterType: CounterType,
  amount: number,
): void {
  switch (counterType) {
    case 'poisonCounters':
      gameStore.changePoison(playerId, amount)
      break
    case 'experienceCounters':
      gameStore.changeExperience(playerId, amount)
      break
    case 'energyCounters':
      gameStore.changeEnergy(playerId, amount)
      break
  }
}

// ─── Composable ──────────────────────────────────────────────────────

export function useBehaviorRuleEngine() {
  const gameStore = useGameStore()
  const settingsStore = useSettingsStore()

  // ─── Reactive state exposed to visual components ─────────────────

  const activeRuleStates = ref<Map<string, ActiveRuleState>>(new Map())
  const flashingPlayerIdSet = ref<Set<string>>(new Set())
  const flashTimerZoneFlag = ref(false)
  const overtimeDisplayFlag = ref(false)
  const announceMessages = ref<string[]>([])

  // Intervals for repeated effects, keyed by `ruleId:effectIndex`
  const repeatedIntervals = new Map<string, ReturnType<typeof setInterval>>()

  // Track rules with fireOnce that have already fired
  const firedOnceRuleIds = new Set<string>()

  // ─── Computed outputs ────────────────────────────────────────────

  const isOvertimeDisplayActive = computed(() => overtimeDisplayFlag.value)

  const flashingPlayerIds = computed<string[]>(() =>
    Array.from(flashingPlayerIdSet.value),
  )

  const flashTimerZone = computed(() => flashTimerZoneFlag.value)

  // ─── Turn timer state (derived from gameStore) ───────────────────

  const turnTimerState = computed<TurnTimerState>(() => {
    if (!settingsStore.gameSettings.enableTurnTimer) {
      return { remainingSeconds: Infinity, isEnabled: false }
    }

    const currentGame = gameStore.currentGame
    if (!currentGame) {
      return { remainingSeconds: Infinity, isEnabled: true }
    }

    const currentTurnPlayer = currentGame.players[currentGame.currentTurnPlayerIndex]
    if (!currentTurnPlayer) {
      return { remainingSeconds: Infinity, isEnabled: true }
    }

    const playerRoundTimeMs = currentGame.playerRoundTimeMs?.[currentTurnPlayer.id] ?? 0
    const remainingSeconds = settingsStore.gameSettings.turnTimerSeconds - (playerRoundTimeMs / 1000)

    return {
      remainingSeconds,
      isEnabled: true,
    }
  })

  // ─── Helpers: find a rule by ID from the active rules ────────────

  function findRuleById(ruleId: string): BehaviorRule | undefined {
    return settingsStore.activeBehaviorRules.find((rule) => rule.id === ruleId)
  }

  // ─── Helpers: build interval key ─────────────────────────────────

  function buildIntervalKey(ruleId: string, effectIndex: number): string {
    return `${ruleId}:${effectIndex}`
  }

  // ─── Helpers: clear all intervals for a given rule ───────────────

  function clearRuleIntervals(ruleId: string): void {
    for (const [key, intervalId] of repeatedIntervals.entries()) {
      if (key.startsWith(`${ruleId}:`)) {
        clearInterval(intervalId)
        repeatedIntervals.delete(key)
      }
    }
  }

  // ─── Helpers: clear ALL intervals ────────────────────────────────

  function clearAllIntervals(): void {
    for (const intervalId of repeatedIntervals.values()) {
      clearInterval(intervalId)
    }
    repeatedIntervals.clear()
  }

  // ─── Effect: determine current turn player IDs ───────────────────

  function getCurrentTurnPlayerId(): string | undefined {
    const currentGame = gameStore.currentGame
    if (!currentGame) return undefined
    const turnPlayer = currentGame.players[currentGame.currentTurnPlayerIndex]
    return turnPlayer?.id
  }

  // ─── Effect dispatching ──────────────────────────────────────────

  function fireEffect(
    effect: BehaviorRuleEffect,
    affectedPlayerIds: string[],
  ): void {
    switch (effect.type) {
      case 'play_sound':
        if (settingsStore.soundEnabled) {
          if (effect.soundName === 'warning') {
            playTimerWarning()
          } else if (effect.soundName === 'urgent') {
            playTimerUrgent()
          }
        }
        break

      case 'haptic_buzz':
        if (settingsStore.hapticFeedback) {
          // For both 'single' and 'repeated' patterns, fire immediately.
          // Repeated pattern additionally sets up an interval in onRuleActivated.
          warningFeedback()
        }
        break

      case 'visual_flash':
        if (effect.target === 'affected_player') {
          for (const playerId of affectedPlayerIds) {
            flashingPlayerIdSet.value.add(playerId)
          }
        } else if (effect.target === 'all_players') {
          const currentGame = gameStore.currentGame
          if (currentGame) {
            for (const player of currentGame.players) {
              flashingPlayerIdSet.value.add(player.id)
            }
          }
        } else if (effect.target === 'timer_zone') {
          flashTimerZoneFlag.value = true
        }
        break

      case 'overtime_display':
        overtimeDisplayFlag.value = true
        break

      case 'modify_life':
        if (gameStore.currentGame?.isRunning) {
          for (const playerId of affectedPlayerIds) {
            gameStore.changeLife(playerId, effect.amount)
          }
        }
        break

      case 'modify_counter':
        if (gameStore.currentGame?.isRunning) {
          for (const playerId of affectedPlayerIds) {
            applyCounterChange(gameStore, playerId, effect.counterType, effect.amount)
          }
        }
        break

      case 'announce_text':
        if (!announceMessages.value.includes(effect.messageKey)) {
          announceMessages.value.push(effect.messageKey)
        }
        break
    }
  }

  // ─── Rule activation (rising edge) ──────────────────────────────

  function onRuleActivated(rule: BehaviorRule, affectedPlayerIds: string[]): void {
    // Determine effective affected player IDs for turn-timer-based penalties:
    // If the rule is per_player scope but triggered by a global timer trigger,
    // the evaluator returns all matching players. For turn-timer penalties,
    // we restrict to the current turn player.
    let effectivePlayerIds = affectedPlayerIds

    const isTurnTimerTrigger =
      rule.trigger.type === 'turn_timer_remaining' ||
      rule.trigger.type === 'turn_timer_expired' ||
      rule.trigger.type === 'turn_timer_overtime'

    if (rule.scope === 'global' && isTurnTimerTrigger) {
      const turnPlayerId = getCurrentTurnPlayerId()
      if (turnPlayerId) {
        effectivePlayerIds = [turnPlayerId]
      }
    }

    for (let effectIndex = 0; effectIndex < rule.effects.length; effectIndex++) {
      const effect = rule.effects[effectIndex]!

      // Fire the effect immediately
      fireEffect(effect, effectivePlayerIds)

      // Determine repeat interval: rule-level takes precedence, then effect-level
      // (only haptic_buzz effects have their own repeatIntervalSeconds)
      const intervalSeconds = rule.repeatIntervalSeconds ?? (
        effect.type === 'haptic_buzz' && effect.pattern === 'repeated'
          ? effect.repeatIntervalSeconds
          : undefined
      )

      if (intervalSeconds && intervalSeconds > 0) {
        const intervalKey = buildIntervalKey(rule.id, effectIndex)
        // Clear any existing interval for this key (safety)
        if (repeatedIntervals.has(intervalKey)) {
          clearInterval(repeatedIntervals.get(intervalKey)!)
        }

        const intervalId = setInterval(() => {
          // Only fire repeated game-mutation effects if game is running
          if (
            (effect.type === 'modify_life' || effect.type === 'modify_counter') &&
            !gameStore.currentGame?.isRunning
          ) {
            return
          }

          // Re-determine affected players for turn-timer penalties
          let currentEffectivePlayerIds = effectivePlayerIds
          if (rule.scope === 'global' && isTurnTimerTrigger) {
            const turnPlayerId = getCurrentTurnPlayerId()
            if (turnPlayerId) {
              currentEffectivePlayerIds = [turnPlayerId]
            }
          } else {
            // Use the latest affected players from the active state
            const currentState = activeRuleStates.value.get(rule.id)
            if (currentState) {
              currentEffectivePlayerIds = currentState.affectedPlayerIds
            }
          }

          fireEffect(effect, currentEffectivePlayerIds)

          // Update lastRepeatFiredAt
          const state = activeRuleStates.value.get(rule.id)
          if (state) {
            state.lastRepeatFiredAt = Date.now()
          }
        }, intervalSeconds * 1000)

        repeatedIntervals.set(intervalKey, intervalId)
      }
    }
  }

  // ─── Rule deactivation (falling edge) ───────────────────────────

  function onRuleDeactivated(rule: BehaviorRule): void {
    // Clear all repeated intervals for this rule
    clearRuleIntervals(rule.id)

    // Remove visual flash effects associated with this rule
    for (const effect of rule.effects) {
      if (effect.type === 'visual_flash') {
        if (effect.target === 'affected_player' || effect.target === 'all_players') {
          // We need to check which player IDs were associated with this rule
          const previousState = activeRuleStates.value.get(rule.id)
          if (previousState) {
            for (const playerId of previousState.affectedPlayerIds) {
              flashingPlayerIdSet.value.delete(playerId)
            }
          }
          // For all_players, also clear all player IDs
          if (effect.target === 'all_players') {
            flashingPlayerIdSet.value.clear()
          }
        } else if (effect.target === 'timer_zone') {
          flashTimerZoneFlag.value = false
        }
      }

      if (effect.type === 'overtime_display') {
        overtimeDisplayFlag.value = false
      }

      if (effect.type === 'announce_text') {
        const messageIndex = announceMessages.value.indexOf(effect.messageKey)
        if (messageIndex !== -1) {
          announceMessages.value.splice(messageIndex, 1)
        }
      }
    }
  }

  // ─── Process evaluation results (edge detection) ────────────────

  function processResults(results: RuleEvaluationResult[]): void {
    const previousStates = new Map(activeRuleStates.value)
    const nextStates = new Map<string, ActiveRuleState>()

    for (const result of results) {
      const previousState = previousStates.get(result.ruleId)
      const wasActive = previousState !== undefined

      if (result.isActive) {
        if (!wasActive) {
          // Rising edge: rule just became active
          const rule = findRuleById(result.ruleId)
          if (!rule) continue

          // Skip rules that have fireOnce set and have already fired
          if (rule.fireOnce && firedOnceRuleIds.has(result.ruleId)) continue

          // Track fireOnce rules
          if (rule.fireOnce) {
            firedOnceRuleIds.add(result.ruleId)
          }

          const newState: ActiveRuleState = {
            ruleId: result.ruleId,
            activatedAt: Date.now(),
            affectedPlayerIds: [...result.affectedPlayerIds],
          }
          nextStates.set(result.ruleId, newState)

          onRuleActivated(rule, result.affectedPlayerIds)
        } else {
          // Still active: update affected player IDs
          const updatedState: ActiveRuleState = {
            ...previousState,
            affectedPlayerIds: [...result.affectedPlayerIds],
          }
          nextStates.set(result.ruleId, updatedState)

          // Update visual flash for changed player sets
          const rule = findRuleById(result.ruleId)
          if (rule) {
            for (const effect of rule.effects) {
              if (effect.type === 'visual_flash' && effect.target === 'affected_player') {
                // Remove players no longer affected
                for (const previousPlayerId of previousState.affectedPlayerIds) {
                  if (!result.affectedPlayerIds.includes(previousPlayerId)) {
                    flashingPlayerIdSet.value.delete(previousPlayerId)
                  }
                }
                // Add newly affected players
                for (const newPlayerId of result.affectedPlayerIds) {
                  if (!previousState.affectedPlayerIds.includes(newPlayerId)) {
                    flashingPlayerIdSet.value.add(newPlayerId)
                  }
                }
              }
            }
          }
        }
      } else if (wasActive) {
        // Falling edge: rule just became inactive
        const rule = findRuleById(result.ruleId)
        if (rule) {
          onRuleDeactivated(rule)
        }
        // Do not add to nextStates (effectively removing it)
      }
    }

    activeRuleStates.value = nextStates
  }

  // ─── Clear all state ────────────────────────────────────────────

  function clearAllState(): void {
    clearAllIntervals()
    firedOnceRuleIds.clear()
    activeRuleStates.value = new Map()
    flashingPlayerIdSet.value = new Set()
    flashTimerZoneFlag.value = false
    overtimeDisplayFlag.value = false
    announceMessages.value = []
  }

  // ─── Main watcher ───────────────────────────────────────────────

  watch(
    [() => gameStore.currentGame, turnTimerState],
    () => {
      const currentGame = gameStore.currentGame
      if (!currentGame) {
        clearAllState()
        return
      }

      const results = evaluateRules(
        currentGame,
        settingsStore.gameSettings,
        settingsStore.activeBehaviorRules,
        turnTimerState.value,
      )

      processResults(results)
    },
    { deep: true },
  )

  // Sync flashing player IDs to gameStore for consumption by usePlayerTimerDisplay
  watch(flashingPlayerIds, (playerIds) => {
    if (gameStore.currentGame) {
      gameStore.currentGame.activeFlashPlayerIds = [...playerIds]
    }
  }, { immediate: true })

  // ─── Cleanup on unmount ─────────────────────────────────────────

  onUnmounted(() => {
    clearAllIntervals()
  })

  // ─── Public API ─────────────────────────────────────────────────

  return {
    activeRuleStates,
    isOvertimeDisplayActive,
    flashingPlayerIds,
    flashTimerZone,
    announceMessages,
  }
}
