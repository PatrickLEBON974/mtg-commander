import type { GameState, GameSettings } from '@/types/game'
import { SCRYFALL_CACHE_MAX_ENTRIES } from '@/config/gameConstants'

const GAME_STATE_KEY = 'mtg_commander_game_state'
const SETTINGS_KEY = 'mtg_commander_settings'
const SCRYFALL_CACHE_KEY = 'mtg_commander_scryfall_cache'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/** Safe JSON parse from localStorage with fallback */
export function readLocalStorageJson<T>(key: string, fallback: T): T {
  const stored = localStorage.getItem(key)
  if (!stored) return fallback
  try {
    const parsed = JSON.parse(stored)
    if (parsed === null || parsed === undefined) return fallback
    return parsed as T
  } catch {
    return fallback
  }
}

export function saveGameState(gameState: GameState | null) {
  if (gameState) {
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(gameState))
  } else {
    localStorage.removeItem(GAME_STATE_KEY)
  }
}

export function loadGameState(): GameState | null {
  const gameState = readLocalStorageJson<GameState | null>(GAME_STATE_KEY, null)
  if (gameState) {
    migrateGameActions(gameState)
  }
  return gameState
}

/**
 * Migrate legacy GameAction entries that used a pre-translated `description`
 * string to the new `descriptionKey` / `descriptionParams` format.
 * Old actions without a `descriptionKey` get a literal fallback so the
 * history modal can still render them.
 */
function migrateGameActions(gameState: GameState): void {
  for (const action of gameState.history) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legacyAction = action as any
    if (!action.descriptionKey && legacyAction.description) {
      action.descriptionKey = legacyAction.description
      delete legacyAction.description
    }
  }
}

export function saveSettings(settings: GameSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function loadSettings(): GameSettings | null {
  return readLocalStorageJson<GameSettings | null>(SETTINGS_KEY, null)
}

// App preferences (non-game settings)
const PREFS_KEY = 'mtg_commander_preferences'

export type LayoutMode = 'default' | 'faceToFace' | 'faceToFaceSide' | 'star'

export interface AppPreferences {
  hapticFeedback: boolean
  keepScreenOn: boolean
  cardSecondLanguage: string | null
  language?: string
  soundEnabled?: boolean
  soundVolume?: number
  layoutMode?: LayoutMode
}

export function savePreferences(preferences: AppPreferences) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(preferences))
}

export function loadPreferences(): AppPreferences | null {
  return readLocalStorageJson<AppPreferences | null>(PREFS_KEY, null)
}

// Scryfall response cache
interface CacheEntry {
  data: unknown
  timestamp: number
}

export function getCachedScryfall(cacheKey: string): unknown | null {
  const cache = readLocalStorageJson<Record<string, CacheEntry> | null>(SCRYFALL_CACHE_KEY, null)
  if (!cache) return null
  const entry = cache[cacheKey]
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null
  return entry.data
}

export function setCachedScryfall(cacheKey: string, data: unknown) {
  try {
    const cache = readLocalStorageJson<Record<string, CacheEntry>>(SCRYFALL_CACHE_KEY, {})
    cache[cacheKey] = { data, timestamp: Date.now() }

    // Limit cache size to configured max entries
    const keys = Object.keys(cache)
    if (keys.length > SCRYFALL_CACHE_MAX_ENTRIES) {
      const oldest = keys.sort((a, b) => (cache[a]?.timestamp ?? 0) - (cache[b]?.timestamp ?? 0))
      for (const key of oldest.slice(0, keys.length - SCRYFALL_CACHE_MAX_ENTRIES)) {
        delete cache[key]
      }
    }

    localStorage.setItem(SCRYFALL_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Storage full, ignore
  }
}
