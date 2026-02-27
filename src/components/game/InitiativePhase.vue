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
            'initiative-card--winner': resolvedPositions[player.id] === 1,
            'initiative-card--second': resolvedPositions[player.id] === 2,
            'initiative-card--tied-second': tiedForSecondPlayerIds.has(player.id),
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
const { gridStyle, cardOuterClasses, cardOuterStyle, cardRotationStyle, getSlot, clockwiseSlotOrder } = usePlayerGridLayout()

const displayValues = ref<Record<string, number>>({})
const rollingPlayerIds = ref<Set<string>>(new Set())
const tiedPlayerIds = ref<Set<string>>(new Set())
const resolvedPositions = ref<Record<string, number>>({})
const tiedForSecondPlayerIds = ref<Set<string>>(new Set())
const phase = ref<'idle' | 'rolling' | 'showing' | 'tied' | 'resolved'>('idle')

const statusText = computed(() => {
  if (phase.value === 'rolling') return t('initiative.rolling')
  if (phase.value === 'tied') return t('initiative.tied')
  if (phase.value === 'resolved') return t('initiative.resolved')
  return t('initiative.title')
})

function isDimmed(playerId: string): boolean {
  // Never dim a player whose position is already resolved
  if (resolvedPositions.value[playerId]) return false

  if (phase.value === 'tied') {
    return !tiedPlayerIds.value.has(playerId) && !tiedForSecondPlayerIds.value.has(playerId)
  }
  const totalPlayerCount = gameStore.currentGame?.players.length ?? 0
  if (phase.value === 'rolling' && rollingPlayerIds.value.size < totalPlayerCount) {
    return !rollingPlayerIds.value.has(playerId)
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

async function rollAndShowResults(playerIds: string[]): Promise<Record<string, number>> {
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

  return finalRolls
}

function groupByRollDescending(playerIds: string[], rolls: Record<string, number>): string[][] {
  const sorted = [...playerIds].sort((a, b) => rolls[b]! - rolls[a]!)
  const groups: string[][] = []
  let i = 0
  while (i < sorted.length) {
    const rollValue = rolls[sorted[i]!]!
    const group: string[] = []
    while (i < sorted.length && rolls[sorted[i]!] === rollValue) {
      group.push(sorted[i]!)
      i++
    }
    groups.push(group)
  }
  return groups
}

async function showTieAndWait(tiedIds: string[]) {
  tiedPlayerIds.value = new Set(tiedIds)
  phase.value = 'tied'
  await delay(1500)
  tiedPlayerIds.value = new Set()
}

async function rollForSingleWinner(playerIds: string[]): Promise<string> {
  if (playerIds.length === 1) return playerIds[0]!

  const rolls = await rollAndShowResults(playerIds)
  const groups = groupByRollDescending(playerIds, rolls)
  const topGroup = groups[0]!

  if (topGroup.length === 1) return topGroup[0]!

  await showTieAndWait(topGroup)
  return rollForSingleWinner(topGroup)
}

function getAdjacentPlayerIds(firstId: string): [string, string] | null {
  const game = gameStore.currentGame
  if (!game || game.players.length < 3) return null

  const slotToPlayerId: Record<number, string> = {}
  game.players.forEach((player, index) => {
    slotToPlayerId[getSlot(index)] = player.id
  })

  const slots = clockwiseSlotOrder.value
  const firstPlayerIndex = game.players.findIndex(p => p.id === firstId)
  const firstSlot = getSlot(firstPlayerIndex)
  const firstClockwiseIndex = slots.indexOf(firstSlot)

  const neighborClockwiseSlot = slots[(firstClockwiseIndex + 1) % slots.length]!
  const neighborCounterClockwiseSlot = slots[(firstClockwiseIndex - 1 + slots.length) % slots.length]!

  return [slotToPlayerId[neighborClockwiseSlot]!, slotToPlayerId[neighborCounterClockwiseSlot]!]
}

async function resolveFirst(playerIds: string[]): Promise<{ firstId: string; initialRolls: Record<string, number> }> {
  const rolls = await rollAndShowResults(playerIds)
  const initialRolls = { ...rolls }
  const groups = groupByRollDescending(playerIds, rolls)
  const topGroup = groups[0]!

  if (topGroup.length === 1) {
    return { firstId: topGroup[0]!, initialRolls }
  }

  // Tie for 1st — re-roll among tied only
  await showTieAndWait(topGroup)
  const firstId = await rollForSingleWinner(topGroup)
  return { firstId, initialRolls }
}

async function showSecondTieAndWait(tiedIds: string[]) {
  tiedForSecondPlayerIds.value = new Set(tiedIds)
  phase.value = 'tied'
  await delay(1500)
  tiedForSecondPlayerIds.value = new Set()
}

async function rollForSecondWinner(playerIds: string[]): Promise<string> {
  if (playerIds.length === 1) return playerIds[0]!

  const rolls = await rollAndShowResults(playerIds)
  const groups = groupByRollDescending(playerIds, rolls)
  const topGroup = groups[0]!

  if (topGroup.length === 1) return topGroup[0]!

  await showSecondTieAndWait(topGroup)
  return rollForSecondWinner(topGroup)
}

async function resolveSecondAmongNeighbors(neighborIds: [string, string], initialRolls: Record<string, number>): Promise<string> {
  const [neighborA, neighborB] = neighborIds
  const rollA = initialRolls[neighborA]
  const rollB = initialRolls[neighborB]

  if (rollA !== undefined && rollB !== undefined && rollA !== rollB) {
    return rollA > rollB ? neighborA : neighborB
  }

  // Tie or no initial rolls for neighbors — roll between them (blue tie style)
  await showSecondTieAndWait(neighborIds)
  return rollForSecondWinner(neighborIds)
}

onMounted(async () => {
  const players = gameStore.currentGame?.players
  if (!players) return

  const playerIds = players.map(p => p.id)
  const { firstId, initialRolls } = await resolveFirst(playerIds)

  resolvedPositions.value[firstId] = 1

  // 2nd player = adjacent neighbor of 1st with highest roll (tie → re-roll between them)
  let secondId: string | null = null
  const neighborIds = getAdjacentPlayerIds(firstId)
  if (neighborIds) {
    secondId = await resolveSecondAmongNeighbors(neighborIds, initialRolls)
    resolvedPositions.value[secondId] = 2
  }

  phase.value = 'resolved'
  playVictory()
  await delay(2500)

  // Build turn order: winner first, direction determined by 2nd player's seat
  const game = gameStore.currentGame!
  const slotToPlayerId: Record<number, string> = {}
  game.players.forEach((player, index) => {
    slotToPlayerId[getSlot(index)] = player.id
  })

  const clockwiseSlots = clockwiseSlotOrder.value
  const winnerPlayerIndex = game.players.findIndex(p => p.id === firstId)
  const winnerSlot = getSlot(winnerPlayerIndex)
  const winnerClockwiseIndex = clockwiseSlots.indexOf(winnerSlot)

  let direction = 1 // default clockwise
  if (secondId) {
    const secondPlayerIndex = game.players.findIndex(p => p.id === secondId)
    const secondSlot = getSlot(secondPlayerIndex)
    const secondClockwiseIndex = clockwiseSlots.indexOf(secondSlot)
    const clockwiseDistance = (secondClockwiseIndex - winnerClockwiseIndex + clockwiseSlots.length) % clockwiseSlots.length
    if (clockwiseDistance > clockwiseSlots.length / 2) {
      direction = -1
    }
  }

  const turnOrder: string[] = []
  for (let i = 0; i < clockwiseSlots.length; i++) {
    const clockwiseIndex = (winnerClockwiseIndex + i * direction + clockwiseSlots.length) % clockwiseSlots.length
    const slot = clockwiseSlots[clockwiseIndex]!
    turnOrder.push(slotToPlayerId[slot]!)
  }

  gameStore.reorderPlayersForTurnOrder(turnOrder)
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

.initiative-card--tied-second {
  border-color: var(--color-accent-blue, #4a90e2);
  box-shadow: 0 0 16px rgba(74, 144, 226, 0.4);
  animation: pulse-border-second 0.8s ease-in-out infinite alternate;
}

@keyframes pulse-border-second {
  from { box-shadow: 0 0 8px rgba(74, 144, 226, 0.3); }
  to { box-shadow: 0 0 20px rgba(74, 144, 226, 0.6); }
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

.initiative-card--second {
  border-color: var(--color-accent-blue, #4a90e2);
  box-shadow: 0 0 16px rgba(74, 144, 226, 0.35), 0 0 32px rgba(74, 144, 226, 0.12);
}

.initiative-card--second .initiative-card-bg {
  opacity: 0.18;
}
</style>
