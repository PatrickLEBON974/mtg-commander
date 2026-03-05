/**
 * Centralised game constants and UI configuration.
 * Replaces magic numbers and duplicated option arrays scattered across views and stores.
 */

// ─── MTG Game Rules ─────────────────────────────────────────────────
export const COMMANDER_TAX_PER_CAST = 2
export const LOW_LIFE_WARNING_THRESHOLD = 10
export const LARGE_LIFE_CHANGE_THRESHOLD = 5
export const ROOM_CODE_LENGTH = 6
export const PLAYER_NAME_MAX_LENGTH = 30

// ─── Timing ─────────────────────────────────────────────────────────
export const LIFE_CHANGE_BATCH_MS = 1000
export const GAME_STATE_SAVE_DEBOUNCE_MS = 500
export const MULTIPLAYER_PUSH_DEBOUNCE_MS = 300
export const LONG_PRESS_DURATION_MS = 500
export const FLOAT_ANIMATION_DELAY_MS = 50

// ─── Limits ─────────────────────────────────────────────────────────
export const MAX_HISTORY_LENGTH = 300
export const MAX_STORED_GAME_RECORDS = 200
export const MAX_RECENT_GAMES = 10
export const SCRYFALL_CACHE_MAX_ENTRIES = 50
export const LOCAL_SEARCH_LIMIT = 50
export const MAX_PLAYER_PROFILES = 20
export const MAX_DECKS_PER_PLAYER = 20
export const MAX_ROOM_CODE_ATTEMPTS = 5

// ─── Shared stepper options (HomeView + SettingsView) ───────────────
export const PLAYER_COUNT_OPTIONS = [2, 3, 4, 5, 6].map((v) => ({ value: v, label: String(v) }))
function rangeOptions(from: number, to: number): { value: number; label: string }[] {
  return Array.from({ length: to - from + 1 }, (_, i) => {
    const value = from + i
    return { value, label: String(value) }
  })
}

export const STARTING_LIFE_OPTIONS = rangeOptions(1, 50)

// ─── Player colours (mana identity order) ──────────────────────────
import type { ManaColor } from '@/types/game'
export const PLAYER_COLORS: ManaColor[] = ['white', 'blue', 'black', 'red', 'green', 'gold']

// ─── Scryfall ───────────────────────────────────────────────────────
export const ALLOWED_BULK_DOWNLOAD_ORIGIN = 'https://data.scryfall.io/'
export const BULK_DATA_FALLBACK_SIZE_MB = 170
