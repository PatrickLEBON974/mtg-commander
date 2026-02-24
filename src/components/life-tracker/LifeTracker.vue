<template>
  <div
    ref="panelRef"
    class="floating-number-container relative flex flex-col items-center justify-between gap-0 overflow-hidden rounded-2xl border p-3"
    :class="[
      playerBgClass,
      turnBorderClass,
      dangerPulseClass,
    ]"
    :data-commander-player="player.id"
  >
    <!-- Corner accents -->
    <CornerAccent position="top-left" />
    <CornerAccent position="top-right" />
    <CornerAccent position="bottom-left" />
    <CornerAccent position="bottom-right" />

    <!-- Priority — animated border glow (blue) -->
    <div
      v-if="showMarchingBorder"
      class="life-tracker-priority-track pointer-events-none absolute inset-0 z-[1] rounded-2xl"
    >
      <div class="life-tracker-priority-spinner absolute inset-[-50%]" />
    </div>

    <!-- Rotating border glow — active turn -->
    <div
      v-if="isCurrentTurn && isActivePlayer && !isPriorityTaken"
      class="life-tracker-glow-track pointer-events-none absolute inset-0 z-[1] rounded-2xl"
    >
      <div class="life-tracker-glow-spinner absolute inset-[-50%]" />
    </div>

    <!-- Life flash overlay -->
    <div
      v-if="flashType"
      class="pointer-events-none absolute inset-0 z-10"
      :class="flashType === 'positive' ? 'flash-positive' : 'flash-negative'"
      @animationend="flashType = null"
    />

    <!-- Full-card tap zones: left/top = -1, right/bottom = +1 -->
    <!-- Adapts orientation based on card rotation (sideways cards use top/bottom split) -->
    <button
      class="life-tap-zone absolute z-[2]"
      :class="isSidewaysCard ? 'inset-x-0 top-0 h-1/2' : 'inset-y-0 left-0 w-1/2'"
      :aria-label="t('aria.decreaseLife', { name: player.name })"
      data-sound="none"
      @click="changeLifeBy(-1)"
      @touchstart.passive="startLifeRepeat(-1)"
      @touchend.passive="stopLifeRepeat"
      @touchcancel.passive="stopLifeRepeat"
    />
    <button
      class="life-tap-zone absolute z-[2]"
      :class="isSidewaysCard ? 'inset-x-0 bottom-0 h-1/2' : 'inset-y-0 right-0 w-1/2'"
      :aria-label="t('aria.increaseLife', { name: player.name })"
      data-sound="none"
      @click="changeLifeBy(1)"
      @touchstart.passive="startLifeRepeat(1)"
      @touchend.passive="stopLifeRepeat"
      @touchcancel.passive="stopLifeRepeat"
    />

    <!-- Zone: Identity — Player Name + Menu -->
    <div class="pointer-events-none relative z-[3] flex w-full items-center min-h-[44px]">
      <div class="w-7 flex-shrink-0" aria-hidden="true" />
      <div class="flex-1 min-w-0 text-center">
        <span class="life-tracker-player-name text-xs font-bold uppercase tracking-[0.15em] text-arena-gold-light/80">
          {{ player.name }}
        </span>
        <span v-if="player.commanders.length > 0" class="block truncate text-[10px] text-white/50">
          {{ player.commanders.map(c => c.cardName).join(' / ') }}
        </span>
      </div>
      <button
        class="pointer-events-auto flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full btn-press"
        :aria-label="t('aria.playerDetails', { name: player.name })"
        @click="showDetail = true"
      >
        <svg width="4" height="16" viewBox="0 0 4 16" fill="currentColor" class="text-arena-gold-light/60">
          <circle cx="2" cy="2" r="1.5" />
          <circle cx="2" cy="8" r="1.5" />
          <circle cx="2" cy="14" r="1.5" />
        </svg>
      </button>
    </div>

    <!-- Zone: Hero — Life Total (tap zones are full-card background) -->
    <div
      class="pointer-events-auto relative z-[3]"
      @touchstart.passive="onLifeTouchStart"
      @touchmove="onLifeTouchMove"
      @touchend.passive="onLifeTouchEnd"
      @touchcancel.passive="onLifeTouchCancel"
    >
      <span
        class="life-tracker-life-total block select-none text-center text-6xl font-bold leading-none tabular-nums"
        :class="lifeColorClass"
        role="status"
        :aria-label="t('aria.lifePoints', { name: player.name, life: player.lifeTotal })"
        @click="openLifeNumpad"
      >
        {{ animatedLife }}
      </span>

      <!-- Life drag indicator -->
      <span
        v-if="lifeDragPendingAmount !== 0"
        class="absolute -top-5 left-1/2 -translate-x-1/2 text-lg font-bold drop-shadow-lg"
        :class="lifeDragPendingAmount > 0 ? 'text-life-positive' : 'text-life-negative'"
      >
        {{ lifeDragPendingAmount > 0 ? '+' : '' }}{{ lifeDragPendingAmount }}
      </span>
    </div>

    <!-- Zone: Timer -->
    <div
      class="life-tracker-timer-zone pointer-events-none relative z-[3] mt-1 flex items-center justify-center gap-3 rounded-lg px-3 py-1.5"
      :class="[
        hasTimerFlashEffect ? 'timer-aggressive-flash' : '',
      ]"
    >
      <!-- Total play time (always visible) -->
      <div class="flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" class="text-white/50">
          <circle cx="12" cy="13" r="9" stroke="currentColor" stroke-width="2.5" />
          <path d="M12 9v4l2.5 2.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M9 2h6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
        </svg>
        <span class="font-mono text-sm font-bold tabular-nums" :class="hasActiveTurn ? 'text-white/50' : 'text-white/30'">{{ formattedTotalPlayTime }}</span>
      </div>

      <div class="h-3 w-px bg-white/10" />

      <!-- Round time -->
      <div class="flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="text-white/40">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
          <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span v-if="!hasActiveTurn" class="font-mono text-sm tabular-nums text-white/50">
          {{ formattedRoundTime }}
        </span>
        <span v-else class="font-mono text-sm font-semibold tabular-nums" :class="roundTimeDisplayClass">
          {{ formattedRoundTime }}
        </span>
      </div>
    </div>

    <!-- Zone: Damage — Poison + Commander on dedicated row -->
    <div class="pointer-events-none relative z-[3] mt-1 flex items-center justify-center gap-2">
      <!-- Poison -->
      <button
        class="pointer-events-auto flex min-h-[40px] min-w-[40px] items-center justify-center gap-0.5 rounded-lg px-2 py-1 btn-press"
        :class="[
          player.poisonCounters > 0 ? 'bg-poison/20 ring-1 ring-poison/20' : 'bg-white/5',
        ]"
        :aria-label="t('aria.poison', { count: player.poisonCounters })"
        data-sound="none"
        @click="changePoisonBy(1)"
        @contextmenu.prevent="changePoisonBy(-1)"
        @touchstart.passive="startPoisonLongPress"
        @touchend.passive="cancelPoisonLongPress"
        @touchcancel.passive="cancelPoisonLongPress"
      >
        <IconPoison :size="14" class="shrink-0" :class="player.poisonCounters > 0 ? 'text-poison' : 'text-white/40'" />
        <span class="text-xs" :class="player.poisonCounters > 0 ? 'text-poison font-bold' : 'text-white/50'">
          {{ player.poisonCounters }}
        </span>
      </button>

      <!-- Commander damage (tap to open modal, drag to another player) -->
      <button
        class="pointer-events-auto flex min-h-[40px] min-w-[40px] items-center justify-center gap-0.5 rounded-lg px-2 py-1 btn-press"
        :class="[
          totalCommanderDamage > 0 ? 'bg-commander-damage/20 ring-1 ring-commander-damage/20' : 'bg-white/5',
        ]"
        :aria-label="t('aria.commanderDamage', { damage: totalCommanderDamage })"
        @click="onCommanderClick"
        @touchstart.passive="onCommanderTouchStart"
        @touchmove="onCommanderTouchMove"
        @touchend.passive="onCommanderTouchEnd"
        @touchcancel.passive="onCommanderTouchCancel"
      >
        <IconSwordSingle :size="14" class="shrink-0" :class="totalCommanderDamage > 0 ? 'text-commander-damage' : 'text-white/40'" />
        <span class="text-xs" :class="totalCommanderDamage > 0 ? 'text-commander-damage font-bold' : 'text-white/50'">
          {{ totalCommanderDamage }}
        </span>
      </button>
    </div>

    <!-- Zone: Status — Other counters + Actions -->
    <div class="pointer-events-none relative z-[3] mt-auto flex flex-wrap items-center justify-center gap-1.5">
      <!-- Experience (visible if > 0) -->
      <button
        v-if="player.experienceCounters > 0"
        class="pointer-events-auto flex min-h-[32px] items-center gap-0.5 rounded-lg bg-arena-blue/20 ring-1 ring-arena-blue/20 px-2 py-1 btn-press"
        @click="showDetail = true"
      >
        <IconExperience :size="12" class="text-arena-blue" />
        <span class="text-xs font-bold text-arena-blue">{{ player.experienceCounters }}</span>
      </button>

      <!-- Energy (visible if > 0) -->
      <button
        v-if="player.energyCounters > 0"
        class="pointer-events-auto flex min-h-[32px] items-center gap-0.5 rounded-lg bg-arena-gold/20 ring-1 ring-arena-gold/20 px-2 py-1 btn-press"
        @click="showDetail = true"
      >
        <IconEnergy :size="12" class="text-arena-gold" />
        <span class="text-xs font-bold text-arena-gold">{{ player.energyCounters }}</span>
      </button>

      <!-- Monarch indicator -->
      <span v-if="player.isMonarch" class="flex items-center gap-1 rounded-lg bg-mana-gold/40 px-2 py-0.5 shadow-glow-gold glow-breathe" style="--glow-color: rgba(212, 168, 67, 0.4)">
        <IconCrown :size="14" color="#f0d078" />
        <span class="text-xs font-bold text-arena-gold-light">M</span>
      </span>

      <!-- Initiative indicator -->
      <span v-if="player.hasInitiative" class="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-0.5">
        <IconShield :size="14" />
        <span class="text-xs font-bold text-white/80">I</span>
      </span>

      <!-- Commander tax -->
      <span
        v-for="(commander, commanderIndex) in player.commanders"
        :key="commanderIndex"
        class="flex items-center gap-0.5 rounded-lg bg-white/5 px-2 py-0.5 text-xs text-white/50"
      >
        <IconMana :size="10" />
        T{{ gameStore.getCommanderTax(player, commanderIndex) }}
      </span>

      <!-- Separator between counters and actions -->
      <div v-if="showAnyActionButton" class="h-4 w-px bg-white/10" />

      <!-- Action buttons (merged into same row) -->
      <div v-if="showEndTurnButton" class="pointer-events-auto relative">
        <button
          class="group flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg bg-life-negative/10 btn-press"
          :aria-label="t('game.endTurn')"
          data-sound="none"
          @click="handleAdvanceTurn"
          @touchstart.passive="showActionTooltip('endTurn')"
          @touchend.passive="hideActionTooltip"
          @touchcancel.passive="hideActionTooltip"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-life-negative drop-shadow-sm transition-transform duration-150 group-active:scale-90">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" opacity="0.3" />
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" />
            <path d="M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <path d="m12 16 4-4-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <Transition name="tooltip-pop">
          <span v-if="activeTooltip === 'endTurn'" class="action-tooltip">{{ t('game.endTurn') }}</span>
        </Transition>
      </div>

      <div v-if="showReclaimTurnButton" class="pointer-events-auto relative">
        <button
          class="group flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg bg-arena-orange/15 btn-press"
          :aria-label="t('game.reclaimPriority')"
          @click="handleReleasePriority"
          @touchstart.passive="showActionTooltip('reclaimPriority')"
          @touchend.passive="hideActionTooltip"
          @touchcancel.passive="hideActionTooltip"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-arena-orange drop-shadow-sm transition-transform duration-150 group-active:scale-90">
            <path d="M4 12a8 8 0 0 1 14-5.3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <path d="M15 3l3 3.7-4 .3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3" />
          </svg>
        </button>
        <Transition name="tooltip-pop">
          <span v-if="activeTooltip === 'reclaimPriority'" class="action-tooltip">{{ t('game.reclaimPriority') }}</span>
        </Transition>
      </div>

      <div v-if="showStartTurnButton" class="pointer-events-auto relative">
        <button
          class="group flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg bg-life-positive/15 btn-press"
          :aria-label="t('game.startTurn')"
          data-sound="none"
          @click="handleAdvanceTurn"
          @touchstart.passive="showActionTooltip('startTurn')"
          @touchend.passive="hideActionTooltip"
          @touchcancel.passive="hideActionTooltip"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-life-positive drop-shadow-sm transition-transform duration-150 group-active:scale-90">
            <path d="M6 4l14 8-14 8V4z" fill="currentColor" opacity="0.3" />
            <path d="M6 4l14 8-14 8V4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
          </svg>
        </button>
        <Transition name="tooltip-pop">
          <span v-if="activeTooltip === 'startTurn'" class="action-tooltip">{{ t('game.startTurn') }}</span>
        </Transition>
      </div>

      <div v-if="showRespondButton" class="pointer-events-auto relative">
        <button
          class="group flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg bg-mana-blue/20 btn-press"
          :aria-label="t('game.respond')"
          @click="handleRespond"
          @touchstart.passive="showActionTooltip('respond')"
          @touchend.passive="hideActionTooltip"
          @touchcancel.passive="hideActionTooltip"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-arena-blue drop-shadow-sm transition-transform duration-150 group-active:scale-90">
            <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor" opacity="0.25" />
            <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
          </svg>
        </button>
        <Transition name="tooltip-pop">
          <span v-if="activeTooltip === 'respond'" class="action-tooltip">{{ t('game.respond') }}</span>
        </Transition>
      </div>

      <div v-if="showReleasePriorityButton" class="pointer-events-auto relative">
        <button
          class="group flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg bg-arena-gold-light/15 btn-press"
          :aria-label="t('game.releasePriority')"
          @click="handleReleasePriority"
          @touchstart.passive="showActionTooltip('releasePriority')"
          @touchend.passive="hideActionTooltip"
          @touchcancel.passive="hideActionTooltip"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-arena-gold-light drop-shadow-sm transition-transform duration-150 group-active:scale-90">
            <path d="M12 5v7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <path d="M12 12l5 5M12 12l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M5 19h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5" />
          </svg>
        </button>
        <Transition name="tooltip-pop">
          <span v-if="activeTooltip === 'releasePriority'" class="action-tooltip">{{ t('game.releasePriority') }}</span>
        </Transition>
      </div>
    </div>

    <!-- Death overlay (animated) -->
    <Transition name="death-overlay">
      <div
        v-if="deathReason"
        class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm"
        role="alert"
        :aria-label="t('aria.playerEliminated', { name: player.name, reason: deathReason })"
      >
        <IconSkull :size="48" class="text-life-negative drop-shadow-lg" />
        <span class="text-lg font-bold text-life-negative drop-shadow-lg">{{ deathReason }}</span>
        <button
          class="mt-1 flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-sm transition-all active:scale-95 active:bg-white/25"
          @click.stop="revertDeath"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="opacity-80">
            <path d="M4 10h12a4 4 0 0 1 0 8H11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M4 10l4-4M4 10l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          {{ t('game.undo') }}
        </button>
      </div>
    </Transition>

    <!-- Life numpad overlay -->
    <LifeNumpad
      :model-value="player.lifeTotal"
      :is-open="showLifeNumpad"
      @confirm="confirmLifeNumpad"
      @cancel="cancelLifeNumpad"
    />

    <!-- Modals -->
    <PlayerDetailModal
      :is-open="showDetail"
      :player="player"
      @close="onDetailClose"
    />

    <CommanderDamageModal
      :is-open="showCommanderDamage"
      :target-player="player"
      :initial-attacker-id="commanderDamageInitialAttackerId"
      @close="onCommanderDamageClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PlayerState } from '@/types/game'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { isDragLocked } from '@/composables/useDragLock'
