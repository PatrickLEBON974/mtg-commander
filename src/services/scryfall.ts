import type { ScryfallCard, CardSearchResult } from '@/types/card'
import { getCachedScryfall, setCachedScryfall } from '@/services/persistence'

const BASE_URL = 'https://api.scryfall.com'
const REQUEST_DELAY_MS = 100

let lastRequestTime = 0

async function throttledFetch(url: string): Promise<Response> {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < REQUEST_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS - elapsed))
  }
  lastRequestTime = Date.now()

  return fetch(url, {
    headers: {
      'User-Agent': 'MTGCommanderApp/1.0.0',
      Accept: 'application/json',
    },
  })
}

export async function autocompleteCards(query: string): Promise<string[]> {
  if (query.length < 2) return []

  const cacheKey = `autocomplete:${query.toLowerCase()}`
  const cached = getCachedScryfall(cacheKey) as string[] | null
  if (cached) return cached

  const encodedQuery = encodeURIComponent(query)
  const response = await throttledFetch(`${BASE_URL}/cards/autocomplete?q=${encodedQuery}`)

  if (!response.ok) return []

  const data = await response.json()
  const results = data.data ?? []
  setCachedScryfall(cacheKey, results)
  return results
}

export async function searchCards(
  query: string,
  commanderLegalOnly = true,
): Promise<CardSearchResult> {
  const legalityFilter = commanderLegalOnly ? ' legal:commander' : ''
  const fullQuery = `${query}${legalityFilter}`

  const cacheKey = `search:${fullQuery.toLowerCase()}`
  const cached = getCachedScryfall(cacheKey) as CardSearchResult | null
  if (cached) return cached

  const encodedQuery = encodeURIComponent(fullQuery)
  const response = await throttledFetch(`${BASE_URL}/cards/search?q=${encodedQuery}&unique=cards&order=name`)

  if (!response.ok) {
    return { total_cards: 0, has_more: false, data: [] }
  }

  const result: CardSearchResult = await response.json()
  setCachedScryfall(cacheKey, result)
  return result
}

export async function getCardByName(name: string): Promise<ScryfallCard | null> {
  const cacheKey = `card:${name.toLowerCase()}`
  const cached = getCachedScryfall(cacheKey) as ScryfallCard | null
  if (cached) return cached

  const encodedName = encodeURIComponent(name)
  const response = await throttledFetch(`${BASE_URL}/cards/named?exact=${encodedName}`)

  if (!response.ok) return null

  const card: ScryfallCard = await response.json()
  setCachedScryfall(cacheKey, card)
  return card
}

export async function getRandomCommander(): Promise<ScryfallCard | null> {
  const response = await throttledFetch(`${BASE_URL}/cards/random?q=is%3Acommander+legal%3Acommander`)

  if (!response.ok) return null

  return response.json()
}

export function getCardImageUrl(card: ScryfallCard, size: 'small' | 'normal' | 'large' | 'art_crop' = 'normal'): string {
  if (card.image_uris) {
    return card.image_uris[size]
  }
  if (card.card_faces?.[0]?.image_uris) {
    return card.card_faces[0].image_uris[size]
  }
  return ''
}
