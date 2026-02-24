import type { ScryfallCard, CardSearchFilters } from '@/types/card'
import { getCachedScryfall, setCachedScryfall } from '@/services/persistence'
import { autocompleteLocal, getCardByNameLocal, type LocalCard } from '@/services/database'
import { useOfflineStore } from '@/stores/offlineStore'

const DEFAULT_FILTERS: CardSearchFilters = {
  commanderOnly: false,
  colorIdentity: [],
  cardTypes: [],
  cmcValues: [],
  rarities: [],
  powerMin: null,
  powerMax: null,
  toughnessMin: null,
  toughnessMax: null,
}

const BASE_URL = 'https://api.scryfall.com'
const REQUEST_DELAY_MS = 100
const MAX_RETRIES = 3
const BASE_DELAY_MS = 500

let lastRequestTime = 0

async function throttledFetch(url: string): Promise<Response> {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < REQUEST_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS - elapsed))
  }
  lastRequestTime = Date.now()

  let lastError: Error | null = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': `MTGCommanderApp/${import.meta.env.VITE_APP_VERSION ?? '1.0.0'}`,
          Accept: 'application/json',
        },
      })

      // Don't retry client errors (except 429)
      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
        return response
      }

      // Retry on 429 and 5xx
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      // Network error - retry
      lastError = error instanceof Error ? error : new Error('Network error')
    }
  }

  throw lastError ?? new Error('Request failed after retries')
}

function localCardToScryfallCard(local: LocalCard): ScryfallCard {
  return {
    id: local.id,
    name: local.name,
    mana_cost: local.mana_cost,
    cmc: local.cmc,
    type_line: local.type_line,
    oracle_text: local.oracle_text,
    colors: JSON.parse(local.colors || '[]'),
    color_identity: JSON.parse(local.color_identity || '[]'),
    keywords: JSON.parse(local.keywords || '[]'),
    power: local.power ?? undefined,
    toughness: local.toughness ?? undefined,
    loyalty: local.loyalty ?? undefined,
    legalities: JSON.parse(local.legalities || '{}'),
    set: local.set_code,
    set_name: local.set_name,
    collector_number: local.collector_number,
    rarity: local.rarity as ScryfallCard['rarity'],
    artist: local.artist,
    image_uris: local.image_normal ? {
      small: local.image_small ?? '',
      normal: local.image_normal,
      large: local.image_normal,
      png: local.image_normal,
      art_crop: local.image_art_crop ?? '',
      border_crop: local.image_normal,
    } : undefined,
    prices: {},
  }
}

function isOfflineAvailable(): boolean {
  try {
    const offlineStore = useOfflineStore()
    return offlineStore.isDbReady && offlineStore.hasLocalData
  } catch {
    return false
  }
}

export async function autocompleteCards(
  query: string,
  filters: CardSearchFilters = DEFAULT_FILTERS,
): Promise<string[]> {
  if (query.length < 2) return []

  const hasActiveFilters = filters.commanderOnly ||
    filters.colorIdentity.length > 0 ||
    filters.cardTypes.length > 0 ||
    filters.cmcValues.length > 0 ||
    filters.rarities.length > 0 ||
    filters.powerMin != null ||
    filters.powerMax != null ||
    filters.toughnessMin != null ||
    filters.toughnessMax != null

  // Try local DB first
  if (isOfflineAvailable()) {
    try {
      const localResults = await autocompleteLocal(query, undefined, {
        commanderOnly: filters.commanderOnly,
        colorIdentity: filters.colorIdentity,
        cardTypes: filters.cardTypes,
        cmcValues: filters.cmcValues,
        rarities: filters.rarities,
        powerMin: filters.powerMin,
        powerMax: filters.powerMax,
        toughnessMin: filters.toughnessMin,
        toughnessMax: filters.toughnessMax,
      })
      if (localResults.length > 0) return localResults
    } catch {
      // Fall through to API
    }
  }

  // For API: use search endpoint when filters are active
  if (hasActiveFilters) {
    return searchWithFiltersApi(query, filters)
  }

  // No filters: use autocomplete endpoint as before
  const cacheKey = `autocomplete:${query.toLowerCase()}`
  const cached = getCachedScryfall(cacheKey) as string[] | null
  if (cached) return cached

  try {
    const encodedQuery = encodeURIComponent(query)
    const response = await throttledFetch(`${BASE_URL}/cards/autocomplete?q=${encodedQuery}`)

    if (!response.ok) return []

    const data = await response.json()
    const results = data.data ?? []
    setCachedScryfall(cacheKey, results)
    return results
  } catch {
    return []
  }
}

