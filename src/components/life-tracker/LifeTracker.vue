<template>
  <div
    ref="panelRef"
    class="card-flip-container floating-number-container relative overflow-hidden rounded-2xl"
    :class="[
      isFlashing ? 'behavior-rule-flash' : '',
    ]"
    :data-commander-player="player.id"
    :style="[{ perspective: '1200px' }, rotationStyle]"
  >
    <!-- 3D flip inner -->
    <div
      class="card-flip-inner relative h-full w-full rounded-2xl"
      :style="flipInlineStyle"
    >
      <!-- ═══════ CARD FRONT ═══════ -->
      <div class="card-face card-front flex flex-col items-center justify-between border" :class="[playerBgClass, turnBorderClass, dangerPulseClass, activeTurnBreathingClass]">
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

        <!-- Life flash overlay (one-shot animation on commit/tap) -->
        <div
          v-if="flashType"
          class="pointer-events-none absolute inset-0 z-10"
          :class="flashType === 'positive' ? 'flash-positive' : 'flash-negative'"
          @animationend="flashType = null"
        />

        <!-- Sustained flash overlay (stays visible during long press repeat) -->
        <div
          v-if="holdFlashType"
          class="pointer-events-none absolute inset-0 z-10"
          :class="holdFlashType === 'positive' ? 'hold-flash-positive' : 'hold-flash-negative'"
        />

        <!-- Full-card tap zones: left = -1, right = +1 (with swipe gesture detection)
             touchstart and touchmove are intentionally non-passive: onSwipeTouchMove
             calls preventDefault() when a flip gesture is detected to prevent page scroll -->
        <div
          class="life-tap-zone absolute inset-y-0 left-0 z-[2] w-1/2"
          data-sound="none"
          @touchstart="(e: TouchEvent) => onSwipeTouchStart(e, 'left')"
          @touchmove="onSwipeTouchMove"
          @touchend="onSwipeTouchEnd"
          @touchcancel.passive="onSwipeTouchCancel"
        />
        <!-- touchstart and touchmove are intentionally non-passive: onSwipeTouchMove
             calls preventDefault() when a flip gesture is detected to prevent page scroll -->
        <div
          class="life-tap-zone absolute inset-y-0 right-0 z-[2] w-1/2"
          data-sound="none"
          @touchstart="(e: TouchEvent) => onSwipeTouchStart(e, 'right')"
          @touchmove="onSwipeTouchMove"
          @touchend="onSwipeTouchEnd"
          @touchcancel.passive="onSwipeTouchCancel"
        />

        <!-- Zone: Identity — Player Name -->
        <div class="card-identity-zone pointer-events-none relative z-[3] flex w-full items-center">
          <div class="card-identity-spacer flex-shrink-0" aria-hidden="true" />
          <div class="flex-1 min-w-0 text-center">
            <span class="life-tracker-player-name font-bold uppercase text-arena-gold-light/80">
              {{ player.name }}
            </span>
            <span v-if="player.commanders.length > 0" class="life-tracker-commander-name block truncate text-white/50">
              {{ player.commanders.map(c => c.cardName).join(' / ') }}
            </span>
          </div>
          <div class="card-identity-spacer flex-shrink-0" aria-hidden="true" />
        </div>

        <!-- Zone: Hero — Life Total + surrounding badges
             pointer-events-none so touches pass through to tap-zones (z-[2]) for swipe.
             Only the life total and individual badges capture touches. -->
        <div
          ref="heroZoneRef"
          class="card-hero-zone pointer-events-none relative z-[3] self-stretch"
        >
          <!-- Token badges orbiting the life total (radial layout) -->
          <div class="card-badges-zone pointer-events-none absolute inset-0 z-[1]">
            <!-- Poison -->
            <button
              v-if="player.poisonCounters > 0"
              class="card-badge pointer-events-auto bg-poison/20 ring-1 ring-poison/20 btn-press"
              :style="badgeStyle('poison')"
              :aria-label="t('aria.poison', { count: player.poisonCounters })"
              data-sound="none"
              @click="openCounterStepper('poison')"
              @touchstart.stop="(e: TouchEvent) => onBadgeTouchStart(e, 'poison')"
              @contextmenu.prevent="changePoisonBy(-1)"
            >
              <IconPoison :size="12" class="shrink-0 text-poison" />
              <span class="text-poison">{{ player.poisonCounters }}</span>
            </button>

            <!-- Experience -->
            <button
              v-if="player.experienceCounters > 0"
              class="card-badge pointer-events-auto bg-arena-blue/20 ring-1 ring-arena-blue/20 btn-press"
              :style="badgeStyle('experience')"
              @click="openCounterStepper('experience')"
              @touchstart.stop="(e: TouchEvent) => onBadgeTouchStart(e, 'experience')"
            >
              <IconExperience :size="12" class="text-arena-blue" />
              <span class="text-arena-blue">{{ player.experienceCounters }}</span>
            </button>

            <!-- Energy -->
            <button
              v-if="player.energyCounters > 0"
              class="card-badge pointer-events-auto bg-arena-gold/20 ring-1 ring-arena-gold/20 btn-press"
              :style="badgeStyle('energy')"
              @click="openCounterStepper('energy')"
              @touchstart.stop="(e: TouchEvent) => onBadgeTouchStart(e, 'energy')"
            >
              <IconEnergy :size="12" class="text-arena-gold" />
              <span class="text-arena-gold">{{ player.energyCounters }}</span>
            </button>

            <!-- Monarch — draggable to another player to transfer -->
            <button
              v-if="player.isMonarch"
              class="card-badge pointer-events-auto bg-mana-gold/40 shadow-glow-gold glow-breathe btn-press"
              :style="{ ...badgeStyle('monarch'), '--glow-color': 'rgba(212, 168, 67, 0.4)' }"
              @click="openTokenPicker"
              @touchstart.stop="(e: TouchEvent) => onBadgeTouchStart(e, 'monarch')"
            >
              <IconCrown :size="14" color="#f0d078" />
            </button>

            <!-- Initiative -->
            <button
              v-if="player.hasInitiative"
              class="card-badge pointer-events-auto bg-white/10 btn-press"
              :style="badgeStyle('initiative')"
              @click="openTokenPicker"
              @touchstart.stop="(e: TouchEvent) => onBadgeTouchStart(e, 'initiative')"
            >
              <IconShield :size="14" />
            </button>

            <!-- City's Blessing -->
            <button
              v-if="player.cityBlessing"
              class="card-badge pointer-events-auto bg-emerald-500/20 ring-1 ring-emerald-500/20 btn-press"
              :style="badgeStyle('cityBlessing')"
              @click="openTokenPicker"
              @touchstart.stop="(e: TouchEvent) => onBadgeTouchStart(e, 'cityBlessing')"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" class="text-emerald-400">
                <path d="M3 21h18M5 21V7l4-4 3 3 3-3 4 4v14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>

            <!-- Ring level -->
            <button
              v-if="player.ringLevel > 0"
              class="card-badge pointer-events-auto bg-amber-500/20 ring-1 ring-amber-500/20 btn-press"
              :style="badgeStyle('ring')"
              @click="openCounterStepper('ring')"
              @touchstart.stop="(e: TouchEvent) => onBadgeTouchStart(e, 'ring')"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" class="text-amber-400">
                <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2.5" />
              </svg>
              <span class="text-amber-400">R{{ player.ringLevel }}</span>
            </button>

            <!-- Rad counter -->
            <button
              v-if="player.radCounters > 0"
              class="card-badge pointer-events-auto bg-green-500/20 ring-1 ring-green-500/20 btn-press"
              :style="badgeStyle('rad')"
              @click="openCounterStepper('rad')"
              @touchstart.stop="(e: TouchEvent) => onBadgeTouchStart(e, 'rad')"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" class="text-green-400">
                <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2.5" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
              <span class="text-green-400">{{ player.radCounters }}</span>
            </button>

            <!-- Hourglass tokens -->
            <button
              v-if="settingsStore.gameSettings.hourglassEnabled"
              class="card-badge pointer-events-auto ring-1 btn-press"
              :class="player.hourglassTokens >= settingsStore.gameSettings.hourglassLossThreshold
                ? 'bg-red-500/20 ring-red-500/20'
                : 'bg-amber-500/20 ring-amber-500/20'"
              :style="badgeStyle('hourglass')"
              @click="openCounterStepper('hourglass')"
              @touchstart.stop="(e: TouchEvent) => onBadgeTouchStart(e, 'hourglass')"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" class="shrink-0" :class="player.hourglassTokens >= settingsStore.gameSettings.hourglassLossThreshold ? 'text-red-400' : 'text-amber-400'">
                <path d="M6 2h12v6l-4 4 4 4v6H6v-6l4-4-4-4V2z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span :class="player.hourglassTokens >= settingsStore.gameSettings.hourglassLossThreshold ? 'text-red-400' : 'text-amber-400'">{{ player.hourglassTokens }}</span>
            </button>

            <!-- Commander tax -->
            <span
              v-for="(commander, commanderIndex) in player.commanders"
              :key="commander.id"
              class="card-badge bg-white/5 text-white/50"
              :style="badgeStyle(`commander-${commanderIndex}`)"
              @touchstart.stop="(e: TouchEvent) => onBadgeTouchStart(e, `commander-${commanderIndex}`)"
            >
              <IconMana :size="10" />
              T{{ gameStore.getCommanderTax(player, commanderIndex) }}
            </span>
          </div>

          <!-- Life total (centered, above badges) — captures touch for life drag -->
          <span
            class="life-tracker-life-total pointer-events-auto relative z-[2] block select-none text-center font-bold leading-none tabular-nums"
            :class="lifeColorClass"
            role="status"
            :aria-label="t('aria.lifePoints', { name: player.name, life: player.lifeTotal })"
            @click="openLifeNumpad"
            @touchstart="onLifeTouchStart"
            @touchmove="onLifeTouchMove"
            @touchend.passive="onLifeTouchEnd"
            @touchcancel.passive="onLifeTouchCancel"
          >
            {{ animatedLife }}
          </span>

          <!-- Pending life indicator (tap accumulation or drag) -->
          <span
            v-if="displayedPendingLife !== 0"
            class="life-drag-indicator absolute left-1/2 -translate-x-1/2 z-[2] font-bold drop-shadow-lg"
            :class="displayedPendingLife > 0 ? 'text-life-positive' : 'text-life-negative'"
          >
            {{ displayedPendingLife > 0 ? '+' : '' }}{{ displayedPendingLife }}
          </span>
        </div>

        <!-- Zone: Timer -->
        <div
          class="life-tracker-timer-zone pointer-events-none relative z-[3] flex items-center justify-center rounded-lg"
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
            <span class="font-mono font-bold tabular-nums" :class="hasActiveTurn ? 'text-white/50' : 'text-white/30'">{{ formattedTotalPlayTime }}</span>
          </div>

          <div class="timer-divider h-3 w-px bg-white/10" />

          <!-- Round time -->
          <div class="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="text-white/40">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
              <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span v-if="!hasActiveTurn" class="font-mono tabular-nums text-white/50">
              {{ formattedRoundTime }}
            </span>
            <span v-else class="font-mono font-semibold tabular-nums" :class="roundTimeDisplayClass">
              {{ formattedRoundTime }}
            </span>
          </div>
        </div>

        <!-- Commander damage — pinned to outer corner (varies with card rotation) -->
        <button
          class="card-commander-btn pointer-events-auto absolute z-[4] flex items-center justify-center gap-1 rounded-xl btn-press"
          :style="commanderDamagePositionStyle"
          :class="[
            totalCommanderDamage > 0 ? 'bg-commander-damage/20 ring-1 ring-commander-damage/20' : 'bg-white/5',
          ]"
          :aria-label="t('aria.commanderDamage', { damage: totalCommanderDamage })"
          @click="onCommanderClick"
          @touchstart="onCommanderTouchStart"
          @touchmove="onCommanderTouchMove"
          @touchend.passive="onCommanderTouchEnd"
          @touchcancel.passive="onCommanderTouchCancel"
        >
          <IconSwordSingle :size="14" class="shrink-0" :class="totalCommanderDamage > 0 ? 'text-commander-damage' : 'text-white/40'" />
          <span :class="totalCommanderDamage > 0 ? 'text-commander-damage font-bold' : 'text-white/50'">
            {{ totalCommanderDamage }}
          </span>
        </button>

        <!-- Zone: Actions -->
        <div v-if="showAnyActionButton" class="card-actions-zone pointer-events-none absolute bottom-2 right-2 z-[3] flex items-center gap-1">
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
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" class="text-arena-orange drop-shadow-sm transition-transform duration-150 group-active:scale-90">
              <path d="M4 12a8 8 0 0 1 14-5.3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <path d="M15 3l3 3.7-4 .3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3" />
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
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" class="text-arena-blue drop-shadow-sm transition-transform duration-150 group-active:scale-90">
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
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" class="text-arena-gold-light drop-shadow-sm transition-transform duration-150 group-active:scale-90">
              <path d="M12 5v7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <path d="M12 12l5 5M12 12l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M5 19h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5" />
            </svg>
          </ActionButton>
        </div>

        <!-- Counter stepper overlay (inline +/- for stackable tokens) -->
        <Transition name="slide-fade">
          <div
            v-if="activeCounterStepper"
            class="pointer-events-auto absolute inset-0 z-[5] flex items-center justify-center"
            @click.self="closeCounterStepper"
          >
            <div class="flex items-center rounded-full bg-surface-elevated/90 shadow-lg backdrop-blur-sm ring-1 ring-white/10">
              <button
                class="counter-stepper-btn flex items-center justify-center rounded-full text-white/80 active:bg-white/10"
                data-sound="none"
                @click="stepCounter(-1)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M5 12h14" /></svg>
              </button>

              <div class="flex items-center gap-1 px-1">
                <IconPoison v-if="activeCounterStepper === 'poison'" :size="18" class="text-poison" />
                <IconExperience v-if="activeCounterStepper === 'experience'" :size="18" class="text-arena-blue" />
                <IconEnergy v-if="activeCounterStepper === 'energy'" :size="18" class="text-arena-gold" />
                <svg v-if="activeCounterStepper === 'ring'" width="18" height="18" viewBox="0 0 24 24" fill="none" class="text-amber-400">
                  <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2.5" />
                </svg>
                <svg v-if="activeCounterStepper === 'rad'" width="18" height="18" viewBox="0 0 24 24" fill="none" class="text-green-400">
                  <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2.5" />
                  <circle cx="12" cy="12" r="3" fill="currentColor" />
                </svg>
                <span class="min-w-[1.2em] text-center text-sm font-bold tabular-nums text-white">
                  {{ counterStepperValue }}
                </span>
              </div>

              <button
                class="counter-stepper-btn flex items-center justify-center rounded-full text-white/80 active:bg-white/10"
                data-sound="none"
                @click="stepCounter(1)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
          </div>
        </Transition>

        <!-- Death confirmation overlay (awaiting user choice) -->
        <Transition name="death-overlay">
          <div
            v-if="showDeathConfirmation"
            class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm"
            role="alertdialog"
            :aria-label="deathReason"
          >
            <IconSkull :size="48" class="text-life-negative drop-shadow-lg" />
            <span class="text-lg font-bold text-life-negative drop-shadow-lg">{{ deathReason }}</span>
            <div class="mt-1 flex gap-3">
              <button
                class="flex items-center gap-1.5 rounded-full bg-life-negative/80 px-5 py-2 text-sm font-bold text-white shadow-lg transition-all active:scale-95"
                @click.stop="confirmDeath"
              >
                {{ t('game.confirmDead') }}
              </button>
              <button
                class="flex items-center gap-1.5 rounded-full bg-white/20 px-5 py-2 text-sm font-bold text-white shadow-lg transition-all active:scale-95 active:bg-white/30"
                @click.stop="confirmAlive"
              >
                {{ t('game.confirmAlive') }}
              </button>
            </div>
          </div>
        </Transition>

        <!-- Death overlay (confirmed dead) -->
        <Transition name="death-overlay">
          <div
            v-if="isConfirmedDead"
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
        <!-- Swipe zones for flipping back (same gesture as front) -->
        <div
          class="life-tap-zone absolute inset-y-0 left-0 z-[1] w-1/2"
          data-sound="none"
          @touchstart="(e: TouchEvent) => onSwipeTouchStart(e, 'left')"
          @touchmove="onSwipeTouchMove"
          @touchend="onSwipeTouchEnd"
          @touchcancel.passive="onSwipeTouchCancel"
        />
        <div
          class="life-tap-zone absolute inset-y-0 right-0 z-[1] w-1/2"
          data-sound="none"
          @touchstart="(e: TouchEvent) => onSwipeTouchStart(e, 'right')"
          @touchmove="onSwipeTouchMove"
          @touchend="onSwipeTouchEnd"
          @touchcancel.passive="onSwipeTouchCancel"
        />

        <PlayerTokenPanel
          class="relative z-[2]"
          :player="player"
          :player-bg-class="playerBgClass"
          @close="isFlipped = false"
          @add-commander="openCommanderPicker"
          @state-changed="emit('stateChanged')"
          @show-game-result="handleGameResultFromBack"
          @open-token-picker="openTokenPicker"
          @touchstart="(e: TouchEvent) => onSwipeTouchStart(e, 'left')"
          @touchmove="onSwipeTouchMove"
          @touchend="onSwipeTouchEnd"
          @touchcancel.passive="onSwipeTouchCancel"
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

    <!-- Floating token picker (outside flip to avoid 3D transform issues) -->
    <TokenPickerSheet
      :is-open="showTokenPicker"
      :player="player"
      :content-rotation="cardRotation"
      @close="closeTokenPicker"
    />

    <!-- Floating commander damage sheet -->
    <CommanderDamageSheet
      :is-open="showCommanderDamage"
      :source-player="player"
      :initial-target-id="commanderDamageInitialTargetId"
      :content-rotation="cardRotation"
      @close="onCommanderDamageClose"
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
import { tapFeedback, lifeFeedback, heavyFeedback } from '@/services/haptics'
import { playLifeChange, playPoisonChange, playPlayerDeath, playMonarchCrown } from '@/services/sounds'
import { LOW_LIFE_WARNING_THRESHOLD, LONG_PRESS_DURATION_MS, FLOAT_ANIMATION_DELAY_MS } from '@/config/gameConstants'
import { prefersReducedMotion } from '@/utils/motion'
import { useAnimatedNumber } from '@/composables/useAnimatedNumber'
import { useCelebration } from '@/composables/useCelebration'
import { useFloatingNumbers } from '@/composables/useFloatingNumbers'
import { useLifeDragGesture } from '@/composables/useLifeDragGesture'
import { useCommanderDragDrop } from '@/composables/useCommanderDragDrop'
import { useBadgeDrag } from '@/composables/useBadgeDrag'
import { usePlayerTimerDisplay } from '@/composables/usePlayerTimerDisplay'
import { useTurnActions } from '@/composables/useTurnActions'
import { useLongPress } from '@/composables/useLongPress'
import { useCardSwipeGesture } from '@/composables/useCardSwipeGesture'
import { useCardRotationContext } from '@/composables/useCardRotationContext'
import { useDamageShake } from '@/composables/useDamageShake'
import { useLifeFeedback, type LifeChangeSource } from '@/composables/useLifeFeedback'
import LifeNumpad from './LifeNumpad.vue'
import PlayerTokenPanel from './PlayerTokenPanel.vue'
import GameResultOverlay from './GameResultOverlay.vue'
import TokenPickerSheet from './TokenPickerSheet.vue'
import CommanderDamageSheet from './CommanderDamageSheet.vue'
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
  commanderDamageTargetId?: string | null
}>()

