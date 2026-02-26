<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center justify-center px-4 py-2">
      <span class="text-sm font-semibold text-text-secondary">{{ t('seating.title') }}</span>
    </div>

    <div class="relative min-h-0 flex-1">
      <div
        ref="seatingGridRef"
        class="grid h-full gap-2 p-2"
        :style="gridStyle"
      >
        <div
          v-for="(player, index) in gameStore.currentGame?.players"
          :key="player.id"
          class="min-h-0 min-w-0 overflow-hidden"
          :class="cardOuterClasses(index)"
          :style="cardOuterStyle(index)"
          :data-player-index="index"
        >
          <div
            class="seating-card h-full"
            :style="cardRotationStyle(index)"
            :class="{
              'seating-card--dragging': dragSourceIndex === index,
              'seating-card--drop-target': dragTargetIndex === index,
            }"
            :data-player-index="index"
            @touchstart.passive="onCardTouchStart($event, index)"
            @touchmove="onCardTouchMove($event)"
            @touchend="onCardTouchEnd"
            @touchcancel="onCardTouchCancel"
          >
            <div
              class="seating-card-bg"
              :style="{ background: `var(--color-mana-${player.color})` }"
            />
            <div class="seating-card-content">
              <div class="seating-grip">⠿</div>
              <span class="seating-name">{{ player.name }}</span>
              <span
                v-if="player.commanders.length"
                class="seating-commander"
              >{{ player.commanders[0]?.cardName }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Rotation dial overlay -->
      <div
        ref="dialContainerRef"
        class="dial-overlay"
        @touchstart.prevent="onDialTouchStart"
        @touchmove.prevent="onDialTouchMove"
        @touchend="onDialTouchEnd"
        @touchcancel="onDialTouchEnd"
      >
        <svg
          class="dial-svg"
          :class="{ 'dial-svg--snapping': isDialSnapping }"
          :style="{ transform: `rotate(${dialAngle}deg)` }"
          viewBox="0 0 100 100"
          width="96"
          height="96"
        >
          <!-- Outer ring -->
          <circle
            cx="50" cy="50" r="46"
            fill="rgba(0, 0, 0, 0.5)"
            stroke="rgba(255, 255, 255, 0.12)"
            stroke-width="2"
          />
          <!-- Grip ring (dashed) -->
          <circle
            cx="50" cy="50" r="38"
            fill="none"
            stroke="rgba(255, 255, 255, 0.06)"
            stroke-width="1"
            stroke-dasharray="4 6"
          />
          <!-- Player tick marks -->
          <line
            v-for="tickIndex in playerCount"
            :key="tickIndex"
            :x1="50 + 40 * Math.sin((tickIndex - 1) * (2 * Math.PI / playerCount))"
            :y1="50 - 40 * Math.cos((tickIndex - 1) * (2 * Math.PI / playerCount))"
            :x2="50 + 46 * Math.sin((tickIndex - 1) * (2 * Math.PI / playerCount))"
            :y2="50 - 46 * Math.cos((tickIndex - 1) * (2 * Math.PI / playerCount))"
            stroke="rgba(255, 255, 255, 0.25)"
            stroke-width="2"
            stroke-linecap="round"
          />
          <!-- Indicator dot at 12 o'clock -->
          <circle
            cx="50" cy="10"
            r="5"
            fill="var(--color-arena-gold-light, #f0d078)"
            opacity="0.85"
          />
          <!-- Center dot -->
          <circle
            cx="50" cy="50"
            r="3"
            fill="rgba(255, 255, 255, 0.2)"
          />
        </svg>
      </div>
    </div>

    <div class="flex items-center justify-center px-4 py-3">
      <button class="validate-btn" data-sound="none" @click="handleValidate">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>{{ t('seating.validate') }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGameStore } from '@/stores/gameStore'
import { usePlayerGridLayout } from '@/composables/usePlayerGridLayout'
import { isDragLocked } from '@/composables/useDragLock'

const { t } = useI18n()
const gameStore = useGameStore()
const { gridStyle, cardOuterClasses, cardOuterStyle, cardRotationStyle, getSlot, clockwiseSlotOrder } = usePlayerGridLayout()

const seatingGridRef = ref<HTMLElement | null>(null)
const playerCount = computed(() => gameStore.currentGame?.players.length ?? 4)

// ─── Card drag-to-swap ───────────────────────────────────────────────
const dragSourceIndex = ref<number | null>(null)
const dragTargetIndex = ref<number | null>(null)
let cardDragActive = false
let cardDragStartX = 0
let cardDragStartY = 0
let dragIndicator: HTMLElement | null = null
const DRAG_THRESHOLD = 15

// ─── Rotation dial ───────────────────────────────────────────────────
const dialContainerRef = ref<HTMLElement | null>(null)
const dialAngle = ref(0)
const isDialSnapping = ref(false)
let lastFingerAngle = 0
let dragDeltaAccumulator = 0
let stepsInCurrentDrag = 0
let dialDragActive = false

onMounted(() => {
  if (!gameStore.currentGame?.customPositionMap) {
    const count = gameStore.currentGame?.players.length ?? 0
    const initialMap = Array.from({ length: count }, (_, i) => getSlot(i))
    gameStore.setCustomPositionMap(initialMap)
  }
})

function handleValidate() {
  gameStore.setGamePhase('initiative')
}

// ─── FLIP card slide animation ───────────────────────────────────────

function rotatePositionsClockwise(direction: 1 | -1) {
  const game = gameStore.currentGame
  if (!game) return

  const count = game.players.length
  const currentMap = game.customPositionMap ?? Array.from({ length: count }, (_, i) => i)
  const order = clockwiseSlotOrder.value

  const newMap = currentMap.map(currentSlot => {
    const indexInOrder = order.indexOf(currentSlot)
    if (indexInOrder === -1) return currentSlot
    const nextIndex = (indexInOrder + direction + order.length) % order.length
    return order[nextIndex]!
  })

  gameStore.setCustomPositionMap(newMap)
}

function animatedRotatePositions(direction: 1 | -1) {
  const gridElement = seatingGridRef.value
  if (!gridElement) {
    rotatePositionsClockwise(direction)
    return
  }

  const cells = Array.from(gridElement.children) as HTMLElement[]

  cells.forEach(cell => {
    cell.style.transition = 'none'
    cell.style.translate = ''
  })
  gridElement.getBoundingClientRect()

  const firstRects = cells.map(cell => cell.getBoundingClientRect())

  rotatePositionsClockwise(direction)

  nextTick(() => {
    cells.forEach((cell, i) => {
      const last = cell.getBoundingClientRect()
      const dx = firstRects[i]!.left - last.left
      const dy = firstRects[i]!.top - last.top

      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return

      cell.style.transition = 'none'
      cell.style.translate = `${dx}px ${dy}px`
    })

    gridElement.getBoundingClientRect()

    cells.forEach(cell => {
      if (cell.style.translate && cell.style.translate !== '0px 0px') {
        cell.style.transition = 'translate 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
        cell.style.translate = '0 0'
      }
    })

    setTimeout(() => {
      cells.forEach(cell => {
        cell.style.transition = ''
        cell.style.translate = ''
      })
    }, 400)
  })
}

// ─── Dial rotation logic ─────────────────────────────────────────────

function getFingerAngleFromDialCenter(clientX: number, clientY: number): number {
  const container = dialContainerRef.value
  if (!container) return 0
  const rect = container.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  return Math.atan2(clientX - centerX, -(clientY - centerY))
}

function vibrate() {
  navigator.vibrate?.(10)
}

function onDialTouchStart(event: TouchEvent) {
  const touch = event.touches[0]!
  lastFingerAngle = getFingerAngleFromDialCenter(touch.clientX, touch.clientY)
  dragDeltaAccumulator = 0
  stepsInCurrentDrag = 0
  isDialSnapping.value = false
  dialDragActive = true
  isDragLocked.value = true
}

function onDialTouchMove(event: TouchEvent) {
  if (!dialDragActive) return
  const touch = event.touches[0]!
  const currentFingerAngle = getFingerAngleFromDialCenter(touch.clientX, touch.clientY)

  let delta = currentFingerAngle - lastFingerAngle
  if (delta > Math.PI) delta -= 2 * Math.PI
  if (delta < -Math.PI) delta += 2 * Math.PI

  const deltaDegrees = delta * (180 / Math.PI)
  dialAngle.value += deltaDegrees
  dragDeltaAccumulator += deltaDegrees
  lastFingerAngle = currentFingerAngle

  const stepDegrees = 360 / playerCount.value
  const targetSteps = Math.round(dragDeltaAccumulator / stepDegrees)

  while (stepsInCurrentDrag < targetSteps) {
    animatedRotatePositions(1)
    stepsInCurrentDrag++
    vibrate()
  }
  while (stepsInCurrentDrag > targetSteps) {
    animatedRotatePositions(-1)
    stepsInCurrentDrag--
    vibrate()
  }
}

function onDialTouchEnd() {
  if (!dialDragActive) return
  dialDragActive = false
  isDragLocked.value = false

  const stepDegrees = 360 / playerCount.value
  const snappedAngle = Math.round(dialAngle.value / stepDegrees) * stepDegrees
  isDialSnapping.value = true
  dialAngle.value = snappedAngle

  setTimeout(() => {
    isDialSnapping.value = false
  }, 200)
}

// ─── Card drag-to-swap logic ─────────────────────────────────────────

function onCardTouchStart(event: TouchEvent, playerIndex: number) {
  const touch = event.touches[0]!
  cardDragStartX = touch.clientX
  cardDragStartY = touch.clientY
  dragSourceIndex.value = playerIndex
  cardDragActive = false
}

function onCardTouchMove(event: TouchEvent) {
  if (dragSourceIndex.value === null) return
  const touch = event.touches[0]!
  const deltaX = touch.clientX - cardDragStartX
  const deltaY = touch.clientY - cardDragStartY

  if (!cardDragActive && Math.hypot(deltaX, deltaY) > DRAG_THRESHOLD) {
    cardDragActive = true
    isDragLocked.value = true
    createDragIndicator(touch.clientX, touch.clientY)
  }

  if (cardDragActive) {
    event.preventDefault()
    moveDragIndicator(touch.clientX, touch.clientY)
    updateDropTarget(touch.clientX, touch.clientY)
  }
}

function onCardTouchEnd() {
  if (cardDragActive && dragSourceIndex.value !== null && dragTargetIndex.value !== null) {
    animateSwap(dragSourceIndex.value, dragTargetIndex.value)
  }
  cleanupCardDrag()
}

function animateSwap(sourceIndex: number, targetIndex: number) {
  const gridElement = seatingGridRef.value
  if (!gridElement) {
    gameStore.swapPlayerPositions(sourceIndex, targetIndex)
    return
  }

  const cells = Array.from(gridElement.children) as HTMLElement[]
  const sourceCell = cells[sourceIndex]
  const targetCell = cells[targetIndex]
  if (!sourceCell || !targetCell) {
    gameStore.swapPlayerPositions(sourceIndex, targetIndex)
    return
  }

  const sourceRect = sourceCell.getBoundingClientRect()
  const targetRect = targetCell.getBoundingClientRect()

  gameStore.swapPlayerPositions(sourceIndex, targetIndex)
  vibrate()

  nextTick(() => {
    const affected = [
      { cell: sourceCell, firstRect: sourceRect },
      { cell: targetCell, firstRect: targetRect },
    ]

    affected.forEach(({ cell, firstRect }) => {
      const lastRect = cell.getBoundingClientRect()
      const dx = firstRect.left - lastRect.left
      const dy = firstRect.top - lastRect.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return

      cell.style.transition = 'none'
      cell.style.translate = `${dx}px ${dy}px`
      cell.style.zIndex = '5'
    })

    gridElement.getBoundingClientRect()

    affected.forEach(({ cell }) => {
      if (cell.style.translate && cell.style.translate !== '0px 0px') {
        cell.style.transition = 'translate 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
        cell.style.translate = '0 0'
      }
    })

    setTimeout(() => {
      affected.forEach(({ cell }) => {
        cell.style.transition = ''
        cell.style.translate = ''
        cell.style.zIndex = ''
      })
    }, 450)
  })
}

function onCardTouchCancel() {
  cleanupCardDrag()
}

function cleanupCardDrag() {
  cardDragActive = false
  dragSourceIndex.value = null
  dragTargetIndex.value = null
  isDragLocked.value = false
  if (dragIndicator) {
    dragIndicator.remove()
    dragIndicator = null
  }
}

function createDragIndicator(x: number, y: number) {
  if (dragSourceIndex.value === null) return
  const player = gameStore.currentGame?.players[dragSourceIndex.value]
  if (!player) return

  dragIndicator = document.createElement('div')
  dragIndicator.className = 'seating-drag-indicator'
  dragIndicator.innerHTML = `
    <span class="drag-dot" style="background: var(--color-mana-${player.color})"></span>
    <span class="drag-name">${player.name}</span>
  `
  dragIndicator.style.left = `${x}px`
  dragIndicator.style.top = `${y}px`
  document.body.appendChild(dragIndicator)
}

function moveDragIndicator(x: number, y: number) {
  if (!dragIndicator) return
  dragIndicator.style.left = `${x}px`
  dragIndicator.style.top = `${y}px`
}

function updateDropTarget(x: number, y: number) {
  if (!dragIndicator) return
  dragIndicator.style.display = 'none'
  const element = document.elementFromPoint(x, y)
  dragIndicator.style.display = ''

  const card = element?.closest('[data-player-index]') as HTMLElement | null
  const targetIndex = card ? parseInt(card.dataset.playerIndex!, 10) : null

  if (targetIndex !== null && targetIndex !== dragSourceIndex.value) {
    dragTargetIndex.value = targetIndex
  } else {
    dragTargetIndex.value = null
  }
}
</script>

<style scoped>
.seating-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.seating-card-bg {
  position: absolute;
  inset: 0;
  opacity: 0.12;
}

.seating-card-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  text-align: center;
}

