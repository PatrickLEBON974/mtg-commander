export interface Commander {
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
}

export interface GameAction {
  id: string
  timestamp: number
  type: GameActionType
  playerId: string
  targetPlayerId?: string
  commanderId?: string
  value: number
  description: string
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
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  startingLife: 40,
  commanderDamageThreshold: 21,
  poisonThreshold: 10,
  playerCount: 4,
  enableTimer: true,
  enableTurnTimer: false,
  turnTimerSeconds: 120,
}