const emit = defineEmits<{
  stateChanged: []
  turnAdvanced: []
  commanderDragDrop: [targetPlayerId: string]
}>()

const { t } = useI18n()
const gameStore = useGameStore()
const settingsStore = useSettingsStore()

const { cardRotation, cardRotationStyle: rotationStyle, innerCornerStyle } = useCardRotationContext(() => props.player.id)

const panelRef = ref<HTMLElement>()
const heroZoneRef = ref<HTMLElement>()
const { triggerDamageShake } = useDamageShake({ containerRef: () => panelRef.value })
const showLifeNumpad = ref(false)
const showTokenPicker = ref(false)
const isFlipped = ref(false)
const showGameResult = ref(false)
const gameResultSlideFromRight = ref(true)
const flashType = ref<'positive' | 'negative' | null>(null)
const holdFlashType = ref<'positive' | 'negative' | null>(null)

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
  const rotation = String(cardRotation.value)
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

const { setSource: setLifeFeedbackSource } = useLifeFeedback({
  playerId: () => props.player.id,
  getLifeTotal: () => props.player.lifeTotal,
  triggerDamageShake,
  setFlashType: (type) => { flashType.value = type },
  addFloat,
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
      if (!isFlipped.value) accumulateTap(side === 'left' ? -1 : 1)
    },
    onLongPressStart(side) {
      if (!isFlipped.value) startLifeRepeat(side === 'left' ? -1 : 1)
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
  isActivePlayer, isPriorityTaken,
  showMarchingBorder, turnBorderClass,
  showRespondButton, showReleasePriorityButton, showReclaimTurnButton, showAnyActionButton,
  handleRespond, handleReleasePriority,
} = useTurnActions({
  playerId: () => props.player.id,
  onStateChanged: () => emit('stateChanged'),
  onTurnAdvanced: () => emit('turnAdvanced'),
})

const {
  showCommanderDamage, commanderDamageInitialTargetId,
  onCommanderClick, onCommanderTouchStart, onCommanderTouchMove,
  onCommanderTouchEnd, onCommanderTouchCancel,
  onCommanderDamageClose,
  cleanup: cleanupCommanderDrag,
} = useCommanderDragDrop({
  playerId: () => props.player.id,
  targetIdProp: () => props.commanderDamageTargetId,
  onDragDrop: (targetPlayerId) => emit('commanderDragDrop', targetPlayerId),
  onStateChanged: () => emit('stateChanged'),
})

const {
  onBadgeTouchStart, draggedBadgeKey, dragOffset,
  cleanup: cleanupBadgeDrag,
} = useBadgeDrag({
  playerId: () => props.player.id,
  cardElement: () => heroZoneRef.value,
  cardRotation: () => cardRotation.value,
  onReposition: (badgeKey, left, top) => {
    gameStore.setBadgePosition(props.player.id, badgeKey, left, top)
    emit('stateChanged')
  },
  onTransfer: (badgeKey, targetPlayerId) => {
    if (badgeKey === 'monarch') {
      gameStore.toggleMonarch(targetPlayerId)
    }
    emit('stateChanged')
  },
})

function openTokenPicker() {
  showTokenPicker.value = true
}

function closeTokenPicker() {
  showTokenPicker.value = false
  isFlipped.value = false
  emit('stateChanged')
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
  cardRotation: () => cardRotation.value,
})

