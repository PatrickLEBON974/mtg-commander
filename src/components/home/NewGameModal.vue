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

      <!-- Timer modes (nested under game timer) -->
      <template v-if="settingsStore.gameSettings.enableTimer">
        <div class="timer-mode-panel">
          <div class="timer-mode-panel__title">
            <span>{{ t('home.timerMode') }}</span>
            <strong>{{ t(`home.timerMode${timerMode === 'elapsed' ? 'Elapsed' : timerMode === 'turn' ? 'Turn' : 'Chess'}`) }}</strong>
          </div>
          <ion-segment v-model="timerMode" class="timer-mode-segment" :aria-label="t('home.timerMode')">
            <ion-segment-button value="elapsed">
              <ion-icon :icon="stopwatchOutline" />
              <ion-label>{{ t('home.timerModeElapsed') }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="turn">
              <ion-icon :icon="timeOutline" />
              <ion-label>{{ t('home.timerModeTurn') }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="chess">
              <ion-icon :icon="hourglassOutline" />
              <ion-label>{{ t('home.timerModeChess') }}</ion-label>
            </ion-segment-button>
          </ion-segment>
          <p>{{ timerModeHint }}</p>
        </div>

        <ion-item v-if="timerMode === 'turn'" lines="none">
          <ion-icon :icon="timeOutline" slot="start" color="medium" />
          <ion-label>{{ t('home.turnDuration') }}</ion-label>
          <SettingStepper
            slot="end"
            v-model="settingsStore.gameSettings.turnTimerSeconds"
            :options="turnTimerOptions"
            :label="t('home.turnDuration')"
          />
        </ion-item>

        <template v-if="timerMode === 'chess'">
          <ion-item class="chess-clock-setting-item" lines="inset">
            <ion-icon :icon="timerOutline" slot="start" color="warning" />
            <ion-label>
              <h3>{{ t('home.chessGameDuration') }}</h3>
              <p>{{ t('home.chessGameDurationHint') }}</p>
            </ion-label>
            <SettingStepper
              slot="end"
              v-model="settingsStore.gameSettings.chessGameDurationMinutes"
              :options="chessDurationOptions"
              :label="t('home.chessGameDuration')"
            />
          </ion-item>

          <ion-item class="chess-clock-setting-item" lines="none">
            <ion-icon :icon="repeatOutline" slot="start" color="tertiary" />
            <ion-label>
              <h3>{{ t('home.chessExpectedRounds') }}</h3>
              <p>{{ t('home.chessExpectedRoundsHint') }}</p>
            </ion-label>
            <SettingStepper
              slot="end"
              v-model="settingsStore.gameSettings.chessExpectedRounds"
              :options="chessRoundOptions"
              :label="t('home.chessExpectedRounds')"
            />
          </ion-item>

          <div class="chess-clock-preview" role="status" aria-live="polite">
            <div class="chess-clock-preview__header">
              <span class="chess-clock-preview__sigil" aria-hidden="true" />
              <div>
                <strong>{{ t('home.chessAllocationTitle') }}</strong>
                <p>{{ t('home.chessAllocationFormula', { players: settingsStore.gameSettings.playerCount }) }}</p>
              </div>
            </div>
            <div class="chess-clock-preview__metrics">
              <div>
                <span>{{ t('home.chessTotalGame') }}</span>
                <strong>{{ formattedChessGameDuration }}</strong>
              </div>
              <div class="chess-clock-preview__primary">
                <span>{{ t('home.chessPerPlayer') }}</span>
                <strong>{{ formattedChessPlayerBudget }}</strong>
              </div>
              <div>
                <span>{{ t('home.chessTheoreticalTurn') }}</span>
                <strong>{{ formattedChessTheoreticalTurn }}</strong>
              </div>
            </div>
            <p class="chess-clock-preview__note">{{ t('home.chessFlexibleOvertime') }}</p>
          </div>
        </template>

        <!-- Hourglass tokens are an alternative pressure rule. -->
        <template v-if="timerMode !== 'chess'">
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
      </template>

      <ion-item class="threshold-setting-item" lines="inset">
        <ion-icon :icon="shieldOutline" slot="start" color="warning" />
        <ion-label>{{ t('home.commanderDamage') }}</ion-label>
        <SettingStepper
          slot="end"
          v-model="settingsStore.gameSettings.commanderDamageThreshold"
          :options="commanderDamageOptions"
          :label="t('settings.commanderDamageLabel')"
        />
      </ion-item>

      <ion-item class="threshold-setting-item" lines="none">
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
      <ion-item
        button
        lines="none"
        :aria-expanded="isBehaviorRulesOpen"
        aria-controls="behavior-rules-panel"
        @click="isBehaviorRulesOpen = !isBehaviorRulesOpen"
      >
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
      <ion-list id="behavior-rules-panel" v-if="isBehaviorRulesOpen" :inset="true" class="mt-0">
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
      <ion-item
        button
        lines="none"
        :aria-expanded="isPlayersOpen"
        aria-controls="game-players-panel"
        @click="isPlayersOpen = !isPlayersOpen"
      >
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
      <div id="game-players-panel" v-if="isPlayersOpen">
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
  IonReorderGroup,
  IonButton,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
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
  repeatOutline,
  stopwatchOutline,
} from 'ionicons/icons'
import { useSettingsStore } from '@/stores/settingsStore'
import AppModal from '@/components/ui/AppModal.vue'
import SettingStepper from '@/components/ui/SettingStepper.vue'
import PlayerSelectItem from '@/components/player-registry/PlayerSelectItem.vue'
import BehaviorRuleEditor from '@/components/home/BehaviorRuleEditor.vue'
import type { PlayerConfigExtended } from '@/components/player-registry/PlayerSelectItem.vue'
import type { BehaviorRule, TimerMode } from '@/types/game'
import { PLAYER_COUNT_OPTIONS, STARTING_LIFE_OPTIONS, PLAYER_COLORS } from '@/config/gameConstants'
import { createChessClockState } from '@/utils/chessClock'
import { formatMsToTimer } from '@/utils/time'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: [playerConfigs: PlayerConfigExtended[]]
}>()

