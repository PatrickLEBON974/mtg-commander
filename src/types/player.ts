export interface PlayerProfile {
  id: string
  name: string
  avatarUrl?: string
  createdAt: number
}

export interface GameRecord {
  id: string
  gameId: string
  playerId: string
  deckName: string
  commanderNames: string[]
  result: 'win' | 'loss'
  eliminatedBy?: string
  turnsPlayed: number
  gameDurationMs: number
  playedAt: number
}

export interface PlayerStats {
  totalGames: number
  wins: number
  losses: number
  winRate: number
  averageGameDurationMs: number
  favoriteCommanders: string[]
}
