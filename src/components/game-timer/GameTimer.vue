<template>
  <div
    class="flex items-center justify-center gap-3 px-4 py-3"
    :class="[
      isRunning ? 'bg-surface-light' : 'bg-life-negative/10',
      { 'game-timer-flash': isFlashing },
    ]"
  >
    <button
      class="flex h-12 w-12 items-center justify-center rounded-full transition-colors"
      :class="isRunning
        ? 'bg-white/10 text-text-secondary active:bg-white/20'
        : 'bg-life-negative/20 text-life-negative active:bg-life-negative/30'"
      :aria-label="isRunning ? t('game.pause') : t('game.resume')"
      @click="handleToggle"
    >
      <ion-icon :icon="isRunning ? pauseOutline : playOutline" class="text-xl" />
    </button>

    <!-- Paused label -->
    <span v-if="!isRunning" class="text-xs font-semibold uppercase tracking-wider text-life-negative animate-pulse">
      {{ t('game.pause') }}
    </span>

    <!-- Game elapsed time -->
    <span class="font-mono text-base tabular-nums text-text-primary">
      {{ formattedGameTime }}
    </span>

    <span v-if="isOvertime" class="text-xs font-bold text-life-negative animate-pulse">{{ t('game.overtime') }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IonIcon } from '@ionic/vue'
import { playOutline, pauseOutline } from 'ionicons/icons'
import { useI18n } from 'vue-i18n'
import { useGameStore } from '@/stores/gameStore'
import { useGameClock } from '@/composables/useGameClock'
import { tapFeedback } from '@/services/haptics'
import { formatMsToTimer } from '@/utils/time'

defineProps<{ isFlashing?: boolean; isOvertime?: boolean }>()

const { t } = useI18n()
const gameStore = useGameStore()
const { isRunning, toggleTimer } = useGameClock()

const formattedGameTime = computed(() =>
  formatMsToTimer(gameStore.currentGame?.elapsedMs ?? 0),
)

function handleToggle() {
  toggleTimer()
  tapFeedback()
}
</script>

<style scoped>
@keyframes game-timer-flash {
  0%, 100% { background-color: rgba(239, 68, 68, 0.05); }
  50% { background-color: rgba(239, 68, 68, 0.25); }
}
.game-timer-flash {
  animation: game-timer-flash 0.8s ease-in-out infinite;
}
</style>
