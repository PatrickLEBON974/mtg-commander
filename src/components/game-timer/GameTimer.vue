<template>
  <div class="flex items-center justify-center gap-3 bg-surface-light px-4 py-2" :class="{ 'game-timer-flash': isFlashing }">
    <button
      class="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary active:text-text-primary"
      :aria-label="isRunning ? t('game.pause') : t('game.resume')"
      @click="toggleTimer"
    >
      <ion-icon :icon="isRunning ? pauseOutline : playOutline" class="text-lg" />
    </button>

    <!-- Game timer -->
    <span class="font-mono text-base tabular-nums text-text-primary">
      {{ formattedGameTime }}
    </span>

    <span v-if="isOvertime" class="text-xs font-bold text-life-negative animate-pulse">{{ t('game.overtime') }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { IonIcon } from '@ionic/vue'
import { playOutline, pauseOutline } from 'ionicons/icons'
import { useI18n } from 'vue-i18n'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { TIMER_TICK_INTERVAL_MS } from '@/config/gameConstants'

const props = defineProps<{ isFlashing?: boolean; isOvertime?: boolean }>()

const { t } = useI18n()
const gameStore = useGameStore()
const settingsStore = useSettingsStore()

// Sync pause state with store (persists across page reloads)
const isRunning = ref(gameStore.currentGame?.isRunning ?? true)
const lastResumedAt = ref(Date.now())
const accumulatedBeforePause = ref(gameStore.currentGame?.elapsedMs ?? 0)
let intervalId: ReturnType<typeof setInterval> | null = null

// If game was restored paused, don't reset lastResumedAt
if (!isRunning.value) {
  lastResumedAt.value = 0
}

const formattedGameTime = computed(() => {
  const totalSeconds = Math.floor((gameStore.currentGame?.elapsedMs ?? 0) / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const minutesPadded = String(minutes).padStart(2, '0')
  const secondsPadded = String(seconds).padStart(2, '0')

  if (hours > 0) return `${hours}:${minutesPadded}:${secondsPadded}`
  return `${minutesPadded}:${secondsPadded}`
})

// Reset round time when turn changes
watch(
  () => gameStore.currentGame?.currentTurnPlayerIndex,
  (newIndex) => {
    if (gameStore.currentGame && newIndex !== undefined) {
      if (!gameStore.currentGame.playerRoundTimeMs) gameStore.currentGame.playerRoundTimeMs = {}
      const newPlayer = gameStore.currentGame.players[newIndex]
      if (newPlayer) {
        gameStore.currentGame.playerRoundTimeMs[newPlayer.id] = 0
      }
    }
  },
)

// Reset local timer state when a new game starts
watch(
  () => gameStore.currentGame?.id,
  () => {
    const game = gameStore.currentGame
    if (!game) return
    accumulatedBeforePause.value = game.elapsedMs
    isRunning.value = game.isRunning
    if (isRunning.value) {
      lastResumedAt.value = Date.now()
    }
  },
)

// Sync if store isRunning changes externally (e.g. endGame)
watch(
  () => gameStore.currentGame?.isRunning,
  (storeIsRunning) => {
    if (storeIsRunning === false && isRunning.value) {
      // Game ended externally — pause the timer
      accumulatedBeforePause.value = accumulatedBeforePause.value + (Date.now() - lastResumedAt.value)
      isRunning.value = false
    }
  },
)

function tick() {
  if (!gameStore.currentGame || !isRunning.value) return

  gameStore.currentGame.elapsedMs = accumulatedBeforePause.value + (Date.now() - lastResumedAt.value)

  // Per-player time tracking
  if (!gameStore.currentGame.playerPlayTimeMs) gameStore.currentGame.playerPlayTimeMs = {}
  if (!gameStore.currentGame.playerRoundTimeMs) gameStore.currentGame.playerRoundTimeMs = {}

  // Total play time: increments for whoever has effective priority
  const priorityPlayer = gameStore.effectivePriorityPlayer
  if (priorityPlayer) {
    gameStore.currentGame.playerPlayTimeMs[priorityPlayer.id] =
      (gameStore.currentGame.playerPlayTimeMs[priorityPlayer.id] ?? 0) + TIMER_TICK_INTERVAL_MS
  }

  // Round time: increments for whoever currently holds the clock
  // (priority player if someone responded, otherwise the turn player)
  if (priorityPlayer) {
    gameStore.currentGame.playerRoundTimeMs[priorityPlayer.id] =
      (gameStore.currentGame.playerRoundTimeMs[priorityPlayer.id] ?? 0) + TIMER_TICK_INTERVAL_MS
  }
}

function toggleTimer() {
  if (isRunning.value) {
    // Pausing: save the current elapsed time
    accumulatedBeforePause.value = accumulatedBeforePause.value + (Date.now() - lastResumedAt.value)
  } else {
    // Resuming: reset the resume timestamp
    lastResumedAt.value = Date.now()
  }
  isRunning.value = !isRunning.value

  // Sync pause state to store for persistence
  if (gameStore.currentGame) {
    gameStore.currentGame.isRunning = isRunning.value
  }
}

onMounted(() => {
  // If game was restored and is running, sync lastResumedAt
  if (isRunning.value) {
    lastResumedAt.value = Date.now()
  }
  intervalId = setInterval(tick, TIMER_TICK_INTERVAL_MS)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
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
