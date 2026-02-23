<template>
  <div class="flex items-center justify-center gap-3 bg-surface-light px-4 py-1.5">
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

    <!-- Turn timer (if enabled) -->
    <template v-if="settingsStore.gameSettings.enableTurnTimer">
      <span class="text-text-secondary">|</span>
      <span
        class="font-mono text-base tabular-nums"
        :class="turnTimeWarning ? 'text-life-negative animate-pulse' : 'text-text-secondary'"
      >
        {{ formattedTurnTime }}
      </span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { IonIcon } from '@ionic/vue'
import { playOutline, pauseOutline } from 'ionicons/icons'
import { useI18n } from 'vue-i18n'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { warningFeedback } from '@/services/haptics'

const { t } = useI18n()
const gameStore = useGameStore()
const settingsStore = useSettingsStore()

// Sync pause state with store (persists across page reloads)
const isRunning = ref(gameStore.currentGame?.isRunning ?? true)
const turnElapsedSeconds = ref(0)
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

const formattedTurnTime = computed(() => {
  const remaining = Math.max(0, settingsStore.gameSettings.turnTimerSeconds - turnElapsedSeconds.value)
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const turnTimeWarning = computed(() => {
  if (!settingsStore.gameSettings.enableTurnTimer) return false
  const remaining = settingsStore.gameSettings.turnTimerSeconds - turnElapsedSeconds.value
  return remaining <= 10 && remaining > 0
})

// Reset turn timer when turn changes
watch(
  () => gameStore.currentGame?.currentTurnPlayerIndex,
  (newIndex) => {
    turnElapsedSeconds.value = 0
    // Reset incoming player's per-player turn timer
    if (gameStore.currentGame && newIndex !== undefined) {
      if (!gameStore.currentGame.playerTurnTimeMs) gameStore.currentGame.playerTurnTimeMs = {}
      const newPlayer = gameStore.currentGame.players[newIndex]
      if (newPlayer) {
        gameStore.currentGame.playerTurnTimeMs[newPlayer.id] = 0
      }
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
  if (!gameStore.currentGame.playerTurnTimeMs) gameStore.currentGame.playerTurnTimeMs = {}

  // Total play time: increments for whoever has effective priority
  const priorityPlayer = gameStore.effectivePriorityPlayer
  if (priorityPlayer) {
    gameStore.currentGame.playerPlayTimeMs[priorityPlayer.id] =
      (gameStore.currentGame.playerPlayTimeMs[priorityPlayer.id] ?? 0) + 1000
  }

  // Turn time: increments for the turn player (wall-clock turn duration)
  const turnPlayer = gameStore.currentTurnPlayer
  if (turnPlayer) {
    gameStore.currentGame.playerTurnTimeMs[turnPlayer.id] =
      (gameStore.currentGame.playerTurnTimeMs[turnPlayer.id] ?? 0) + 1000
  }

  if (settingsStore.gameSettings.enableTurnTimer) {
    turnElapsedSeconds.value++
    if (turnElapsedSeconds.value === settingsStore.gameSettings.turnTimerSeconds && settingsStore.hapticFeedback) {
      warningFeedback()
    }
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
  intervalId = setInterval(tick, 1000)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>
