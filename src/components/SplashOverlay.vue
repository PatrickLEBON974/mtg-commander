<template>
  <Transition name="splash-fade">
    <div
      v-if="isVisible"
      class="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style="background: radial-gradient(ellipse at 50% 40%, #111827 0%, #0a0e17 60%, #050810 100%)"
    >
      <!-- Animated logo with Arena gold glow -->
      <div class="splash-logo" :class="{ 'animate-pulse-glow': !isReady }">
        <img
          src="@/assets/icons/ui/logo.svg"
          alt="MTG Commander"
          class="h-36 w-36"
        />
      </div>

      <!-- App name in Beleren -->
      <h1
        class="mt-6 arena-heading"
        style="font-family: var(--font-beleren); font-size: 32px; letter-spacing: 4px;"
      >
        COMMANDER
      </h1>

      <!-- Mana color dots -->
      <div class="mt-3 flex items-center gap-3">
        <i class="ms ms-w ms-cost" style="font-size: 16px" />
        <i class="ms ms-u ms-cost" style="font-size: 16px" />
        <i class="ms ms-b ms-cost" style="font-size: 16px" />
        <i class="ms ms-r ms-cost" style="font-size: 16px" />
        <i class="ms ms-g ms-cost" style="font-size: 16px" />
      </div>

      <!-- Loading bar — Arena gold gradient -->
      <div class="mt-8 h-1.5 w-52 overflow-hidden rounded-full" style="background: rgba(212, 168, 67, 0.1); box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);">
        <div
          class="h-full rounded-full transition-all duration-500 ease-out"
          style="background: linear-gradient(90deg, #e8600a, #d4a843); box-shadow: 0 0 8px rgba(232, 96, 10, 0.4);"
          :style="{ width: `${loadProgress}%` }"
        />
      </div>

      <p class="mt-3 text-xs" style="color: rgba(212, 168, 67, 0.4)">{{ loadingMessage }}</p>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const isVisible = ref(true)
const isReady = ref(false)
const loadProgress = ref(0)
const loadingMessage = ref(t('splash.initializing'))

onMounted(async () => {
  loadProgress.value = 30
  loadingMessage.value = t('splash.loadingStores')

  await new Promise((resolve) => setTimeout(resolve, 300))
  loadProgress.value = 60
  loadingMessage.value = t('splash.preparingGame')

  await new Promise((resolve) => setTimeout(resolve, 300))
  loadProgress.value = 100
  loadingMessage.value = t('splash.ready')
  isReady.value = true

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
    filter: drop-shadow(0 0 12px rgba(212, 168, 67, 0.2));
    transform: scale(1);
  }
  50% {
    filter: drop-shadow(0 0 40px rgba(212, 168, 67, 0.55));
    transform: scale(1.03);
  }
}
</style>
