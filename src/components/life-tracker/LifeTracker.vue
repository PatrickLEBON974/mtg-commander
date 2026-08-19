<template>
  <div
    ref="panelRef"
    class="card-flip-container floating-number-container relative overflow-hidden rounded-2xl"
    :class="[
      isFlashing ? 'behavior-rule-flash' : '',
    ]"
    :data-commander-player="player.id"
    :data-card-face="isFlipped ? 'back' : 'front'"
    :style="[{ perspective: '1200px' }, rotationStyle]"
  >
    <!-- 3D flip inner -->
    <div
      class="card-flip-inner relative h-full w-full rounded-2xl"
      :style="flipInlineStyle"
    >
      <!-- ═══════ CARD FRONT ═══════ -->
      <div
        class="card-face card-front flex flex-col items-center justify-between border"
        :class="[
          playerBgClass,
          turnBorderClass,
          dangerPulseClass,
          activeTurnBreathingClass,
          { 'card-face--active': !isFlipped },
        ]"
        :aria-hidden="isFlipped"
        :inert="isFlipped"
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
          <div class="card-identity-spacer pointer-events-auto flex flex-shrink-0 justify-end">
            <button
              class="card-flip-trigger"
              type="button"
              :aria-label="t('cardBack.open', { name: player.name })"
              data-sound="none"
              @click.stop="flipToBack"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M7.2 7.4A7 7 0 0 1 19 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                <path d="m17 9 2 3 2-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M16.8 16.6A7 7 0 0 1 5 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                <path d="m7 15-2-3-2 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
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
              v-if="settingsStore.gameSettings.hourglassEnabled && !gameStore.currentGame?.chessClock"
              class="card-badge pointer-events-auto ring-1 btn-press"
              :class="[
                player.hourglassTokens >= settingsStore.gameSettings.hourglassLossThreshold
                  ? 'bg-red-500/20 ring-red-500/20'
                  : 'bg-amber-500/20 ring-amber-500/20',
                hourglassAnimating ? 'hourglass-pulse' : '',
              ]"
              :style="badgeStyle('hourglass')"
              @click="openCounterStepper('hourglass')"
              @touchstart.stop="(e: TouchEvent) => onBadgeTouchStart(e, 'hourglass')"
              @animationend="hourglassAnimating = false"
            >
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none"
                class="shrink-0"
                :class="[
                  player.hourglassTokens >= settingsStore.gameSettings.hourglassLossThreshold ? 'text-red-400' : 'text-amber-400',
                  hourglassAnimating ? 'hourglass-flip' : '',
                ]"
              >
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
            tabindex="0"
            :aria-label="t('aria.lifePoints', { name: player.name, life: player.lifeTotal })"
            :aria-keyshortcuts="'Enter'"
            :title="t('aria.editLife', { name: player.name })"
            @click="openLifeNumpad"
            @keydown.enter.space.prevent="openLifeNumpad"
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
            isChessClockMode ? 'life-tracker-timer-zone--chess' : '',
            isGlobalOvertime ? 'life-tracker-timer-zone--overtime' : '',
          ]"
          :style="chessClockProgressStyle"
          role="timer"
          :aria-label="timerZoneAriaLabel"
        >
          <!-- Aggregate player time / remaining chess budget -->
          <div class="relative flex items-center gap-1">
            <span v-if="isChessClockMode && isClockOwner" class="chess-clock-live-dot" aria-hidden="true" />
            <svg v-if="isChessClockMode" width="12" height="12" viewBox="0 0 24 24" fill="none" class="text-arena-gold-light/70">
              <path d="M7 3h10M7 21h10M8 3c0 4 1.2 6.3 4 9-2.8 2.7-4 5-4 9M16 3c0 4-1.2 6.3-4 9 2.8 2.7 4 5 4 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" class="text-white/50">
              <circle cx="12" cy="13" r="9" stroke="currentColor" stroke-width="2.5" />
              <path d="M12 9v4l2.5 2.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M9 2h6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
            </svg>
            <span class="font-mono font-bold tabular-nums" :class="globalTimeDisplayClass">{{ formattedTotalPlayTime }}</span>
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

          <span v-if="isChessClockMode" class="chess-budget-track" aria-hidden="true">
            <span class="chess-budget-track__fill" />
          </span>
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
      <div
        class="card-face card-back border border-white/[0.04]"
        :class="[playerBgClass, { 'card-face--active': isFlipped }]"
        :style="cardBackTransform"
        :aria-hidden="!isFlipped"
        :inert="!isFlipped"
      >
        <!-- Swipe zones for flipping back (same pattern as front face) -->
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

        <PlayerCardBack
          class="relative z-[2]"
          :player="player"
          @close="flipToFront"
          @add-commander="openCommanderPicker"
          @state-changed="emit('stateChanged')"
          @show-game-result="handleGameResultFromBack"
          @open-token-picker="openTokenPicker"
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
import type { PlayerState } from '@/types/game'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { tapFeedback, lifeFeedback, heavyFeedback } from '@/services/haptics'
import { playLifeChange, playPoisonChange, playPlayerDeath, playMonarchCrown } from '@/services/sounds'
import { LOW_LIFE_WARNING_THRESHOLD, LONG_PRESS_DURATION_MS, FLOAT_ANIMATION_DELAY_MS } from '@/config/gameConstants'
import { useAnimatedNumber } from '@/composables/useAnimatedNumber'
import { useFloatingNumbers } from '@/composables/useFloatingNumbers'
import { useLifeDragGesture } from '@/composables/useLifeDragGesture'
import { useCommanderDragDrop } from '@/composables/useCommanderDragDrop'
import { useBadgeDrag } from '@/composables/useBadgeDrag'
import { usePlayerTimerDisplay } from '@/composables/usePlayerTimerDisplay'
import { useTurnActions } from '@/composables/useTurnActions'
import { useLongPress } from '@/composables/useLongPress'
import { useCardSwipeGesture } from '@/composables/useCardSwipeGesture'
import { useCardFlip3D } from '@/composables/useCardFlip3D'
import { useCardRotationContext } from '@/composables/useCardRotationContext'
import { useDamageShake } from '@/composables/useDamageShake'
import { useLifeFeedback, type LifeChangeSource } from '@/composables/useLifeFeedback'
import LifeNumpad from './LifeNumpad.vue'
import PlayerCardBack from './PlayerCardBack.vue'
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
const hourglassAnimating = ref(false)


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
      if (!isFlipped.value) {
        // Forward flip: store the axis/sign for this swipe direction + card rotation
        commitFlipAxis()
      }
      isFlipped.value = !isFlipped.value
      if (settingsStore.hapticFeedback) tapFeedback()
    },
  },
)

