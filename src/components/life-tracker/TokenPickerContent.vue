<template>
  <div class="token-picker relative">
    <!-- Header -->
    <div class="token-picker-header">
      <h2 class="token-picker-title">{{ t('tokens.manageTokens') }}</h2>
      <button class="token-picker-close" :aria-label="t('common.close')" @click="dismiss()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
        </svg>
      </button>
    </div>
    <p class="mb-3 text-center text-xs text-white/40">{{ player.name }}</p>

    <!-- ── Designations ── -->
    <h3 class="token-section-title">{{ t('tokens.designations') }}</h3>
    <div class="token-grid">
      <button
        class="token-cell"
        :class="{ 'token-cell-on': player.isMonarch }"
        style="--token-color: #f0d078"
        @click="handleToggleMonarch"
      >
        <IconCrown :size="24" :color="player.isMonarch ? '#f0d078' : undefined" :class="!player.isMonarch && 'text-white/30'" />
        <span class="token-cell-label">{{ t('playerDetail.monarch') }}</span>
      </button>

      <button
        class="token-cell"
        :class="{ 'token-cell-on': player.hasInitiative }"
        style="--token-color: rgba(255, 255, 255, 0.9)"
        @click="handleToggleInitiative"
      >
        <IconShield :size="24" :class="player.hasInitiative ? 'text-white' : 'text-white/30'" />
        <span class="token-cell-label">{{ t('playerDetail.initiative') }}</span>
      </button>

      <button
        class="token-cell"
        :class="{ 'token-cell-on': player.cityBlessing }"
        style="--token-color: #34d399"
        @click="handleToggleCityBlessing"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" :class="player.cityBlessing ? 'text-emerald-400' : 'text-white/30'">
          <path d="M3 21h18M5 21V7l4-4 3 3 3-3 4 4v14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="token-cell-label">{{ t('tokens.cityBlessing') }}</span>
      </button>
    </div>

    <!-- ── Counters ── -->
    <h3 class="token-section-title">{{ t('playerDetail.counters') }}</h3>
    <div class="token-grid">
      <button
        class="token-cell"
        :class="{ 'token-cell-on': player.poisonCounters > 0 }"
        style="--token-color: #a855f7"
        @click="handleTogglePoison"
      >
        <IconPoison :size="24" :class="player.poisonCounters > 0 ? 'text-poison' : 'text-white/30'" />
        <span class="token-cell-label">{{ t('playerDetail.poison') }}</span>
      </button>

      <button
        class="token-cell"
        :class="{ 'token-cell-on': player.experienceCounters > 0 }"
        style="--token-color: #4a90e2"
        @click="handleToggleExperience"
      >
        <IconExperience :size="24" :class="player.experienceCounters > 0 ? 'text-arena-blue' : 'text-white/30'" />
        <span class="token-cell-label">{{ t('playerDetail.experience') }}</span>
      </button>

      <button
        class="token-cell"
        :class="{ 'token-cell-on': player.energyCounters > 0 }"
        style="--token-color: #d4a843"
        @click="handleToggleEnergy"
      >
        <IconEnergy :size="24" :class="player.energyCounters > 0 ? 'text-arena-gold' : 'text-white/30'" />
        <span class="token-cell-label">{{ t('playerDetail.energy') }}</span>
      </button>

      <button
        class="token-cell"
        :class="{ 'token-cell-on': player.radCounters > 0 }"
        style="--token-color: #4ade80"
        @click="handleToggleRad"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" :class="player.radCounters > 0 ? 'text-green-400' : 'text-white/30'">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
        <span class="token-cell-label">{{ t('tokens.rad') }}</span>
      </button>
    </div>

    <!-- ── Special ── -->
    <h3 class="token-section-title">{{ t('tokens.special') }}</h3>
    <div class="token-grid">
      <button
        class="token-cell"
        :class="{ 'token-cell-on': player.ringLevel > 0 }"
        style="--token-color: #f59e0b"
        @click="handleToggleRing"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" :class="player.ringLevel > 0 ? 'text-amber-400' : 'text-white/30'">
          <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2.5" />
          <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.5" opacity="0.5" />
        </svg>
        <span class="token-cell-label">{{ t('tokens.ring') }}</span>
      </button>

      <button
        class="token-cell"
        :class="{ 'token-cell-on': dayNightState !== null }"
        :style="{ '--token-color': dayNightState === 'night' ? '#93c5fd' : '#facc15' }"
        @pointerdown.prevent="onDayNightPointerDown"
        @pointerup="onDayNightPointerUp"
        @pointerleave="onDayNightPointerLeave"
      >
        <svg v-if="dayNightState !== 'night'" width="24" height="24" viewBox="0 0 24 24" fill="none" :class="dayNightState === 'day' ? 'text-yellow-400' : 'text-white/30'">
          <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2.5" />
          <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" class="text-blue-300">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="token-cell-label">{{ dayNightLabel }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PlayerState } from '@/types/game'
