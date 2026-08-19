<template>
  <section
    class="chess-clock-hud"
    :class="[
      `chess-clock-hud--${budgetState}`,
      { 'chess-clock-hud--paused': !isRunning },
    ]"
    :style="progressStyle"
    role="timer"
    aria-live="off"
    :aria-label="accessibleLabel"
  >
    <div class="chess-clock-hud__ornament" aria-hidden="true" />

    <div class="chess-clock-hud__clock chess-clock-hud__clock--turn">
      <div class="chess-clock-hud__heading">
        <span>{{ t('game.chessTurnClock') }}</span>
        <b>{{ turnPlayerName }}</b>
      </div>
      <div class="chess-clock-hud__value-row">
        <strong>{{ formattedTurnTime }}</strong>
        <span class="chess-clock-hud__target">
          {{ t('game.chessTargetShort') }} {{ formattedTargetTime }}
        </span>
      </div>
    </div>

    <div class="chess-clock-hud__sigil" aria-hidden="true">
      <span />
    </div>

    <div class="chess-clock-hud__clock chess-clock-hud__clock--budget">
      <div class="chess-clock-hud__heading">
        <span>{{ t('game.chessGlobalClock') }}</span>
        <b>{{ clockOwnerName }}</b>
      </div>
      <div class="chess-clock-hud__value-row">
        <strong>{{ formattedRemainingTime }}</strong>
        <span v-if="budgetState === 'overtime'" class="chess-clock-hud__overtime">
          {{ t('game.chessBudgetExceeded') }}
        </span>
      </div>
    </div>

    <div class="chess-clock-hud__progress" aria-hidden="true">
      <span />
    </div>

    <div v-if="!isRunning" class="chess-clock-hud__pause" aria-hidden="true">
      <i />
      <i />
      <span>{{ t('game.pause') }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatMsToTimer } from '@/utils/time'
import {
  formatSignedTimer,
  getChessClockRemainingMs,
  getChessClockRemainingRatio,
} from '@/utils/chessClock'

const props = defineProps<{
  turnPlayerName: string
  clockOwnerName: string
  turnElapsedMs: number
  clockUsedMs: number
  playerBudgetMs: number
  theoreticalTurnMs: number
  isRunning: boolean
}>()

const { t } = useI18n()

const remainingMs = computed(() =>
  getChessClockRemainingMs(props.playerBudgetMs, props.clockUsedMs),
)
const remainingRatio = computed(() =>
  getChessClockRemainingRatio(props.playerBudgetMs, props.clockUsedMs),
)
const formattedTurnTime = computed(() => formatMsToTimer(props.turnElapsedMs))
const formattedTargetTime = computed(() => formatMsToTimer(props.theoreticalTurnMs))
const formattedRemainingTime = computed(() => formatSignedTimer(remainingMs.value))

const budgetState = computed<'ready' | 'warning' | 'critical' | 'overtime'>(() => {
  if (remainingMs.value <= 0) return 'overtime'
  if (remainingRatio.value <= 0.1) return 'critical'
  if (remainingRatio.value <= 0.25) return 'warning'
  return 'ready'
})

const progressStyle = computed(() => ({
  '--chess-budget-progress': `${remainingRatio.value * 100}%`,
}))

const accessibleLabel = computed(() => t('game.chessClockAria', {
  turnPlayer: props.turnPlayerName,
  turnTime: formattedTurnTime.value,
  clockPlayer: props.clockOwnerName,
  remainingTime: formattedRemainingTime.value,
  targetTime: formattedTargetTime.value,
}))
</script>

<style scoped>
.chess-clock-hud {
  position: relative;
  display: grid;
  min-height: 62px;
  overflow: hidden;
  grid-template-columns: minmax(0, 1fr) 20px minmax(0, 1.08fr);
  border: 1px solid rgba(203, 170, 99, 0.28);
  border-radius: 12px;
  background:
    radial-gradient(circle at 76% 20%, rgba(217, 104, 32, 0.12), transparent 38%),
    linear-gradient(105deg, rgba(24, 34, 36, 0.98), rgba(8, 13, 15, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.045),
    inset 0 -14px 24px rgba(0, 0, 0, 0.17),
    0 5px 14px rgba(0, 0, 0, 0.28);
  transition: border-color 0.25s ease, filter 0.25s ease;
}

.chess-clock-hud__ornament {
  position: absolute;
  top: 0;
  right: 12%;
  left: 12%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(239, 217, 160, 0.72), transparent);
  box-shadow: 0 0 8px rgba(239, 217, 160, 0.28);
}

.chess-clock-hud__clock {
  position: relative;
  z-index: 1;
  display: flex;
  min-width: 0;
  padding: 7px 9px 8px;
  justify-content: center;
  flex-direction: column;
}

.chess-clock-hud__heading {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 5px;
  color: rgba(210, 222, 217, 0.58);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.11em;
  line-height: 1;
  text-transform: uppercase;
}

