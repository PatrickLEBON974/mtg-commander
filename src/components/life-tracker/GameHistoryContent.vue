<template>
  <div class="history-content">
    <!-- Header -->
    <div class="history-header">
      <h2 class="history-title">{{ t('history.title') }}</h2>
      <button class="history-close-btn" :aria-label="t('common.close')" @click="dismiss()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <ion-list v-if="reversedHistory.length > 0">
      <ion-item v-for="action in reversedHistory" :key="action.id">
        <ion-icon :icon="actionIcon(action.type)" slot="start" :color="actionColor(action.type)" />
        <ion-label>
          <h3>{{ translateActionDescription(action) }}</h3>
          <p>{{ formatRelativeTime(action.timestamp, gameStore.currentGame?.startedAt ?? action.timestamp) }}</p>
        </ion-label>
      </ion-item>
    </ion-list>

    <div v-else class="flex h-40 items-center justify-center">
      <p class="text-text-secondary">{{ t('history.noActions') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonList, IonItem, IonLabel, IonIcon } from '@ionic/vue'
import {
  heartOutline, shieldOutline, skullOutline, flashOutline,
  batteryChargingOutline, playForwardOutline, ribbonOutline,
} from 'ionicons/icons'
import { useGameStore } from '@/stores/gameStore'
import { formatRelativeTime } from '@/utils/time'
import type { GameAction, GameActionType } from '@/types/game'
defineProps<{
  dismiss: (data?: unknown, role?: string) => void
}>()

const { t } = useI18n()
const gameStore = useGameStore()

const reversedHistory = computed(() =>
  [...(gameStore.currentGame?.history ?? [])].reverse(),
)

function actionIcon(type: GameActionType): string {
  const iconMap: Record<GameActionType, string> = {
    life_change: heartOutline,
    commander_damage: shieldOutline,
    commander_cast: ribbonOutline,
    poison_change: skullOutline,
    experience_change: flashOutline,
    energy_change: batteryChargingOutline,
    monarch_change: ribbonOutline,
    initiative_change: flashOutline,
    turn_advance: playForwardOutline,
    behavior_rule_life: heartOutline,
    behavior_rule_counter: skullOutline,
  }
  return iconMap[type] ?? heartOutline
}

function actionColor(type: GameActionType): string {
  const colorMap: Record<GameActionType, string> = {
    life_change: 'success',
    commander_damage: 'warning',
    commander_cast: 'tertiary',
    poison_change: 'secondary',
    experience_change: 'primary',
    energy_change: 'primary',
    monarch_change: 'warning',
    initiative_change: 'primary',
    turn_advance: 'medium',
    behavior_rule_life: 'danger',
    behavior_rule_counter: 'danger',
  }
  return colorMap[type] ?? 'medium'
}

function translateActionDescription(action: GameAction): string {
  return t(action.descriptionKey, action.descriptionParams ?? {})
}
</script>

<style scoped>
.history-content {
  position: relative;
  min-height: 200px;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
}

.history-title {
  font-family: var(--font-beleren);
  font-size: 18px;
  color: var(--color-arena-gold-light);
  letter-spacing: 0.5px;
  text-shadow: 0 0 16px rgba(212, 168, 67, 0.15);
}

.history-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  -webkit-tap-highlight-color: transparent;
}

.history-close-btn:active {
  background: rgba(255, 255, 255, 0.12);
}
</style>
