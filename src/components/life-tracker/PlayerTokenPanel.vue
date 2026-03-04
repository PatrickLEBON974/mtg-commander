<template>
  <div class="token-panel relative flex h-full flex-col overflow-y-auto rounded-2xl px-1.5 py-1" :class="playerBgClass">
    <!-- Header -->
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

    <!-- Commanders -->
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
    </div>

    <!-- Action bar — icon buttons -->
    <div class="flex items-center justify-center gap-2 mt-1">
      <!-- Manage tokens -->
      <button
        class="panel-icon-btn panel-icon-btn--gold"
        :aria-label="t('tokens.manageTokens')"
        @click="$emit('openTokenPicker')"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="7" cy="7" r="3" stroke="currentColor" stroke-width="2" />
          <circle cx="17" cy="7" r="3" stroke="currentColor" stroke-width="2" />
          <circle cx="7" cy="17" r="3" stroke="currentColor" stroke-width="2" />
          <circle cx="17" cy="17" r="3" stroke="currentColor" stroke-width="2" />
        </svg>
      </button>

      <!-- Add commander -->
      <button
        v-if="player.commanders.length < 2"
        class="panel-icon-btn panel-icon-btn--white"
        :aria-label="t('playerDetail.addCommander')"
        @click="$emit('addCommander')"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
        </svg>
      </button>

      <!-- Game result -->
      <button
        class="panel-icon-btn panel-icon-btn--red"
        :aria-label="t('gameResult.title')"
        @click="$emit('showGameResult')"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M4 22v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { PlayerState } from '@/types/game'
import { useGameStore } from '@/stores/gameStore'
import { playCommanderCast } from '@/services/sounds'

const props = defineProps<{
  player: PlayerState
  playerBgClass: string
}>()

defineEmits<{
  close: []
  addCommander: []
  stateChanged: []
  showGameResult: []
  openTokenPicker: []
}>()

const { t } = useI18n()
const gameStore = useGameStore()

function handleCastCommander(commanderIndex: number) {
  gameStore.castCommander(props.player.id, commanderIndex)
  playCommanderCast()
}
</script>

<style scoped>
.font-beleren {
  font-family: var(--font-beleren);
}

/* ── Icon buttons (action bar) ── */
.panel-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  -webkit-tap-highlight-color: transparent;
  box-shadow: var(--shadow-btn-beveled);
  transition: transform 0.1s ease, box-shadow 0.1s ease, background 0.1s ease;
}
.panel-icon-btn:active {
  box-shadow: var(--shadow-btn-pressed);
  transform: translateY(1px);
}

.panel-icon-btn--gold {
  background: rgba(212, 168, 67, 0.12);
  border: 1px solid rgba(212, 168, 67, 0.18);
  color: rgba(212, 168, 67, 0.8);
}
.panel-icon-btn--gold:active {
  background: rgba(212, 168, 67, 0.22);
}

.panel-icon-btn--white {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
}
.panel-icon-btn--white:active {
  background: rgba(255, 255, 255, 0.12);
}

.panel-icon-btn--red {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.15);
  color: rgba(239, 68, 68, 0.7);
}
.panel-icon-btn--red:active {
  background: rgba(239, 68, 68, 0.2);
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
  border: 1px solid rgba(245, 158, 11, 0.1);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
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
  box-shadow: var(--shadow-btn-beveled);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}
.commander-tax-btn:active {
  background: rgba(232, 96, 10, 0.3);
  box-shadow: var(--shadow-btn-pressed);
  transform: translateY(1px);
}

</style>
