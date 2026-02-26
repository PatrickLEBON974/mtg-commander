<template>
  <div class="flex h-full flex-col overflow-y-auto rounded-2xl px-2 py-1.5" :class="playerBgClass">
    <!-- Header: Player Name + Close (compact) -->
    <div class="flex items-center justify-between mb-1 min-h-[28px]">
      <span class="font-beleren text-[10px] font-bold uppercase tracking-[0.12em] text-arena-gold-light/80 truncate">
        {{ player.name }}
      </span>
      <button
        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/60 active:bg-white/20"
        :aria-label="t('common.close')"
        @click="$emit('close')"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Toggle grid: 2x2, ultra compact -->
    <div class="grid grid-cols-2 gap-1">
      <button
        class="token-toggle"
        :class="player.isMonarch ? 'token-active token-monarch' : 'token-off'"
        @click="handleToggleMonarch"
      >
        <IconCrown :size="12" :color="player.isMonarch ? '#f0d078' : undefined" :class="!player.isMonarch && 'text-white/40'" />
        <span class="token-text">{{ t('playerDetail.monarch') }}</span>
      </button>

      <button
        class="token-toggle"
        :class="player.hasInitiative ? 'token-active token-initiative' : 'token-off'"
        @click="handleToggleInitiative"
      >
        <IconShield :size="12" :class="player.hasInitiative ? 'text-white' : 'text-white/40'" />
        <span class="token-text">{{ t('playerDetail.initiative') }}</span>
      </button>

      <button
        class="token-toggle"
        :class="player.cityBlessing ? 'token-active token-city' : 'token-off'"
        @click="handleToggleCityBlessing"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" :class="player.cityBlessing ? 'text-emerald-400' : 'text-white/40'">
          <path d="M3 21h18M5 21V7l4-4 3 3 3-3 4 4v14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="token-text">{{ t('tokens.cityBlessing') }}</span>
      </button>

      <button
        class="token-toggle"
        :class="dayNightClass"
        @click="handleToggleDayNight"
      >
        <svg v-if="dayNightState !== 'night'" width="12" height="12" viewBox="0 0 24 24" fill="none" :class="dayNightState === 'day' ? 'text-yellow-400' : 'text-white/40'">
          <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2.5" />
          <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" class="text-blue-300">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="token-text">{{ dayNightLabel }}</span>
      </button>
    </div>

    <!-- Separator line -->
    <div class="my-1 h-px bg-white/8" />

    <!-- Counter steppers: compact inline rows -->
    <div class="space-y-0.5">
      <div class="stepper-row">
        <IconExperience :size="11" class="text-arena-blue shrink-0" />
        <span class="stepper-label">{{ t('playerDetail.experience') }}</span>
        <div class="stepper-controls" data-sound="none">
          <button class="stepper-btn" @click="handleExperienceChange(-1)">-</button>
          <span class="stepper-val text-arena-blue" :class="{ 'opacity-40': player.experienceCounters === 0 }">{{ player.experienceCounters }}</span>
          <button class="stepper-btn" @click="handleExperienceChange(1)">+</button>
        </div>
      </div>

      <div class="stepper-row">
        <IconEnergy :size="11" class="text-arena-gold shrink-0" />
        <span class="stepper-label">{{ t('playerDetail.energy') }}</span>
        <div class="stepper-controls" data-sound="none">
          <button class="stepper-btn" @click="handleEnergyChange(-1)">-</button>
          <span class="stepper-val text-arena-gold" :class="{ 'opacity-40': player.energyCounters === 0 }">{{ player.energyCounters }}</span>
          <button class="stepper-btn" @click="handleEnergyChange(1)">+</button>
        </div>
      </div>

      <div class="stepper-row">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" class="text-green-400 shrink-0">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
        <span class="stepper-label">{{ t('tokens.rad') }}</span>
        <div class="stepper-controls" data-sound="none">
          <button class="stepper-btn" @click="handleRadChange(-1)">-</button>
          <span class="stepper-val text-green-400" :class="{ 'opacity-40': player.radCounters === 0 }">{{ player.radCounters }}</span>
          <button class="stepper-btn" @click="handleRadChange(1)">+</button>
        </div>
      </div>
    </div>

    <!-- Ring level — single row with pips -->
    <div class="my-1 h-px bg-white/8" />
    <div class="flex items-center justify-between min-h-[24px]">
      <span class="flex items-center gap-1">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" :class="player.ringLevel > 0 ? 'text-amber-400' : 'text-white/40'">
          <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2.5" />
          <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.5" opacity="0.5" />
        </svg>
        <span class="text-[10px] text-white/60">{{ t('tokens.ring') }}</span>
      </span>
      <div class="flex items-center gap-1">
        <button
          v-for="pipLevel in 4"
          :key="pipLevel"
          class="ring-pip"
          :class="pipLevel <= player.ringLevel ? 'ring-pip-on' : 'ring-pip-off'"
          @click="handleSetRingLevel(pipLevel === player.ringLevel ? 0 : pipLevel)"
        />
      </div>
    </div>

    <!-- Commander section (push to bottom) -->
    <div class="my-1 h-px bg-white/8" />
    <div class="mt-auto space-y-1">
      <div
        v-for="(commander, commanderIndex) in player.commanders"
        :key="commander.id"
        class="flex items-center gap-1.5 rounded-md bg-black/20 px-1.5 py-1"
      >
        <img
          v-if="commander.imageUri"
          :src="commander.imageUri"
          :alt="commander.cardName"
          class="h-6 w-6 rounded object-cover"
        />
        <p class="min-w-0 flex-1 truncate text-[10px] text-white/70">{{ commander.cardName }}</p>
        <button
          class="flex h-6 items-center rounded bg-arena-orange/20 px-1.5 text-[10px] font-bold text-arena-orange active:bg-arena-orange/30"
          data-sound="none"
          @click="handleCastCommander(commanderIndex)"
        >
          T{{ gameStore.getCommanderTax(player, commanderIndex) }}
        </button>
      </div>

      <button
        v-if="player.commanders.length < 2"
        class="flex w-full items-center justify-center gap-1 rounded-md bg-white/5 py-1 text-[10px] text-white/30 active:bg-white/10"
        @click="$emit('addCommander')"
      >
        + {{ t('playerDetail.addCommander') }}
      </button>

      <!-- Game result button -->
      <button
        class="flex w-full items-center justify-center gap-1.5 rounded-md bg-life-negative/10 py-1.5 text-[10px] font-semibold text-life-negative/70 active:bg-life-negative/20"
        @click="$emit('showGameResult')"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" class="text-life-negative/60">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M4 22v-7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
        </svg>
        {{ t('gameResult.title') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PlayerState } from '@/types/game'
import { useGameStore } from '@/stores/gameStore'
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

function handleToggleMonarch() {
  gameStore.toggleMonarch(props.player.id)
  if (!props.player.isMonarch) playMonarchCrown()
}

function handleToggleInitiative() {
  gameStore.toggleInitiative(props.player.id)
  if (!props.player.hasInitiative) playInitiative()
}

function handleToggleCityBlessing() {
  gameStore.toggleCityBlessing(props.player.id)
}

function handleToggleDayNight() {
  gameStore.toggleDayNight()
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

/* ── Toggle buttons: ultra-compact 2x2 grid ── */
.token-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: 6px;
  min-height: 28px;
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
  box-shadow: inset 0 0 8px rgba(212, 168, 67, 0.15);
}
.token-initiative {
  background: rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 0 8px rgba(255, 255, 255, 0.1);
}
.token-city {
  background: rgba(52, 211, 153, 0.15);
  box-shadow: inset 0 0 8px rgba(52, 211, 153, 0.15);
}
.token-day {
  background: rgba(250, 204, 21, 0.15);
  box-shadow: inset 0 0 8px rgba(250, 204, 21, 0.15);
}
.token-night {
  background: rgba(147, 197, 253, 0.15);
  box-shadow: inset 0 0 8px rgba(147, 197, 253, 0.15);
}
.token-text {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Stepper rows: single-line with inline controls ── */
.stepper-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  min-height: 28px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.12);
}
.stepper-label {
  flex: 1;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stepper-controls {
  display: flex;
  align-items: center;
  gap: 2px;
}
.stepper-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  font-weight: bold;
  font-size: 13px;
  -webkit-tap-highlight-color: transparent;
}
.stepper-btn:active {
  background: rgba(255, 255, 255, 0.2);
}
.stepper-val {
  min-width: 18px;
  text-align: center;
  font-weight: 700;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

/* ── Ring pips ── */
.ring-pip {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  transition: background 0.15s, box-shadow 0.15s;
  -webkit-tap-highlight-color: transparent;
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
</style>
