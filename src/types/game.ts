export interface Commander {
  id: string // stable UUID, does not change when commanders are reordered
  cardName: string
  imageUri?: string
  castCount: number
}

export interface PlayerState {
  id: string
  name: string
  color: PlayerColor
  lifeTotal: number
  commanders: Commander[]
  commanderDamageReceived: Record<string, number> // commanderId -> damage
  poisonCounters: number
  experienceCounters: number
  energyCounters: number
  isMonarch: boolean
  hasInitiative: boolean
  cityBlessing: boolean
  ringLevel: number // 0-4 (0 = no ring, 1-4 = The Ring tempts you levels)
  radCounters: number
  hourglassTokens: number
  badgePositions?: Record<string, { left: number; top: number }>
}

export type GamePhase = 'seating' | 'initiative' | 'playing'

export interface GameState {
  id: string
  players: PlayerState[]
  currentTurnPlayerIndex: number
  turnNumber: number
  startedAt: number
  elapsedMs: number
  isRunning: boolean
  history: GameAction[]
  playerPlayTimeMs: Record<string, number>
  playerRoundTimeMs: Record<string, number>
  priorityPlayerId: string | null
  activeFlashPlayerIds: string[]
  gamePhase: GamePhase
  customPositionMap: number[] | null
  dayNightState: 'day' | 'night' | null // null = not yet established
  hourglassTimeBankRemainingMs: Record<string, number>
}

export interface GameAction {
  id: string
  timestamp: number
  type: GameActionType
  playerId: string
  targetPlayerId?: string
  commanderId?: string
  value: number
  /** i18n key (e.g. 'game.lifeChange') — components translate at render time */
  descriptionKey: string
  /** Interpolation params for the i18n key (e.g. { name, amount }) */
  descriptionParams?: Record<string, string | number>
  previousValue?: number // stores previous state for undo (e.g., previous turn index)
}

export type GameActionType =
  | 'life_change'
  | 'commander_damage'
  | 'commander_cast'
  | 'poison_change'
  | 'experience_change'
  | 'energy_change'
  | 'monarch_change'
  | 'initiative_change'
  | 'city_blessing_change'
  | 'ring_level_change'
  | 'rad_change'
  | 'hourglass_change'
  | 'day_night_change'
  | 'game_result'
  | 'turn_advance'
  | 'behavior_rule_life'
  | 'behavior_rule_counter'

export type ManaColor = 'white' | 'blue' | 'black' | 'red' | 'green' | 'colorless' | 'gold'

/** Player-assignable colors — excludes 'colorless' which is not a valid player identity */
export type PlayerColor = Exclude<ManaColor, 'colorless'>

export interface GameSettings {
  startingLife: number
  commanderDamageThreshold: number
  poisonThreshold: number
  playerCount: number
  enableTimer: boolean
  enableTurnTimer: boolean
  turnTimerSeconds: number
  activeBehaviorRuleIds: string[]
  selectedBehaviorProfileId: string
  hourglassEnabled: boolean
  hourglassMode: 'fixed' | 'time_bank'
  hourglassGracePeriodSeconds: number
  hourglassLossThreshold: number
  hourglassTimeBankCapEnabled: boolean
  hourglassTimeBankCapSeconds: number
}

// ─── Behavior Rules ──────────────────────────────────────────────────

// === Trigger Types (discriminated union) ===

export interface LifeBelowTrigger {
  type: 'life_below'
  threshold: number
}

export interface LifeExactTrigger {
  type: 'life_exact'
  threshold: number
}

export interface PoisonAboveTrigger {
  type: 'poison_above'
  threshold: number
}

export interface CommanderDamageAboveTrigger {
  type: 'commander_damage_above'
  threshold: number
}

export interface TurnTimerRemainingTrigger {
  type: 'turn_timer_remaining'
  thresholdSeconds: number
}

export interface TurnTimerExpiredTrigger {
  type: 'turn_timer_expired'
}

export interface TurnTimerOvertimeTrigger {
  type: 'turn_timer_overtime'
  thresholdSeconds: number
}

export interface GameTimeExceededTrigger {
  type: 'game_time_exceeded'
  thresholdSeconds: number
}

export interface PlayerDeathTrigger {
  type: 'player_death'
}

export interface HourglassAboveThresholdTrigger {
  type: 'hourglass_above'
  threshold: number
}

export type BehaviorRuleTrigger =
  | LifeBelowTrigger
  | LifeExactTrigger
  | PoisonAboveTrigger
  | CommanderDamageAboveTrigger
  | TurnTimerRemainingTrigger
  | TurnTimerExpiredTrigger
  | TurnTimerOvertimeTrigger
  | GameTimeExceededTrigger
  | PlayerDeathTrigger
  | HourglassAboveThresholdTrigger

// === Effect Types (discriminated union) ===

export interface PlaySoundEffect {
  type: 'play_sound'
  soundName: 'warning' | 'urgent'
}

export interface HapticBuzzEffect {
  type: 'haptic_buzz'
  pattern: 'single' | 'repeated'
  repeatIntervalSeconds?: number
}

export interface VisualFlashEffect {
  type: 'visual_flash'
  target: 'affected_player' | 'all_players' | 'timer_zone'
}

export interface OvertimeDisplayEffect {
  type: 'overtime_display'
}

export interface ModifyLifeEffect {
  type: 'modify_life'
  amount: number
}

export interface ModifyCounterEffect {
  type: 'modify_counter'
  counterType: 'poisonCounters' | 'experienceCounters' | 'energyCounters'
  amount: number
}

export interface AnnounceTextEffect {
  type: 'announce_text'
  messageKey: string
}

export type BehaviorRuleEffect =
  | PlaySoundEffect
  | HapticBuzzEffect
  | VisualFlashEffect
  | OvertimeDisplayEffect
  | ModifyLifeEffect
  | ModifyCounterEffect
  | AnnounceTextEffect

// === Rule Definition ===

export type TriggerScope = 'per_player' | 'global'

export type RuleCategory =
  | 'life'
  | 'poison'
  | 'commander_damage'
  | 'turn_timer'
  | 'game_time'
  | 'death'
  | 'penalty'
  | 'hourglass'

export interface BehaviorRule {
  id: string
  name: string
  trigger: BehaviorRuleTrigger
  effects: BehaviorRuleEffect[]
  scope: TriggerScope
  fireOnce: boolean
  repeatIntervalSeconds?: number
  category: RuleCategory
  isPreset: boolean
}

// === Rule Profile ===

export interface BehaviorRuleInProfile {
  rule: BehaviorRule
  enabled: boolean
}

export interface BehaviorRuleProfile {
  id: string
  name: string
  rules: BehaviorRuleInProfile[]
  isPreset: boolean
}

// === Engine Internal State ===

export interface ActiveRuleState {
  ruleId: string
  activatedAt: number
  affectedPlayerIds: string[]
  lastRepeatFiredAt?: number
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  startingLife: 40,
  commanderDamageThreshold: 21,
  poisonThreshold: 10,
  playerCount: 4,
  enableTimer: true,
  enableTurnTimer: false,
  turnTimerSeconds: 120,
  activeBehaviorRuleIds: [],
  selectedBehaviorProfileId: 'default',
  hourglassEnabled: false,
  hourglassMode: 'fixed' as const,
  hourglassGracePeriodSeconds: 300,
  hourglassLossThreshold: 10,
  hourglassTimeBankCapEnabled: false,
  hourglassTimeBankCapSeconds: 900,
}
