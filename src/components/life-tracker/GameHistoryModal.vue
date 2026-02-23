<template>
  <ion-modal :is-open="isOpen" @didDismiss="$emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('history.title') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')">{{ t('common.close') }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list v-if="reversedHistory.length > 0">
        <ion-item v-for="action in reversedHistory" :key="action.id">
          <ion-icon :icon="actionIcon(action.type)" slot="start" :color="actionColor(action.type)" />
          <ion-label>
            <h3>{{ action.description }}</h3>
            <p>{{ formatTime(action.timestamp) }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <div v-else class="flex h-full items-center justify-center">
        <p class="text-text-secondary">{{ t('history.noActions') }}</p>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
} from '@ionic/vue'
import {
  heartOutline,
  shieldOutline,
  skullOutline,
  flashOutline,
  batteryChargingOutline,
  playForwardOutline,
  ribbonOutline,
} from 'ionicons/icons'
import { useGameStore } from '@/stores/gameStore'
import type { GameActionType } from '@/types/game'

defineProps<{
  isOpen: boolean
}>()

defineEmits<{
  close: []
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
  }
  return colorMap[type] ?? 'medium'
}

function formatTime(timestamp: number): string {
  const startedAt = gameStore.currentGame?.startedAt ?? timestamp
  const elapsedSeconds = Math.floor((timestamp - startedAt) / 1000)
  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
</script>
