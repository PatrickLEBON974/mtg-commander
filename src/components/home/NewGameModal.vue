<template>
  <AppModal :is-open="isOpen" :title="t('home.newGame')" @close="$emit('close')">
    <ion-list :inset="true">
      <ion-item lines="inset">
        <ion-icon :icon="peopleOutline" slot="start" color="tertiary" />
        <ion-label>{{ t('home.players') }}</ion-label>
        <SettingStepper
          slot="end"
          v-model="settingsStore.gameSettings.playerCount"
          :options="PLAYER_COUNT_OPTIONS"
          :label="t('common.players')"
        />
      </ion-item>

      <ion-item lines="inset">
        <ion-icon :icon="heartOutline" slot="start" color="danger" />
        <ion-label>{{ t('home.life') }}</ion-label>
        <SettingStepper
          slot="end"
          v-model="settingsStore.gameSettings.startingLife"
          :options="STARTING_LIFE_OPTIONS"
          :label="t('common.life')"
        />
      </ion-item>

      <ion-item :lines="settingsStore.gameSettings.enableTimer ? 'inset' : 'none'">
        <ion-icon :icon="timerOutline" slot="start" color="medium" />
        <ion-label>{{ t('home.gameTimer') }}</ion-label>
        <ion-toggle slot="end" v-model="settingsStore.gameSettings.enableTimer" />
      </ion-item>

      <!-- Turn timer (nested under game timer) -->
      <template v-if="settingsStore.gameSettings.enableTimer">
        <ion-item :lines="settingsStore.gameSettings.enableTurnTimer ? 'inset' : 'none'">
          <ion-icon :icon="hourglassOutline" slot="start" color="medium" />
          <ion-label>{{ t('home.turnTimer') }}</ion-label>
          <ion-toggle slot="end" v-model="settingsStore.gameSettings.enableTurnTimer" />
        </ion-item>

        <ion-item v-if="settingsStore.gameSettings.enableTurnTimer" lines="none">
          <ion-icon :icon="timeOutline" slot="start" color="medium" />
          <ion-label>{{ t('home.turnDuration') }}</ion-label>
          <SettingStepper
            slot="end"
            v-model="settingsStore.gameSettings.turnTimerSeconds"
            :options="turnTimerOptions"
            :label="t('home.turnDuration')"
          />
        </ion-item>

        <!-- Hourglass tokens -->
        <ion-item :lines="settingsStore.gameSettings.hourglassEnabled ? 'inset' : 'none'">
          <ion-icon :icon="hourglassOutline" slot="start" color="warning" />
          <ion-label>{{ t('rules.hourglassEnabled') }}</ion-label>
          <ion-toggle slot="end" v-model="settingsStore.gameSettings.hourglassEnabled" />
        </ion-item>

        <template v-if="settingsStore.gameSettings.hourglassEnabled">
          <ion-item lines="inset">
            <ion-label>{{ t('rules.hourglassMode') }}</ion-label>
            <ion-select v-model="settingsStore.gameSettings.hourglassMode" interface="action-sheet">
              <ion-select-option value="fixed">{{ t('rules.hourglassModeFixed') }}</ion-select-option>
              <ion-select-option value="time_bank">{{ t('rules.hourglassModeTimeBank') }}</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item lines="inset">
            <ion-label>{{ t('rules.hourglassGracePeriod') }}</ion-label>
            <SettingStepper
              slot="end"
              v-model="settingsStore.gameSettings.hourglassGracePeriodSeconds"
              :options="HOURGLASS_GRACE_OPTIONS"
              :label="t('rules.hourglassGracePeriod')"
            />
          </ion-item>

          <ion-item lines="inset">
            <ion-label>{{ t('rules.hourglassLossThreshold') }}</ion-label>
            <SettingStepper
              slot="end"
              v-model="settingsStore.gameSettings.hourglassLossThreshold"
              :options="HOURGLASS_THRESHOLD_OPTIONS"
              :label="t('rules.hourglassLossThreshold')"
            />
          </ion-item>

          <!-- Time bank cap (only shown in time_bank mode) -->
          <template v-if="settingsStore.gameSettings.hourglassMode === 'time_bank'">
            <ion-item :lines="settingsStore.gameSettings.hourglassTimeBankCapEnabled ? 'inset' : 'none'">
              <ion-label>{{ t('rules.hourglassTimeBankCapEnabled') }}</ion-label>
              <ion-toggle slot="end" v-model="settingsStore.gameSettings.hourglassTimeBankCapEnabled" />
            </ion-item>

            <ion-item v-if="settingsStore.gameSettings.hourglassTimeBankCapEnabled" lines="none">
              <ion-label>{{ t('rules.hourglassTimeBankCap') }}</ion-label>
              <SettingStepper
                slot="end"
                v-model="settingsStore.gameSettings.hourglassTimeBankCapSeconds"
                :options="HOURGLASS_CAP_OPTIONS"
                :label="t('rules.hourglassTimeBankCap')"
              />
            </ion-item>
          </template>
        </template>
      </template>

      <ion-item lines="inset">
        <ion-icon :icon="shieldOutline" slot="start" color="warning" />
        <ion-label>{{ t('home.commanderDamage') }}</ion-label>
        <SettingStepper
          slot="end"
          v-model="settingsStore.gameSettings.commanderDamageThreshold"
          :options="commanderDamageOptions"
          :label="t('settings.commanderDamageLabel')"
        />
      </ion-item>

      <ion-item lines="none">
        <ion-icon :icon="skullOutline" slot="start" color="primary" />
        <ion-label>{{ t('home.poisonThreshold') }}</ion-label>
        <SettingStepper
          slot="end"
          v-model="settingsStore.gameSettings.poisonThreshold"
          :options="poisonOptions"
          :label="t('settings.poisonLabel')"
        />
      </ion-item>
    </ion-list>

    <!-- Behavior Rules Section (collapsible, closed by default) -->
    <ion-list :inset="true">
      <ion-item button lines="none" @click="isBehaviorRulesOpen = !isBehaviorRulesOpen">
        <ion-icon :icon="shieldCheckmarkOutline" slot="start" color="tertiary" />
        <ion-label>{{ t('rules.sectionTitle') }}</ion-label>
        <ion-icon
          slot="end"
          :icon="chevronDownOutline"
          class="collapsible-chevron"
          :class="{ 'collapsible-chevron--open': isBehaviorRulesOpen }"
        />
      </ion-item>
    </ion-list>

    <Transition name="collapse">
      <ion-list v-if="isBehaviorRulesOpen" :inset="true" class="mt-0">
        <!-- Profile selector -->
        <ion-item lines="inset">
          <ion-icon :icon="shieldCheckmarkOutline" slot="start" color="tertiary" />
          <ion-label>{{ t('rules.selectProfile') }}</ion-label>
          <ion-select
            :value="settingsStore.gameSettings.selectedBehaviorProfileId"
            interface="action-sheet"
            @ionChange="onProfileChange($event.detail.value)"
          >
            <ion-select-option
              v-for="profile in settingsStore.behaviorRuleProfiles"
              :key="profile.id"
              :value="profile.id"
            >
              {{ profile.isPreset ? t(`rules.profiles.${profile.id === 'default' ? 'default' : profile.id === 'fast-game' ? 'fastGame' : 'relaxed'}`) : profile.name }}
            </ion-select-option>
          </ion-select>
        </ion-item>

        <!-- Rules list with toggles -->
        <ion-item
          v-for="(entry, index) in settingsStore.behaviorRules"
          :key="entry.rule.id"
          :lines="index === settingsStore.behaviorRules.length - 1 ? 'none' : 'inset'"
          button
          @click="openRuleEditor(entry.rule)"
        >
          <ion-label>
            <h3>{{ getRuleName(entry.rule) }}</h3>
            <p>{{ getRuleDescription(entry.rule) }}</p>
          </ion-label>
          <ion-toggle
            slot="end"
            :checked="entry.enabled"
            @ionChange.stop="settingsStore.toggleRuleInProfile(entry.rule.id, $event.detail.checked)"
          />
        </ion-item>

        <!-- Add custom rule button -->
        <ion-item button lines="none" @click="openRuleEditor(null)">
          <ion-icon :icon="addOutline" slot="start" color="primary" />
          <ion-label color="primary">{{ t('rules.editor.createTitle') }}</ion-label>
        </ion-item>

        <!-- Save as profile (if modified) -->
        <ion-item v-if="isProfileModified" button lines="none" @click="promptSaveAsProfile">
          <ion-icon :icon="saveOutline" slot="start" color="success" />
          <ion-label color="success">{{ t('rules.saveAsProfile') }}</ion-label>
        </ion-item>
      </ion-list>
    </Transition>

    <!-- Player list (collapsible, closed by default) -->
    <ion-list :inset="true">
      <ion-item button lines="none" @click="isPlayersOpen = !isPlayersOpen">
        <ion-icon :icon="peopleOutline" slot="start" color="tertiary" />
        <ion-label>{{ t('home.playerList') }}</ion-label>
        <ion-icon
          slot="end"
          :icon="chevronDownOutline"
          class="collapsible-chevron"
          :class="{ 'collapsible-chevron--open': isPlayersOpen }"
        />
      </ion-item>
    </ion-list>

    <Transition name="collapse">
      <div v-if="isPlayersOpen">
        <ion-reorder-group :disabled="false" @ionItemReorder="handleReorder($event)">
          <PlayerSelectItem
            v-for="(player, index) in playerConfigs"
            :key="player.id"
            :model-value="player"
            :player-index="index"
            :used-profile-ids="usedProfileIds"
            @update:model-value="playerConfigs[index] = $event"
          />
        </ion-reorder-group>
      </div>
    </Transition>

    <div class="p-4">
      <ion-button expand="block" color="primary" data-sound="none" @click="handleConfirm">
        <ion-icon :icon="playOutline" slot="start" />
        {{ t('home.newGame') }}
      </ion-button>
    </div>

    <BehaviorRuleEditor
      :is-open="isRuleEditorOpen"
      :rule="editingRule"
      @close="isRuleEditorOpen = false"
      @save="onRuleEditorSave"
      @delete="onRuleEditorDelete"
    />
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonListHeader,
  IonReorderGroup,
  IonButton,
  IonIcon,
  IonSelect,
  IonSelectOption,
  alertController,
} from '@ionic/vue'
import {
  playOutline,
  peopleOutline,
  heartOutline,
  timerOutline,
  hourglassOutline,
  timeOutline,
  shieldOutline,
  skullOutline,
  shieldCheckmarkOutline,
  addOutline,
  saveOutline,
  chevronDownOutline,
} from 'ionicons/icons'
import { useSettingsStore } from '@/stores/settingsStore'
import AppModal from '@/components/ui/AppModal.vue'
import SettingStepper from '@/components/ui/SettingStepper.vue'
import PlayerSelectItem from '@/components/player-registry/PlayerSelectItem.vue'
import BehaviorRuleEditor from '@/components/home/BehaviorRuleEditor.vue'
import type { PlayerConfigExtended } from '@/components/player-registry/PlayerSelectItem.vue'
import type { BehaviorRule } from '@/types/game'
import { PLAYER_COUNT_OPTIONS, STARTING_LIFE_OPTIONS, PLAYER_COLORS } from '@/config/gameConstants'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: [playerConfigs: PlayerConfigExtended[]]
}>()

