<template>
  <div
    ref="panelRef"
    class="card-flip-container floating-number-container relative overflow-hidden rounded-2xl"
    :class="[
      isFlashing ? 'behavior-rule-flash' : '',
    ]"
    :data-commander-player="player.id"
    :style="{ perspective: '1200px' }"
  >
    <!-- 3D flip inner -->
    <div
      class="card-flip-inner relative h-full w-full rounded-2xl"
      :style="flipInlineStyle"
    >
      <!-- ═══════ CARD FRONT ═══════ -->
      <div class="card-face card-front flex flex-col items-center justify-between gap-0 border p-3" :class="[playerBgClass, turnBorderClass, dangerPulseClass, activeTurnBreathingClass]">
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
          <div class="life-tracker-priority-spinner absolute inset-[-75%]" />
        </div>

        <!-- Rotating border glow — active turn -->
        <div
          v-if="isCurrentTurn && isActivePlayer && !isPriorityTaken"
          class="life-tracker-glow-track pointer-events-none absolute inset-0 z-[1] rounded-2xl"
        >
          <div class="life-tracker-glow-spinner absolute inset-[-75%]" />
        </div>

        <!-- Life flash overlay -->
        <div
          v-if="flashType"
          class="pointer-events-none absolute inset-0 z-10"
          :class="flashType === 'positive' ? 'flash-positive' : 'flash-negative'"
          @animationend="flashType = null"
        />

        <!-- Full-card tap zones: left = -1, right = +1 (with swipe gesture detection)
             touchmove is intentionally non-passive: onSwipeTouchMove conditionally calls
             preventDefault() when a flip gesture is detected to prevent page scroll -->
        <div
          class="life-tap-zone absolute inset-y-0 left-0 z-[2] w-1/2"
          data-sound="none"
          @touchstart.passive="(e) => onSwipeTouchStart(e, 'left')"
          @touchmove="onSwipeTouchMove"
          @touchend="onSwipeTouchEnd"
          @touchcancel.passive="onSwipeTouchCancel"
        />
        <!-- touchmove is intentionally non-passive: onSwipeTouchMove conditionally calls
             preventDefault() when a flip gesture is detected to prevent page scroll -->
        <div
          class="life-tap-zone absolute inset-y-0 right-0 z-[2] w-1/2"
          data-sound="none"
          @touchstart.passive="(e) => onSwipeTouchStart(e, 'right')"
          @touchmove="onSwipeTouchMove"
          @touchend="onSwipeTouchEnd"
          @touchcancel.passive="onSwipeTouchCancel"
        />

        <!-- Zone: Identity — Player Name -->
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
          <div class="w-7 flex-shrink-0" aria-hidden="true" />
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

        <!-- Zone: Damage — Poison (centered) -->
        <div class="pointer-events-none relative z-[3] mt-1 flex items-center justify-center">
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
            @touchstart.passive="poisonLongPress.start"
            @touchend.passive="poisonLongPress.cancel"
            @touchcancel.passive="poisonLongPress.cancel"
          >
            <IconPoison :size="14" class="shrink-0" :class="player.poisonCounters > 0 ? 'text-poison' : 'text-white/40'" />
            <span class="text-xs" :class="player.poisonCounters > 0 ? 'text-poison font-bold' : 'text-white/50'">
              {{ player.poisonCounters }}
            </span>
          </button>
        </div>

        <!-- Commander damage — pinned to outer corner (varies with card rotation) -->
        <button
          class="pointer-events-auto absolute z-[4] flex min-h-[36px] min-w-[36px] items-center justify-center gap-0.5 rounded-lg px-1.5 py-1 btn-press"
          :style="commanderDamagePositionStyle"
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

        <!-- Zone: Status — Other counters + Actions -->
        <div class="pointer-events-none relative z-[3] mt-auto flex flex-wrap items-center justify-center gap-1.5">
          <!-- Experience (visible if > 0) -->
          <span
            v-if="player.experienceCounters > 0"
            class="flex min-h-[32px] items-center gap-0.5 rounded-lg bg-arena-blue/20 ring-1 ring-arena-blue/20 px-2 py-1"
          >
            <IconExperience :size="12" class="text-arena-blue" />
            <span class="text-xs font-bold text-arena-blue">{{ player.experienceCounters }}</span>
          </span>

          <!-- Energy (visible if > 0) -->
          <span
            v-if="player.energyCounters > 0"
            class="flex min-h-[32px] items-center gap-0.5 rounded-lg bg-arena-gold/20 ring-1 ring-arena-gold/20 px-2 py-1"
          >
            <IconEnergy :size="12" class="text-arena-gold" />
            <span class="text-xs font-bold text-arena-gold">{{ player.energyCounters }}</span>
          </span>

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

          <!-- City's Blessing indicator -->
          <span v-if="player.cityBlessing" class="flex items-center gap-1 rounded-lg bg-emerald-500/20 ring-1 ring-emerald-500/20 px-2 py-0.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" class="text-emerald-400">
              <path d="M3 21h18M5 21V7l4-4 3 3 3-3 4 4v14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="text-xs font-bold text-emerald-400">CB</span>
          </span>

          <!-- Ring level indicator -->
          <span v-if="player.ringLevel > 0" class="flex items-center gap-1 rounded-lg bg-amber-500/20 ring-1 ring-amber-500/20 px-2 py-0.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" class="text-amber-400">
              <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2.5" />
            </svg>
            <span class="text-xs font-bold text-amber-400">R{{ player.ringLevel }}</span>
          </span>

          <!-- Rad counter indicator -->
          <span v-if="player.radCounters > 0" class="flex items-center gap-1 rounded-lg bg-green-500/20 ring-1 ring-green-500/20 px-2 py-0.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" class="text-green-400">
              <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2.5" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
            <span class="text-xs font-bold text-green-400">{{ player.radCounters }}</span>
          </span>

          <!-- Commander tax -->
          <span
            v-for="(commander, commanderIndex) in player.commanders"
            :key="commander.id"
            class="flex items-center gap-0.5 rounded-lg bg-white/5 px-2 py-0.5 text-xs text-white/50"
          >
            <IconMana :size="10" />
            T{{ gameStore.getCommanderTax(player, commanderIndex) }}
          </span>

          <!-- Separator between counters and actions -->
          <div v-if="showAnyActionButton" class="h-4 w-px bg-white/10" />

          <!-- Action buttons (merged into same row) -->
          <ActionButton
            :show="showEndTurnButton"
            bg-class="bg-life-negative/10"
            tooltip-key="game.endTurn"
            tooltip-id="endTurn"
            :active-tooltip="activeTooltip"
            sound="none"
            @click="handleAdvanceTurn"
            @tooltip-show="showActionTooltip"
            @tooltip-hide="hideActionTooltip"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-life-negative drop-shadow-sm transition-transform duration-150 group-active:scale-90">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" opacity="0.3" />
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" />
              <path d="M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <path d="m12 16 4-4-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </ActionButton>

          <ActionButton
            :show="showReclaimTurnButton"
            bg-class="bg-arena-orange/15"
            tooltip-key="game.reclaimPriority"
            tooltip-id="reclaimPriority"
            :active-tooltip="activeTooltip"
            @click="handleReleasePriority"
            @tooltip-show="showActionTooltip"
            @tooltip-hide="hideActionTooltip"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-arena-orange drop-shadow-sm transition-transform duration-150 group-active:scale-90">
              <path d="M4 12a8 8 0 0 1 14-5.3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <path d="M15 3l3 3.7-4 .3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3" />
            </svg>
          </ActionButton>

          <ActionButton
            :show="showStartTurnButton"
            bg-class="bg-life-positive/15"
            tooltip-key="game.startTurn"
            tooltip-id="startTurn"
            :active-tooltip="activeTooltip"
            sound="none"
            @click="handleAdvanceTurn"
            @tooltip-show="showActionTooltip"
            @tooltip-hide="hideActionTooltip"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-life-positive drop-shadow-sm transition-transform duration-150 group-active:scale-90">
              <path d="M6 4l14 8-14 8V4z" fill="currentColor" opacity="0.3" />
              <path d="M6 4l14 8-14 8V4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
            </svg>
          </ActionButton>

          <ActionButton
            :show="showRespondButton"
            bg-class="bg-mana-blue/20"
            tooltip-key="game.respond"
            tooltip-id="respond"
            :active-tooltip="activeTooltip"
            @click="handleRespond"
            @tooltip-show="showActionTooltip"
            @tooltip-hide="hideActionTooltip"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-arena-blue drop-shadow-sm transition-transform duration-150 group-active:scale-90">
              <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor" opacity="0.25" />
              <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
            </svg>
          </ActionButton>

          <ActionButton
            :show="showReleasePriorityButton"
            bg-class="bg-arena-gold-light/15"
            tooltip-key="game.releasePriority"
            tooltip-id="releasePriority"
            :active-tooltip="activeTooltip"
            @click="handleReleasePriority"
            @tooltip-show="showActionTooltip"
            @tooltip-hide="hideActionTooltip"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-arena-gold-light drop-shadow-sm transition-transform duration-150 group-active:scale-90">
              <path d="M12 5v7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <path d="M12 12l5 5M12 12l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M5 19h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5" />
            </svg>
          </ActionButton>
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

        <!-- Game result overlay -->
        <GameResultOverlay
          :is-open="showGameResult"
          :player-id="player.id"
          :slide-from-right="gameResultSlideFromRight"
          @close="showGameResult = false"
        />
      </div>

      <!-- ═══════ CARD BACK ═══════ -->
      <div class="card-face card-back border border-white/[0.04]" :class="playerBgClass" :style="cardBackTransform">
        <PlayerTokenPanel
          :player="player"
          :player-bg-class="playerBgClass"
          @close="isFlipped = false"
          @add-commander="openCommanderPicker"
          @state-changed="emit('stateChanged')"
          @show-game-result="handleGameResultFromBack"
        />
      </div>
    </div>

    <!-- Life numpad overlay (outside flip to avoid 3D transform issues) -->
    <LifeNumpad
      :model-value="player.lifeTotal"
      :is-open="showLifeNumpad"
      @confirm="confirmLifeNumpad"
      @cancel="cancelLifeNumpad"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import gsap from 'gsap'
