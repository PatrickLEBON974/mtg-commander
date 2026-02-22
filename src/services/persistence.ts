import type { GameState, GameSettings } from '@/types/game'

const GAME_STATE_KEY = 'mtg_commander_game_state'
const SETTINGS_KEY = 'mtg_commander_settings'
const SCRYFALL_CACHE_KEY = 'mtg_commander_scryfall_cache'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export function saveGameState(gameState: GameState | null) {
  if (gameState) {
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(gameState))
  } else {
    localStorage.removeItem(GAME_STATE_KEY)
  }
}

export function loadGameState(): GameState | null {
  const stored = localStorage.getItem(GAME_STATE_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as GameState
  } catch {
    return null
  }
}

export function saveSettings(settings: GameSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function loadSettings(): GameSettings | null {
  const stored = localStorage.getItem(SETTINGS_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as GameSettings
  } catch {
    return null
  }
}

// Scryfall response cache
interface CacheEntry {
  data: unknown
  timestamp: number
}

export function getCachedScryfall(cacheKey: string): unknown | null {
  try {
    const cacheRaw = localStorage.getItem(SCRYFALL_CACHE_KEY)
    if (!cacheRaw) return null
    const cache: Record<string, CacheEntry> = JSON.parse(cacheRaw)
    const entry = cache[cacheKey]
    if (!entry) return null
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null
    return entry.data
  } catch {
    return null
  }
}

export function setCachedScryfall(cacheKey: string, data: unknown) {
  try {
    const cacheRaw = localStorage.getItem(SCRYFALL_CACHE_KEY)
    const cache: Record<string, CacheEntry> = cacheRaw ? JSON.parse(cacheRaw) : {}
    cache[cacheKey] = { data, timestamp: Date.now() }

    // Limit cache size to ~50 entries
    const keys = Object.keys(cache)
    if (keys.length > 50) {
      const oldest = keys.sort((a, b) => (cache[a]?.timestamp ?? 0) - (cache[b]?.timestamp ?? 0))
      for (const key of oldest.slice(0, keys.length - 50)) {
        delete cache[key]
      }
    }

    localStorage.setItem(SCRYFALL_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Storage full, ignore
  }
}