// --- Action tooltip (inlined) ---
type ActionTooltipKey = 'reclaimPriority' | 'respond' | 'releasePriority'
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

/** Inner corner style — derived internally from card rotation context */
const commanderDamagePositionStyle = innerCornerStyle

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

// --- Radial badge positioning ---

const visibleBadgeKeys = computed(() => {
  const keys: string[] = []
  if (props.player.poisonCounters > 0) keys.push('poison')
  if (props.player.experienceCounters > 0) keys.push('experience')
  if (props.player.energyCounters > 0) keys.push('energy')
  if (props.player.isMonarch) keys.push('monarch')
  if (props.player.hasInitiative) keys.push('initiative')
  if (props.player.cityBlessing) keys.push('cityBlessing')
  if (props.player.ringLevel > 0) keys.push('ring')
  if (props.player.radCounters > 0) keys.push('rad')
  if (settingsStore.gameSettings.hourglassEnabled) keys.push('hourglass')
  props.player.commanders.forEach((_, commanderIndex) => keys.push(`commander-${commanderIndex}`))
  return keys
})

/** Position a badge on an ellipse around the life total center */
function badgeRadialStyle(badgeKey: string): Record<string, string> {
  // Use stored custom position if available
  const storedPosition = props.player.badgePositions?.[badgeKey]
  if (storedPosition) {
    return {
      position: 'absolute',
      left: `${storedPosition.left}%`,
      top: `${storedPosition.top}%`,
      transform: 'translate(-50%, -50%)',
    }
  }

  const keys = visibleBadgeKeys.value
  const index = keys.indexOf(badgeKey)
  if (index === -1) return { display: 'none' }

  const total = keys.length
  // Start at top for 3+, right for 2, bottom for 1
  const startAngleDeg = total === 1 ? 90 : total === 2 ? 0 : -90
  const angleStepDeg = 360 / total
  const angleDeg = startAngleDeg + index * angleStepDeg
  const angleRad = angleDeg * Math.PI / 180

  const radiusX = 38
  const radiusY = 34
  const positionLeft = 50 + radiusX * Math.cos(angleRad)
  const positionTop = 50 + radiusY * Math.sin(angleRad)

  return {
    position: 'absolute',
    left: `${positionLeft}%`,
    top: `${positionTop}%`,
    transform: 'translate(-50%, -50%)',
  }
}

