<template>
  <div class="game-menu-content" :style="rotationStyle">
    <h3 class="menu-title">{{ t('game.menu') }}</h3>
    <div class="grid grid-cols-3 gap-3">
      <button class="menu-action-btn" :disabled="!gameStore.canUndo" data-sound="none" @click="action('undo')">
        <ion-icon :icon="arrowUndoOutline" />
        <span>{{ t('game.undo') }}</span>
      </button>
      <button class="menu-action-btn" :disabled="!gameStore.canRedo" data-sound="none" @click="action('redo')">
        <ion-icon :icon="arrowRedoOutline" />
        <span>{{ t('game.redo') }}</span>
      </button>
      <button class="menu-action-btn" @click="action('dice')">
        <IconDie :size="22" />
        <span>{{ t('dice.title') }}</span>
      </button>
      <button class="menu-action-btn" @click="action('layout')">
        <ion-icon :icon="gridOutline" />
        <span>{{ t('game.layoutTitle') }}</span>
      </button>
      <button class="menu-action-btn" @click="action('history')">
        <ion-icon :icon="listOutline" />
        <span>{{ t('game.history') }}</span>
      </button>
      <button
        class="menu-action-btn"
        :class="{ 'menu-action-active': settingsStore.autoOrientIcons }"
        @click="action('orientation')"
      >
        <ion-icon :icon="compassOutline" />
        <span>{{ t('game.orientation') }}</span>
      </button>
      <button class="menu-action-btn menu-action-danger" @click="action('endGame')">
        <ion-icon :icon="flagOutline" />
        <span>{{ t('game.endGame') }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonIcon } from '@ionic/vue'
import { arrowUndoOutline, arrowRedoOutline, listOutline, flagOutline, gridOutline, compassOutline } from 'ionicons/icons'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import IconDie from '@/components/icons/dice/IconDie.vue'

const props = defineProps<{
  contentRotation?: number
  dismiss: (data?: unknown, role?: string) => void
}>()

const { t } = useI18n()
const gameStore = useGameStore()
const settingsStore = useSettingsStore()

const rotationStyle = computed(() => {
  const rotation = props.contentRotation ?? 0
  if (rotation === 0) return {}
  return { transform: `rotate(${rotation}deg)`, transition: 'transform 0.3s ease-in-out' }
})

function action(name: string) {
  props.dismiss(name, 'action')
}
</script>

<style scoped>
.game-menu-content {
  position: relative;
  padding: 20px 16px calc(80px + 48px + var(--ion-safe-area-bottom, 0px));
}

.menu-title {
  margin-bottom: 16px;
  text-align: center;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-arena-gold-light);
  font-family: var(--font-beleren);
  letter-spacing: 1px;
  text-shadow: 0 0 16px rgba(212, 168, 67, 0.15);
}

.menu-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 0.75rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.3px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.1s ease, transform 0.1s ease, box-shadow 0.1s ease;
  box-shadow: var(--shadow-btn-beveled);
  -webkit-tap-highlight-color: transparent;
}

.menu-action-btn ion-icon,
.menu-action-btn :deep(svg) {
  font-size: 1.5rem;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.menu-action-btn:active {
  background: rgba(255, 255, 255, 0.08);
  transform: scale(0.93) translateY(1px);
  box-shadow: var(--shadow-btn-pressed);
}

.menu-action-btn:disabled {
  opacity: 0.3;
  pointer-events: none;
}

.menu-action-danger {
  color: var(--color-life-negative);
  border-color: rgba(239, 68, 68, 0.1);
}

.menu-action-danger:active {
  background: rgba(239, 68, 68, 0.12);
}

.menu-action-active {
  background: rgba(232, 96, 10, 0.12);
  color: var(--color-accent);
  border-color: rgba(232, 96, 10, 0.25);
  box-shadow: var(--shadow-btn-beveled), 0 0 8px rgba(232, 96, 10, 0.08);
}
</style>