import { tapFeedback, lifeFeedback, heavyFeedback, warningFeedback } from '@/services/haptics'
import { playLifeChange, playLargeLifeChange, playPoisonChange, playPlayerDeath, playMonarchCrown, playTurnAdvance } from '@/services/sounds'
import { formatMsToTimer } from '@/utils/time'
import { LOW_LIFE_WARNING_THRESHOLD, LARGE_LIFE_CHANGE_THRESHOLD, LONG_PRESS_DURATION_MS, FLOAT_ANIMATION_DELAY_MS, MAX_COMMANDERS_PER_PLAYER } from '@/config/gameConstants'
import { useAnimatedNumber } from '@/composables/useAnimatedNumber'
import { useCelebration } from '@/composables/useCelebration'
import { useFloatingNumbers } from '@/composables/useFloatingNumbers'
import LifeNumpad from './LifeNumpad.vue'
import PlayerDetailModal from './PlayerDetailModal.vue'
import CommanderDamageModal from './CommanderDamageModal.vue'
import CornerAccent from '@/components/icons/decorative/CornerAccent.vue'
import IconPoison from '@/components/icons/game/IconPoison.vue'
import IconSwordSingle from '@/components/icons/game/IconSwordSingle.vue'
import IconExperience from '@/components/icons/game/IconExperience.vue'
import IconEnergy from '@/components/icons/game/IconEnergy.vue'
import IconCrown from '@/components/icons/game/IconCrown.vue'
import IconShield from '@/components/icons/game/IconShield.vue'
import IconMana from '@/components/icons/game/IconMana.vue'
import IconSkull from '@/components/icons/game/IconSkull.vue'