/** Apply drag offset to badge during active drag, otherwise use radial/stored position */
function badgeStyle(badgeKey: string): Record<string, string> {
  const baseStyle = badgeRadialStyle(badgeKey)
  if (draggedBadgeKey.value === badgeKey) {
    return {
      ...baseStyle,
      transform: `translate(calc(-50% + ${dragOffset.value.x}px), calc(-50% + ${dragOffset.value.y}px))`,
      zIndex: '10',
      transition: 'none',
    }
  }
  return baseStyle
}

const deathReason = computed(() => {
  if (props.player.lifeTotal <= 0) return t('game.deathLife')
  if (gameStore.isPlayerDeadByPoison(props.player)) return t('game.deathPoison')
  if (gameStore.isPlayerDeadByCommanderDamage(props.player)) return t('game.deathCommander')
  return null
})

// Death confirmation state: 'pending' = awaiting user choice, 'dead' = confirmed dead, 'alive' = dismissed as alive
const deathConfirmationState = ref<'pending' | 'dead' | 'alive' | null>(null)

const showDeathConfirmation = computed(() => deathConfirmationState.value === 'pending')
const isConfirmedDead = computed(() => deathConfirmationState.value === 'dead')

const activeTurnBreathingClass = computed(() => {
  if (props.isCurrentTurn && !deathReason.value) return 'card-front-active-turn'
  return ''
})

