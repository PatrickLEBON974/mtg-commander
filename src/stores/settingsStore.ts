import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { GameSettings, BehaviorRuleProfile, BehaviorRule, BehaviorRuleInProfile, TimerRule } from '@/types/game'
import { DEFAULT_GAME_SETTINGS } from '@/types/game'
import { saveSettings, loadSettings, savePreferences, loadPreferences, saveBehaviorProfiles, loadBehaviorProfiles } from '@/services/persistence'
import { DEFAULT_PROFILES, BEHAVIOR_RULE_TEMPLATES } from '@/rules/behaviorRulePresets'
import type { LayoutMode } from '@/services/persistence'

// ─── Default timer rules (shipped with the app) ────────────────────
const DEFAULT_TIMER_RULES: TimerRule[] = [
  {
    id: 'default_last_minute_flash',
    name: 'Last minute flash',
    trigger: { type: 'timer_b_remaining', thresholdSeconds: 60 },
    effect: { type: 'aggressive_flash' },
  },
  {
    id: 'default_expired_buzz',
    name: 'Expired buzz',
    trigger: { type: 'timer_b_expired', thresholdSeconds: 0 },
    effect: { type: 'repeated_buzz', repeatIntervalSeconds: 30 },
  },
  {
    id: 'default_expired_sound',
    name: 'Expired sound',
    trigger: { type: 'timer_b_expired', thresholdSeconds: 0 },
    effect: { type: 'play_sound', soundType: 'urgent' },
  },
  {
    id: 'default_overtime_display',
    name: 'Overtime display',
    trigger: { type: 'timer_b_expired', thresholdSeconds: 0 },
    effect: { type: 'overtime_display' },
  },
]

const TIMER_RULES_STORAGE_KEY = 'mtg_commander_timer_rules'

function loadTimerRules(): TimerRule[] {
  const stored = localStorage.getItem(TIMER_RULES_STORAGE_KEY)
  if (!stored) return [...DEFAULT_TIMER_RULES]
  try {
    return JSON.parse(stored) ?? [...DEFAULT_TIMER_RULES]
  } catch {
    return [...DEFAULT_TIMER_RULES]
  }
}

function saveTimerRules(rules: TimerRule[]) {
  localStorage.setItem(TIMER_RULES_STORAGE_KEY, JSON.stringify(rules))
}

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
  const timerRules = ref<TimerRule[]>(loadTimerRules())

  // ─── Behavior Rule Profiles ──────────────────────────────────────────
  const behaviorRuleProfiles = ref<BehaviorRuleProfile[]>(
    structuredClone(DEFAULT_PROFILES),
  )

  // Load persisted profiles on init
  const savedProfiles = loadBehaviorProfiles() as BehaviorRuleProfile[] | null
  if (savedProfiles && Array.isArray(savedProfiles) && savedProfiles.length > 0) {
    behaviorRuleProfiles.value = savedProfiles
  }

  // Load persisted game settings on init
  const savedSettings = loadSettings()
  if (savedSettings) {
    gameSettings.value = { ...DEFAULT_GAME_SETTINGS, ...savedSettings }
  }

  // If activeTimerRuleIds is empty (new install or first time), activate all defaults
  if (gameSettings.value.activeTimerRuleIds.length === 0 && timerRules.value.length > 0) {
    gameSettings.value.activeTimerRuleIds = timerRules.value.map((rule) => rule.id)
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

  // Persist timer rules on change
  watch(timerRules, (rules) => saveTimerRules(rules), { deep: true })

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
    if (!profile) return
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
    if (!profile) return
    const entry = profile.rules.find((r) => r.rule.id === ruleId)
    if (entry) {
      entry.rule = updatedRule
    }
  }

  function addRuleToProfile(rule: BehaviorRule, enabled = true) {
    const profile = selectedProfile.value
    if (!profile) return
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

  // ─── Timer rule CRUD ─────────────────────────────────────────────────

  function addTimerRule(rule: TimerRule) {
    timerRules.value.push(rule)
  }

  function updateTimerRule(ruleId: string, updatedRule: TimerRule) {
    const index = timerRules.value.findIndex((rule) => rule.id === ruleId)
    if (index >= 0) {
      timerRules.value[index] = updatedRule
    }
  }

  function removeTimerRule(ruleId: string) {
    timerRules.value = timerRules.value.filter((rule) => rule.id !== ruleId)
    // Also remove from active rules in game settings
    gameSettings.value.activeTimerRuleIds = gameSettings.value.activeTimerRuleIds.filter(
      (id) => id !== ruleId,
    )
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
    // Timer rules
    timerRules,
    addTimerRule,
    updateTimerRule,
    removeTimerRule,
  }
})