import type { PlayerState } from '@/types/game'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { tapFeedback, lifeFeedback, heavyFeedback, warningFeedback } from '@/services/haptics'
import { playLifeChange, playLargeLifeChange, playPoisonChange, playPlayerDeath, playMonarchCrown } from '@/services/sounds'
import { LOW_LIFE_WARNING_THRESHOLD, LARGE_LIFE_CHANGE_THRESHOLD, LONG_PRESS_DURATION_MS, FLOAT_ANIMATION_DELAY_MS } from '@/config/gameConstants'
import { prefersReducedMotion } from '@/utils/motion'
import { useAnimatedNumber } from '@/composables/useAnimatedNumber'
import { useCelebration } from '@/composables/useCelebration'
import { useFloatingNumbers } from '@/composables/useFloatingNumbers'
import { useLifeDragGesture } from '@/composables/useLifeDragGesture'
import { useCommanderDragDrop } from '@/composables/useCommanderDragDrop'
import { usePlayerTimerDisplay } from '@/composables/usePlayerTimerDisplay'
import { useTurnActions } from '@/composables/useTurnActions'
import { useLongPress } from '@/composables/useLongPress'
import { useCardSwipeGesture } from '@/composables/useCardSwipeGesture'
import LifeNumpad from './LifeNumpad.vue'
import PlayerTokenPanel from './PlayerTokenPanel.vue'
import GameResultOverlay from './GameResultOverlay.vue'
import { presentModal } from '@/composables/useControllerModal'
import IconPoison from '@/components/icons/game/IconPoison.vue'
import IconSwordSingle from '@/components/icons/game/IconSwordSingle.vue'
import IconExperience from '@/components/icons/game/IconExperience.vue'
import IconEnergy from '@/components/icons/game/IconEnergy.vue'
import IconCrown from '@/components/icons/game/IconCrown.vue'
import IconShield from '@/components/icons/game/IconShield.vue'
import IconMana from '@/components/icons/game/IconMana.vue'
import IconSkull from '@/components/icons/game/IconSkull.vue'
import CornerAccent from '@/components/icons/decorative/CornerAccent.vue'
import ActionButton from './ActionButton.vue'