const props = defineProps<{
  player: PlayerState
  isCurrentTurn: boolean
  cardRotation?: number
  commanderDamageAttackerId?: string | null
}>()

const emit = defineEmits<{
  stateChanged: []
  turnAdvanced: []
  commanderDragDrop: [targetPlayerId: string]
}>()

const { t } = useI18n()
const gameStore = useGameStore()
const settingsStore = useSettingsStore()

const panelRef = ref<HTMLElement>()
const showLifeNumpad = ref(false)
const showDetail = ref(false)
const showCommanderDamage = ref(false)
const flashType = ref<'positive' | 'negative' | null>(null)

const { monarchCrown, playerEliminated } = useCelebration()

const { addFloat } = useFloatingNumbers({
  containerRef: () => panelRef.value,
})

const animatedLife = useAnimatedNumber(() => props.player.lifeTotal)

const totalCommanderDamage = computed(() =>
  Object.values(props.player.commanderDamageReceived).reduce((sum, damage) => sum + damage, 0),
)

// Low-life danger pulse
const dangerPulseClass = computed(() => {
  if (props.player.lifeTotal <= 0) return ''
  if (props.player.lifeTotal <= LOW_LIFE_WARNING_THRESHOLD) return 'danger-pulse'
  return ''
})

// Total play time — cumulative time across the entire game (never resets)
const totalPlayTimeMs = computed(() =>
  gameStore.currentGame?.playerPlayTimeMs?.[props.player.id] ?? 0,
)
const formattedTotalPlayTime = computed(() => formatMsToTimer(totalPlayTimeMs.value))

