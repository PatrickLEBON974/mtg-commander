<template>
  <Teleport to="body">
    <Transition name="dice-popup" @enter="onEnter" @leave="onLeave">
      <div v-if="isOpen" class="dice-overlay" @click.self="handleClose">
        <div class="dice-popup" @click="clearAutoDismiss">
          <!-- Back button -->
          <button v-if="currentView !== 'picker'" class="back-btn" @click="goBack">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <!-- Die type picker -->
          <template v-if="currentView === 'picker'">
            <div class="dice-row">
              <button
                v-for="die in dieTypes"
                :key="die.sides"
                class="die-button"
                data-sound="none"
                @click="rollDie(die.sides)"
              >
                <component :is="die.icon" :size="32" />
                <span class="die-label">{{ die.label }}</span>
              </button>
              <button class="die-button" @click="openPlayerPicker">
                <IconPeople :size="32" />
                <span class="die-label">{{ t('dice.player') }}</span>
              </button>
            </div>
          </template>

          <!-- Player picker / roll -->
          <template v-else-if="currentView === 'playerPicker'">
            <div class="player-picker">
              <button
                v-for="player in gamePlayers"
                :key="player.id"
                class="player-row"
                :class="{
                  'player-row--selected': selectedPlayerIds.has(player.id) && !isRolling && !winnerPlayerId,
                  'player-row--unselected': !selectedPlayerIds.has(player.id) && !isRolling && !winnerPlayerId,
                  'player-row--highlight': highlightedPlayerId === player.id,
                  'player-row--winner': winnerPlayerId === player.id && !isRolling,
                  'player-row--dimmed': (winnerPlayerId && winnerPlayerId !== player.id && !isRolling) || (isRolling && !selectedPlayerIds.has(player.id)),
                }"
                :disabled="isRolling || !!winnerPlayerId"
                @click="togglePlayer(player.id)"
              >
                <span
                  class="player-dot"
                  :style="{ background: `var(--color-mana-${player.color})` }"
                />
                <span class="player-name">{{ player.name }}</span>
                <span v-if="selectedPlayerIds.has(player.id) && !isRolling && !winnerPlayerId" class="player-check">&#10003;</span>
              </button>
              <button
                class="action-btn action-btn--primary roll-btn"
                data-sound="none"
                :disabled="selectedPlayerIds.size < 2 || isRolling"
                @click="rollPlayer"
              >
                {{ winnerPlayerId ? t('dice.reroll') : t('dice.roll') }}
              </button>
            </div>
          </template>

          <!-- Numeric die result -->
          <template v-else-if="currentView === 'dieResult'">
            <div class="result-area">
              <component :is="currentDieIcon" :size="24" class="result-die-icon" />
              <div class="result-number" ref="resultNumberRef">
                {{ displayValue }}
              </div>
              <button class="action-btn action-btn--primary" data-sound="none" @click="reroll">
                {{ t('dice.reroll') }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import gsap from 'gsap'
import { useGameStore } from '@/stores/gameStore'
import IconDie4 from '@/components/icons/dice/IconDie4.vue'
import IconDie6 from '@/components/icons/dice/IconDie6.vue'
import IconDie8 from '@/components/icons/dice/IconDie8.vue'
import IconDie20 from '@/components/icons/dice/IconDie20.vue'
import IconPeople from '@/components/icons/nav/IconPeople.vue'
import { playDiceRoll, playVictory } from '@/services/sounds'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const gameStore = useGameStore()

type ViewState = 'picker' | 'playerPicker' | 'dieResult'

interface DieType {
  sides: number
  label: string
  icon: Component
}

const dieTypes: DieType[] = [
  { sides: 4, label: 'D4', icon: IconDie4 },
  { sides: 6, label: 'D6', icon: IconDie6 },
  { sides: 8, label: 'D8', icon: IconDie8 },
  { sides: 20, label: 'D20', icon: IconDie20 },
]

const currentView = ref<ViewState>('picker')
const selectedDieSides = ref<number | null>(null)
const rollResult = ref<number | null>(null)
const displayValue = ref<number>(1)
const isRolling = ref(false)
const resultNumberRef = ref<HTMLElement>()
const selectedPlayerIds = ref<Set<string>>(new Set())
const highlightedPlayerId = ref<string | null>(null)
const winnerPlayerId = ref<string | null>(null)
let autoDismissTimer: ReturnType<typeof setTimeout> | null = null
let rollInterval: ReturnType<typeof setInterval> | null = null

const gamePlayers = computed(() => gameStore.currentGame?.players ?? [])

const currentDieIcon = computed(() => {
  const die = dieTypes.find((d) => d.sides === selectedDieSides.value)
  return die?.icon ?? IconDie6
})

function onEnter(el: Element, done: () => void) {
  const popup = (el as HTMLElement).querySelector('.dice-popup')
  gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2 })
  if (popup) {
    gsap.fromTo(
      popup,
      { scale: 0.8, opacity: 0, y: -20 },
      { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: 'back.out(2)', onComplete: done },
    )
  } else {
    done()
  }
}