const props = defineProps<{
  player: PlayerState
  isCurrentTurn: boolean
  isFlashing?: boolean
  cardRotation?: number
  innerCornerStyle?: Record<string, string>
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
const isFlipped = ref(false)
const showGameResult = ref(false)
const gameResultSlideFromRight = ref(true)
const flashType = ref<'positive' | 'negative' | null>(null)

// --- Flip axis: rotate in the swipe direction, accounting for card CSS rotation ---

/**
 * Lookup table for CSS 3D rotation axis and angle sign based on card rotation
 * and swipe direction. Replaces trig-based computation — the card only ever has
 * 4 discrete orientations (0/90/180/270°).
 *
 * Each entry maps a swipe direction to the correct CSS rotation axis/sign so the
 * card visually "follows the finger" regardless of card rotation.
 */
const FLIP_AXIS_MAP: Record<string, Record<string, { axis: 'rotateX' | 'rotateY'; sign: number }>> = {
  '0':   { up: { axis: 'rotateX', sign: 1 },  down: { axis: 'rotateX', sign: -1 }, left: { axis: 'rotateY', sign: -1 }, right: { axis: 'rotateY', sign: 1 } },
  '90':  { up: { axis: 'rotateY', sign: -1 }, down: { axis: 'rotateY', sign: 1 },  left: { axis: 'rotateX', sign: -1 }, right: { axis: 'rotateX', sign: 1 } },
  '180': { up: { axis: 'rotateX', sign: -1 }, down: { axis: 'rotateX', sign: 1 },  left: { axis: 'rotateY', sign: 1 },  right: { axis: 'rotateY', sign: -1 } },
  '270': { up: { axis: 'rotateY', sign: 1 },  down: { axis: 'rotateY', sign: -1 }, left: { axis: 'rotateX', sign: 1 },  right: { axis: 'rotateX', sign: -1 } },
}

const flipAxisAndSign = computed(() => {
  const rotation = String(props.cardRotation ?? 0)
  const direction = flipDirection.value ?? 'down'
  return FLIP_AXIS_MAP[rotation]?.[direction] ?? { axis: 'rotateX' as const, sign: -1 }
})

/**
 * Stored axis/sign from the flip that opened the card back.
 * Used for flip-back animation to avoid cross-axis CSS transition jank.
 * (e.g., flipped via UP=rotateX → flip back stays on rotateX regardless of new swipe direction)
 */
const storedFlipAxis = ref<'rotateX' | 'rotateY'>('rotateX')
const storedFlipSign = ref(-1)

/** Use computed axis when flipping forward, stored axis when card is already flipped */
const effectiveFlipAxis = computed(() => isFlipped.value ? storedFlipAxis.value : flipAxisAndSign.value.axis)
const effectiveFlipSign = computed(() => isFlipped.value ? storedFlipSign.value : flipAxisAndSign.value.sign)

const flipInlineStyle = computed(() => {
  // During active drag: use inline transform for interactive feedback
  if (isGestureActive.value && flipDragProgress.value !== (isFlipped.value ? 1 : 0)) {
    const angle = flipDragProgress.value * 180 * effectiveFlipSign.value
    return { transform: `${effectiveFlipAxis.value}(${angle}deg)`, transition: 'none' }
  }
  // When flipped (resting state): use stored axis for stability
  if (isFlipped.value) {
    const angle = 180 * storedFlipSign.value
    return { transform: `${storedFlipAxis.value}(${angle}deg)` }
  }
  return {}
})

/** Card back pre-rotation must match the flip endpoint on the same axis */
const cardBackTransform = computed(() => {
  const axis = effectiveFlipAxis.value
  const sign = effectiveFlipSign.value
  return { transform: `${axis}(${180 * sign}deg)` }
})

const { monarchCrown, playerEliminated } = useCelebration()

const { addFloat } = useFloatingNumbers({
  containerRef: () => panelRef.value,
})

const animatedLife = useAnimatedNumber(() => props.player.lifeTotal)

// --- Card swipe gesture ---

const {
  onTouchStart: onSwipeTouchStart,
  onTouchMove: onSwipeTouchMove,
  onTouchEnd: onSwipeTouchEnd,
  onTouchCancel: onSwipeTouchCancel,
  flipDragProgress,
  flipDirection,
  isGestureActive,
  cleanup: cleanupSwipeGesture,
} = useCardSwipeGesture(
  {
    onTap(side) {
      changeLifeBy(side === 'left' ? -1 : 1)
    },
    onLongPressStart(side) {
      startLifeRepeat(side === 'left' ? -1 : 1)
    },
    onLongPressEnd() {
      stopLifeRepeat()
    },
    onFlip() {
      // Store the axis/sign computed for this specific swipe direction + card rotation
      storedFlipAxis.value = flipAxisAndSign.value.axis
      storedFlipSign.value = flipAxisAndSign.value.sign
      isFlipped.value = true
    },
    onFlipBack() {
      isFlipped.value = false
    },
  },
  isFlipped,
)

// --- Composables ---

const {
  formattedTotalPlayTime, formattedRoundTime, hasActiveTurn,
  roundTimeDisplayClass, hasTimerFlashEffect,
} = usePlayerTimerDisplay({
  playerId: () => props.player.id,
  isCurrentTurn: () => props.isCurrentTurn,
})

const {
  isActivePlayer, isPriorityTaken, hasPriority,
  showMarchingBorder, turnBorderClass,
  showEndTurnButton, showStartTurnButton, showRespondButton,
  showReleasePriorityButton, showReclaimTurnButton, showAnyActionButton,
  handleAdvanceTurn, handleRespond, handleReleasePriority,
} = useTurnActions({
  playerId: () => props.player.id,
  onStateChanged: () => emit('stateChanged'),
  onTurnAdvanced: () => emit('turnAdvanced'),
})

const {
  showCommanderDamage, commanderDamageInitialAttackerId,
  onCommanderClick, onCommanderTouchStart, onCommanderTouchMove,
  onCommanderTouchEnd, onCommanderTouchCancel,
  cleanup: cleanupCommanderDrag,
} = useCommanderDragDrop({
  playerId: () => props.player.id,
  attackerIdProp: () => props.commanderDamageAttackerId,
  onDragDrop: (targetPlayerId) => emit('commanderDragDrop', targetPlayerId),
  onStateChanged: () => emit('stateChanged'),
})

// --- Controller modals (escape swipe-track stacking context) ---

/**
 * Watch showCommanderDamage from useCommanderDragDrop — it gets set to true
 * by onCommanderClick() and the attackerIdProp watcher. Present the modal
 * and immediately reset the ref so subsequent opens work.
 */
watch(showCommanderDamage, (isOpen) => {
  if (isOpen) {
    openCommanderDamage()
    showCommanderDamage.value = false
  }
})

async function openCommanderDamage() {
  const { default: CommanderDamageContent } = await import('./CommanderDamageContent.vue')
  await presentModal({
    component: CommanderDamageContent,
    componentProps: {
      targetPlayer: props.player,
      initialAttackerId: commanderDamageInitialAttackerId.value,
    },
    cssClass: 'cmdr-dialog',
    onDismiss: () => {
      emit('stateChanged')
    },
  })
}

async function openCommanderPicker() {
  const { default: CommanderPickerContent } = await import('@/components/commander-zone/CommanderPickerContent.vue')
  await presentModal({
    component: CommanderPickerContent,
    onDismiss: ({ data, role }) => {
      if (role === 'select' && data) {
        const { cardName, imageUri } = data as { cardName: string; imageUri: string }
        addCommander(cardName, imageUri)
      }
    },
  })
}

const {
  lifeDragPendingAmount, isDragging,
  onLifeTouchStart, onLifeTouchMove, onLifeTouchEnd, onLifeTouchCancel,
} = useLifeDragGesture({
  onLifeChange: (amount) => changeLifeBy(amount),
})

// --- Action tooltip (inlined) ---
type ActionTooltipKey = 'endTurn' | 'startTurn' | 'respond' | 'releasePriority' | 'reclaimPriority'
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

// --- Computed state ---

const totalCommanderDamage = computed(() =>
  Object.values(props.player.commanderDamageReceived).reduce((sum, damage) => sum + damage, 0),
)

/** Inner corner style from layout composable (grid position + rotation aware) */
const commanderDamagePositionStyle = computed(() =>
  props.innerCornerStyle ?? { bottom: '8px', right: '8px' },
)

const dangerPulseClass = computed(() => {
  if (props.player.lifeTotal <= 0) return ''
  if (props.player.lifeTotal <= LOW_LIFE_WARNING_THRESHOLD) return 'danger-pulse'
  return ''
})

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

const activeTurnBreathingClass = computed(() => {
  if (props.isCurrentTurn && !deathReason.value) return 'card-front-active-turn'
  return ''
})

// --- Watchers ---

watch(deathReason, (newValue, oldValue) => {
  if (newValue && !oldValue) {
    playerEliminated()
    playPlayerDeath()

    // Death screen shake
    if (!prefersReducedMotion.value && panelRef.value) {
      gsap.fromTo(panelRef.value,
        { x: -4 },
        { x: 4, duration: 0.05, repeat: 5, yoyo: true, ease: 'none',
          onComplete: () => { if (panelRef.value) gsap.set(panelRef.value, { x: 0 }) },
        },
      )
    }
  }
})

watch(() => props.player.isMonarch, (newValue, oldValue) => {
  if (newValue && !oldValue) {
    monarchCrown()
    playMonarchCrown()
  }
})

onUnmounted(() => {
  poisonLongPress.cancel()
  stopLifeRepeat()
  hideActionTooltip()
  cleanupCommanderDrag()
  cleanupSwipeGesture()
})

// --- Life interactions ---

function changeLifeBy(amount: number) {
  gameStore.changeLife(props.player.id, amount)
  flashType.value = amount > 0 ? 'positive' : 'negative'
  setTimeout(() => addFloat(amount, 'life'), FLOAT_ANIMATION_DELAY_MS)

  if (settingsStore.hapticFeedback) {
    const newLife = props.player.lifeTotal
    if (newLife <= 0) warningFeedback()
    else if (Math.abs(amount) >= LARGE_LIFE_CHANGE_THRESHOLD) heavyFeedback()
    else lifeFeedback()
  }

  if (Math.abs(amount) >= LARGE_LIFE_CHANGE_THRESHOLD) {
    playLargeLifeChange(amount > 0)
  } else {
    playLifeChange(amount > 0)
  }
  emit('stateChanged')
}

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
  if (lifeRepeatDelayTimer) { clearTimeout(lifeRepeatDelayTimer); lifeRepeatDelayTimer = null }
  if (lifeRepeatIntervalTimer) { clearInterval(lifeRepeatIntervalTimer); lifeRepeatIntervalTimer = null }
}

