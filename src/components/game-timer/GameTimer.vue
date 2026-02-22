<template>
  <div class="flex items-center justify-center gap-3 bg-surface-light px-4 py-1.5">
    <button
      class="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary active:text-text-primary"
      :aria-label="isRunning ? 'Pause' : 'Reprendre'"
      @click="toggleTimer"
    >
      <ion-icon :icon="isRunning ? pauseOutline : playOutline" class="text-lg" />
    </button>

    <!-- Game timer -->
    <span class="font-mono text-base tabular-nums text-text-primary">
      {{ formattedGameTime }}
    </span>

    <!-- Turn timer (if enabled) -->
    <template v-if="settings.enableTurnTimer">
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
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { warningFeedback } from '@/services/haptics'

const gameStore = useGameStore()
const { gameSettings: settings } = useSettingsStore()
const settingsStore = useSettingsStore()

const isRunning = ref(true)
const turnElapsedSeconds = ref(0)
let intervalId: ReturnType<typeof setInterval> | null = null

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
  const remaining = Math.max(0, settings.turnTimerSeconds - turnElapsedSeconds.value)
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const turnTimeWarning = computed(() => {
  if (!settings.enableTurnTimer) return false
  const remaining = settings.turnTimerSeconds - turnElapsedSeconds.value
  return remaining <= 10 && remaining > 0
})

// Reset turn timer when turn changes
watch(
  () => gameStore.currentGame?.currentTurnPlayerIndex,
  () => {
    turnElapsedSeconds.value = 0
  },
)

function tick() {
  if (!gameStore.currentGame || !isRunning.value) return

  gameStore.currentGame.elapsedMs = Date.now() - gameStore.currentGame.startedAt

  if (settings.enableTurnTimer) {
    turnElapsedSeconds.value++
    if (turnElapsedSeconds.value === settings.turnTimerSeconds && settingsStore.hapticFeedback) {
      warningFeedback()
    }
  }
}

function toggleTimer() {
  isRunning.value = !isRunning.value
}

onMounted(() => {
  intervalId = setInterval(tick, 1000)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>