// --- 3D flip styling (axis/sign per card rotation × swipe direction) ---

const { flipInlineStyle, cardBackTransform, commitFlipAxis } = useCardFlip3D({
  cardRotation: () => cardRotation.value,
  isFlipped,
  isGestureActive,
  flipDragProgress,
  flipDirection,
})

/** Explicit control for users who prefer a button to the directional swipe. */
function flipToBack() {
  if (isFlipped.value) return
  flipDirection.value = 'down'
  commitFlipAxis()
  isFlipped.value = true
  if (settingsStore.hapticFeedback) tapFeedback()
}

function flipToFront() {
  if (!isFlipped.value) return
  isFlipped.value = false
  if (settingsStore.hapticFeedback) tapFeedback()
}

// --- Composables ---

const {
  formattedTotalPlayTime, formattedRoundTime, hasActiveTurn,
  isChessClockMode, isClockOwner, isGlobalOvertime,
  globalTimeDisplayClass, globalBudgetRemainingRatio,
  roundTimeDisplayClass, hasTimerFlashEffect,
} = usePlayerTimerDisplay({
  playerId: () => props.player.id,
  isCurrentTurn: () => props.isCurrentTurn,
})

const chessClockProgressStyle = computed(() => isChessClockMode.value
  ? { '--chess-clock-progress': `${globalBudgetRemainingRatio.value * 100}%` }
  : undefined,
)

const timerZoneAriaLabel = computed(() => isChessClockMode.value
  ? t('game.chessPlayerClockAria', {
      name: props.player.name,
      budget: formattedTotalPlayTime.value,
      turn: formattedRoundTime.value,
    })
  : t('game.playerClockAria', {
      name: props.player.name,
      total: formattedTotalPlayTime.value,
      turn: formattedRoundTime.value,
    }),
)