function onLeave(el: Element, done: () => void) {
  const popup = (el as HTMLElement).querySelector('.dice-popup')
  if (popup) {
    gsap.to(popup, { scale: 0.8, opacity: 0, y: -10, duration: 0.2, ease: 'power2.in' })
  }
  gsap.to(el, { opacity: 0, duration: 0.2, onComplete: done })
}

function cryptoRandom(max: number): number {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return (array[0]! % max)
}

// --- Numeric die ---

function rollDie(sides: number) {
  clearAutoDismiss()
  if (rollInterval) {
    clearInterval(rollInterval)
    rollInterval = null
  }
  selectedDieSides.value = sides
  isRolling.value = true
  currentView.value = 'dieResult'
  playDiceRoll()

  const steps = 10
  const intervalMs = 60
  let step = 0

  rollInterval = setInterval(() => {
    displayValue.value = Math.floor(Math.random() * sides) + 1
    step++
    if (step >= steps) {
      if (rollInterval) clearInterval(rollInterval)
      rollInterval = null
      const finalValue = cryptoRandom(sides) + 1
      displayValue.value = finalValue
      rollResult.value = finalValue
      isRolling.value = false
      animateResult()
      startAutoDismiss()
    }
  }, intervalMs)
}

function reroll() {
  if (!selectedDieSides.value) return
  rollDie(selectedDieSides.value)
}

// --- Player picker ---

function openPlayerPicker() {
  currentView.value = 'playerPicker'
  selectedPlayerIds.value = new Set(gamePlayers.value.map((p) => p.id))
  highlightedPlayerId.value = null
  winnerPlayerId.value = null
}

function togglePlayer(playerId: string) {
  if (isRolling.value || winnerPlayerId.value) return
  const newSet = new Set(selectedPlayerIds.value)
  if (newSet.has(playerId)) {
    newSet.delete(playerId)
  } else {
    newSet.add(playerId)
  }
  selectedPlayerIds.value = newSet
}

function rollPlayer() {
  clearAutoDismiss()
  if (rollInterval) {
    clearTimeout(rollInterval as unknown as number)
    rollInterval = null
  }
  const candidates = gamePlayers.value.filter((p) => selectedPlayerIds.value.has(p.id))
  if (candidates.length < 2) return

  isRolling.value = true
  winnerPlayerId.value = null
  highlightedPlayerId.value = null

  // Animate: cycle through players with decelerating speed
  const totalSteps = 14 + Math.floor(Math.random() * 4) // 14-17 steps
  const baseInterval = 60
  let step = 0

  function tick() {
    const randomIndex = Math.floor(Math.random() * candidates.length)
    highlightedPlayerId.value = candidates[randomIndex]!.id
    step++

    if (step >= totalSteps) {
      // Final pick
      const finalIndex = cryptoRandom(candidates.length)
      const winner = candidates[finalIndex]!
      highlightedPlayerId.value = null
      winnerPlayerId.value = winner.id
      isRolling.value = false
      playVictory()

      // Bounce the winner row
      nextTick(() => {
        const winnerEl = document.querySelector(`.player-row--winner`)
        if (winnerEl) {
          gsap.fromTo(
            winnerEl,
            { scale: 1.06 },
            { scale: 1, duration: 0.4, ease: 'back.out(3)' },
          )
        }
      })

      startAutoReturn()
      return
    }

    // Decelerate: intervals get longer toward the end
    const progress = step / totalSteps
    const delay = baseInterval + progress * progress * 200
    rollInterval = setTimeout(tick, delay) as unknown as ReturnType<typeof setInterval>
  }

  tick()
}

// --- Navigation ---

function goBack() {
  cleanup()
  currentView.value = 'picker'
  selectedDieSides.value = null
  rollResult.value = null
  isRolling.value = false
  highlightedPlayerId.value = null
  winnerPlayerId.value = null
}

// --- Shared ---

function animateResult() {
  const element = resultNumberRef.value
  if (!element) return
  gsap.fromTo(
    element,
    { scale: 1.4, opacity: 0.6 },
    { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2)' },
  )
}

