<template>
  <div class="orientation-picker-content">
    <div class="orientation-decor" aria-hidden="true">
      <CornerAccent position="top-left" />
      <CornerAccent position="top-right" />
      <div class="orientation-top-accent" />
    </div>

    <h3 class="orientation-title">{{ t('game.orientation') }}</h3>

    <div class="flex flex-col gap-2">
      <!-- Auto: follow current turn -->
      <button
        class="orientation-option card-lift"
        :class="{ 'orientation-option--active': isAutoMode }"
        @click="selectAuto"
      >
        <ion-icon :icon="syncOutline" class="orientation-icon" />
        <div class="flex flex-col items-start">
          <span class="orientation-label" :class="{ 'orientation-label--active': isAutoMode }">
            {{ t('game.orientationAuto') }}
          </span>
          <span class="orientation-hint">{{ t('game.orientationAutoHint') }}</span>
        </div>
      </button>

      <!-- Per-player lock -->
      <button
        v-for="player in players"
        :key="player.id"
        class="orientation-option card-lift"
        :class="{ 'orientation-option--active': isLockedToPlayer(player.id) }"
        @click="selectPlayer(player.id)"
      >
        <div
          class="orientation-color-dot"
          :style="{ background: `var(--color-mana-${player.color})` }"
        />
        <div class="flex flex-col items-start">
          <span class="orientation-label" :class="{ 'orientation-label--active': isLockedToPlayer(player.id) }">
            {{ player.name }}
          </span>
        </div>
      </button>

      <!-- Off -->
      <button
        class="orientation-option card-lift"
        :class="{ 'orientation-option--active': !autoOrientIcons }"
        @click="selectOff"
      >
        <ion-icon :icon="closeCircleOutline" class="orientation-icon" />
        <div class="flex flex-col items-start">
          <span class="orientation-label" :class="{ 'orientation-label--active': !autoOrientIcons }">
            {{ t('game.orientationOff') }}
          </span>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonIcon } from '@ionic/vue'
import { syncOutline, closeCircleOutline } from 'ionicons/icons'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import CornerAccent from '@/components/icons/decorative/CornerAccent.vue'
import type { PlayerState } from '@/types/game'

const props = defineProps<{
  dismiss: (data?: unknown, role?: string) => void
}>()

const { t } = useI18n()
const gameStore = useGameStore()
const settingsStore = useSettingsStore()

const autoOrientIcons = computed(() => settingsStore.autoOrientIcons)
const players = computed<PlayerState[]>(() => gameStore.currentGame?.players ?? [])
const lockedPlayerId = computed(() => settingsStore.orientationLockedPlayerId)

const isAutoMode = computed(() => autoOrientIcons.value && lockedPlayerId.value === null)

function isLockedToPlayer(playerId: string) {
  return autoOrientIcons.value && lockedPlayerId.value === playerId
}

function selectAuto() {
  settingsStore.autoOrientIcons = true
  settingsStore.orientationLockedPlayerId = null
  props.dismiss(undefined, 'confirm')
}

function selectPlayer(playerId: string) {
  settingsStore.autoOrientIcons = true
  settingsStore.orientationLockedPlayerId = playerId
  props.dismiss(undefined, 'confirm')
}

function selectOff() {
  settingsStore.autoOrientIcons = false
  settingsStore.orientationLockedPlayerId = null
  props.dismiss(undefined, 'confirm')
}
</script>

<style scoped>
.orientation-picker-content {
  position: relative;
  padding: 20px 16px;
}

.orientation-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  overflow: hidden;
  border-radius: inherit;
}

.orientation-top-accent {
  position: absolute;
  top: 0;
  left: 10%;
  right: 10%;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, rgba(212, 168, 67, 0.15) 20%, rgba(212, 168, 67, 0.4) 50%, rgba(212, 168, 67, 0.15) 80%, transparent 100%);
  box-shadow: 0 0 12px rgba(212, 168, 67, 0.15);
}

.orientation-title {
  margin-bottom: 16px;
  text-align: center;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.orientation-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--surface-card, rgba(26, 31, 53, 1));
  width: 100%;
  text-align: left;
}

.orientation-option--active {
  background: rgba(232, 96, 10, 0.2);
  box-shadow: 0 0 0 2px var(--color-accent);
}

.orientation-icon {
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
}

.orientation-option--active .orientation-icon {
  color: var(--color-accent);
}

.orientation-color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.3);
}

.orientation-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.orientation-label--active {
  color: var(--color-accent);
  font-weight: 600;
}

.orientation-hint {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.35);
}
</style>