async function searchWithFiltersApi(query: string, filters: CardSearchFilters): Promise<string[]> {
  let scryfallQuery = query + ' f:commander'

  if (filters.commanderOnly) {
    scryfallQuery += ' is:commander'
  }

  if (filters.colorIdentity.length > 0) {
    if (filters.colorIdentity.length === 1) {
      scryfallQuery += ` id>=${filters.colorIdentity[0]!.toLowerCase()}`
    } else {
      const colorClauses = filters.colorIdentity.map((c) => `id>=${c.toLowerCase()}`).join(' OR ')
      scryfallQuery += ` (${colorClauses})`
    }
  }

  if (filters.cardTypes.length > 0) {
    if (filters.cardTypes.length === 1) {
      scryfallQuery += ` t:${filters.cardTypes[0]!.toLowerCase()}`
    } else {
      const typeClauses = filters.cardTypes.map((t) => `t:${t.toLowerCase()}`).join(' OR ')
      scryfallQuery += ` (${typeClauses})`
    }
  }

  if (filters.cmcValues.length > 0) {
    const cmcClauses: string[] = []
    for (const val of filters.cmcValues) {
      if (val >= 8) {
        cmcClauses.push('cmc>=8')
      } else {
        cmcClauses.push(`cmc=${val}`)
      }
    }
    if (cmcClauses.length === 1) {
      scryfallQuery += ` ${cmcClauses[0]}`
    } else {
      scryfallQuery += ` (${cmcClauses.join(' OR ')})`
    }
  }

  if (filters.rarities.length > 0) {
    if (filters.rarities.length === 1) {
      scryfallQuery += ` r:${filters.rarities[0]}`
    } else {
      const rarityClauses = filters.rarities.map((r) => `r:${r}`).join(' OR ')
      scryfallQuery += ` (${rarityClauses})`
    }
  }

  if (filters.powerMin != null) scryfallQuery += ` pow>=${filters.powerMin}`
  if (filters.powerMax != null) scryfallQuery += ` pow<=${filters.powerMax}`
  if (filters.toughnessMin != null) scryfallQuery += ` tou>=${filters.toughnessMin}`
  if (filters.toughnessMax != null) scryfallQuery += ` tou<=${filters.toughnessMax}`

  const cacheKey = `search_filtered:${scryfallQuery.toLowerCase()}`
  const cached = getCachedScryfall(cacheKey) as string[] | null
  if (cached) return cached

  try {
    const encodedQuery = encodeURIComponent(scryfallQuery)
    const response = await throttledFetch(`${BASE_URL}/cards/search?q=${encodedQuery}&order=name`)

    if (!response.ok) return []

    const data = await response.json()
    const names: string[] = (data.data ?? []).map((card: { name: string }) => card.name)
    const uniqueNames = [...new Set(names)]
    setCachedScryfall(cacheKey, uniqueNames)
    return uniqueNames
  } catch {
    return []
  }
}

export async function getCardByName(name: string): Promise<ScryfallCard | null> {
  // Try local DB first
  if (isOfflineAvailable()) {
    try {
      const localCard = await getCardByNameLocal(name)
      if (localCard) return localCardToScryfallCard(localCard)
    } catch {
      // Fall through to API
    }
  }

  const cacheKey = `card:${name.toLowerCase()}`
  const cached = getCachedScryfall(cacheKey) as ScryfallCard | null
  if (cached) return cached

  try {
    const encodedName = encodeURIComponent(name)
    const response = await throttledFetch(`${BASE_URL}/cards/named?exact=${encodedName}`)

    if (!response.ok) return null

    const card: ScryfallCard = await response.json()
    setCachedScryfall(cacheKey, card)
    return card
  } catch {
    return null
  }
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
