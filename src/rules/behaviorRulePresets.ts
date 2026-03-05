import type {
  BehaviorRule,
  BehaviorRuleProfile,
  BehaviorRuleInProfile,
  BehaviorRuleTrigger,
} from '@/types/game'

// ─── Template Rules ─────────────────────────────────────────────────────────

export const BEHAVIOR_RULE_TEMPLATES: BehaviorRule[] = [
  {
    id: 'critical-life',
    name: 'rules.critical-life',
    trigger: { type: 'life_below', threshold: 5 },
    effects: [
      { type: 'visual_flash', target: 'affected_player' },
      { type: 'play_sound', soundName: 'urgent' },
      { type: 'haptic_buzz', pattern: 'single' },
    ],
    scope: 'per_player',
    fireOnce: true,
    category: 'life',
    isPreset: true,
  },
  {
    id: 'poison-warning',
    name: 'rules.poison-warning',
    trigger: { type: 'poison_above', threshold: 7 },
    effects: [
      { type: 'play_sound', soundName: 'warning' },
      { type: 'visual_flash', target: 'affected_player' },
    ],
    scope: 'per_player',
    fireOnce: true,
    category: 'poison',
    isPreset: true,
  },
  {
    id: 'commander-damage-warning',
    name: 'rules.commander-damage-warning',
    trigger: { type: 'commander_damage_above', threshold: 15 },
    effects: [
      { type: 'play_sound', soundName: 'warning' },
      { type: 'visual_flash', target: 'affected_player' },
    ],
    scope: 'per_player',
    fireOnce: true,
    category: 'commander_damage',
    isPreset: true,
  },
  {
    id: 'turn-timer-warning',
    name: 'rules.turn-timer-warning',
    trigger: { type: 'turn_timer_remaining', thresholdSeconds: 30 },
    effects: [
      { type: 'play_sound', soundName: 'warning' },
      { type: 'visual_flash', target: 'timer_zone' },
    ],
    scope: 'global',
    fireOnce: true,
    category: 'turn_timer',
    isPreset: true,
  },
  {
    id: 'player-elimination',
    name: 'rules.player-elimination',
    trigger: { type: 'player_death' },
    effects: [
      { type: 'play_sound', soundName: 'urgent' },
      { type: 'haptic_buzz', pattern: 'single' },
      { type: 'visual_flash', target: 'all_players' },
    ],
    scope: 'global',
    fireOnce: true,
    category: 'death',
    isPreset: true,
  },
  {
    id: 'hourglass-lethal',
    name: 'rules.hourglass-lethal',
    trigger: { type: 'hourglass_above', threshold: 10 },
    effects: [
      { type: 'play_sound', soundName: 'urgent' },
      { type: 'haptic_buzz', pattern: 'single' },
      { type: 'visual_flash', target: 'affected_player' },
    ],
    scope: 'per_player',
    fireOnce: true,
    category: 'hourglass',
    isPreset: true,
  },
]

// ─── Profile Builder ────────────────────────────────────────────────────────

interface RuleOverrides {
  trigger?: Partial<BehaviorRuleTrigger>
  repeatIntervalSeconds?: number
}

function deepCloneRule(rule: BehaviorRule): BehaviorRule {
  return structuredClone(rule)
}

function applyTriggerOverride(trigger: BehaviorRuleTrigger, overrides: Partial<BehaviorRuleTrigger>): BehaviorRuleTrigger {
  if ('threshold' in trigger && 'threshold' in overrides && overrides.threshold !== undefined) {
    return { ...trigger, threshold: overrides.threshold } as BehaviorRuleTrigger
  }
  if ('thresholdSeconds' in trigger && 'thresholdSeconds' in overrides && overrides.thresholdSeconds !== undefined) {
    return { ...trigger, thresholdSeconds: overrides.thresholdSeconds } as BehaviorRuleTrigger
  }
  return trigger
}

function createProfile(
  id: string,
  name: string,
  templateRules: BehaviorRule[],
  enabledRuleIds: Set<string>,
  overrides: Record<string, RuleOverrides> = {},
): BehaviorRuleProfile {
  const rules: BehaviorRuleInProfile[] = templateRules.map((template) => {
    const clonedRule = deepCloneRule(template)
    const ruleOverrides = overrides[clonedRule.id]

    if (ruleOverrides) {
      if (ruleOverrides.trigger) {
        clonedRule.trigger = applyTriggerOverride(clonedRule.trigger, ruleOverrides.trigger)
      }
      if (ruleOverrides.repeatIntervalSeconds !== undefined) {
        clonedRule.repeatIntervalSeconds = ruleOverrides.repeatIntervalSeconds
      }
    }

    return {
      rule: clonedRule,
      enabled: enabledRuleIds.has(clonedRule.id),
    }
  })

  return { id, name, rules, isPreset: true }
}

// ─── Default Profiles ───────────────────────────────────────────────────────

const DEFAULT_ENABLED_RULE_IDS = new Set([
  'critical-life',
  'poison-warning',
  'commander-damage-warning',
  'turn-timer-warning',
  'player-elimination',
])

const FAST_GAME_ENABLED_RULE_IDS = new Set([
  'critical-life',
  'poison-warning',
  'commander-damage-warning',
  'turn-timer-warning',
  'player-elimination',
  'hourglass-lethal',
])

const RELAXED_ENABLED_RULE_IDS = new Set([
  'critical-life',
  'commander-damage-warning',
  'player-elimination',
])

export const DEFAULT_PROFILES: BehaviorRuleProfile[] = [
  createProfile('default', 'rules.profiles.default', BEHAVIOR_RULE_TEMPLATES, DEFAULT_ENABLED_RULE_IDS),
  createProfile('fast-game', 'rules.profiles.fastGame', BEHAVIOR_RULE_TEMPLATES, FAST_GAME_ENABLED_RULE_IDS, {
    'turn-timer-warning': { trigger: { thresholdSeconds: 20 } },
    'hourglass-lethal': { trigger: { threshold: 7 } },
  }),
  createProfile('relaxed', 'rules.profiles.relaxed', BEHAVIOR_RULE_TEMPLATES, RELAXED_ENABLED_RULE_IDS),
]
