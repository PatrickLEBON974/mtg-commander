import type {
  GameState,
  GameSettings,
  PlayerState,
  BehaviorRule,
  BehaviorRuleTrigger,
} from '@/types/game'

// ─── Exported Interfaces ─────────────────────────────────────────────

export interface RuleEvaluationResult {
  ruleId: string
  isActive: boolean
  affectedPlayerIds: string[]
}

export interface TurnTimerState {
  remainingSeconds: number // negative when overtime
  isEnabled: boolean
}

// ─── Trigger Evaluation: Per-Player ──────────────────────────────────

function evaluatePlayerTrigger(
  trigger: BehaviorRuleTrigger,
  player: PlayerState,
  settings: GameSettings,
): boolean {
  switch (trigger.type) {
    case 'life_below':
      return player.lifeTotal < trigger.threshold && player.lifeTotal > 0

    case 'life_exact':
      return player.lifeTotal === trigger.threshold

    case 'poison_above':
      return player.poisonCounters >= trigger.threshold

    case 'commander_damage_above': {
      const damageValues = Object.values(player.commanderDamageReceived)
      return damageValues.some((damage) => damage >= trigger.threshold)
    }

    case 'hourglass_above':
      return player.hourglassTokens >= settings.hourglassLossThreshold

    case 'player_death': {
      const isLifeDead = player.lifeTotal <= 0

      const isPoisonDead =
        settings.poisonThreshold > 0 && player.poisonCounters >= settings.poisonThreshold

      const isCommanderDead =
        settings.commanderDamageThreshold > 0 &&
        Object.values(player.commanderDamageReceived).some(
          (damage) => damage >= settings.commanderDamageThreshold,
        )

      return isLifeDead || isPoisonDead || isCommanderDead
    }

    // Global trigger types return false when evaluated per-player
    case 'turn_timer_remaining':
    case 'turn_timer_expired':
    case 'turn_timer_overtime':
    case 'game_time_exceeded':
      return false

    default: {
      const _exhaustive: never = trigger
      return _exhaustive
    }
  }
}

// ─── Trigger Evaluation: Global ──────────────────────────────────────

function evaluateGlobalTrigger(
  trigger: BehaviorRuleTrigger,
  gameState: GameState,
  _settings: GameSettings,
  turnTimerState: TurnTimerState,
): boolean {
  switch (trigger.type) {
    case 'turn_timer_remaining':
      return (
        turnTimerState.isEnabled &&
        turnTimerState.remainingSeconds <= trigger.thresholdSeconds &&
        turnTimerState.remainingSeconds > 0
      )

    case 'turn_timer_expired':
      return turnTimerState.isEnabled && turnTimerState.remainingSeconds <= 0

    case 'turn_timer_overtime':
      return (
        turnTimerState.isEnabled &&
        turnTimerState.remainingSeconds <= -trigger.thresholdSeconds
      )

    case 'game_time_exceeded':
      return gameState.elapsedMs / 1000 > trigger.thresholdSeconds

    // Per-player trigger types return false when evaluated globally
    case 'life_below':
    case 'life_exact':
    case 'poison_above':
    case 'commander_damage_above':
    case 'hourglass_above':
    case 'player_death':
      return false

    default: {
      const _exhaustive: never = trigger
      return _exhaustive
    }
  }
}

// ─── Main Evaluation ─────────────────────────────────────────────────

export function evaluateRules(
  gameState: GameState,
  gameSettings: GameSettings,
  rules: BehaviorRule[],
  turnTimerState: TurnTimerState,
): RuleEvaluationResult[] {
  const results: RuleEvaluationResult[] = []

  for (const rule of rules) {
    if (rule.scope === 'per_player') {
      const affectedPlayerIds: string[] = []

      for (const player of gameState.players) {
        if (evaluatePlayerTrigger(rule.trigger, player, gameSettings)) {
          affectedPlayerIds.push(player.id)
        }
      }

      results.push({
        ruleId: rule.id,
        isActive: affectedPlayerIds.length > 0,
        affectedPlayerIds,
      })
    } else {
      const isTriggered = evaluateGlobalTrigger(
        rule.trigger,
        gameState,
        gameSettings,
        turnTimerState,
      )

      results.push({
        ruleId: rule.id,
        isActive: isTriggered,
        affectedPlayerIds: [],
      })
    }
  }

  return results
}