function openLifeNumpad() {
  if (isDragging()) return
  showLifeNumpad.value = true
}

function confirmLifeNumpad(newLife: number) {
  showLifeNumpad.value = false
  if (newLife !== props.player.lifeTotal) changeLifeBy(newLife - props.player.lifeTotal)
}

function cancelLifeNumpad() {
  showLifeNumpad.value = false
}

// --- Poison ---

function changePoisonBy(amount: number) {
  gameStore.changePoison(props.player.id, amount)
  if (settingsStore.hapticFeedback) tapFeedback()
  playPoisonChange()
  setTimeout(() => addFloat(amount, 'poison'), FLOAT_ANIMATION_DELAY_MS)
  emit('stateChanged')
}

const poisonLongPress = useLongPress(() => {
  changePoisonBy(-1)
  if (settingsStore.hapticFeedback) heavyFeedback()
}, LONG_PRESS_DURATION_MS)

// --- Commander (from card back) ---

function addCommander(cardName: string, imageUri: string) {
  gameStore.addPlayerCommander(props.player.id, cardName, imageUri)
}

// --- Game result (from card back) ---

function handleGameResultFromBack() {
  isFlipped.value = false
  gameResultSlideFromRight.value = true
  // Small delay so the flip-back animation plays before the overlay appears
  setTimeout(() => { showGameResult.value = true }, 300)
}

