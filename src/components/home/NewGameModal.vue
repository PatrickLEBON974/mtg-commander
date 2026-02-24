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

        <ion-item v-if="settingsStore.gameSettings.enableTurnTimer" lines="inset">
          <ion-icon :icon="timeOutline" slot="start" color="medium" />
          <ion-label>{{ t('home.turnDuration') }}</ion-label>
          <SettingStepper
            slot="end"
            v-model="settingsStore.gameSettings.turnTimerSeconds"
            :options="turnTimerOptions"
            :label="t('home.turnDuration')"
          />
        </ion-item>

        <!-- Timer rules toggles (per-game activation) -->
        <template v-if="settingsStore.gameSettings.enableTurnTimer && settingsStore.timerRules.length > 0">
          <ion-list-header>
            <ion-label class="text-sm">{{ t('home.timerRules') }}</ion-label>
          </ion-list-header>
          <ion-item
            v-for="rule in settingsStore.timerRules"
            :key="rule.id"
            :lines="rule === settingsStore.timerRules[settingsStore.timerRules.length - 1] ? 'none' : 'inset'"
          >
            <ion-label>{{ rule.name }}</ion-label>
            <ion-toggle
              slot="end"
              :checked="settingsStore.gameSettings.activeTimerRuleIds.includes(rule.id)"
              @ionChange="toggleTimerRule(rule.id, $event.detail.checked)"
            />
          </ion-item>
        </template>
      </template>
    </ion-list>

    <ion-list :inset="true">
      <ion-list-header>
        <ion-label>{{ t('home.rules') }}</ion-label>
      </ion-list-header>

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

    <ion-list-header>
      <ion-label>{{ t('home.playerList') }}</ion-label>
    </ion-list-header>

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

    <div class="p-4">
      <ion-button expand="block" color="primary" data-sound="none" @click="handleConfirm">
        <ion-icon :icon="playOutline" slot="start" />
        {{ t('home.newGame') }}
      </ion-button>
    </div>
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
} from 'ionicons/icons'
import { useSettingsStore } from '@/stores/settingsStore'
import AppModal from '@/components/ui/AppModal.vue'
import SettingStepper from '@/components/ui/SettingStepper.vue'
import PlayerSelectItem from '@/components/player-registry/PlayerSelectItem.vue'
import type { PlayerConfigExtended } from '@/components/player-registry/PlayerSelectItem.vue'
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

// ─── Stepper options ──────────────────────────────────────────────────
const commanderDamageOptions = computed(() => [
  { value: 0, label: t('common.off') },
  { value: 21, label: '21' },
])
const poisonOptions = computed(() => [
  { value: 0, label: t('common.off') },
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 15, label: '15' },
  { value: 20, label: '20' },
])

const turnTimerOptions = [
  { value: 60, label: '1:00' },
  { value: 90, label: '1:30' },
  { value: 120, label: '2:00' },
  { value: 180, label: '3:00' },
  { value: 300, label: '5:00' },
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

// ─── Timer rule toggle ────────────────────────────────────────────────
function toggleTimerRule(ruleId: string, isActive: boolean) {
  const activeIds = settingsStore.gameSettings.activeTimerRuleIds
  if (isActive && !activeIds.includes(ruleId)) {
    activeIds.push(ruleId)
  } else if (!isActive) {
    settingsStore.gameSettings.activeTimerRuleIds = activeIds.filter((id) => id !== ruleId)
  }
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