// --- Watchers ---

watch(deathReason, (newValue, oldValue) => {
  if (newValue && !oldValue) {
    // Death conditions newly met — show confirmation, don't auto-eliminate
    deathConfirmationState.value = 'pending'
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
  } else if (newValue && oldValue && newValue !== oldValue && deathConfirmationState.value === 'alive') {
    // A different death condition appeared after dismissal — re-prompt
    deathConfirmationState.value = 'pending'
  } else if (!newValue) {
    // Death conditions resolved (e.g., undo, life gain)
    deathConfirmationState.value = null
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
  if (tapCommitTimer) { clearTimeout(tapCommitTimer); commitTap() }
  if (gameResultTimeout) { clearTimeout(gameResultTimeout); gameResultTimeout = null }
  hideActionTooltip()
  closeCounterStepper()
  cleanupCommanderDrag()
  cleanupBadgeDrag()
  cleanupSwipeGesture()
})

// --- Tap accumulation (batch rapid taps into a single life change) ---
const TAP_COMMIT_DELAY_MS = 600
const tapPendingAmount = ref(0)
let tapCommitTimer: ReturnType<typeof setTimeout> | null = null

function accumulateTap(delta: number) {
  tapPendingAmount.value += delta
  if (tapCommitTimer) clearTimeout(tapCommitTimer)
  tapCommitTimer = setTimeout(commitTap, TAP_COMMIT_DELAY_MS)

  // Feedback per tap (sound + haptic) but no life change yet
  if (settingsStore.hapticFeedback) lifeFeedback()
  playLifeChange(delta > 0)
}

function commitTap() {
  if (tapPendingAmount.value === 0) return
  changeLifeBy(tapPendingAmount.value, 'commit')
  tapPendingAmount.value = 0
  tapCommitTimer = null
}

/** Unified pending amount shown in the indicator (tap or drag, never both at once) */
const displayedPendingLife = computed(() =>
  lifeDragPendingAmount.value !== 0 ? lifeDragPendingAmount.value : tapPendingAmount.value,
)

// --- Life interactions ---

function changeLifeBy(amount: number, source: LifeChangeSource = 'direct') {
  setLifeFeedbackSource(source)
  gameStore.changeLife(props.player.id, amount)
  emit('stateChanged')
}

const LIFE_REPEAT_DELAY_MS = 400
const LIFE_REPEAT_INTERVAL_MS = 100
let lifeRepeatDelayTimer: ReturnType<typeof setTimeout> | null = null
let lifeRepeatIntervalTimer: ReturnType<typeof setInterval> | null = null

function startLifeRepeat(amount: number) {
  stopLifeRepeat()
  lifeRepeatDelayTimer = setTimeout(() => {
    holdFlashType.value = amount > 0 ? 'positive' : 'negative'
    accumulateTap(amount)
    lifeRepeatIntervalTimer = setInterval(() => accumulateTap(amount), LIFE_REPEAT_INTERVAL_MS)
  }, LIFE_REPEAT_DELAY_MS)
}

function stopLifeRepeat() {
  if (lifeRepeatDelayTimer) { clearTimeout(lifeRepeatDelayTimer); lifeRepeatDelayTimer = null }
  if (lifeRepeatIntervalTimer) { clearInterval(lifeRepeatIntervalTimer); lifeRepeatIntervalTimer = null }
  holdFlashType.value = null
  // Commit accumulated amount immediately on finger release
  if (tapCommitTimer) clearTimeout(tapCommitTimer)
  commitTap()
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

// --- Counter stepper (inline +/- overlay for stackable tokens) ---

const STEPPER_AUTO_DISMISS_MS = 3000
const activeCounterStepper = ref<string | null>(null)
let stepperDismissTimer: ReturnType<typeof setTimeout> | null = null

function openCounterStepper(badgeKey: string) {
  activeCounterStepper.value = badgeKey
  resetStepperDismissTimer()
}

function closeCounterStepper() {
  activeCounterStepper.value = null
  if (stepperDismissTimer) { clearTimeout(stepperDismissTimer); stepperDismissTimer = null }
}

function resetStepperDismissTimer() {
  if (stepperDismissTimer) clearTimeout(stepperDismissTimer)
  stepperDismissTimer = setTimeout(closeCounterStepper, STEPPER_AUTO_DISMISS_MS)
}

const counterStepperValue = computed(() => {
  switch (activeCounterStepper.value) {
    case 'poison': return props.player.poisonCounters
    case 'experience': return props.player.experienceCounters
    case 'energy': return props.player.energyCounters
    case 'ring': return props.player.ringLevel
    case 'rad': return props.player.radCounters
    case 'hourglass': return props.player.hourglassTokens
    default: return 0
  }
})

function stepCounter(amount: number) {
  const key = activeCounterStepper.value
  if (!key) return

  switch (key) {
    case 'poison':
      gameStore.changePoison(props.player.id, amount)
      playPoisonChange()
      setTimeout(() => addFloat(amount, 'poison'), FLOAT_ANIMATION_DELAY_MS)
      break
    case 'experience':
      gameStore.changeExperience(props.player.id, amount)
      break
    case 'energy':
      gameStore.changeEnergy(props.player.id, amount)
      break
    case 'ring':
      gameStore.setRingLevel(props.player.id, props.player.ringLevel + amount)
      break
    case 'rad':
      gameStore.changeRadCounters(props.player.id, amount)
      break
    case 'hourglass':
      gameStore.changeHourglassTokens(props.player.id, amount)
      break
  }

  if (settingsStore.hapticFeedback) tapFeedback()
  emit('stateChanged')
  resetStepperDismissTimer()

  // Auto-close when counter drops to 0 (badge disappears)
  if (counterStepperValue.value <= 0) closeCounterStepper()
}

// --- Commander (from card back) ---

function addCommander(cardName: string, imageUri: string) {
  gameStore.addPlayerCommander(props.player.id, cardName, imageUri)
}

// --- Game result (from card back) ---

let gameResultTimeout: ReturnType<typeof setTimeout> | null = null

function handleGameResultFromBack() {
  isFlipped.value = false
  gameResultSlideFromRight.value = true
  // Clear any pending timeout from a previous rapid invocation
  if (gameResultTimeout) clearTimeout(gameResultTimeout)
  // Small delay so the flip-back animation plays before the overlay appears
  gameResultTimeout = setTimeout(() => {
    showGameResult.value = true
    gameResultTimeout = null
  }, 300)
}

// --- Misc actions ---

function confirmDeath() {
  deathConfirmationState.value = 'dead'
  playerEliminated()
  gameStore.declareGameResult(props.player.id, 'eliminated')
  if (settingsStore.hapticFeedback) heavyFeedback()
}

function confirmAlive() {
  deathConfirmationState.value = 'alive'
}

function revertDeath() {
  gameStore.undoUntilPlayerAlive(props.player.id)
  if (settingsStore.hapticFeedback) heavyFeedback()
  emit('stateChanged')
}

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

/* ═══════════════════════════════════════════════════════════════
   CONTAINER QUERY ADAPTIVE SIZING
   The card becomes a CSS container so all children scale
   fluidly with the card's actual dimensions.
   cqmin = 1% of the smaller dimension (width or height)
   cqw/cqh = 1% of container width/height
   ═══════════════════════════════════════════════════════════════ */

.card-flip-container {
  container-type: size;
  container-name: card;
}

/* ── Fluid card shell ── */
.card-front {
  padding: clamp(4px, 2.5cqmin, 12px);
  gap: clamp(2px, 1cqh, 8px);
}

/* ── Identity zone (player name + commander) ── */
.card-identity-zone {
  min-height: clamp(20px, 9cqmin, 44px);
}

.card-identity-spacer {
  width: clamp(12px, 5cqw, 28px);
}

.life-tracker-player-name {
  font-size: clamp(0.55rem, 3cqmin, 0.85rem);
  letter-spacing: clamp(0.04em, 0.4cqmin, 0.15em);
}

.life-tracker-commander-name {
  font-size: clamp(7px, 2.2cqmin, 10px);
}

/* ── Hero zone (life total) — absorbs extra vertical space ── */
.card-hero-zone {
  flex: 1 1 0%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.life-tracker-life-total {
  font-size: clamp(2rem, min(24cqw, 18cqh), 6rem);
}

.life-drag-indicator {
  font-size: clamp(0.75rem, 4cqmin, 1.125rem);
  top: clamp(-16px, -4cqmin, -10px);
}

/* ── Timer zone ── */
.life-tracker-timer-zone {
  font-size: clamp(1.5rem, 7cqmin, 2rem);
  gap: clamp(8px, 3cqmin, 24px);
  padding: clamp(4px, 1.4cqmin, 12px) clamp(8px, 3cqmin, 24px);
}

.life-tracker-timer-zone svg {
  width: clamp(20px, 8cqmin, 32px);
  height: clamp(20px, 8cqmin, 32px);
}

/* ── Commander damage — absolute positioned ── */
.card-commander-btn {
  min-height: clamp(50px, 18cqmin, 80px);
  min-width: clamp(50px, 18cqmin, 80px);
  padding: clamp(6px, 1.6cqmin, 12px) clamp(8px, 2.4cqmin, 16px);
  font-size: clamp(0.85rem, 5cqmin, 1.4rem);
}

.card-commander-btn :deep(svg) {
  width: clamp(20px, 7cqmin, 32px);
  height: clamp(20px, 7cqmin, 32px);
}

/* ── Token badges — radial orbit around the life total ── */
.card-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: clamp(4px, 1cqmin, 8px) clamp(8px, 2.4cqmin, 14px);
  border-radius: 12px;
  font-size: clamp(0.75rem, 4cqmin, 1.2rem);
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.card-badge :deep(svg) {
  width: clamp(16px, 5cqmin, 24px);
  height: clamp(16px, 5cqmin, 24px);
}

/* ── Counter stepper (inline +/- overlay) ── */
.counter-stepper-btn {
  width: clamp(28px, 9cqmin, 40px);
  height: clamp(28px, 9cqmin, 40px);
}

/* ── Action buttons ── */
.card-actions-zone {
  gap: clamp(3px, 1cqmin, 6px);
}

.card-actions-zone :deep(button) {
  min-height: clamp(28px, 9cqmin, 40px);
  min-width: clamp(28px, 9cqmin, 40px);
}

.card-actions-zone :deep(button svg) {
  width: clamp(12px, 3.5cqmin, 16px);
  height: clamp(12px, 3.5cqmin, 16px);
}

/* ── Death overlay — fluid icon ── */
.card-front > [role="alert"] :deep(svg),
.card-front > [role="alertdialog"] :deep(svg) {
  width: clamp(28px, 10cqmin, 48px);
  height: clamp(28px, 10cqmin, 48px);
}

.card-front > [role="alert"] > span,
.card-front > [role="alertdialog"] > span {
  font-size: clamp(0.8rem, 4cqmin, 1.125rem);
}

/* ═══════════════════════════════════════════════════════════════
   HEIGHT BREAKPOINTS — discrete layout changes
   Timer is ALWAYS visible (user's primary element).
   ═══════════════════════════════════════════════════════════════ */

/* COMPACT: card under 200px — hide timer icons, keep numbers */
@container card (max-height: 200px) {
  .life-tracker-timer-zone svg {
    display: none;
  }

  .timer-divider {
    display: none;
  }
}

/* MICRO: card under 160px tall — hide badges, max density */
@container card (max-height: 160px) {
  .card-badges-zone {
    display: none !important;
  }

  .card-identity-zone {
    min-height: 16px;
  }
}
</style>