// --- Misc actions ---

function revertDeath() {
  gameStore.undoUntilPlayerAlive(props.player.id)
  if (settingsStore.hapticFeedback) heavyFeedback()
  emit('stateChanged')
}

// Suppress unused variable warning — hasPriority used indirectly via template conditions
void hasPriority
</script>

<style scoped>
/* ═══ 3D Card Flip ═══ */
.card-flip-container {
  transform-style: preserve-3d;
}

.card-flip-inner {
  transform-style: preserve-3d;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  height: 100%;
  width: 100%;
}

.card-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: inherit;
}

.card-front {
  z-index: 1;
  border-color: rgba(212, 168, 67, 0.12);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03), 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* Surface grain texture */
.card-front::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: repeating-linear-gradient(
    95deg, transparent 0px, transparent 4px,
    rgba(255, 255, 255, 0.006) 4px, rgba(255, 255, 255, 0.006) 5px
  );
  pointer-events: none;
  z-index: 0;
}

.card-back {
  /* transform set inline via cardBackTransform computed (axis matches swipe direction) */
  z-index: 0;
}

/* Player name — Beleren font */
.life-tracker-player-name {
  font-family: var(--font-beleren);
}

/* Life total — Beleren + embossed multi-layer text glow */
.life-tracker-life-total {
  font-family: var(--font-beleren);
  text-shadow:
    0 2px 0 rgba(0, 0, 0, 0.4),
    0 -1px 0 rgba(255, 255, 255, 0.08),
    0 0 32px rgba(255, 255, 255, 0.1),
    0 0 4px rgba(0, 0, 0, 0.5);
}

