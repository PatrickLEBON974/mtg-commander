import type {
  BehaviorRule,
  BehaviorRuleProfile,
  BehaviorRuleInProfile,
  BehaviorRuleTrigger,
} from '@/types/game'

// ─── Template Rules ─────────────────────────────────────────────────────────

export const BEHAVIOR_RULE_TEMPLATES: BehaviorRule[] = [
  // ── Life ───────────────────────────────────────────────────────────────────
  {
    id: 'low-life-warning',
    name: 'rules.low-life-warning',
    trigger: { type: 'life_below', threshold: 10 },
    effects: [{ type: 'play_sound', soundName: 'warning' }],
    scope: 'per_player',
    fireOnce: true,
    category: 'life',
    isPreset: true,
  },
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
    id: 'last-breath',
    name: 'rules.last-breath',
    trigger: { type: 'life_exact', threshold: 1 },
    effects: [
      { type: 'play_sound', soundName: 'urgent' },
      { type: 'haptic_buzz', pattern: 'repeated', repeatIntervalSeconds: 15 },
      { type: 'visual_flash', target: 'affected_player' },
    ],
    scope: 'per_player',
    fireOnce: false,
    repeatIntervalSeconds: 15,
    category: 'life',
    isPreset: true,
  },

  // ── Poison ─────────────────────────────────────────────────────────────────
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
    id: 'poison-lethal-imminent',
    name: 'rules.poison-lethal-imminent',
    trigger: { type: 'poison_above', threshold: 9 },
    effects: [
      { type: 'play_sound', soundName: 'urgent' },
      { type: 'haptic_buzz', pattern: 'single' },
    ],
    scope: 'per_player',
    fireOnce: true,
    category: 'poison',
    isPreset: true,
  },

  // ── Commander Damage ───────────────────────────────────────────────────────
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
    id: 'commander-damage-lethal',
    name: 'rules.commander-damage-lethal',
    trigger: { type: 'commander_damage_above', threshold: 18 },
    effects: [
      { type: 'play_sound', soundName: 'urgent' },
      { type: 'haptic_buzz', pattern: 'single' },
      { type: 'visual_flash', target: 'affected_player' },
    ],
    scope: 'per_player',
    fireOnce: true,
    category: 'commander_damage',
    isPreset: true,
  },

  // ── Turn Timer ─────────────────────────────────────────────────────────────
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
    id: 'turn-timer-urgent',
    name: 'rules.turn-timer-urgent',
    trigger: { type: 'turn_timer_remaining', thresholdSeconds: 10 },
    effects: [
      { type: 'play_sound', soundName: 'urgent' },
      { type: 'haptic_buzz', pattern: 'repeated', repeatIntervalSeconds: 5 },
      { type: 'visual_flash', target: 'timer_zone' },
    ],
    scope: 'global',
    fireOnce: false,
    repeatIntervalSeconds: 5,
    category: 'turn_timer',
    isPreset: true,
  },
  {
    id: 'turn-timer-expired-display',
    name: 'rules.turn-timer-expired-display',
    trigger: { type: 'turn_timer_expired' },
    effects: [
      { type: 'overtime_display' },
      { type: 'visual_flash', target: 'timer_zone' },
    ],
    scope: 'global',
    fireOnce: false,
    category: 'turn_timer',
    isPreset: true,
  },
  {
    id: 'turn-timer-expired-reminder',
    name: 'rules.turn-timer-expired-reminder',
    trigger: { type: 'turn_timer_expired' },
    effects: [{ type: 'haptic_buzz', pattern: 'repeated', repeatIntervalSeconds: 30 }],
    scope: 'global',
    fireOnce: false,
    repeatIntervalSeconds: 30,
    category: 'turn_timer',
    isPreset: true,
  },

  // ── Game Time ──────────────────────────────────────────────────────────────
  {
    id: 'long-game',
    name: 'rules.long-game',
    trigger: { type: 'game_time_exceeded', thresholdSeconds: 5400 },
    effects: [
      { type: 'play_sound', soundName: 'warning' },
      { type: 'visual_flash', target: 'all_players' },
    ],
    scope: 'global',
    fireOnce: true,
    category: 'game_time',
    isPreset: true,
  },
  {
    id: 'very-long-game',
    name: 'rules.very-long-game',
    trigger: { type: 'game_time_exceeded', thresholdSeconds: 7200 },
    effects: [
      { type: 'play_sound', soundName: 'urgent' },
      { type: 'haptic_buzz', pattern: 'single' },
    ],
    scope: 'global',
    fireOnce: true,
    category: 'game_time',
    isPreset: true,
  },

  // ── Death ──────────────────────────────────────────────────────────────────
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

  // ── Penalty ────────────────────────────────────────────────────────────────
  {
    id: 'penalty-turn-expired',
    name: 'rules.penalty-turn-expired',
    trigger: { type: 'turn_timer_expired' },
    effects: [{ type: 'modify_life', amount: -1 }],
    scope: 'global',
    fireOnce: false,
    repeatIntervalSeconds: 60,
    category: 'penalty',
    isPreset: true,
  },
  {
    id: 'penalty-turn-very-long',
    name: 'rules.penalty-turn-very-long',
    trigger: { type: 'turn_timer_overtime', thresholdSeconds: 120 },
    effects: [{ type: 'modify_life', amount: -2 }],
    scope: 'global',
    fireOnce: false,
    repeatIntervalSeconds: 60,
    category: 'penalty',
    isPreset: true,
  },
  {
    id: 'penalty-endless-game',
    name: 'rules.penalty-endless-game',
    trigger: { type: 'game_time_exceeded', thresholdSeconds: 7200 },
    effects: [{ type: 'modify_life', amount: -1 }],
    scope: 'global',
    fireOnce: false,
    repeatIntervalSeconds: 300,
    category: 'penalty',
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
  'low-life-warning',
  'critical-life',
  'last-breath',
  'poison-warning',
  'poison-lethal-imminent',
  'commander-damage-warning',
  'commander-damage-lethal',
  'turn-timer-warning',
  'turn-timer-urgent',
  'turn-timer-expired-display',
  'player-elimination',
])