.seating-grip {
  font-size: 1.25rem;
  opacity: 0.3;
  letter-spacing: 2px;
  line-height: 1;
}

.seating-name {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary, #fff);
}

.seating-commander {
  font-size: 0.6875rem;
  color: var(--text-secondary, rgba(255, 255, 255, 0.5));
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seating-card--dragging {
  opacity: 0.4;
  transform: scale(0.95);
}

.seating-card--drop-target {
  border-color: var(--color-accent, #e8600a);
  box-shadow: inset 0 0 0 2px rgba(232, 96, 10, 0.3), 0 0 16px rgba(232, 96, 10, 0.3);
}

/* ─── Dial ──────────────────────────────────────────────────────────── */

.dial-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 10;
}

.dial-svg {
  pointer-events: auto;
  touch-action: none;
  filter: drop-shadow(0 0 12px rgba(0, 0, 0, 0.5));
  cursor: grab;
}

.dial-svg:active {
  cursor: grabbing;
}

.dial-svg--snapping {
  transition: transform 0.2s ease-out;
}

/* ─── Validate ──────────────────────────────────────────────────────── */

.validate-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  background: rgba(232, 96, 10, 0.15);
  border: 1px solid rgba(232, 96, 10, 0.3);
  color: var(--color-accent, #e8600a);
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.15s ease;
}

.validate-btn:active {
  transform: scale(0.95);
  background: rgba(232, 96, 10, 0.3);
}
</style>

<style>
.seating-drag-indicator {
  position: fixed;
  z-index: 999999;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(232, 96, 10, 0.4);
  pointer-events: none;
  transform: translate(-50%, -120%);
  white-space: nowrap;
}

.drag-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.drag-name {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}
</style>