.chess-clock-hud__heading b {
  overflow: hidden;
  color: rgba(239, 217, 160, 0.88);
  font-size: 9px;
  letter-spacing: 0.04em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chess-clock-hud__value-row {
  display: flex;
  min-width: 0;
  margin-top: 3px;
  align-items: baseline;
  gap: 6px;
}

.chess-clock-hud__value-row strong {
  color: rgba(238, 235, 225, 0.94);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: clamp(16px, 5.2vw, 21px);
  font-variant-numeric: tabular-nums;
  font-weight: 750;
  letter-spacing: -0.04em;
  line-height: 1;
  text-shadow: 0 2px 7px rgba(0, 0, 0, 0.55);
  white-space: nowrap;
}

.chess-clock-hud__clock--budget .chess-clock-hud__value-row strong {
  color: #efd9a0;
}

.chess-clock-hud__target,
.chess-clock-hud__overtime {
  overflow: hidden;
  color: rgba(210, 222, 217, 0.48);
  font-size: 8px;
  font-weight: 700;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chess-clock-hud__sigil {
  position: relative;
  display: grid;
  place-items: center;
}

.chess-clock-hud__sigil::before {
  content: '';
  position: absolute;
  top: 9px;
  bottom: 9px;
  width: 1px;
  background: linear-gradient(transparent, rgba(203, 170, 99, 0.36), transparent);
}

.chess-clock-hud__sigil span {
  position: relative;
  width: 6px;
  height: 6px;
  border: 1px solid rgba(239, 217, 160, 0.62);
  background: #11191b;
  box-shadow: 0 0 8px rgba(203, 170, 99, 0.22);
  transform: rotate(45deg);
}

.chess-clock-hud__progress {
  position: absolute;
  z-index: 2;
  right: 7px;
  bottom: 3px;
  width: calc(52% - 9px);
  height: 2px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.chess-clock-hud__progress span {
  display: block;
  width: var(--chess-budget-progress, 100%);
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #af782b, #efd9a0);
  box-shadow: 0 0 7px rgba(239, 217, 160, 0.55);
  transition: width 0.35s linear, background 0.25s ease;
}

.chess-clock-hud--warning {
  border-color: rgba(245, 158, 11, 0.42);
}

.chess-clock-hud--warning .chess-clock-hud__progress span {
  background: #f59e0b;
}

.chess-clock-hud--critical,
.chess-clock-hud--overtime {
  border-color: rgba(239, 68, 68, 0.55);
  background:
    radial-gradient(circle at 78% 28%, rgba(239, 68, 68, 0.18), transparent 40%),
    linear-gradient(105deg, rgba(24, 31, 33, 0.98), rgba(15, 9, 10, 0.98));
}

.chess-clock-hud--critical .chess-clock-hud__clock--budget strong,
.chess-clock-hud--overtime .chess-clock-hud__clock--budget strong,
.chess-clock-hud__overtime {
  color: #ff7777;
}

.chess-clock-hud--critical .chess-clock-hud__progress span,
.chess-clock-hud--overtime .chess-clock-hud__progress span {
  background: #ef4444;
  box-shadow: 0 0 9px rgba(239, 68, 68, 0.75);
}

.chess-clock-hud--overtime .chess-clock-hud__progress span {
  width: 100%;
}

.chess-clock-hud--overtime .chess-clock-hud__clock--budget strong {
  animation: chess-overtime-pulse 1.15s ease-in-out infinite;
}

.chess-clock-hud__pause {
  position: absolute;
  z-index: 3;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(7, 11, 13, 0.73);
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
  color: #ff7777;
}

.chess-clock-hud__pause i {
  width: 3px;
  height: 14px;
  border-radius: 1px;
  background: currentColor;
}

.chess-clock-hud__pause span {
  margin-left: 4px;
  font-size: 10px;
  font-style: normal;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

@keyframes chess-overtime-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; text-shadow: 0 0 12px rgba(239, 68, 68, 0.68); }
}

@media (min-width: 700px) {
  .chess-clock-hud {
    min-height: 68px;
    grid-template-columns: minmax(0, 1fr) 28px minmax(0, 1fr);
    border-radius: 14px;
  }

  .chess-clock-hud__clock {
    padding: 8px 14px 9px;
  }

  .chess-clock-hud__heading {
    font-size: 9px;
  }

  .chess-clock-hud__heading b {
    font-size: 10px;
  }

  .chess-clock-hud__value-row strong {
    font-size: 23px;
  }

  .chess-clock-hud__target,
  .chess-clock-hud__overtime {
    font-size: 9px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chess-clock-hud,
  .chess-clock-hud__progress span {
    transition: none;
  }

  .chess-clock-hud--overtime .chess-clock-hud__clock--budget strong {
    animation: none;
  }
}
</style>