const { t } = useI18n()
const settingsStore = useSettingsStore()

const timerMode = computed<TimerMode>({
  get: () => settingsStore.gameSettings.timerMode,
  set: (mode) => {
    settingsStore.gameSettings.timerMode = mode
  },
})

const timerModeHint = computed(() => t(
  timerMode.value === 'elapsed'
    ? 'home.timerModeElapsedHint'
    : timerMode.value === 'turn'
      ? 'home.timerModeTurnHint'
      : 'home.timerModeChessHint',
))

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

const chessDurationOptions = Array.from({ length: 48 }, (_, index) => {
  const minutes = 15 + (index * 15)
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  const label = hours === 0
    ? `${minutes} min`
    : remainingMinutes === 0
      ? `${hours} h`
      : `${hours} h ${remainingMinutes}`
  return { value: minutes, label }
})

const chessRoundOptions = Array.from({ length: 27 }, (_, index) => {
  const rounds = index + 4
  return { value: rounds, label: String(rounds) }
})

const chessClockPreview = computed(() => createChessClockState(
  settingsStore.gameSettings.chessGameDurationMinutes,
  settingsStore.gameSettings.playerCount,
  settingsStore.gameSettings.chessExpectedRounds,
))
const formattedChessGameDuration = computed(() =>
  formatMsToTimer(chessClockPreview.value.totalGameDurationMs),
)
const formattedChessPlayerBudget = computed(() =>
  formatMsToTimer(chessClockPreview.value.playerBudgetMs),
)
const formattedChessTheoreticalTurn = computed(() =>
  formatMsToTimer(chessClockPreview.value.theoreticalTurnMs),
)

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
.timer-mode-panel {
  margin: 4px 12px 10px;
  padding: 12px;
  border: 1px solid rgba(203, 170, 99, 0.18);
  border-radius: 14px;
  background:
    radial-gradient(circle at 78% 10%, rgba(217, 104, 32, 0.1), transparent 38%),
    linear-gradient(145deg, rgba(22, 31, 34, 0.94), rgba(10, 15, 17, 0.96));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035), 0 6px 16px rgba(0, 0, 0, 0.2);
}

