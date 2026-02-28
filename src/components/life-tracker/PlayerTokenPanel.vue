<template>
  <div class="token-panel relative flex h-full flex-col overflow-y-auto rounded-2xl px-1.5 py-1" :class="playerBgClass">
    <!-- Header: 24px -->
    <div class="flex items-center justify-between mb-0.5 min-h-[24px]">
      <span class="font-beleren text-[9px] font-bold uppercase tracking-[0.12em] text-arena-gold-light/80 truncate">
        {{ player.name }}
      </span>
      <button
        class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/60 active:bg-white/20"
        :aria-label="t('common.close')"
        @click="$emit('close')"
      >
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Toggle row: 1×4 icon-only buttons -->
    <div class="flex gap-1.5 justify-center">
      <button
        class="token-icon-btn"
        :class="player.isMonarch ? 'token-active token-monarch' : 'token-off'"
        :aria-label="t('playerDetail.monarch')"
        @click="handleToggleMonarch"
      >
        <IconCrown :size="26" :color="player.isMonarch ? '#f0d078' : undefined" :class="!player.isMonarch && 'text-white/30'" />
      </button>

      <button
        class="token-icon-btn"
        :class="player.hasInitiative ? 'token-active token-initiative' : 'token-off'"
        :aria-label="t('playerDetail.initiative')"
        @click="handleToggleInitiative"
      >
        <IconShield :size="26" :class="player.hasInitiative ? 'text-white' : 'text-white/30'" />
      </button>

      <button
        class="token-icon-btn"
        :class="player.cityBlessing ? 'token-active token-city' : 'token-off'"
        :aria-label="t('tokens.cityBlessing')"
        @click="handleToggleCityBlessing"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" :class="player.cityBlessing ? 'text-emerald-400' : 'text-white/30'">
          <path d="M3 21h18M5 21V7l4-4 3 3 3-3 4 4v14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <button
        class="token-icon-btn"
        :class="dayNightClass"
        :aria-label="dayNightLabel"
        @pointerdown.prevent="onDayNightPointerDown"
        @pointerup="onDayNightPointerUp"
        @pointerleave="onDayNightPointerLeave"
      >
        <svg v-if="dayNightState !== 'night'" width="26" height="26" viewBox="0 0 24 24" fill="none" :class="dayNightState === 'day' ? 'text-yellow-400' : 'text-white/30'">
          <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2.5" />
          <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <svg v-else width="26" height="26" viewBox="0 0 24 24" fill="none" class="text-blue-300">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <!-- Separator -->
    <div class="my-0.5 h-px bg-white/8" />

    <!-- Counter grid: 2×2 with ring pips in 4th cell -->
    <div class="counter-grid">
      <!-- Experience -->
      <div class="counter-cell">
        <IconExperience :size="10" class="text-arena-blue shrink-0" />
        <span class="counter-label">{{ t('playerDetail.experience') }}</span>
        <div class="stepper-controls" data-sound="none">
          <button class="stepper-btn" :aria-label="t('aria.decreaseExperience')" @click="handleExperienceChange(-1)">-</button>
          <span class="stepper-val text-arena-blue" :class="{ 'opacity-40': player.experienceCounters === 0 }">{{ player.experienceCounters }}</span>
          <button class="stepper-btn" :aria-label="t('aria.increaseExperience')" @click="handleExperienceChange(1)">+</button>
        </div>
      </div>

      <!-- Energy -->
      <div class="counter-cell">
        <IconEnergy :size="10" class="text-arena-gold shrink-0" />
        <span class="counter-label">{{ t('playerDetail.energy') }}</span>
        <div class="stepper-controls" data-sound="none">
          <button class="stepper-btn" :aria-label="t('aria.decreaseEnergy')" @click="handleEnergyChange(-1)">-</button>
          <span class="stepper-val text-arena-gold" :class="{ 'opacity-40': player.energyCounters === 0 }">{{ player.energyCounters }}</span>
          <button class="stepper-btn" :aria-label="t('aria.increaseEnergy')" @click="handleEnergyChange(1)">+</button>
        </div>
      </div>

      <!-- Rad -->
      <div class="counter-cell">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" class="text-green-400 shrink-0">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
        <span class="counter-label">{{ t('tokens.rad') }}</span>
        <div class="stepper-controls" data-sound="none">
          <button class="stepper-btn" :aria-label="t('aria.decreaseRad')" @click="handleRadChange(-1)">-</button>
          <span class="stepper-val text-green-400" :class="{ 'opacity-40': player.radCounters === 0 }">{{ player.radCounters }}</span>
          <button class="stepper-btn" :aria-label="t('aria.increaseRad')" @click="handleRadChange(1)">+</button>
        </div>
      </div>

      <!-- Ring pips -->
      <div class="counter-cell">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" :class="player.ringLevel > 0 ? 'text-amber-400' : 'text-white/40'">
          <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2.5" />
          <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.5" opacity="0.5" />
        </svg>
        <span class="counter-label">{{ t('tokens.ring') }}</span>
        <div class="flex items-center gap-1.5 ml-auto">
          <button
            v-for="pipLevel in 4"
            :key="pipLevel"
            class="ring-pip"
            :class="pipLevel <= player.ringLevel ? 'ring-pip-on' : 'ring-pip-off'"
            :aria-label="t('aria.setRingLevel', { level: pipLevel })"
            @click="handleSetRingLevel(pipLevel === player.ringLevel ? 0 : pipLevel)"
          />
        </div>
      </div>
    </div>

    <!-- Separator -->
    <div class="my-0.5 h-px bg-white/8" />

    <!-- Commanders + game result (push to bottom) -->
    <div class="mt-auto space-y-0.5">
      <div
        v-for="(commander, commanderIndex) in player.commanders"
        :key="commander.id"
        class="commander-row"
      >
        <img
          v-if="commander.imageUri"
          :src="commander.imageUri"
          :alt="commander.cardName"
          class="h-5 w-5 rounded object-cover"
        />
        <p class="min-w-0 flex-1 truncate text-[9px] text-white/70">{{ commander.cardName }}</p>
        <button
          class="commander-tax-btn"
          data-sound="none"
          @click="handleCastCommander(commanderIndex)"
        >
          T{{ gameStore.getCommanderTax(player, commanderIndex) }}
        </button>
      </div>

      <button
        v-if="player.commanders.length < 2"
        class="flex w-full items-center justify-center rounded-lg bg-white/5 min-h-[36px] text-[11px] font-medium text-white/40 active:bg-white/10"
        @click="$emit('addCommander')"
      >
        + {{ t('playerDetail.addCommander') }}
      </button>

      <!-- Game result button -->
      <button
        class="token-game-result"
        @click="$emit('showGameResult')"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" class="text-life-negative/60">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M4 22v-7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
        </svg>
        {{ t('gameResult.title') }}
      </button>
    </div>

    <!-- Toast overlay — centered on card -->
    <Transition name="toast">
      <div v-if="toastMessage" class="token-toast">
        {{ toastMessage }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PlayerState } from '@/types/game'
