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
  playerPlayTimeMs?: number
  playedAt: number
  playerProfileId?: string
  deckId?: string
}