.timer-mode-panel__title {
  display: flex;
  margin: 0 2px 9px;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.timer-mode-panel__title span {
  color: rgba(211, 223, 219, 0.58);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.timer-mode-panel__title strong {
  color: rgba(239, 217, 160, 0.9);
  font-family: var(--font-beleren);
  font-size: 13px;
  letter-spacing: 0.03em;
}

.timer-mode-segment {
  --background: rgba(0, 0, 0, 0.28);
  min-height: 52px;
  padding: 3px;
  border: 1px solid rgba(255, 255, 255, 0.055);
  border-radius: 11px;
}

.timer-mode-segment ion-segment-button {
  --background-checked: linear-gradient(180deg, rgba(217, 104, 32, 0.32), rgba(117, 61, 25, 0.26));
  --border-radius: 8px;
  --color: rgba(198, 211, 207, 0.58);
  --color-checked: #f2ddb0;
  --indicator-color: transparent;
  min-width: 0;
  min-height: 44px;
  margin: 0;
  border: 1px solid transparent;
}

.timer-mode-segment ion-segment-button.segment-button-checked {
  border-color: rgba(229, 173, 79, 0.28);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045), 0 3px 10px rgba(0, 0, 0, 0.22);
}

.timer-mode-segment ion-icon {
  margin-bottom: 2px;
  font-size: 16px;
}

.timer-mode-segment ion-label {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.timer-mode-panel > p {
  min-height: 17px;
  margin: 8px 3px 0;
  color: rgba(202, 216, 211, 0.58);
  font-size: 11px;
  line-height: 1.45;
}

.chess-clock-preview {
  position: relative;
  overflow: hidden;
  margin: 2px 12px 12px;
  padding: 13px;
  border: 1px solid rgba(203, 170, 99, 0.24);
  border-radius: 14px;
  background:
    radial-gradient(circle at 50% -20%, rgba(203, 170, 99, 0.16), transparent 48%),
    linear-gradient(135deg, rgba(18, 27, 29, 0.98), rgba(8, 13, 15, 0.98));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 8px 20px rgba(0, 0, 0, 0.24);
}

.chess-clock-preview::after {
  content: '';
  position: absolute;
  top: 0;
  right: 18%;
  left: 18%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(239, 217, 160, 0.68), transparent);
}

.chess-clock-preview__header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chess-clock-preview__sigil {
  position: relative;
  width: 27px;
  height: 27px;
  flex: 0 0 auto;
  border: 1px solid rgba(239, 217, 160, 0.4);
  transform: rotate(45deg);
  box-shadow: inset 0 0 12px rgba(203, 170, 99, 0.1), 0 0 10px rgba(203, 170, 99, 0.12);
}

.chess-clock-preview__sigil::before,
.chess-clock-preview__sigil::after {
  content: '';
  position: absolute;
  background: rgba(239, 217, 160, 0.42);
}

.chess-clock-preview__sigil::before {
  top: 5px;
  bottom: 5px;
  left: 50%;
  width: 1px;
}

.chess-clock-preview__sigil::after {
  top: 50%;
  right: 5px;
  left: 5px;
  height: 1px;
}

.chess-clock-preview__header strong {
  color: rgba(241, 226, 192, 0.92);
  font-family: var(--font-beleren);
  font-size: 14px;
}

.chess-clock-preview__header p {
  margin: 2px 0 0;
  color: rgba(198, 211, 207, 0.58);
  font-size: 10px;
}

.chess-clock-preview__metrics {
  display: grid;
  margin-top: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid rgba(255, 255, 255, 0.055);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.2);
}

.chess-clock-preview__metrics > div {
  display: flex;
  min-width: 0;
  padding: 9px 6px;
  align-items: center;
  flex-direction: column;
  gap: 3px;
  text-align: center;
}

.chess-clock-preview__metrics > div + div {
  border-left: 1px solid rgba(255, 255, 255, 0.055);
}

.chess-clock-preview__metrics span {
  overflow: hidden;
  width: 100%;
  color: rgba(198, 211, 207, 0.52);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.chess-clock-preview__metrics strong {
  color: rgba(232, 235, 225, 0.82);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: clamp(12px, 4vw, 16px);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.04em;
}

.chess-clock-preview__metrics .chess-clock-preview__primary strong {
  color: #efd9a0;
  text-shadow: 0 0 10px rgba(239, 217, 160, 0.2);
}

.chess-clock-preview__note {
  margin: 9px 2px 0;
  color: rgba(224, 188, 117, 0.72);
  font-size: 10px;
  line-height: 1.4;
  text-align: center;
}

.collapsible-chevron,
ion-item[button] {
  touch-action: manipulation;
}

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

@media (max-width: 359px) {
  :deep(ion-list[inset='true']) {
    margin-right: 8px;
    margin-left: 8px;
  }

  :deep(ion-item) {
    --padding-start: 10px;
    --inner-padding-end: 8px;
  }

  :deep(ion-item ion-icon[slot='start']) {
    margin-inline-end: 8px;
  }

  :deep(.threshold-setting-item ion-icon[slot='start']) {
    display: none;
  }

  .timer-mode-panel,
  .chess-clock-preview {
    margin-right: 8px;
    margin-left: 8px;
  }

  .timer-mode-panel {
    padding: 9px;
  }

  .timer-mode-segment ion-label {
    font-size: 9px;
  }

  .chess-clock-preview {
    padding: 11px 9px;
  }

  :deep(.chess-clock-setting-item ion-label p) {
    display: none;
  }
}

@media (min-width: 700px) {
  .timer-mode-panel,
  .chess-clock-preview {
    margin-right: 18px;
    margin-left: 18px;
  }

  .timer-mode-panel,
  .chess-clock-preview {
    padding: 16px;
  }

  .timer-mode-panel > p {
    font-size: 12px;
  }

  .chess-clock-preview__metrics strong {
    font-size: 17px;
  }
}
</style>
