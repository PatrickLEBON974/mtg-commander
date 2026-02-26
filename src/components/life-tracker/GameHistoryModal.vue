<template>
  <AppModal :is-open="isOpen" :title="t('history.title')" @close="$emit('close')">
    <ion-list v-if="reversedHistory.length > 0">
      <ion-item v-for="action in reversedHistory" :key="action.id">
        <ion-icon :icon="actionIcon(action.type)" slot="start" :color="actionColor(action.type)" />
        <ion-label>
          <h3>{{ translateActionDescription(action) }}</h3>
          <p>{{ formatRelativeTime(action.timestamp, gameStore.currentGame?.startedAt ?? action.timestamp) }}</p>
        </ion-label>
      </ion-item>
    </ion-list>

    <div v-else class="flex h-full items-center justify-center">
      <p class="text-text-secondary">{{ t('history.noActions') }}</p>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
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
import { formatRelativeTime } from '@/utils/time'
import type { GameAction, GameActionType } from '@/types/game'
import AppModal from '@/components/ui/AppModal.vue'

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

/** Translate an action's i18n key at render time so language changes apply instantly */
function translateActionDescription(action: GameAction): string {
  return t(action.descriptionKey, action.descriptionParams ?? {})
}

</script>
