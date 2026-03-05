import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { GameSettings, BehaviorRuleProfile, BehaviorRule, BehaviorRuleInProfile } from '@/types/game'
import { DEFAULT_GAME_SETTINGS } from '@/types/game'
import { saveSettings, loadSettings, savePreferences, loadPreferences, saveBehaviorProfiles, loadBehaviorProfiles } from '@/services/persistence'
import { DEFAULT_PROFILES, BEHAVIOR_RULE_TEMPLATES } from '@/rules/behaviorRulePresets'
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
  const autoOrientIcons = ref(true)
  const orientationLockedPlayerId = ref<string | null>(null)
  // ─── Behavior Rule Profiles ──────────────────────────────────────────
  const behaviorRuleProfiles = ref<BehaviorRuleProfile[]>(
    structuredClone(DEFAULT_PROFILES),
  )

  // Load persisted profiles on init
  // Always use fresh DEFAULT_PROFILES for preset profiles (handles rule overhaul migrations).
  // Only restore user-created (non-preset) profiles from persistence.
  const savedProfiles = loadBehaviorProfiles() as BehaviorRuleProfile[] | null
  if (savedProfiles && Array.isArray(savedProfiles) && savedProfiles.length > 0) {
    const userCreatedProfiles = savedProfiles.filter((profile) => !profile.isPreset)
    behaviorRuleProfiles.value = [...structuredClone(DEFAULT_PROFILES), ...userCreatedProfiles]
  }

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
    autoOrientIcons.value = savedPreferences.autoOrientIcons ?? true
  }

  // Persist game settings on change
  watch(gameSettings, (value) => saveSettings(value), { deep: true })

  // Persist profiles on change
  watch(behaviorRuleProfiles, (value) => saveBehaviorProfiles(value), { deep: true })

  // Persist preferences on change
  watch(
    [hapticFeedback, keepScreenOn, cardSecondLanguage, language, soundEnabled, soundVolume, layoutMode, autoOrientIcons],
    () => {
      savePreferences({
        hapticFeedback: hapticFeedback.value,
        keepScreenOn: keepScreenOn.value,
        cardSecondLanguage: cardSecondLanguage.value,
        language: language.value,
        soundEnabled: soundEnabled.value,
        soundVolume: soundVolume.value,
        layoutMode: layoutMode.value,
        autoOrientIcons: autoOrientIcons.value,
      })
    },
  )

  // ─── Computed: current profile & rules ───────────────────────────────

  const selectedProfile = computed<BehaviorRuleProfile | undefined>(() =>
    behaviorRuleProfiles.value.find(
      (profile) => profile.id === gameSettings.value.selectedBehaviorProfileId,
    ),
  )

  const behaviorRules = computed<BehaviorRuleInProfile[]>(() =>
    selectedProfile.value?.rules ?? [],
  )

  const activeBehaviorRules = computed<BehaviorRule[]>(() =>
    behaviorRules.value
      .filter((entry) => entry.enabled)
      .map((entry) => entry.rule),
  )

  // ─── Profile CRUD ────────────────────────────────────────────────────

  function selectProfile(profileId: string) {
    gameSettings.value.selectedBehaviorProfileId = profileId
    // Sync activeBehaviorRuleIds from profile
    const profile = behaviorRuleProfiles.value.find((p) => p.id === profileId)
    if (profile) {
      gameSettings.value.activeBehaviorRuleIds = profile.rules
        .filter((entry) => entry.enabled)
        .map((entry) => entry.rule.id)
    }
  }

  function addProfile(name: string, baseProfileId?: string): BehaviorRuleProfile {
    const baseProfile = baseProfileId
      ? behaviorRuleProfiles.value.find((p) => p.id === baseProfileId)
      : undefined
    const newProfile: BehaviorRuleProfile = {
      id: crypto.randomUUID(),
      name,
      rules: baseProfile
        ? structuredClone(baseProfile.rules)
        : BEHAVIOR_RULE_TEMPLATES.map((rule) => ({
            rule: structuredClone(rule),
            enabled: false,
          })),
      isPreset: false,
    }
    behaviorRuleProfiles.value.push(newProfile)
    return newProfile
  }

  function duplicateProfile(profileId: string, newName: string): BehaviorRuleProfile | undefined {
    return addProfile(newName, profileId)
  }

  function deleteProfile(profileId: string) {
    const profile = behaviorRuleProfiles.value.find((p) => p.id === profileId)
    if (!profile || profile.isPreset) return
    behaviorRuleProfiles.value = behaviorRuleProfiles.value.filter((p) => p.id !== profileId)
    if (gameSettings.value.selectedBehaviorProfileId === profileId) {
      selectProfile('default')
    }
  }

  function renameProfile(profileId: string, newName: string) {
    const profile = behaviorRuleProfiles.value.find((p) => p.id === profileId)
    if (profile && !profile.isPreset) {
      profile.name = newName
    }
  }

  // ─── Rule CRUD (within current profile) ──────────────────────────────

  function toggleRuleInProfile(ruleId: string, enabled: boolean) {
    const profile = selectedProfile.value
    if (!profile || profile.isPreset) return
    const entry = profile.rules.find((r) => r.rule.id === ruleId)
    if (entry) {
      entry.enabled = enabled
    }
    // Sync activeBehaviorRuleIds
    gameSettings.value.activeBehaviorRuleIds = profile.rules
      .filter((r) => r.enabled)
      .map((r) => r.rule.id)
  }

  function updateRuleInProfile(ruleId: string, updatedRule: BehaviorRule) {
    const profile = selectedProfile.value
    if (!profile || profile.isPreset) return
    const entry = profile.rules.find((r) => r.rule.id === ruleId)
    if (entry) {
      entry.rule = updatedRule
    }
  }

  function addRuleToProfile(rule: BehaviorRule, enabled = true) {
    const profile = selectedProfile.value
    if (!profile || profile.isPreset) return
    profile.rules.push({ rule: structuredClone(rule), enabled })
    if (enabled) {
      gameSettings.value.activeBehaviorRuleIds.push(rule.id)
    }
  }

  function deleteRuleFromProfile(ruleId: string) {
    const profile = selectedProfile.value
    if (!profile) return
    const entry = profile.rules.find((r) => r.rule.id === ruleId)
    if (entry?.rule.isPreset) return // cannot delete preset rules
    profile.rules = profile.rules.filter((r) => r.rule.id !== ruleId)
    gameSettings.value.activeBehaviorRuleIds = gameSettings.value.activeBehaviorRuleIds.filter(
      (id) => id !== ruleId,
    )
  }

  // ─── Save current config as new profile ──────────────────────────────

  function saveCurrentAsProfile(name: string): BehaviorRuleProfile {
    const currentProfile = selectedProfile.value
    const newProfile: BehaviorRuleProfile = {
      id: crypto.randomUUID(),
      name,
      rules: currentProfile
        ? structuredClone(currentProfile.rules)
        : [],
      isPreset: false,
    }
    behaviorRuleProfiles.value.push(newProfile)
    selectProfile(newProfile.id)
    return newProfile
  }

  // ─── General settings ────────────────────────────────────────────────

  function updateGameSettings(partial: Partial<GameSettings>) {
    gameSettings.value = { ...gameSettings.value, ...partial }
  }

  function resetToDefaults() {
    gameSettings.value = { ...DEFAULT_GAME_SETTINGS }
    behaviorRuleProfiles.value = structuredClone(DEFAULT_PROFILES)
  }

  const cardLanguages = computed<string[]>(() => {
    const langs = ['en']
    if (cardSecondLanguage.value) langs.push(cardSecondLanguage.value)
    return langs
  })

  return {
    // Game settings
    gameSettings,
    updateGameSettings,
    resetToDefaults,
    // Preferences
    hapticFeedback,
    soundEnabled,
    soundVolume,
    keepScreenOn,
    language,
    cardSecondLanguage,
    layoutMode,
    autoOrientIcons,
    orientationLockedPlayerId,
    cardLanguages,
    // Behavior rule profiles
    behaviorRuleProfiles,
    selectedProfile,
    behaviorRules,
    activeBehaviorRules,
    selectProfile,
    addProfile,
    duplicateProfile,
    deleteProfile,
    renameProfile,
    // Rule CRUD within profile
    toggleRuleInProfile,
    updateRuleInProfile,
    addRuleToProfile,
    deleteRuleFromProfile,
    saveCurrentAsProfile,
  }
})
