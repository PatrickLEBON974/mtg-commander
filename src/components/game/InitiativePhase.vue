<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center justify-center px-4 py-2">
      <span class="text-sm font-semibold text-text-secondary">{{ statusText }}</span>
    </div>

    <div
      class="grid min-h-0 flex-1 gap-2 p-2"
      :style="gridStyle"
    >
      <div
        v-for="(player, index) in gameStore.currentGame?.players"
        :key="player.id"
        class="min-h-0 min-w-0 overflow-hidden"
        :class="cardOuterClasses(index)"
        :style="cardOuterStyle(index)"
      >
        <div
          class="initiative-card h-full"
          :style="cardRotationStyle(index)"
          :class="{
            'initiative-card--rolling': rollingPlayerIds.has(player.id),
            'initiative-card--tied': tiedPlayerIds.has(player.id),
            'initiative-card--dimmed': isDimmed(player.id),
            'initiative-card--winner': resolvedPositions[player.id] === 1 && phase === 'resolved',
          }"
        >
          <div
            class="initiative-card-bg"
            :style="{ background: `var(--color-mana-${player.color})` }"
          />
          <div class="initiative-card-content">
            <span class="initiative-player-name">{{ player.name }}</span>
            <span
              v-if="displayValues[player.id] !== undefined"
              class="initiative-roll-value"
              :class="{ 'initiative-roll-spinning': rollingPlayerIds.has(player.id) }"
            >{{ displayValues[player.id] }}</span>
            <span
              v-if="resolvedPositions[player.id]"
              class="initiative-position"
            >{{ formatPosition(resolvedPositions[player.id]!) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGameStore } from '@/stores/gameStore'
import { usePlayerGridLayout } from '@/composables/usePlayerGridLayout'
import { playDiceRoll, playVictory } from '@/services/sounds'

const { t } = useI18n()
const gameStore = useGameStore()
const { gridStyle, cardOuterClasses, cardOuterStyle, cardRotationStyle } = usePlayerGridLayout()

const displayValues = ref<Record<string, number>>({})
const rollingPlayerIds = ref<Set<string>>(new Set())
const tiedPlayerIds = ref<Set<string>>(new Set())
const resolvedPositions = ref<Record<string, number>>({})
const phase = ref<'idle' | 'rolling' | 'showing' | 'tied' | 'resolved'>('idle')

const statusText = computed(() => {
  if (phase.value === 'rolling') return t('initiative.rolling')
  if (phase.value === 'tied') return t('initiative.tied')
  if (phase.value === 'resolved') return t('initiative.resolved')
  return t('initiative.title')
})

function isDimmed(playerId: string): boolean {
  if (phase.value === 'tied') {
    return !tiedPlayerIds.value.has(playerId)
  }
  return false
}

function formatPosition(position: number): string {
  if (position === 1) return t('initiative.first')
  if (position === 2) return t('initiative.second')
  if (position === 3) return t('initiative.third')
  return `${position}${t('initiative.nth')}`
}

function cryptoRandom(max: number): number {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return array[0]! % max
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function animateRolling(playerIds: string[], durationMs: number): Promise<void> {
  return new Promise(resolve => {
    const intervalMs = 60
    const steps = Math.floor(durationMs / intervalMs)
    let step = 0

    const interval = setInterval(() => {
      for (const id of playerIds) {
        displayValues.value[id] = Math.floor(Math.random() * 20) + 1
      }
      step++
      if (step >= steps) {
        clearInterval(interval)
        resolve()
      }
    }, intervalMs)
  })
}

async function resolveInitiative(playerIds: string[]): Promise<string[]> {
  if (playerIds.length <= 1) return [...playerIds]

  rollingPlayerIds.value = new Set(playerIds)
  tiedPlayerIds.value = new Set()
  phase.value = 'rolling'
  playDiceRoll()

  await animateRolling(playerIds, 1200)

  const finalRolls: Record<string, number> = {}
  for (const id of playerIds) {
    finalRolls[id] = cryptoRandom(20) + 1
    displayValues.value[id] = finalRolls[id]!
  }

  rollingPlayerIds.value = new Set()
  phase.value = 'showing'
  await delay(1000)

  const sorted = [...playerIds].sort((a, b) => finalRolls[b]! - finalRolls[a]!)

  const result: string[] = []
  let i = 0
  while (i < sorted.length) {
    const value = finalRolls[sorted[i]!]!
    const group: string[] = []
    while (i < sorted.length && finalRolls[sorted[i]!] === value) {
      group.push(sorted[i]!)
      i++
    }

    if (group.length === 1) {
      result.push(group[0]!)
    } else {
      tiedPlayerIds.value = new Set(group)
      phase.value = 'tied'
      await delay(1500)
      tiedPlayerIds.value = new Set()

      const tieResolved = await resolveInitiative(group)
      result.push(...tieResolved)
    }
  }

  return result
}

onMounted(async () => {
  const players = gameStore.currentGame?.players
  if (!players) return

  const playerIds = players.map(p => p.id)
  const order = await resolveInitiative(playerIds)

  order.forEach((id, i) => {
    resolvedPositions.value[id] = i + 1
  })

  phase.value = 'resolved'
  playVictory()
  await delay(2500)

  gameStore.reorderPlayersForTurnOrder(order)
  gameStore.setGamePhase('playing')
})
</script>

<style scoped>
.initiative-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  transition: border-color 0.3s ease, box-shadow 0.3s ease, opacity 0.3s ease;
}

.initiative-card-bg {
  position: absolute;
  inset: 0;
  opacity: 0.12;
  transition: opacity 0.3s ease;
}

.initiative-card-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  text-align: center;
}

.initiative-player-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-secondary, rgba(255, 255, 255, 0.6));
}

.initiative-roll-value {
  font-size: 2.5rem;
  font-weight: 900;
  color: #fff;
  text-shadow: 0 0 20px rgba(232, 96, 10, 0.5);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  transition: transform 0.2s ease;
}

.initiative-roll-spinning {
  animation: spin-number 0.1s steps(1) infinite;
}

@keyframes spin-number {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 0.5; }
}

.initiative-position {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-arena-gold-light, #f0d078);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-top: 0.25rem;
}

.initiative-card--rolling {
  border-color: rgba(232, 96, 10, 0.3);
}

.initiative-card--tied {
  border-color: var(--color-accent, #e8600a);
  box-shadow: 0 0 16px rgba(232, 96, 10, 0.4);
  animation: pulse-border 0.8s ease-in-out infinite alternate;
}

@keyframes pulse-border {
  from { box-shadow: 0 0 8px rgba(232, 96, 10, 0.3); }
  to { box-shadow: 0 0 20px rgba(232, 96, 10, 0.6); }
}

.initiative-card--dimmed {
  opacity: 0.35;
}

.initiative-card--winner {
  border-color: var(--color-arena-gold-light, #f0d078);
  box-shadow: 0 0 24px rgba(240, 208, 120, 0.4), 0 0 48px rgba(240, 208, 120, 0.15);
}

.initiative-card--winner .initiative-card-bg {
  opacity: 0.2;
}
</style>
