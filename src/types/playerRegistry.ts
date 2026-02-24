import type { ManaColor } from '@/types/game'

export interface CommanderCardSnapshot {
  scryfallId: string
  name: string
  imageUri: string
  colorIdentity: string[]
  typeLine: string
}

export interface Deck {
  id: string
  name: string
  commanders: CommanderCardSnapshot[]
  createdAt: number
}

export interface PlayerProfile {
  id: string
  name: string
  preferredColor: ManaColor
  decks: Deck[]
  createdAt: number
  updatedAt: number
}