// Round time — per-turn timer that resets each turn
const currentRoundTimeMs = computed(() =>
  gameStore.currentGame?.playerRoundTimeMs?.[props.player.id] ?? 0,
)
const turnTimerLimitSeconds = computed(() => settingsStore.gameSettings.turnTimerSeconds)
const roundTimeRemainingSeconds = computed(() =>
  turnTimerLimitSeconds.value - (currentRoundTimeMs.value / 1000),
)

const formattedRoundTime = computed(() => {
  // Without turn timer: count-up (elapsed round time)
  if (!settingsStore.gameSettings.enableTurnTimer) {
    return formatMsToTimer(currentRoundTimeMs.value)
  }
  // With turn timer: countdown from limit
  const remaining = roundTimeRemainingSeconds.value
  if (remaining >= 0) {
    const minutes = Math.floor(remaining / 60)
    const seconds = Math.floor(remaining % 60)
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  // Overtime: show negative
  const overtime = Math.abs(remaining)
  const minutes = Math.floor(overtime / 60)
  const seconds = Math.floor(overtime % 60)
  return `-${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

// Clock owner: does this player currently "own the clock"?
// Either it is their turn, or they took priority from someone.
const isClockOwner = computed(() =>
  props.player.id === gameStore.effectivePriorityPlayer?.id,
)

// Active turn: should both timers (round time + total play time) be visible?
const hasActiveTurn = computed(() =>
  isClockOwner.value || props.isCurrentTurn,
)

// Round time display styling (priority-aware)
const roundTimeDisplayClass = computed(() => {
  if (!isClockOwner.value) {
    // Your turn but someone else took priority → dimmed
    return 'text-white/25'
  }
  // Without turn timer: neutral color (count-up mode)
  if (!settingsStore.gameSettings.enableTurnTimer) {
    return 'text-white/60'
  }
  // With turn timer: countdown colors
  if (roundTimeRemainingSeconds.value <= 0) return 'text-life-negative animate-pulse font-bold'
  if (roundTimeRemainingSeconds.value <= 60) return 'text-life-negative'
  return 'text-arena-gold-light'
})

// Timer flash effect — triggered by rules engine when time is critical
const hasTimerFlashEffect = computed(() =>
  gameStore.currentGame?.activeFlashPlayerIds?.includes(props.player.id) ?? false,
)

// Card orientation — sideways cards (90°/270°) use top/bottom tap zones instead of left/right
const isSidewaysCard = computed(() => props.cardRotation === 90 || props.cardRotation === 270)

// Priority system
const isActivePlayer = computed(() => props.player.id === gameStore.currentTurnPlayer?.id)
const isNextPlayer = computed(() => props.player.id === gameStore.nextTurnPlayer?.id)
const isPriorityTaken = computed(() =>
  gameStore.currentGame?.priorityPlayerId != null,
)
const hasPriority = computed(() => {
  const effectiveId = gameStore.currentGame?.priorityPlayerId ?? gameStore.currentTurnPlayer?.id
  return props.player.id === effectiveId
})

// Turn / priority border + rotating glow (glow tied to isCurrentTurn like the timer)
const showMarchingBorder = computed(() => hasPriority.value && isPriorityTaken.value && !isActivePlayer.value)
const turnBorderClass = computed(() => {
  if (isActivePlayer.value) return 'border-arena-orange/70'
  if (showMarchingBorder.value) return 'border-transparent'
  return 'border-white/[0.04]'
})

// Button visibility
const showEndTurnButton = computed(() => isActivePlayer.value)
const showStartTurnButton = computed(() => isNextPlayer.value && !isActivePlayer.value && !isPriorityTaken.value)
const showRespondButton = computed(() =>
  !isActivePlayer.value && !hasPriority.value,
)
const showReleasePriorityButton = computed(() =>
  isPriorityTaken.value && hasPriority.value && !isActivePlayer.value,
)
const showReclaimTurnButton = computed(() =>
  isActivePlayer.value && isPriorityTaken.value,
)

const showAnyActionButton = computed(() =>
  showEndTurnButton.value || showStartTurnButton.value ||
  showRespondButton.value || showReleasePriorityButton.value ||
  showReclaimTurnButton.value,
)

function handleAdvanceTurn() {
  gameStore.advanceTurn()
  playTurnAdvance()
  if (settingsStore.hapticFeedback) tapFeedback()
  emit('turnAdvanced')
  emit('stateChanged')
}

function handleRespond() {
  gameStore.takePriority(props.player.id)
  if (settingsStore.hapticFeedback) tapFeedback()
  emit('stateChanged')
}

function handleReleasePriority() {
  gameStore.releasePriority()
  if (settingsStore.hapticFeedback) tapFeedback()
  emit('stateChanged')
}

const playerBgClass = computed(() => {
  const colorMap: Record<string, string> = {
    white: 'bg-mana-white/10',
    blue: 'bg-mana-blue/30',
    black: 'bg-mana-black/50',
    red: 'bg-mana-red/30',
    green: 'bg-mana-green/30',
    colorless: 'bg-mana-colorless/20',
    gold: 'bg-mana-gold/20',
  }
  return colorMap[props.player.color] ?? 'bg-surface-card'
})

const lifeColorClass = computed(() => {
  if (props.player.lifeTotal <= 0) return 'text-life-negative'
  if (props.player.lifeTotal <= LOW_LIFE_WARNING_THRESHOLD) return 'text-life-negative/80'
  return 'text-white'
})

const deathReason = computed(() => {
  if (props.player.lifeTotal <= 0) return t('game.deathLife')
  if (gameStore.isPlayerDeadByPoison(props.player)) return t('game.deathPoison')
  if (gameStore.isPlayerDeadByCommanderDamage(props.player)) return t('game.deathCommander')
  return null
})

watch(deathReason, (newValue, oldValue) => {
  if (newValue && !oldValue) {
    playerEliminated()
    playPlayerDeath()
  }
})

watch(() => props.player.isMonarch, (newValue, oldValue) => {
  if (newValue && !oldValue) {
    monarchCrown()
    playMonarchCrown()
  }
})

onUnmounted(() => {
  cancelPoisonLongPress()
  stopLifeRepeat()
  hideActionTooltip()
  isDragLocked.value = false
})

// --- Life drag gesture ---

let lifeDragActive = false
let lifeDragStartX = 0
let lifeDragStartY = 0
const lifeDragPendingAmount = ref(0)
const LIFE_DRAG_PIXELS_PER_POINT = 25
const LIFE_DRAG_THRESHOLD = 10

function onLifeTouchStart(event: TouchEvent) {
  const touch = event.touches[0]
  if (!touch) return
  lifeDragActive = false
  lifeDragStartX = touch.clientX
  lifeDragStartY = touch.clientY
  lifeDragPendingAmount.value = 0
}

function onLifeTouchMove(event: TouchEvent) {
  const touch = event.touches[0]
  if (!touch) return

  const deltaX = touch.clientX - lifeDragStartX
  const deltaY = touch.clientY - lifeDragStartY

  if (!lifeDragActive && Math.hypot(deltaX, deltaY) > LIFE_DRAG_THRESHOLD) {
    lifeDragActive = true
    isDragLocked.value = true
  }

  if (lifeDragActive) {
    event.preventDefault()
    // Use dominant axis: up/right = gain, down/left = loss
    const rawAmount = Math.abs(deltaX) > Math.abs(deltaY)
      ? deltaX / LIFE_DRAG_PIXELS_PER_POINT
      : -deltaY / LIFE_DRAG_PIXELS_PER_POINT
    lifeDragPendingAmount.value = Math.round(rawAmount)
  }
}

function onLifeTouchEnd() {
  if (lifeDragActive && lifeDragPendingAmount.value !== 0) {
    changeLifeBy(lifeDragPendingAmount.value)
  }
  lifeDragActive = false
  isDragLocked.value = false
  lifeDragPendingAmount.value = 0
}

function onLifeTouchCancel() {
  lifeDragActive = false
  isDragLocked.value = false
  lifeDragPendingAmount.value = 0
}

function changeLifeBy(amount: number) {
  gameStore.changeLife(props.player.id, amount)

  // Flash effect
  flashType.value = amount > 0 ? 'positive' : 'negative'

  // Floating number (slightly delayed for choreography)
  setTimeout(() => addFloat(amount, 'life'), FLOAT_ANIMATION_DELAY_MS)

  // Haptic feedback
  if (settingsStore.hapticFeedback) {
    const newLife = props.player.lifeTotal
    if (newLife <= 0) {
      warningFeedback()
    } else if (Math.abs(amount) >= LARGE_LIFE_CHANGE_THRESHOLD) {
      heavyFeedback()
    } else {
      lifeFeedback()
    }
  }

  // Sound effect
  if (Math.abs(amount) >= LARGE_LIFE_CHANGE_THRESHOLD) {
    playLargeLifeChange(amount > 0)
  } else {
    playLifeChange(amount > 0)
  }

  emit('stateChanged')
}

// Long-press repeat for ±1 buttons
const LIFE_REPEAT_DELAY_MS = 400
const LIFE_REPEAT_INTERVAL_MS = 100
let lifeRepeatDelayTimer: ReturnType<typeof setTimeout> | null = null
let lifeRepeatIntervalTimer: ReturnType<typeof setInterval> | null = null

function startLifeRepeat(amount: number) {
  stopLifeRepeat()
  lifeRepeatDelayTimer = setTimeout(() => {
    changeLifeBy(amount)
    lifeRepeatIntervalTimer = setInterval(() => changeLifeBy(amount), LIFE_REPEAT_INTERVAL_MS)
  }, LIFE_REPEAT_DELAY_MS)
}

function stopLifeRepeat() {
  if (lifeRepeatDelayTimer) {
    clearTimeout(lifeRepeatDelayTimer)
    lifeRepeatDelayTimer = null
  }
  if (lifeRepeatIntervalTimer) {
    clearInterval(lifeRepeatIntervalTimer)
    lifeRepeatIntervalTimer = null
  }
}

function openLifeNumpad() {
  if (lifeDragActive) return
  showLifeNumpad.value = true
}

function confirmLifeNumpad(newLife: number) {
  showLifeNumpad.value = false
  if (newLife !== props.player.lifeTotal) {
    changeLifeBy(newLife - props.player.lifeTotal)
  }
}

function cancelLifeNumpad() {
  showLifeNumpad.value = false
}

function changePoisonBy(amount: number) {
  gameStore.changePoison(props.player.id, amount)
  if (settingsStore.hapticFeedback) tapFeedback()
  playPoisonChange()
  setTimeout(() => addFloat(amount, 'poison'), FLOAT_ANIMATION_DELAY_MS)
  emit('stateChanged')
}

// Long-press to decrement poison on mobile (no right-click on touch)
let poisonLongPressTimer: ReturnType<typeof setTimeout> | null = null
function startPoisonLongPress() {
  poisonLongPressTimer = setTimeout(() => {
    changePoisonBy(-1)
    if (settingsStore.hapticFeedback) heavyFeedback()
    poisonLongPressTimer = null
  }, LONG_PRESS_DURATION_MS)
}
function cancelPoisonLongPress() {
  if (poisonLongPressTimer) {
    clearTimeout(poisonLongPressTimer)
    poisonLongPressTimer = null
  }
}

// --- Commander damage drag-drop ---

const commanderDamageInitialAttackerId = ref<string | null>(null)
let commanderDragActive = false
let commanderDragStartX = 0
let commanderDragStartY = 0
let commanderDragIndicator: HTMLElement | null = null
const DRAG_THRESHOLD = 10

// Watch external prop to open modal with pre-selected attacker
watch(() => props.commanderDamageAttackerId, (attackerId) => {
  if (attackerId) {
    commanderDamageInitialAttackerId.value = attackerId
    showCommanderDamage.value = true
  }
})

function onCommanderClick() {
  // Only open on tap, not after drag
  if (!commanderDragActive) {
    commanderDamageInitialAttackerId.value = null
    showCommanderDamage.value = true
  }
}

function onCommanderTouchStart(event: TouchEvent) {
  const touch = event.touches[0]
  if (!touch) return
  commanderDragActive = false
  commanderDragStartX = touch.clientX
  commanderDragStartY = touch.clientY
}

function onCommanderTouchMove(event: TouchEvent) {
  const touch = event.touches[0]
  if (!touch) return

  const deltaX = touch.clientX - commanderDragStartX
  const deltaY = touch.clientY - commanderDragStartY

  if (!commanderDragActive && Math.hypot(deltaX, deltaY) > DRAG_THRESHOLD) {
    commanderDragActive = true
    isDragLocked.value = true
    createCommanderDragIndicator()
  }

  if (commanderDragActive) {
    event.preventDefault()
    moveCommanderDragIndicator(touch.clientX, touch.clientY)
    highlightDropTarget(touch.clientX, touch.clientY)
  }
}

function onCommanderTouchEnd(event: TouchEvent) {
  if (commanderDragActive) {
    const touch = event.changedTouches[0]
    if (touch) {
      const targetPlayerId = findDropTarget(touch.clientX, touch.clientY)
      if (targetPlayerId && targetPlayerId !== props.player.id) {
        emit('commanderDragDrop', targetPlayerId)
      }
    }
    clearDropHighlights()
    removeCommanderDragIndicator()
    commanderDragActive = false
    isDragLocked.value = false
    return
  }
  commanderDragActive = false
}

function onCommanderTouchCancel() {
  clearDropHighlights()
  removeCommanderDragIndicator()
  commanderDragActive = false
  isDragLocked.value = false
}

function createSwordSvg(): SVGSVGElement {
  const svgNS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNS, 'svg')
  svg.setAttribute('width', '28')
  svg.setAttribute('height', '28')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')

  const blade = document.createElementNS(svgNS, 'path')
  blade.setAttribute('d', 'M12 2l2 10-2 2-2-2 2-10z')
  blade.setAttribute('fill', 'white')
  blade.setAttribute('opacity', '0.15')

  const shaft = document.createElementNS(svgNS, 'path')
  shaft.setAttribute('d', 'M12 2v12')
  shaft.setAttribute('stroke', 'white')
  shaft.setAttribute('stroke-width', '1.5')
  shaft.setAttribute('stroke-linecap', 'round')

  const guard = document.createElementNS(svgNS, 'path')
  guard.setAttribute('d', 'M8 14h8')
  guard.setAttribute('stroke', 'white')
  guard.setAttribute('stroke-width', '2')
  guard.setAttribute('stroke-linecap', 'round')

  const handle = document.createElementNS(svgNS, 'path')
  handle.setAttribute('d', 'M12 14v5')
  handle.setAttribute('stroke', 'white')
  handle.setAttribute('stroke-width', '2')
  handle.setAttribute('stroke-linecap', 'round')

  const pommel = document.createElementNS(svgNS, 'circle')
  pommel.setAttribute('cx', '12')
  pommel.setAttribute('cy', '20')
  pommel.setAttribute('r', '1.2')
  pommel.setAttribute('fill', 'white')

  svg.append(blade, shaft, guard, handle, pommel)
  return svg
}

function createCommanderDragIndicator() {
  commanderDragIndicator = document.createElement('div')
  const swordSvg = createSwordSvg()
  // Shift sword up 2px to visually center (blade is taller than handle)
  swordSvg.style.transform = 'translateY(-2px)'
  commanderDragIndicator.appendChild(swordSvg)
  Object.assign(commanderDragIndicator.style, {
    position: 'fixed',
    zIndex: '100',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4), 0 2px 8px rgba(0,0,0,0.5)',
    transform: 'translate(-50%, -50%)',
  })
  document.body.appendChild(commanderDragIndicator)
}

function moveCommanderDragIndicator(x: number, y: number) {
  if (commanderDragIndicator) {
    commanderDragIndicator.style.left = `${x}px`
    commanderDragIndicator.style.top = `${y}px`
  }
}

function removeCommanderDragIndicator() {
  commanderDragIndicator?.remove()
  commanderDragIndicator = null
}

function findDropTarget(x: number, y: number): string | null {
  // Temporarily hide indicator to get element underneath
  if (commanderDragIndicator) commanderDragIndicator.style.display = 'none'
  const element = document.elementFromPoint(x, y)
  if (commanderDragIndicator) commanderDragIndicator.style.display = ''

  const commanderButton = element?.closest('[data-commander-player]') as HTMLElement | null
  return commanderButton?.dataset.commanderPlayer ?? null
}

function highlightDropTarget(x: number, y: number) {
  clearDropHighlights()
  if (commanderDragIndicator) commanderDragIndicator.style.display = 'none'
  const element = document.elementFromPoint(x, y)
  if (commanderDragIndicator) commanderDragIndicator.style.display = ''

  const playerPanel = element?.closest('[data-commander-player]') as HTMLElement | null
  if (playerPanel && playerPanel.dataset.commanderPlayer !== props.player.id) {
    playerPanel.style.boxShadow = 'inset 0 0 0 3px var(--color-commander-damage), 0 0 24px rgba(245, 158, 11, 0.3)'
  }
}

function clearDropHighlights() {
  document.querySelectorAll('[data-commander-player]').forEach((el) => {
    ;(el as HTMLElement).style.boxShadow = ''
  })
}

function onCommanderDamageClose() {
  showCommanderDamage.value = false
  commanderDamageInitialAttackerId.value = null
  emit('stateChanged')
}

// --- Long-press tooltip for icon-only action buttons ---

type ActionTooltipKey = 'endTurn' | 'startTurn' | 'respond' | 'releasePriority'
const activeTooltip = ref<ActionTooltipKey | null>(null)
let tooltipTimer: ReturnType<typeof setTimeout> | null = null

function showActionTooltip(key: ActionTooltipKey) {
  tooltipTimer = setTimeout(() => {
    activeTooltip.value = key
    if (settingsStore.hapticFeedback) tapFeedback()
  }, LONG_PRESS_DURATION_MS)
}

function hideActionTooltip() {
  if (tooltipTimer) {
    clearTimeout(tooltipTimer)
    tooltipTimer = null
  }
  activeTooltip.value = null
}

function revertDeath() {
  gameStore.undoUntilPlayerAlive(props.player.id)
  if (settingsStore.hapticFeedback) heavyFeedback()
  emit('stateChanged')
}

function onDetailClose() {
  showDetail.value = false
  emit('stateChanged')
}
</script>

<style scoped>
/* Player name — Beleren font */
.life-tracker-player-name {
  font-family: var(--font-beleren);
}

/* Life total — Beleren + subtle text glow */
.life-tracker-life-total {
  font-family: var(--font-beleren);
  text-shadow: 0 0 24px rgba(255, 255, 255, 0.06);
}

/* ±1 Buttons — tinted backgrounds with colored borders */
.life-tracker-btn-minus {
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.1);
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
}
.life-tracker-btn-minus:active {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.15);
}

.life-tracker-btn-plus {
  background: rgba(34, 197, 94, 0.06);
  border: 1px solid rgba(34, 197, 94, 0.1);
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
}
.life-tracker-btn-plus:active {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.3);
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.15);
}

/* Active turn — rotating light along the border */
.life-tracker-glow-track {
  overflow: hidden;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  padding: 2px;
}

.life-tracker-glow-spinner {
  background: conic-gradient(
    from 0deg,
    transparent 0%,
    transparent 60%,
    rgba(232, 96, 10, 0.3) 67%,
    rgba(255, 180, 60, 0.7) 74%,
    rgba(255, 220, 120, 0.9) 78%,
    rgba(255, 180, 60, 0.7) 82%,
    rgba(232, 96, 10, 0.3) 89%,
    transparent 96%,
    transparent 100%
  );
  animation: glow-spin 2.5s linear infinite;
}

@keyframes glow-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Priority — rotating blue light along the border (same mask technique as active turn glow) */
.life-tracker-priority-track {
  overflow: hidden;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  padding: 2px;
}

.life-tracker-priority-spinner {
  background: conic-gradient(
    from 0deg,
    transparent 0%,
    transparent 60%,
    rgba(74, 144, 226, 0.3) 67%,
    rgba(100, 180, 255, 0.7) 74%,
    rgba(150, 210, 255, 0.9) 78%,
    rgba(100, 180, 255, 0.7) 82%,
    rgba(74, 144, 226, 0.3) 89%,
    transparent 96%,
    transparent 100%
  );
  animation: priority-spin 2.5s linear infinite;
}

@keyframes priority-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Timer zone — dark inset panel */
.life-tracker-timer-zone {
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

/* Action tooltip */
.action-tooltip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  pointer-events: none;
  z-index: 30;
}

.tooltip-pop-enter-active {
  transition: opacity 0.15s ease-out, transform 0.15s ease-out;
}
.tooltip-pop-leave-active {
  transition: opacity 0.1s ease-in, transform 0.1s ease-in;
}
.tooltip-pop-enter-from,
.tooltip-pop-leave-to {
  opacity: 0;
  transform: translateX(-50%) scale(0.85) translateY(4px);
}

/* Aggressive flash — triggered by rules engine */
@keyframes timer-aggressive-flash {
  0%, 100% { border-color: rgba(239, 68, 68, 0.3); }
  25% { border-color: rgba(239, 68, 68, 0.9); }
  50% { border-color: rgba(239, 68, 68, 0.3); }
  75% { border-color: rgba(239, 68, 68, 0.9); }
}
.timer-aggressive-flash {
  animation: timer-aggressive-flash 0.6s ease-in-out infinite;
  border: 2px solid rgba(239, 68, 68, 0.3);
}

/* Full-card life tap zones */
.life-tap-zone {
  appearance: none;
  background: transparent;
  border: none;
  outline: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.life-tap-zone:active {
  background: rgba(255, 255, 255, 0.04);
}
</style>