const {
  isActivePlayer, isPriorityTaken,
  showMarchingBorder, turnBorderClass,
  showRespondButton, showReleasePriorityButton, showReclaimTurnButton, showAnyActionButton,
  handleRespond, handleReleasePriority,
} = useTurnActions({
  playerId: () => props.player.id,
  onStateChanged: () => emit('stateChanged'),
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
const ACTION_TOOLTIP_KEYS: readonly ActionTooltipKey[] = ['reclaimPriority', 'respond', 'releasePriority']
const activeTooltip = ref<ActionTooltipKey | null>(null)
let tooltipTimer: ReturnType<typeof setTimeout> | null = null

// `key` arrives as the ActionButton tooltip-id (a string emit); guard against the known set.
function showActionTooltip(key: string) {
  if (!ACTION_TOOLTIP_KEYS.includes(key as ActionTooltipKey)) return
  const tooltipKey = key as ActionTooltipKey
  tooltipTimer = setTimeout(() => {
    activeTooltip.value = tooltipKey
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
  if (settingsStore.gameSettings.hourglassEnabled && !gameStore.currentGame?.chessClock) keys.push('hourglass')
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
  return undefined
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

    // Death screen shake — heaviest tier (organic decay, reduced-motion aware)
    triggerDamageShake(15)
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
    playMonarchCrown()
  }
})

watch(() => props.player.hourglassTokens, (newValue, oldValue) => {
  if (newValue > oldValue) {
    hourglassAnimating.value = true
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
  transform-origin: center center;
  will-change: transform;
  height: 100%;
  width: 100%;
}

.card-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: inherit;
  pointer-events: none;
  transform-style: preserve-3d;
}

.card-face--active {
  pointer-events: auto;
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

.card-flip-trigger {
  position: relative;
  display: grid;
  width: clamp(22px, 7cqmin, 30px);
  height: clamp(22px, 7cqmin, 30px);
  place-items: center;
  border: 1px solid rgba(214, 176, 94, 0.2);
  border-radius: 999px;
  color: rgba(239, 210, 145, 0.72);
  background: linear-gradient(145deg, rgba(214, 176, 94, 0.13), rgba(7, 10, 15, 0.38));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 2px 7px rgba(0, 0, 0, 0.24);
  -webkit-tap-highlight-color: transparent;
  transition: transform 140ms ease, color 140ms ease, border-color 140ms ease;
}

.card-flip-trigger::after {
  content: '';
  position: absolute;
  width: 44px;
  height: 44px;
}

.card-flip-trigger svg {
  width: 60%;
  height: 60%;
}

.card-flip-trigger:active {
  color: #ffe7ad;
  border-color: rgba(240, 202, 119, 0.46);
  transform: scale(0.9) rotate(14deg);
}

.card-flip-trigger:focus-visible {
  outline: 2px solid rgba(110, 202, 194, 0.9);
  outline-offset: 2px;
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

/* Active turn — card breathing.
   The breathe shadow is painted ONCE on an ::after overlay and only its
   opacity animates (GPU-composited) — animating box-shadow directly would
   repaint the card every frame for the whole game. */
@keyframes overlay-breathe {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}
.card-front-active-turn::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 3px 14px rgba(0, 0, 0, 0.35), 0 0 8px rgba(232, 96, 10, 0.06);
  opacity: 0;
  animation: overlay-breathe 3s ease-in-out infinite;
  will-change: opacity;
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
  width: 100%;
  min-width: 0;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

.life-tracker-timer-zone > div {
  min-width: 0;
}

.life-tracker-timer-zone span {
  white-space: nowrap;
}

.life-tracker-timer-zone--chess {
  border-color: rgba(203, 170, 99, 0.2);
  background:
    linear-gradient(90deg, rgba(203, 170, 99, 0.08), transparent 45%),
    rgba(0, 0, 0, 0.32);
}

.life-tracker-timer-zone--overtime {
  border-color: rgba(239, 68, 68, 0.42);
  background:
    linear-gradient(90deg, rgba(239, 68, 68, 0.14), transparent 55%),
    rgba(0, 0, 0, 0.34);
}

.chess-budget-track {
  position: absolute;
  right: 4px;
  bottom: 2px;
  left: 4px;
  height: 2px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.chess-budget-track__fill {
  display: block;
  width: var(--chess-clock-progress, 100%);
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #b98532, #efd9a0);
  box-shadow: 0 0 7px rgba(239, 217, 160, 0.55);
  transition: width 0.35s linear;
}

.life-tracker-timer-zone--overtime .chess-budget-track__fill {
  width: 100%;
  background: #ef4444;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.7);
}

.chess-clock-live-dot {
  width: 5px;
  height: 5px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #efd9a0;
  box-shadow: 0 0 8px rgba(239, 217, 160, 0.9);
  animation: chess-clock-live 1.4s ease-in-out infinite;
}

@keyframes chess-clock-live {
  0%, 100% { opacity: 0.45; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .chess-clock-live-dot {
    animation: none;
  }

  .chess-budget-track__fill {
    transition: none;
  }
}

/* Aggressive flash — triggered by rules engine.
   Bright border lives on an ::after overlay; only opacity animates
   (border-color animation would repaint every frame). */
@keyframes overlay-flash {
  0%, 50%, 100% { opacity: 0; }
  25%, 75% { opacity: 1; }
}
.timer-aggressive-flash {
  border: 2px solid rgba(239, 68, 68, 0.3);
  position: relative;
}
.timer-aggressive-flash::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  border: 2px solid rgba(239, 68, 68, 0.9);
  pointer-events: none;
  opacity: 0;
  animation: overlay-flash 0.6s ease-in-out infinite;
  will-change: opacity;
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

/* Behavior rule — player card flash (red glow border).
   Painted once on an ::after overlay, only opacity animates (GPU-composited).
   Base (faint) state stays on the container; the bright state fades in/out. */
@keyframes overlay-breathe-full {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}
.behavior-rule-flash {
  box-shadow: inset 0 0 0 2px rgba(239, 68, 68, 0.2);
}
.behavior-rule-flash::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 5;
  box-shadow: inset 0 0 0 2px rgba(239, 68, 68, 0.7), inset 0 0 20px rgba(239, 68, 68, 0.25);
  opacity: 0;
  animation: overlay-breathe-full 1.2s ease-in-out infinite;
  will-change: opacity;
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

/* A11y (#15): invisible touch slop so interactive badges reach a ~44px tap
   target on normal/compact cards. Non-interactive placeholder badges
   (<span class="card-badge">) are excluded. In MICRO (6-player dense) the
   radial spacing physically prevents 44px without overlap, so the slop is
   capped smaller there — see the MICRO override below. */
button.card-badge {
  position: relative;
}
button.card-badge::after {
  content: '';
  position: absolute;
  inset: 50%;
  width: 44px;
  height: 44px;
  transform: translate(-50%, -50%);
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
  width: clamp(20px, 8cqmin, 32px);
  height: clamp(20px, 8cqmin, 32px);
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

/* NARROW: phone grids place two cards side by side. Keep both clocks
   readable without letting their iconography consume the number width. */
@container card (max-width: 240px) {
  .life-tracker-timer-zone {
    padding: 4px 6px;
    gap: 6px;
    font-size: clamp(0.72rem, 7cqmin, 0.95rem);
  }

  .life-tracker-timer-zone svg {
    display: none;
  }

  .chess-clock-live-dot {
    width: 4px;
    height: 4px;
  }
}

/* COMPACT: card under 200px — hide timer icons, keep numbers */
@container card (max-height: 200px) {
  .life-tracker-timer-zone svg {
    display: none;
  }

  .timer-divider {
    display: none;
  }
}

/* MICRO: card under 160px tall — compact badges, max density */
@container card (max-height: 160px) {
  .card-badge {
    padding: 2px 5px;
    font-size: 0.65rem;
    gap: 2px;
    border-radius: 8px;
  }

  .card-badge :deep(svg) {
    width: 10px;
    height: 10px;
  }

  /* Dense radial layout: cap hit-slop below 44px to avoid overlapping
     neighbouring badges and the life tap-zone (best achievable here). */
  button.card-badge::after {
    width: 30px;
    height: 30px;
  }

  .card-identity-zone {
    min-height: 16px;
  }
}

/* ── Hourglass increment animation ── */

.hourglass-pulse {
  animation: hourglass-pulse 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes hourglass-pulse {
  0% { transform: scale(1); }
  40% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.hourglass-flip {
  animation: hourglass-flip 400ms ease-in-out;
}

@keyframes hourglass-flip {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(180deg); }
}
</style>
