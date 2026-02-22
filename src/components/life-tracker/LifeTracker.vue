<template>
  <div
    class="relative flex flex-col items-center justify-between overflow-hidden rounded-2xl p-2"
    :class="[
      playerBgClass,
      isCurrentTurn ? 'current-turn-glow' : '',
    ]"
  >
    <!-- Life flash overlay -->
    <div
      v-if="flashType"
      class="pointer-events-none absolute inset-0 z-10"
      :class="flashType === 'positive' ? 'flash-positive' : 'flash-negative'"
      @animationend="flashType = null"
    />

    <!-- Player name (tap to open detail) -->
    <button
      class="min-h-[44px] w-full text-center btn-press"
      :aria-label="`Details de ${player.name}`"
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
        class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 text-xl font-bold text-life-negative life-btn"
        :aria-label="`Diminuer la vie de ${player.name} de 1`"
        @click="changeLifeBy(-1)"
      >
        -
      </button>

      <span
        class="min-w-[3.5rem] text-center text-4xl font-bold tabular-nums"
        :class="lifeColorClass"
        role="status"
        :aria-label="`${player.name}: ${player.lifeTotal} points de vie`"
      >
        {{ animatedLife }}
      </span>

      <button
        class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 text-xl font-bold text-life-positive life-btn"
        :aria-label="`Augmenter la vie de ${player.name} de 1`"
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
        class="min-h-[28px] rounded px-2 py-1 text-[10px] font-medium btn-press"
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
        class="flex min-h-[24px] min-w-[24px] items-center justify-center gap-0.5 rounded-full px-1.5 py-0.5 btn-press"
        :class="player.poisonCounters > 0 ? 'bg-poison/20' : 'bg-white/5'"
        :aria-label="`Poison: ${player.poisonCounters}`"
        @click="changePoisonBy(1)"
        @contextmenu.prevent="changePoisonBy(-1)"
      >
        <span class="text-[10px]" :class="player.poisonCounters > 0 ? 'text-poison font-bold' : 'text-white/40'">
          {{ player.poisonCounters }}P
        </span>
      </button>

      <!-- Commander damage (tap to open modal) -->
      <button
        class="flex min-h-[24px] min-w-[24px] items-center justify-center gap-0.5 rounded-full px-1.5 py-0.5 btn-press"
        :class="totalCommanderDamage > 0 ? 'bg-commander-damage/20' : 'bg-white/5'"
        :aria-label="`Degats commandant: ${totalCommanderDamage}`"
        @click="showCommanderDamage = true"
      >
        <span class="text-[10px]" :class="totalCommanderDamage > 0 ? 'text-commander-damage font-bold' : 'text-white/40'">
          {{ totalCommanderDamage }}C
        </span>
      </button>

      <!-- Experience (visible if > 0) -->
      <button
        v-if="player.experienceCounters > 0"
        class="flex min-h-[24px] items-center gap-0.5 rounded-full bg-blue-500/20 px-1.5 py-0.5 btn-press"
        @click="showDetail = true"
      >
        <span class="text-[10px] font-bold text-blue-400">{{ player.experienceCounters }}E</span>
      </button>

      <!-- Energy (visible if > 0) -->
      <button
        v-if="player.energyCounters > 0"
        class="flex min-h-[24px] items-center gap-0.5 rounded-full bg-yellow-500/20 px-1.5 py-0.5 btn-press"
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

    <!-- Death overlay (animated) -->
    <Transition name="death-overlay">
      <div
        v-if="deathReason"
        class="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        role="alert"
        :aria-label="`${player.name} elimine: ${deathReason}`"
      >
        <span class="text-lg font-bold text-life-negative drop-shadow-lg">{{ deathReason }}</span>
      </div>
    </Transition>

    <!-- Modals -->
    <PlayerDetailModal
      :is-open="showDetail"
      :player="player"
      @close="onDetailClose"
    />

    <CommanderDamageModal
      :is-open="showCommanderDamage"
      :target-player="player"
      @close="onCommanderDamageClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PlayerState } from '@/types/game'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { tapFeedback, lifeFeedback, heavyFeedback, warningFeedback } from '@/services/haptics'
import { useAnimatedNumber } from '@/composables/useAnimatedNumber'
import PlayerDetailModal from './PlayerDetailModal.vue'
import CommanderDamageModal from './CommanderDamageModal.vue'

const props = defineProps<{
  player: PlayerState
  isCurrentTurn: boolean
}>()

const emit = defineEmits<{
  stateChanged: []
}>()

const gameStore = useGameStore()
const settingsStore = useSettingsStore()

const showDetail = ref(false)
const showCommanderDamage = ref(false)
const flashType = ref<'positive' | 'negative' | null>(null)

const animatedLife = useAnimatedNumber(() => props.player.lifeTotal)

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

  // Flash effect
  flashType.value = amount > 0 ? 'positive' : 'negative'

  // Haptic feedback
  if (settingsStore.hapticFeedback) {
    const newLife = props.player.lifeTotal
    if (newLife <= 0) {
      warningFeedback()
    } else if (Math.abs(amount) >= 5) {
      heavyFeedback()
    } else {
      lifeFeedback()
    }
  }

  emit('stateChanged')
}

function changePoisonBy(amount: number) {
  gameStore.changePoison(props.player.id, amount)
  if (settingsStore.hapticFeedback) tapFeedback()
  emit('stateChanged')
}

function onCommanderDamageClose() {
  showCommanderDamage.value = false
  emit('stateChanged')
}

function onDetailClose() {
  showDetail.value = false
  emit('stateChanged')
}
</script>
