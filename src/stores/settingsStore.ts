import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { GameSettings } from '@/types/game'
import { DEFAULT_GAME_SETTINGS } from '@/types/game'
import { saveSettings, loadSettings, savePreferences, loadPreferences } from '@/services/persistence'
import type { LayoutMode } from '@/services/persistence'

export const useSettingsStore = defineStore('settings', () => {
  const gameSettings = ref<GameSettings>({ ...DEFAULT_GAME_SETTINGS })
  const hapticFeedback = ref(true)
  const soundEnabled = ref(false)
  const soundVolume = ref(0.5)
  const keepScreenOn = ref(true)
  const language = ref<'fr' | 'en'>('fr')
  const cardSecondLanguage = ref<string | null>(null)
  const layoutMode = ref<LayoutMode>('default')

  // Load persisted game settings on init
  const savedSettings = loadSettings()
  if (savedSettings) {
    gameSettings.value = { ...DEFAULT_GAME_SETTINGS, ...savedSettings }
  }

  // Load persisted preferences on init
  const savedPreferences = loadPreferences()
  if (savedPreferences) {
    hapticFeedback.value = savedPreferences.hapticFeedback ?? true
    keepScreenOn.value = savedPreferences.keepScreenOn ?? true
    cardSecondLanguage.value = savedPreferences.cardSecondLanguage ?? null
    language.value = (savedPreferences.language as 'fr' | 'en') ?? 'fr'
    soundEnabled.value = savedPreferences.soundEnabled ?? false
    soundVolume.value = savedPreferences.soundVolume ?? 0.5
    layoutMode.value = (savedPreferences.layoutMode as LayoutMode) ?? 'default'
  }

  // Persist game settings on change
  watch(gameSettings, (value) => saveSettings(value), { deep: true })

  // Persist preferences on change
  watch(
    [hapticFeedback, keepScreenOn, cardSecondLanguage, language, soundEnabled, soundVolume, layoutMode],
    () => {
      savePreferences({
        hapticFeedback: hapticFeedback.value,
        keepScreenOn: keepScreenOn.value,
        cardSecondLanguage: cardSecondLanguage.value,
        language: language.value,
        soundEnabled: soundEnabled.value,
        soundVolume: soundVolume.value,
        layoutMode: layoutMode.value,
      })
    },
  )

  function updateGameSettings(partial: Partial<GameSettings>) {
    gameSettings.value = { ...gameSettings.value, ...partial }
  }

  function resetToDefaults() {
    gameSettings.value = { ...DEFAULT_GAME_SETTINGS }
  }

  const cardLanguages = computed<string[]>(() => {
    const langs = ['en']
    if (cardSecondLanguage.value) langs.push(cardSecondLanguage.value)
    return langs
  })

  return {
    gameSettings,
    hapticFeedback,
    soundEnabled,
    soundVolume,
    keepScreenOn,
    language,
    cardSecondLanguage,
    layoutMode,
    cardLanguages,
    resetToDefaults,
  }
})
