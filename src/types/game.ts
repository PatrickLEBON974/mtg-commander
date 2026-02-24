export interface Commander {
  id: string // stable UUID, does not change when commanders are reordered
  cardName: string
  imageUri?: string
  castCount: number
}

export interface PlayerState {
  id: string
  name: string
  color: ManaColor
  lifeTotal: number
  commanders: Commander[]
  commanderDamageReceived: Record<string, number> // commanderId -> damage
  poisonCounters: number
  experienceCounters: number
  energyCounters: number
  isMonarch: boolean
  hasInitiative: boolean
}

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
  | 'turn_advance'

export type ManaColor = 'white' | 'blue' | 'black' | 'red' | 'green' | 'colorless' | 'gold'

export interface GameSettings {
  startingLife: number
  commanderDamageThreshold: number
  poisonThreshold: number
  playerCount: number
  enableTimer: boolean
  enableTurnTimer: boolean
  turnTimerSeconds: number
  activeTimerRuleIds: string[]
}

// ─── Timer Rules ─────────────────────────────────────────────────────

export type RuleTriggerType =
  | 'timer_b_remaining'   // Timer B has <= X seconds left
  | 'timer_b_expired'     // Timer B hit 0
  | 'timer_a_exceeded'    // Timer A total exceeds X seconds

export type RuleEffectType =
  | 'overtime_display'    // Show -00:15 format
  | 'repeated_buzz'       // Haptic vibration (repeating)
  | 'aggressive_flash'    // Card border aggressive blink
  | 'play_sound'          // Play alert tone

export interface TimerRuleTrigger {
  type: RuleTriggerType
  thresholdSeconds: number
}

export interface TimerRuleEffect {
  type: RuleEffectType
  repeatIntervalSeconds?: number  // for repeated_buzz (default 30)
  soundType?: 'warning' | 'urgent'  // for play_sound
}

export interface TimerRule {
  id: string
  name: string
  trigger: TimerRuleTrigger
  effect: TimerRuleEffect
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  startingLife: 40,
  commanderDamageThreshold: 21,
  poisonThreshold: 10,
  playerCount: 4,
  enableTimer: true,
  enableTurnTimer: false,
  turnTimerSeconds: 120,
  activeTimerRuleIds: [],
}

/** Empty counter defaults for new PlayerState creation */
export const EMPTY_PLAYER_COUNTERS = {
  commanders: [] as Commander[],
  commanderDamageReceived: {} as Record<string, number>,
  poisonCounters: 0,
  experienceCounters: 0,
  energyCounters: 0,
  isMonarch: false,
  hasInitiative: false,
} as const