function startAutoDismiss() {
  clearAutoDismiss()
  autoDismissTimer = setTimeout(() => {
    handleClose()
  }, 4000)
}

function startAutoReturn() {
  clearAutoDismiss()
  autoDismissTimer = setTimeout(() => {
    goBack()
  }, 3000)
}

function clearAutoDismiss() {
  if (autoDismissTimer) {
    clearTimeout(autoDismissTimer)
    autoDismissTimer = null
  }
}

function cleanup() {
  clearAutoDismiss()
  if (rollInterval) {
    clearTimeout(rollInterval as unknown as number)
    rollInterval = null
  }
}

function resetState() {
  currentView.value = 'picker'
  selectedDieSides.value = null
  rollResult.value = null
  isRolling.value = false
  highlightedPlayerId.value = null
  winnerPlayerId.value = null
}

function handleClose() {
  cleanup()
  resetState()
  emit('close')
}

watch(() => props.isOpen, (open) => {
  if (open) {
    resetState()
  } else {
    cleanup()
  }
})
</script>

<style scoped>
.dice-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: calc(var(--ion-safe-area-top, 44px) + 56px);
  padding-left: 16px;
  padding-right: 16px;
  background: rgba(0, 0, 0, 0.5);
}

.dice-popup {
  position: relative;
  background: var(--ion-color-step-100, #1c2138);
  border: 1px solid rgba(212, 168, 67, 0.15);
  border-radius: 20px;
  padding: 16px;
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.5),
    0 0 20px rgba(232, 96, 10, 0.08);
  min-width: 240px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - var(--ion-safe-area-top, 44px) - 100px);
  overflow-y: auto;
}

/* --- Back button --- */

.back-btn {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  border: none;
  color: var(--color-arena-gold-light, #f0d078);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 150ms ease, transform 150ms ease;
  z-index: 1;
}

.back-btn:active {
  transform: scale(0.9);
  background: rgba(255, 255, 255, 0.12);
}

/* --- Die picker --- */

.dice-row {
  display: flex;
  gap: 6px;
}

.die-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex: 1;
  padding: 14px 4px;
  min-height: 48px;
  min-width: 44px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--text-primary, #fff);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 150ms ease, transform 150ms ease, box-shadow 150ms ease;
}

.die-button:active {
  transform: scale(0.93);
  background: rgba(232, 96, 10, 0.15);
  box-shadow: 0 0 12px rgba(232, 96, 10, 0.3);
}

.die-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  opacity: 0.8;
}

/* --- Player picker --- */

.player-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 220px;
  padding-top: 28px;
}

.player-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  min-height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 2px solid transparent;
  color: var(--text-primary, #fff);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 120ms ease;
}

.player-row:disabled {
  cursor: default;
}

.player-row--selected {
  background: rgba(232, 96, 10, 0.08);
  border-color: rgba(232, 96, 10, 0.25);
}

.player-row--unselected {
  opacity: 0.35;
}

.player-row--highlight {
  background: rgba(232, 96, 10, 0.2);
  border-color: var(--color-accent, #e8600a);
  box-shadow: 0 0 12px rgba(232, 96, 10, 0.4);
}

.player-row--winner {
  background: rgba(232, 96, 10, 0.2);
  border-color: var(--color-accent, #e8600a);
  box-shadow: 0 0 16px rgba(232, 96, 10, 0.5), 0 0 32px rgba(232, 96, 10, 0.2);
}

.player-row--dimmed {
  opacity: 0.35;
}

.player-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.player-name {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  text-align: left;
}

.player-check {
  font-size: 14px;
  color: var(--color-accent, #e8600a);
}

.roll-btn {
  margin-top: 4px;
  width: 100%;
  padding: 14px;
  min-height: 48px;
  text-align: center;
  font-size: 15px;
}

.roll-btn:disabled {
  opacity: 0.35;
  pointer-events: none;
}

/* --- Results --- */

.result-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 16px 8px;
}

.result-die-icon {
  opacity: 0.4;
}

.result-number {
  font-size: 56px;
  font-weight: 900;
  color: #fff;
  text-shadow: 0 0 20px rgba(232, 96, 10, 0.6), 0 0 40px rgba(232, 96, 10, 0.3);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.action-btn {
  padding: 12px 28px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  min-height: 44px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 150ms ease;
  border: none;
  margin-top: 8px;
}

.action-btn--primary {
  background: rgba(232, 96, 10, 0.15);
  color: var(--color-accent, #e8600a);
  border: 1px solid rgba(232, 96, 10, 0.3);
}

.action-btn--primary:active {
  background: rgba(232, 96, 10, 0.3);
  transform: scale(0.95);
}
</style>
