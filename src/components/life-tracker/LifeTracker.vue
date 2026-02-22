<template>
  <div
    class="relative flex flex-col items-center justify-between overflow-hidden rounded-2xl p-2"
    :class="[
      playerBgClass,
      isCurrentTurn ? 'ring-2 ring-accent' : '',
    ]"
  >
    <!-- Player name (tap to open detail) -->
    <button
      class="w-full text-center"
      @click="showDetail = true"
    >
      <span class="text-[10px] font-medium uppercase tracking-wider text-white/70">
        {{ player.name }}
      </span>
      <span v-if="player.commanders.length > 0" class="block truncate text-[9px] text-white/40">
        {{ player.commanders.map(c => c.cardName).join(' / ') }}
      </span>
    </button>

    <!-- Life total + buttons -->
    <div class="flex items-center gap-2">
      <button
        class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl font-bold text-life-negative active:bg-white/20"
        @click="changeLifeBy(-1)"
      >
        -
      </button>

      <span
        class="min-w-[3.5rem] text-center text-4xl font-bold tabular-nums"
        :class="lifeColorClass"
      >
        {{ player.lifeTotal }}
      </span>

      <button
        class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl font-bold text-life-positive active:bg-white/20"
        @click="changeLifeBy(1)"
      >
        +
      </button>
    </div>

    <!-- Quick increment row -->
    <div class="flex gap-1">
      <button
        v-for="amount in [-10, -5, 5, 10]"
        :key="amount"
        class="rounded px-1.5 py-0.5 text-[10px] font-medium active:bg-white/15"
        :class="amount < 0 ? 'bg-life-negative/15 text-life-negative' : 'bg-life-positive/15 text-life-positive'"
        @click="changeLifeBy(amount)"
      >
        {{ amount > 0 ? '+' : '' }}{{ amount }}
      </button>
    </div>

    <!-- Counters row -->
    <div class="flex flex-wrap justify-center gap-1.5">
      <!-- Poison -->
      <button
        class="flex items-center gap-0.5 rounded-full px-1.5 py-0.5"
        :class="player.poisonCounters > 0 ? 'bg-poison/20' : 'bg-white/5'"
        @click="gameStore.changePoison(player.id, 1)"
        @contextmenu.prevent="gameStore.changePoison(player.id, -1)"
      >
        <span class="text-[10px]" :class="player.poisonCounters > 0 ? 'text-poison font-bold' : 'text-white/40'">
          {{ player.poisonCounters }}P
        </span>
      </button>

      <!-- Commander damage (tap to open modal) -->
      <button
        class="flex items-center gap-0.5 rounded-full px-1.5 py-0.5"
        :class="totalCommanderDamage > 0 ? 'bg-commander-damage/20' : 'bg-white/5'"
        @click="showCommanderDamage = true"
      >
        <span class="text-[10px]" :class="totalCommanderDamage > 0 ? 'text-commander-damage font-bold' : 'text-white/40'">
          {{ totalCommanderDamage }}C
        </span>
      </button>

      <!-- Experience (visible if > 0) -->
      <button
        v-if="player.experienceCounters > 0"
        class="flex items-center gap-0.5 rounded-full bg-blue-500/20 px-1.5 py-0.5"
        @click="showDetail = true"
      >
        <span class="text-[10px] font-bold text-blue-400">{{ player.experienceCounters }}E</span>
      </button>

      <!-- Energy (visible if > 0) -->
      <button
        v-if="player.energyCounters > 0"
        class="flex items-center gap-0.5 rounded-full bg-yellow-500/20 px-1.5 py-0.5"
        @click="showDetail = true"
      >
        <span class="text-[10px] font-bold text-yellow-400">{{ player.energyCounters }}N</span>
      </button>

      <!-- Monarch indicator -->
      <span v-if="player.isMonarch" class="rounded-full bg-mana-gold/30 px-1.5 py-0.5 text-[10px] font-bold text-mana-gold">
        M
      </span>

      <!-- Initiative indicator -->
      <span v-if="player.hasInitiative" class="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/80">
        I
      </span>

      <!-- Commander tax -->
      <span
        v-for="(commander, commanderIndex) in player.commanders"
        :key="commanderIndex"
        class="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-white/50"
      >
        T{{ gameStore.getCommanderTax(player, commanderIndex) }}
      </span>
    </div>

    <!-- Death indicators -->
    <div v-if="deathReason" class="absolute inset-0 flex items-center justify-center bg-black/60">
      <span class="text-lg font-bold text-life-negative">{{ deathReason }}</span>
    </div>

    <!-- Modals -->
    <PlayerDetailModal
      :is-open="showDetail"
      :player="player"
      @close="showDetail = false"
    />

    <CommanderDamageModal
      :is-open="showCommanderDamage"
      :target-player="player"
      @close="showCommanderDamage = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PlayerState } from '@/types/game'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { lifeFeedback, warningFeedback } from '@/services/haptics'
import PlayerDetailModal from './PlayerDetailModal.vue'
import CommanderDamageModal from './CommanderDamageModal.vue'

const props = defineProps<{
  player: PlayerState
  isCurrentTurn: boolean
}>()

const gameStore = useGameStore()
const settingsStore = useSettingsStore()

const showDetail = ref(false)
const showCommanderDamage = ref(false)

const totalCommanderDamage = computed(() =>
  Object.values(props.player.commanderDamageReceived).reduce((sum, damage) => sum + damage, 0),
)

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
  if (props.player.lifeTotal <= 10) return 'text-life-negative/80'
  return 'text-white'
})

const deathReason = computed(() => {
  if (props.player.lifeTotal <= 0) return 'MORT'
  if (gameStore.isPlayerDeadByPoison(props.player)) return 'POISON'
  if (gameStore.isPlayerDeadByCommanderDamage(props.player)) return 'CMD 21'
  return null
})

function changeLifeBy(amount: number) {
  gameStore.changeLife(props.player.id, amount)
  if (settingsStore.hapticFeedback) {
    if (props.player.lifeTotal + amount <= 0) {
      warningFeedback()
    } else {
      lifeFeedback()
    }
  }
}
</script>