import { useGameStore } from '@/stores/gameStore'
import { useLongPress } from '@/composables/useLongPress'
import { playExperienceChange, playEnergyChange, playCommanderCast, playInitiative, playMonarchCrown } from '@/services/sounds'
import IconCrown from '@/components/icons/game/IconCrown.vue'
import IconShield from '@/components/icons/game/IconShield.vue'
import IconExperience from '@/components/icons/game/IconExperience.vue'
import IconEnergy from '@/components/icons/game/IconEnergy.vue'

const props = defineProps<{
  player: PlayerState
  playerBgClass: string
}>()

defineEmits<{
  close: []
  addCommander: []
  stateChanged: []
  showGameResult: []
}>()

const { t } = useI18n()
const gameStore = useGameStore()

/* ── Toast feedback ── */
const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(message: string) {
  toastMessage.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 1200)
}

onBeforeUnmount(() => { if (toastTimer) clearTimeout(toastTimer) })

/* ── Day/Night long-press to reset ── */
const dayNightLongPress = useLongPress(() => {
  if (gameStore.currentGame) {
    gameStore.currentGame.dayNightState = null
  }
  showToast(t('tokens.dayNight') + ' ✕')
}, 600)

function onDayNightPointerDown() {
  dayNightLongPress.start()
}

function onDayNightPointerUp() {
  dayNightLongPress.cancel()
  if (!dayNightLongPress.isTriggered()) {
    handleToggleDayNight()
  }
}

function onDayNightPointerLeave() {
  dayNightLongPress.cancel()
}

/* ── Computed ── */
const dayNightState = computed(() => gameStore.currentGame?.dayNightState ?? null)

const dayNightClass = computed(() => {
  if (dayNightState.value === 'day') return 'token-active token-day'
  if (dayNightState.value === 'night') return 'token-active token-night'
  return 'token-off'
})

const dayNightLabel = computed(() => {
  if (dayNightState.value === 'day') return t('tokens.day')
  if (dayNightState.value === 'night') return t('tokens.night')
  return t('tokens.dayNight')
})

/* ── Toggle handlers ── */
function handleToggleMonarch() {
  const wasBefore = props.player.isMonarch
  gameStore.toggleMonarch(props.player.id)
  if (!wasBefore) playMonarchCrown()
  showToast(t('playerDetail.monarch') + (wasBefore ? ' ✕' : ' ✓'))
}

