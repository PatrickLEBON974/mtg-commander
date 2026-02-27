<template>
  <Transition name="result-backdrop">
    <div
      v-if="isOpen"
      class="absolute inset-0 z-30 flex items-center"
      :class="slideFromRight ? 'justify-end' : 'justify-start'"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')" />

      <!-- Panel -->
      <Transition :name="slideFromRight ? 'result-slide-right' : 'result-slide-left'">
        <div
          v-if="isOpen"
          class="result-panel relative z-10 flex w-[75%] flex-col gap-1.5 rounded-xl p-2"
          :class="slideFromRight ? 'mr-2' : 'ml-2'"
        >
          <!-- Winner -->
          <button class="result-option result-winner" @click="handleResult('winner')">
            <IconCrown :size="16" color="#f0d078" />
            <span class="result-label text-arena-gold-light">{{ t('gameResult.winner') }}</span>
          </button>

          <!-- Eliminated -->
          <button class="result-option result-eliminated" @click="handleResult('eliminated')">
            <IconSkull :size="16" class="text-life-negative" />
            <span class="result-label text-life-negative">{{ t('gameResult.eliminated') }}</span>
          </button>

          <!-- Surrender -->
          <button class="result-option result-surrender" @click="handleResult('surrender')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-white/60">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M4 22v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
            <span class="result-label text-white/60">{{ t('gameResult.surrender') }}</span>
          </button>

          <!-- Draw -->
          <button class="result-option result-draw" @click="handleResult('draw')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-white/50">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="result-label text-white/50">{{ t('gameResult.draw') }}</span>
          </button>

          <!-- Cancel -->
          <button
            class="mt-0.5 rounded-lg bg-white/5 min-h-[36px] text-center text-[11px] font-medium text-white/40 active:bg-white/10"
            @click="$emit('close')"
          >
            {{ t('common.cancel') }}
          </button>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useGameStore } from '@/stores/gameStore'
import { useCelebration } from '@/composables/useCelebration'
import { playVictory, playPlayerDeath } from '@/services/sounds'
import IconCrown from '@/components/icons/game/IconCrown.vue'
import IconSkull from '@/components/icons/game/IconSkull.vue'

const props = defineProps<{
  isOpen: boolean
  playerId: string
  slideFromRight?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const gameStore = useGameStore()
const { victory } = useCelebration()

function handleResult(result: 'winner' | 'eliminated' | 'surrender' | 'draw') {
  gameStore.declareGameResult(props.playerId, result)

  if (result === 'winner') {
    victory()
    playVictory()
  } else if (result === 'eliminated' || result === 'surrender') {
    playPlayerDeath()
  }

  emit('close')
}
</script>

<style scoped>
.result-panel {
  background: rgba(10, 14, 23, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  max-height: calc(100% - 8px);
  overflow-y: auto;
}

.result-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  min-height: 44px;
  transition: background 0.15s, box-shadow 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.result-option:active {
  transform: scale(0.98);
}

.result-winner {
  background: rgba(212, 168, 67, 0.1);
  border: 1px solid rgba(212, 168, 67, 0.2);
}
.result-winner:active {
  background: rgba(212, 168, 67, 0.2);
  box-shadow: 0 0 16px rgba(212, 168, 67, 0.15);
}

.result-eliminated {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
}
.result-eliminated:active {
  background: rgba(239, 68, 68, 0.2);
}

.result-surrender {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.result-surrender:active {
  background: rgba(255, 255, 255, 0.08);
}

.result-draw {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.result-draw:active {
  background: rgba(255, 255, 255, 0.08);
}

.result-label {
  font-family: var(--font-beleren);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Backdrop transition */
.result-backdrop-enter-active,
.result-backdrop-leave-active {
  transition: opacity 0.25s ease;
}
.result-backdrop-enter-from,
.result-backdrop-leave-to {
  opacity: 0;
}

/* Slide from right */
.result-slide-right-enter-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
}
.result-slide-right-leave-active {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.6, 1), opacity 0.15s ease;
}
.result-slide-right-enter-from {
  transform: translateX(100%);
  opacity: 0;
}
.result-slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* Slide from left */
.result-slide-left-enter-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
}
.result-slide-left-leave-active {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.6, 1), opacity 0.15s ease;
}
.result-slide-left-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}
.result-slide-left-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
</style>
