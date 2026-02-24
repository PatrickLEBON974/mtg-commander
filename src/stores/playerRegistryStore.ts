import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { PlayerProfile, Deck, CommanderCardSnapshot } from '@/types/playerRegistry'
import type { ManaColor } from '@/types/game'
import { MAX_PLAYER_PROFILES, MAX_DECKS_PER_PLAYER } from '@/config/gameConstants'

const STORAGE_KEY = 'mtg_commander_player_profiles'

function loadPlayerProfiles(): PlayerProfile[] {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return []
  try {
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return parsed as PlayerProfile[]
  } catch {
    return []
  }
}

export function generateDeckName(commanders: CommanderCardSnapshot[]): string {
  if (commanders.length === 0) return ''
  return commanders.map((commander) => commander.name).join(' / ')
}

export const usePlayerRegistryStore = defineStore('playerRegistry', () => {
  const playerProfiles = ref<PlayerProfile[]>(loadPlayerProfiles())

  watch(
    playerProfiles,
    (profiles) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles))
    },
    { deep: true },
  )

  const sortedProfiles = computed(() => {
    return [...playerProfiles.value].sort((a, b) => a.name.localeCompare(b.name))
  })

  function getProfileById(profileId: string): PlayerProfile | undefined {
    return playerProfiles.value.find((profile) => profile.id === profileId)
  }

  function getDeckById(profileId: string, deckId: string): Deck | undefined {
    const profile = getProfileById(profileId)
    if (!profile) return undefined
    return profile.decks.find((deck) => deck.id === deckId)
  }

  // --- Player CRUD ---

  function addPlayerProfile(name: string, preferredColor: ManaColor): PlayerProfile | null {
    if (playerProfiles.value.length >= MAX_PLAYER_PROFILES) return null

    const now = Date.now()
    const profile: PlayerProfile = {
      id: crypto.randomUUID(),
      name,
      preferredColor,
      decks: [],
      createdAt: now,
      updatedAt: now,
    }
    playerProfiles.value.push(profile)
    return profile
  }

  function updatePlayerProfile(profileId: string, updates: { name?: string; preferredColor?: ManaColor }) {
    const profile = getProfileById(profileId)
    if (!profile) return
    if (updates.name !== undefined) profile.name = updates.name
    if (updates.preferredColor !== undefined) profile.preferredColor = updates.preferredColor
    profile.updatedAt = Date.now()
  }

  function deletePlayerProfile(profileId: string) {
    const index = playerProfiles.value.findIndex((profile) => profile.id === profileId)
    if (index !== -1) {
      playerProfiles.value.splice(index, 1)
    }
  }

  // --- Deck CRUD ---

  function addDeck(profileId: string, name: string, commanders: CommanderCardSnapshot[]): Deck | null {
    const profile = getProfileById(profileId)
    if (!profile) return null
    if (profile.decks.length >= MAX_DECKS_PER_PLAYER) return null

    const deck: Deck = {
      id: crypto.randomUUID(),
      name: name || generateDeckName(commanders),
      commanders,
      createdAt: Date.now(),
    }
    profile.decks.push(deck)
    profile.updatedAt = Date.now()
    return deck
  }

  function updateDeck(profileId: string, deckId: string, updates: { name?: string }) {
    const deck = getDeckById(profileId, deckId)
    if (!deck) return
    if (updates.name !== undefined) deck.name = updates.name
    const profile = getProfileById(profileId)
    if (profile) profile.updatedAt = Date.now()
  }

  function removeDeck(profileId: string, deckId: string) {
    const profile = getProfileById(profileId)
    if (!profile) return
    const index = profile.decks.findIndex((deck) => deck.id === deckId)
    if (index !== -1) {
      profile.decks.splice(index, 1)
      profile.updatedAt = Date.now()
    }
  }

  function addCommanderToDeck(profileId: string, deckId: string, commander: CommanderCardSnapshot) {
    const deck = getDeckById(profileId, deckId)
    if (!deck || deck.commanders.length >= 2) return
    deck.commanders.push(commander)
    // Auto-update deck name if it was auto-generated
    deck.name = generateDeckName(deck.commanders)
    const profile = getProfileById(profileId)
    if (profile) profile.updatedAt = Date.now()
  }

  function removeCommanderFromDeck(profileId: string, deckId: string, commanderIndex: number) {
    const deck = getDeckById(profileId, deckId)
    if (!deck || commanderIndex < 0 || commanderIndex >= deck.commanders.length) return
    deck.commanders.splice(commanderIndex, 1)
    deck.name = generateDeckName(deck.commanders)
    const profile = getProfileById(profileId)
    if (profile) profile.updatedAt = Date.now()
  }

  return {
    playerProfiles,
    sortedProfiles,
    getProfileById,
    getDeckById,
    addPlayerProfile,
    updatePlayerProfile,
    deletePlayerProfile,
    addDeck,
    updateDeck,
    removeDeck,
    addCommanderToDeck,
    removeCommanderFromDeck,
  }
})
