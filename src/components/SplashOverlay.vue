<template>
  <Transition name="splash-fade">
    <div
      v-if="isVisible"
      class="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style="background: #1a1a2e"
    >
      <!-- Animated logo: pulsing shield with mana dots -->
      <div class="splash-logo" :class="{ 'animate-pulse-glow': !isReady }">
        <img
          src="@/assets/icons/ui/logo.svg"
          alt="MTG Commander"
          class="h-32 w-32"
        />
      </div>

      <!-- App name -->
      <h1 class="mt-6 text-2xl font-bold tracking-wider text-mana-gold">
        COMMANDER
      </h1>

      <!-- Loading bar -->
      <div class="mt-8 h-1 w-48 overflow-hidden rounded-full bg-white/10">
        <div
          class="h-full rounded-full bg-accent transition-all duration-500 ease-out"
          :style="{ width: `${loadProgress}%` }"
        />
      </div>

      <p class="mt-3 text-xs text-white/40">{{ loadingMessage }}</p>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const isVisible = ref(true)
const isReady = ref(false)
const loadProgress = ref(0)
const loadingMessage = ref('Initialisation...')

onMounted(async () => {
  // Simulate progressive loading
  loadProgress.value = 30
  loadingMessage.value = 'Chargement des stores...'

  await new Promise((resolve) => setTimeout(resolve, 300))
  loadProgress.value = 60
  loadingMessage.value = 'Preparation de la partie...'

  await new Promise((resolve) => setTimeout(resolve, 300))
  loadProgress.value = 100
  loadingMessage.value = 'Pret !'
  isReady.value = true

  // Fade out after a brief moment
  await new Promise((resolve) => setTimeout(resolve, 400))
  isVisible.value = false
})
</script>

<style scoped>
.splash-fade-leave-active {
  transition: opacity 400ms ease-out;
}
.splash-fade-leave-to {
  opacity: 0;
}

.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    filter: drop-shadow(0 0 8px rgba(203, 172, 94, 0.2));
    transform: scale(1);
  }
  50% {
    filter: drop-shadow(0 0 24px rgba(203, 172, 94, 0.5));
    transform: scale(1.03);
  }
}
</style>