function handleToggleInitiative() {
  const wasBefore = props.player.hasInitiative
  gameStore.toggleInitiative(props.player.id)
  if (!wasBefore) playInitiative()
  showToast(t('playerDetail.initiative') + (wasBefore ? ' ✕' : ' ✓'))
}

function handleToggleCityBlessing() {
  const wasBefore = props.player.cityBlessing
  gameStore.toggleCityBlessing(props.player.id)
  showToast(t('tokens.cityBlessing') + (wasBefore ? ' ✕' : ' ✓'))
}

function handleToggleDayNight() {
  gameStore.toggleDayNight()
  const newState = gameStore.currentGame?.dayNightState
  if (newState === 'day') showToast('☀ ' + t('tokens.day'))
  else if (newState === 'night') showToast('☽ ' + t('tokens.night'))
}

function handleExperienceChange(amount: number) {
  gameStore.changeExperience(props.player.id, amount)
  playExperienceChange()
}

function handleEnergyChange(amount: number) {
  gameStore.changeEnergy(props.player.id, amount)
  playEnergyChange()
}

function handleRadChange(amount: number) {
  gameStore.changeRadCounters(props.player.id, amount)
}

function handleSetRingLevel(level: number) {
  gameStore.setRingLevel(props.player.id, level)
}

function handleCastCommander(commanderIndex: number) {
  gameStore.castCommander(props.player.id, commanderIndex)
  playCommanderCast()
}
</script>

<style scoped>
.font-beleren {
  font-family: var(--font-beleren);
}

/* ── Toast feedback — centered overlay ── */
.token-toast {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 20;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  border-radius: 8px;
  padding: 6px 14px;
  white-space: nowrap;
  pointer-events: none;
}
.toast-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.toast-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.85);
}
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(1.05);
}

/* ── Icon-only toggle buttons: 1×4 row ── */
.token-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  transition: background 0.15s, box-shadow 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.token-off {
  background: rgba(255, 255, 255, 0.05);
}
.token-off:active {
  background: rgba(255, 255, 255, 0.1);
}
.token-active {
  font-weight: 600;
}
.token-monarch {
  background: rgba(212, 168, 67, 0.15);
  box-shadow: inset 0 0 6px rgba(212, 168, 67, 0.2);
}
.token-initiative {
  background: rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 0 6px rgba(255, 255, 255, 0.15);
}
.token-city {
  background: rgba(52, 211, 153, 0.15);
  box-shadow: inset 0 0 6px rgba(52, 211, 153, 0.2);
}
.token-day {
  background: rgba(250, 204, 21, 0.15);
  box-shadow: inset 0 0 6px rgba(250, 204, 21, 0.2);
}
.token-night {
  background: rgba(147, 197, 253, 0.15);
  box-shadow: inset 0 0 6px rgba(147, 197, 253, 0.2);
}

/* ── Counter grid: 2×2 layout ── */
.counter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
}
.counter-cell {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 1px 3px;
  min-height: 26px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.12);
}
.counter-label {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.stepper-controls {
  display: flex;
  align-items: center;
  gap: 1px;
  margin-left: auto;
}
.stepper-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  font-weight: bold;
  font-size: 10px;
  -webkit-tap-highlight-color: transparent;
}
.stepper-btn::after {
  content: '';
  position: absolute;
  inset: -3px;
}
.stepper-btn:active {
  background: rgba(255, 255, 255, 0.2);
}
.stepper-val {
  min-width: 14px;
  text-align: center;
  font-weight: 700;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

/* ── Ring pips (inside counter grid) ── */
.ring-pip {
  position: relative;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  transition: background 0.15s, box-shadow 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.ring-pip::after {
  content: '';
  position: absolute;
  inset: -3px;
}
.ring-pip-off {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.ring-pip-on {
  background: rgba(245, 158, 11, 0.6);
  border: 1px solid rgba(245, 158, 11, 0.8);
  box-shadow: 0 0 4px rgba(245, 158, 11, 0.4);
}

/* ── Commander rows: compact ── */
.commander-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  min-height: 28px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
}
.commander-tax-btn {
  display: flex;
  align-items: center;
  height: 22px;
  padding: 0 6px;
  border-radius: 4px;
  background: rgba(232, 96, 10, 0.2);
  font-size: 9px;
  font-weight: 700;
  color: #e8600a;
  -webkit-tap-highlight-color: transparent;
}
.commander-tax-btn:active {
  background: rgba(232, 96, 10, 0.3);
}

/* ── Game result button ── */
.token-game-result {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.1);
  font-size: 11px;
  font-weight: 600;
  color: rgba(239, 68, 68, 0.7);
  -webkit-tap-highlight-color: transparent;
}
.token-game-result:active {
  background: rgba(239, 68, 68, 0.2);
}
</style>
