import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GameSettings } from '@/types/game'
import { DEFAULT_GAME_SETTINGS } from '@/types/game'

export const useSettingsStore = defineStore('settings', () => {
  const gameSettings = ref<GameSettings>({ ...DEFAULT_GAME_SETTINGS })
  const isDarkMode = ref(true)
  const hapticFeedback = ref(true)
  const keepScreenOn = ref(true)
  const language = ref<'fr' | 'en'>('fr')

  function updateGameSettings(partial: Partial<GameSettings>) {
    gameSettings.value = { ...gameSettings.value, ...partial }
  }

  function resetToDefaults() {
    gameSettings.value = { ...DEFAULT_GAME_SETTINGS }
  }

  return {
    gameSettings,
    isDarkMode,
    hapticFeedback,
    keepScreenOn,
    language,
    updateGameSettings,
    resetToDefaults,
  }
})