const ALL_RULE_IDS = new Set(BEHAVIOR_RULE_TEMPLATES.map((rule) => rule.id))

const RELAXED_ENABLED_RULE_IDS = new Set([
  'low-life-warning',
  'last-breath',
  'poison-warning',
  'commander-damage-warning',
  'player-elimination',
])

export const DEFAULT_PROFILES: BehaviorRuleProfile[] = [
  createProfile('default', 'rules.profiles.default', BEHAVIOR_RULE_TEMPLATES, DEFAULT_ENABLED_RULE_IDS),

  createProfile('fast-game', 'rules.profiles.fastGame', BEHAVIOR_RULE_TEMPLATES, ALL_RULE_IDS, {
    'turn-timer-warning': {
      trigger: { thresholdSeconds: 20 },
    },
    'turn-timer-urgent': {
      trigger: { thresholdSeconds: 5 },
    },
    'turn-timer-expired-reminder': {
      repeatIntervalSeconds: 15,
    },
    'long-game': {
      trigger: { thresholdSeconds: 3600 },
    },
    'very-long-game': {
      trigger: { thresholdSeconds: 5400 },
    },
    'penalty-turn-expired': {
      repeatIntervalSeconds: 30,
    },
    'penalty-turn-very-long': {
      trigger: { thresholdSeconds: 60 },
    },
    'penalty-endless-game': {
      trigger: { thresholdSeconds: 5400 },
      repeatIntervalSeconds: 180,
    },
  }),

  createProfile('relaxed', 'rules.profiles.relaxed', BEHAVIOR_RULE_TEMPLATES, RELAXED_ENABLED_RULE_IDS, {
    'low-life-warning': {
      trigger: { threshold: 5 },
    },
    'poison-warning': {
      trigger: { threshold: 8 },
    },
    'commander-damage-warning': {
      trigger: { threshold: 18 },
    },
  }),
]