const { t } = useI18n()
const settingsStore = useSettingsStore()

const isBehaviorRulesOpen = ref(false)
const isPlayersOpen = ref(false)

// ─── Stepper options ──────────────────────────────────────────────────
const commanderDamageOptions = computed(() => [
  { value: 0, label: t('common.off') },
  ...Array.from({ length: 40 }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
])
const poisonOptions = computed(() => [
  { value: 0, label: t('common.off') },
  ...Array.from({ length: 20 }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
])

const turnTimerOptions = Array.from({ length: 59 }, (_, i) => {
  const seconds = (i + 1) * 10
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return { value: seconds, label: `${minutes}:${String(remainingSeconds).padStart(2, '0')}` }
})

const HOURGLASS_GRACE_OPTIONS = [
  { value: 120, label: '2 min' },
  { value: 180, label: '3 min' },
  { value: 300, label: '5 min' },
  { value: 420, label: '7 min' },
  { value: 600, label: '10 min' },
]
const HOURGLASS_THRESHOLD_OPTIONS = [
  { value: 5, label: '5' },
  { value: 7, label: '7' },
  { value: 10, label: '10' },
  { value: 15, label: '15' },
  { value: 20, label: '20' },
]
const HOURGLASS_CAP_OPTIONS = [
  { value: 600, label: '10 min' },
  { value: 900, label: '15 min' },
  { value: 1200, label: '20 min' },
  { value: 1800, label: '30 min' },
]

// ─── Player configs ───────────────────────────────────────────────────
let nextConfigId = 0
const playerConfigs = ref<PlayerConfigExtended[]>([])

const usedProfileIds = computed(() =>
  playerConfigs.value
    .map((config) => config.playerProfileId)
    .filter((id): id is string => id !== undefined),
)

watch(() => settingsStore.gameSettings.playerCount, (count) => {
  const existing = playerConfigs.value
  if (count > existing.length) {
    for (let i = existing.length; i < count; i++) {
      existing.push({
        id: nextConfigId++,
        name: t('game.defaultPlayerName', { index: i + 1 }),
        color: PLAYER_COLORS[i % PLAYER_COLORS.length]!,
      })
    }
  } else if (count < existing.length) {
    existing.splice(count)
  }
}, { immediate: true })

// ─── Behavior rule editor ─────────────────────────────────────────────
const editingRule = ref<BehaviorRule | null>(null)
const isRuleEditorOpen = ref(false)
const isProfileModified = ref(false)

function onProfileChange(profileId: string) {
  settingsStore.selectProfile(profileId)
  isProfileModified.value = false
}

function openRuleEditor(rule: BehaviorRule | null) {
  editingRule.value = rule ? structuredClone(rule) : null
  isRuleEditorOpen.value = true
}

function onRuleEditorSave(rule: BehaviorRule) {
  if (editingRule.value) {
    settingsStore.updateRuleInProfile(editingRule.value.id, rule)
  } else {
    settingsStore.addRuleToProfile(rule)
  }
  isRuleEditorOpen.value = false
  isProfileModified.value = true
}

function onRuleEditorDelete(ruleId: string) {
  settingsStore.deleteRuleFromProfile(ruleId)
  isRuleEditorOpen.value = false
  isProfileModified.value = true
}

async function promptSaveAsProfile() {
  const alert = await alertController.create({
    header: t('rules.newProfile'),
    inputs: [{ name: 'name', type: 'text', placeholder: t('rules.profileName') }],
    buttons: [
      { text: t('common.cancel'), role: 'cancel' },
      {
        text: t('common.confirm'),
        handler: (data) => {
          if (data.name?.trim()) {
            settingsStore.saveCurrentAsProfile(data.name.trim())
            isProfileModified.value = false
          }
        },
      },
    ],
  })
  await alert.present()
}

const RULE_ID_TO_I18N_KEY: Record<string, string> = {
  'critical-life': 'criticalLife',
  'poison-warning': 'poisonWarning',
  'commander-damage-warning': 'commanderDamageWarning',
  'turn-timer-warning': 'turnTimerWarning',
  'player-elimination': 'playerElimination',
  'hourglass-lethal': 'hourglassLethal',
}

function getRuleName(rule: BehaviorRule): string {
  const key = RULE_ID_TO_I18N_KEY[rule.id]
  return key ? t(`rules.${key}`) : rule.name
}

function getRuleDescription(rule: BehaviorRule): string {
  const trigger = rule.trigger
  const params: Record<string, string | number> = {}
  if ('threshold' in trigger) params.threshold = trigger.threshold
  if ('thresholdSeconds' in trigger) {
    params.threshold = trigger.thresholdSeconds
    params.minutes = Math.round(trigger.thresholdSeconds / 60)
  }
  if (rule.repeatIntervalSeconds) params.interval = rule.repeatIntervalSeconds
  for (const effect of rule.effects) {
    if (effect.type === 'modify_life') params.amount = effect.amount
    if (effect.type === 'modify_counter') params.amount = effect.amount
  }

  const key = RULE_ID_TO_I18N_KEY[rule.id]
  return key ? t(`rules.${key}Desc`, params) : rule.name
}

// ─── Reorder players ──────────────────────────────────────────────────
function handleReorder(event: CustomEvent) {
  const movedItem = playerConfigs.value.splice(event.detail.from, 1)[0]!
  playerConfigs.value.splice(event.detail.to, 0, movedItem)
  event.detail.complete(false)
}

// ─── Confirm ──────────────────────────────────────────────────────────
function handleConfirm() {
  emit('confirm', playerConfigs.value)
}
</script>

<style scoped>
.collapsible-chevron {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  font-size: 16px;
  color: var(--ion-color-tertiary);
  opacity: 0.6;
}

.collapsible-chevron--open {
  transform: rotate(180deg);
  opacity: 1;
}

.collapse-enter-active {
  transition: opacity 0.3s ease-out, max-height 0.3s ease-out;
  overflow: hidden;
}
.collapse-leave-active {
  transition: opacity 0.2s ease-in, max-height 0.2s ease-in;
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 2000px;
}
</style>