/* Active turn — card breathing (subtle box-shadow pulse) */
@keyframes card-breathe {
  0%, 100% { box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03), 0 2px 8px rgba(0, 0, 0, 0.3); }
  50% { box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 3px 14px rgba(0, 0, 0, 0.35), 0 0 8px rgba(232, 96, 10, 0.06); }
}
.card-front-active-turn {
  animation: card-breathe 3s ease-in-out infinite;
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
    transparent 38%,
    rgba(232, 96, 10, 0.1) 44%,
    rgba(232, 96, 10, 0.2) 50%,
    rgba(232, 96, 10, 0.35) 56%,
    rgba(255, 180, 60, 0.65) 62%,
    rgba(255, 220, 120, 1) 68%,
    rgba(255, 180, 60, 0.65) 74%,
    rgba(232, 96, 10, 0.35) 80%,
    rgba(232, 96, 10, 0.2) 86%,
    rgba(232, 96, 10, 0.1) 92%,
    transparent 97%,
    transparent 100%
  );
  animation: glow-spin 3s linear infinite;
  filter: blur(1.5px);
}

@keyframes glow-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Priority — rotating blue light along the border */
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
    transparent 45%,
    rgba(74, 144, 226, 0.15) 52%,
    rgba(74, 144, 226, 0.3) 58%,
    rgba(100, 180, 255, 0.6) 66%,
    rgba(150, 210, 255, 0.9) 72%,
    rgba(100, 180, 255, 0.6) 78%,
    rgba(74, 144, 226, 0.3) 84%,
    rgba(74, 144, 226, 0.15) 90%,
    transparent 97%,
    transparent 100%
  );
  animation: priority-spin 3s linear infinite;
  filter: blur(1px);
}

@keyframes priority-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Timer zone — dark inset panel */
.life-tracker-timer-zone {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
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

/* Behavior rule — player card flash (red glow border) */
@keyframes behavior-rule-flash {
  0%, 100% { box-shadow: inset 0 0 0 2px rgba(239, 68, 68, 0.2), 0 0 12px rgba(239, 68, 68, 0.1); }
  50% { box-shadow: inset 0 0 0 2px rgba(239, 68, 68, 0.7), 0 0 20px rgba(239, 68, 68, 0.3); }
}
.behavior-rule-flash {
  animation: behavior-rule-flash 1.2s ease-in-out infinite;
}
</style>