import { useGameStore } from '@/stores/gameStore'
import { useLongPress } from '@/composables/useLongPress'
import { playInitiative, playMonarchCrown } from '@/services/sounds'
import IconCrown from '@/components/icons/game/IconCrown.vue'
import IconShield from '@/components/icons/game/IconShield.vue'
import IconExperience from '@/components/icons/game/IconExperience.vue'
import IconEnergy from '@/components/icons/game/IconEnergy.vue'
import IconPoison from '@/components/icons/game/IconPoison.vue'

const props = defineProps<{
  player: PlayerState
  dismiss: (data?: unknown, role?: string) => void
}>()

const { t } = useI18n()
const gameStore = useGameStore()

/* ── Day/Night ── */
const dayNightState = computed(() => gameStore.currentGame?.dayNightState ?? null)

const dayNightLabel = computed(() => {
  if (dayNightState.value === 'day') return t('tokens.day')
  if (dayNightState.value === 'night') return t('tokens.night')
  return t('tokens.dayNight')
})

const dayNightLongPress = useLongPress(() => {
  if (gameStore.currentGame) gameStore.currentGame.dayNightState = null
}, 600)

function onDayNightPointerDown() { dayNightLongPress.start() }
function onDayNightPointerUp() {
  dayNightLongPress.cancel()
  if (!dayNightLongPress.isTriggered()) gameStore.toggleDayNight()
}
function onDayNightPointerLeave() { dayNightLongPress.cancel() }

/* ── Designation toggles ── */
function handleToggleMonarch() {
  if (!props.player.isMonarch) playMonarchCrown()
  gameStore.toggleMonarch(props.player.id)
}

function handleToggleInitiative() {
  if (!props.player.hasInitiative) playInitiative()
  gameStore.toggleInitiative(props.player.id)
}

function handleToggleCityBlessing() {
  gameStore.toggleCityBlessing(props.player.id)
}

/* ── Counter toggles (on → 1, off → 0) ── */
function handleTogglePoison() {
  const newValue = props.player.poisonCounters > 0 ? -props.player.poisonCounters : 1
  gameStore.changePoison(props.player.id, newValue)
}

function handleToggleExperience() {
  const newValue = props.player.experienceCounters > 0 ? -props.player.experienceCounters : 1
  gameStore.changeExperience(props.player.id, newValue)
}

function handleToggleEnergy() {
  const newValue = props.player.energyCounters > 0 ? -props.player.energyCounters : 1
  gameStore.changeEnergy(props.player.id, newValue)
}

function handleToggleRad() {
  const newValue = props.player.radCounters > 0 ? -props.player.radCounters : 1
  gameStore.changeRadCounters(props.player.id, newValue)
}

function handleToggleRing() {
  gameStore.setRingLevel(props.player.id, props.player.ringLevel > 0 ? 0 : 1)
}
</script>

<style scoped>
.token-picker {
  padding: 16px;
  max-height: 70vh;
  overflow-y: auto;
}

.token-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.token-picker-title {
  font-family: var(--font-beleren);
  font-size: 18px;
  color: var(--color-arena-gold-light);
  letter-spacing: 0.5px;
  text-shadow: 0 0 16px rgba(212, 168, 67, 0.15);
}

.token-picker-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  -webkit-tap-highlight-color: transparent;
}
.token-picker-close:active {
  background: rgba(255, 255, 255, 0.12);
}

/* ── Section titles ── */
.token-section-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.25);
  margin: 12px 0 6px;
  padding-left: 4px;
}
.token-section-title:first-of-type {
  margin-top: 0;
}

/* ── Grid layout ── */
.token-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

/* ── Cell: icon + label stacked ── */
.token-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  aspect-ratio: 1;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}
.token-cell:active {
  background: rgba(255, 255, 255, 0.07);
}

/* Active cell: per-token colored glow */
.token-cell-on {
  border-color: color-mix(in srgb, var(--token-color) 35%, transparent);
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--token-color) 12%, transparent),
    rgba(255, 255, 255, 0.02)
  );
  box-shadow:
    inset 0 0 16px color-mix(in srgb, var(--token-color) 8%, transparent),
    0 0 12px color-mix(in srgb, var(--token-color) 10%, transparent);
}

.token-cell-label {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  line-height: 1.2;
  transition: color 0.15s ease;
}
.token-cell-on .token-cell-label {
  color: rgba(255, 255, 255, 0.85);
}
</style>
