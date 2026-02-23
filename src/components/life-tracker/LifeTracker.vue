<template>
  <div
    class="relative flex flex-col items-center justify-between overflow-hidden rounded-2xl border-2 p-2"
    :class="[
      playerBgClass,
      turnBorderClass,
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
      :aria-label="t('aria.playerDetails', { name: player.name })"
      @click="showDetail = true"
    >
      <span class="text-[10px] font-medium uppercase tracking-wider text-white/70">
        {{ player.name }}
      </span>
      <span v-if="player.commanders.length > 0" class="block truncate text-[11px] text-white/60">
        {{ player.commanders.map(c => c.cardName).join(' / ') }}
      </span>
    </button>

    <!-- Player timers -->
    <div class="flex items-center justify-center gap-1.5 font-mono text-[10px] tabular-nums">
      <span class="text-white/40" :title="t('game.totalPlayTime')">{{ formattedPlayerTotalTime }}</span>
      <span class="text-white/20">&middot;</span>
      <span
        :class="isCurrentTurn ? 'text-arena-gold-light' : 'text-white/30'"
        :title="t('game.turnTime')"
      >
        {{ formattedPlayerTurnTime }}
      </span>
    </div>

    <!-- Life total + buttons -->
    <div class="flex items-center gap-2">
      <button
        class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 text-xl font-bold text-life-negative life-btn"
        :aria-label="t('aria.decreaseLife', { name: player.name })"
        @click="changeLifeBy(-1)"
      >
        -
      </button>

      <span
        class="relative min-w-[4.5rem] select-none text-center text-6xl font-bold tabular-nums"
        :class="lifeColorClass"
        role="status"
        :aria-label="t('aria.lifePoints', { name: player.name, life: player.lifeTotal })"
        @touchstart.passive="onLifeTouchStart"
        @touchmove="onLifeTouchMove"
        @touchend.passive="onLifeTouchEnd"
        @touchcancel.passive="onLifeTouchCancel"
      >
        {{ animatedLife }}
        <!-- Life drag indicator -->
        <span
          v-if="lifeDragPendingAmount !== 0"
          class="absolute -top-5 left-1/2 -translate-x-1/2 text-lg font-bold drop-shadow-lg"
          :class="lifeDragPendingAmount > 0 ? 'text-life-positive' : 'text-life-negative'"
        >
          {{ lifeDragPendingAmount > 0 ? '+' : '' }}{{ lifeDragPendingAmount }}
        </span>
      </span>

      <button
        class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 text-xl font-bold text-life-positive life-btn"
        :aria-label="t('aria.increaseLife', { name: player.name })"
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
        class="min-h-[36px] min-w-[40px] rounded px-2 py-1 text-[11px] font-medium btn-press"
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
        class="flex min-h-[44px] min-w-[44px] items-center justify-center gap-0.5 rounded-full px-2 py-1 btn-press"
        :class="player.poisonCounters > 0 ? 'bg-poison/20' : 'bg-white/5'"
        :aria-label="t('aria.poison', { count: player.poisonCounters })"
        @click="changePoisonBy(1)"
        @contextmenu.prevent="changePoisonBy(-1)"
        @touchstart.passive="startPoisonLongPress"
        @touchend.passive="cancelPoisonLongPress"
        @touchcancel.passive="cancelPoisonLongPress"
      >
        <span class="text-xs" :class="player.poisonCounters > 0 ? 'text-poison font-bold' : 'text-white/50'">
          {{ player.poisonCounters }}P
        </span>
      </button>

      <!-- Commander damage (tap to open modal, drag to another player) -->
      <button
        class="flex min-h-[44px] min-w-[44px] items-center justify-center gap-0.5 rounded-full px-2 py-1 btn-press"
        :class="totalCommanderDamage > 0 ? 'bg-commander-damage/20' : 'bg-white/5'"
        :aria-label="t('aria.commanderDamage', { damage: totalCommanderDamage })"
        :data-commander-player="player.id"
        @click="onCommanderClick"
        @touchstart.passive="onCommanderTouchStart"
        @touchmove="onCommanderTouchMove"
        @touchend.passive="onCommanderTouchEnd"
        @touchcancel.passive="onCommanderTouchCancel"
      >
        <span class="text-xs" :class="totalCommanderDamage > 0 ? 'text-commander-damage font-bold' : 'text-white/50'">
          {{ totalCommanderDamage }}C
        </span>
      </button>

      <!-- Experience (visible if > 0) -->
      <button
        v-if="player.experienceCounters > 0"
        class="flex min-h-[32px] items-center gap-0.5 rounded-full bg-blue-500/20 px-2 py-1 btn-press"
        @click="showDetail = true"
      >
        <span class="text-xs font-bold text-blue-400">{{ player.experienceCounters }}E</span>
      </button>

      <!-- Energy (visible if > 0) -->
      <button
        v-if="player.energyCounters > 0"
        class="flex min-h-[32px] items-center gap-0.5 rounded-full bg-yellow-500/20 px-2 py-1 btn-press"
        @click="showDetail = true"
      >
        <span class="text-xs font-bold text-yellow-400">{{ player.energyCounters }}N</span>
      </button>

      <!-- Monarch indicator -->
      <span v-if="player.isMonarch" class="rounded-full bg-mana-gold/40 px-2 py-0.5 text-xs font-bold text-arena-gold-light shadow-glow-gold">
        M
      </span>

      <!-- Initiative indicator -->
      <span v-if="player.hasInitiative" class="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-white/80">
        I
      </span>

      <!-- Commander tax -->
      <span
        v-for="(commander, commanderIndex) in player.commanders"
        :key="commanderIndex"
        class="rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/50"
      >
        T{{ gameStore.getCommanderTax(player, commanderIndex) }}
      </span>
    </div>

    <!-- Turn / Priority action buttons -->
    <div class="flex justify-center gap-1.5">
      <button
        v-if="showEndTurnButton"
        class="min-h-[32px] rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/70 btn-press"
        @click="handleEndTurn"
      >
        {{ t('game.endTurn') }}
      </button>

      <button
        v-if="showStartTurnButton"
        class="min-h-[32px] rounded-full bg-life-positive/15 px-3 py-1 text-[11px] font-medium text-life-positive btn-press"
        @click="handleStartTurn"
      >
        {{ t('game.startTurn') }}
      </button>

      <button
        v-if="showRespondButton"
        class="min-h-[32px] rounded-full bg-mana-blue/20 px-3 py-1 text-[11px] font-medium text-blue-400 btn-press"
        @click="handleRespond"
      >
        {{ t('game.respond') }}
      </button>

      <button
        v-if="showReleasePriorityButton"
        class="min-h-[32px] rounded-full bg-arena-gold-light/15 px-3 py-1 text-[11px] font-medium text-arena-gold-light btn-press"
        @click="handleReleasePriority"
      >
        {{ t('game.releasePriority') }}
      </button>
    </div>

    <!-- Death overlay (animated) -->
    <Transition name="death-overlay">
      <div
        v-if="deathReason"
        class="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        role="alert"
        :aria-label="t('aria.playerEliminated', { name: player.name, reason: deathReason })"
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
      :initial-attacker-id="commanderDamageInitialAttackerId"
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
import { isDragLocked } from '@/composables/useDragLock'
import { tapFeedback, lifeFeedback, heavyFeedback, warningFeedback } from '@/services/haptics'
import { playLifeChange, playLargeLifeChange, playPoisonChange, playPlayerDeath, playMonarchCrown } from '@/services/sounds'
import { useAnimatedNumber } from '@/composables/useAnimatedNumber'
import { useCelebration } from '@/composables/useCelebration'
import PlayerDetailModal from './PlayerDetailModal.vue'
import CommanderDamageModal from './CommanderDamageModal.vue'

const props = defineProps<{
  player: PlayerState
  isCurrentTurn: boolean
  commanderDamageAttackerId?: string | null
}>()

const emit = defineEmits<{
  stateChanged: []
  turnAdvanced: []
  commanderDragDrop: [targetPlayerId: string]
}>()

const { t } = useI18n()
const gameStore = useGameStore()
const settingsStore = useSettingsStore()

const showDetail = ref(false)
const showCommanderDamage = ref(false)
const flashType = ref<'positive' | 'negative' | null>(null)

const { monarchCrown, playerEliminated } = useCelebration()

const animatedLife = useAnimatedNumber(() => props.player.lifeTotal)

const totalCommanderDamage = computed(() =>
  Object.values(props.player.commanderDamageReceived).reduce((sum, damage) => sum + damage, 0),
)

// Per-player time tracking
const playerTotalPlayTimeMs = computed(() =>
  gameStore.currentGame?.playerPlayTimeMs?.[props.player.id] ?? 0,
)

const playerTurnTimeMs = computed(() =>
  gameStore.currentGame?.playerTurnTimeMs?.[props.player.id] ?? 0,
)

function formatTimeMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const minutesPadded = String(minutes).padStart(2, '0')
  const secondsPadded = String(seconds).padStart(2, '0')
  if (hours > 0) return `${hours}:${minutesPadded}:${secondsPadded}`
  return `${minutesPadded}:${secondsPadded}`
}

const formattedPlayerTotalTime = computed(() => formatTimeMs(playerTotalPlayTimeMs.value))
const formattedPlayerTurnTime = computed(() => formatTimeMs(playerTurnTimeMs.value))

// Priority system
const isActivePlayer = computed(() => props.player.id === gameStore.currentTurnPlayer?.id)
const isNextPlayer = computed(() => props.player.id === gameStore.nextTurnPlayer?.id)
const isPriorityTaken = computed(() =>
  gameStore.currentGame?.priorityPlayerId != null,
)
const hasPriority = computed(() => {
  const effectiveId = gameStore.currentGame?.priorityPlayerId ?? gameStore.currentTurnPlayer?.id
  return props.player.id === effectiveId
})

// Turn / priority border
const turnBorderClass = computed(() => {
  if (isActivePlayer.value) return 'border-arena-orange'
  if (hasPriority.value && isPriorityTaken.value) return 'border-dashed border-blue-400'
  return 'border-transparent'
})

// Button visibility
const showEndTurnButton = computed(() => isActivePlayer.value)
const showStartTurnButton = computed(() => isNextPlayer.value && !isActivePlayer.value && !isPriorityTaken.value)
const showRespondButton = computed(() =>
  !isActivePlayer.value && !hasPriority.value,
)
const showReleasePriorityButton = computed(() =>
  isPriorityTaken.value && hasPriority.value && !isActivePlayer.value,
)

function handleEndTurn() {
  gameStore.advanceTurn()
  if (settingsStore.hapticFeedback) tapFeedback()
  emit('turnAdvanced')
  emit('stateChanged')
}

function handleStartTurn() {
  gameStore.advanceTurn()
  if (settingsStore.hapticFeedback) tapFeedback()
  emit('turnAdvanced')
  emit('stateChanged')
}

function handleRespond() {
  gameStore.takePriority(props.player.id)
  if (settingsStore.hapticFeedback) tapFeedback()
  emit('stateChanged')
}

function handleReleasePriority() {
  gameStore.releasePriority()
  if (settingsStore.hapticFeedback) tapFeedback()
  emit('stateChanged')
}

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
  if (props.player.lifeTotal <= 0) return t('game.deathLife')
  if (gameStore.isPlayerDeadByPoison(props.player)) return t('game.deathPoison')
  if (gameStore.isPlayerDeadByCommanderDamage(props.player)) return t('game.deathCommander')
  return null
})

watch(deathReason, (newValue, oldValue) => {
  if (newValue && !oldValue) {
    playerEliminated()
    playPlayerDeath()
  }
})

watch(() => props.player.isMonarch, (newValue, oldValue) => {
  if (newValue && !oldValue) {
    monarchCrown()
    playMonarchCrown()
  }
})

onUnmounted(() => {
  cancelPoisonLongPress()
})

// --- Life drag gesture ---

let lifeDragActive = false
let lifeDragStartX = 0
let lifeDragStartY = 0
const lifeDragPendingAmount = ref(0)
const LIFE_DRAG_PIXELS_PER_POINT = 25
const LIFE_DRAG_THRESHOLD = 10

function onLifeTouchStart(event: TouchEvent) {
  const touch = event.touches[0]
  if (!touch) return
  lifeDragActive = false
  lifeDragStartX = touch.clientX
  lifeDragStartY = touch.clientY
  lifeDragPendingAmount.value = 0
}

function onLifeTouchMove(event: TouchEvent) {
  const touch = event.touches[0]
  if (!touch) return

  const deltaX = touch.clientX - lifeDragStartX
  const deltaY = touch.clientY - lifeDragStartY

  if (!lifeDragActive && Math.hypot(deltaX, deltaY) > LIFE_DRAG_THRESHOLD) {
    lifeDragActive = true
    isDragLocked.value = true
  }

  if (lifeDragActive) {
    event.preventDefault()
    // Use dominant axis: up/right = gain, down/left = loss
    const rawAmount = Math.abs(deltaX) > Math.abs(deltaY)
      ? deltaX / LIFE_DRAG_PIXELS_PER_POINT
      : -deltaY / LIFE_DRAG_PIXELS_PER_POINT
    lifeDragPendingAmount.value = Math.round(rawAmount)
  }
}

function onLifeTouchEnd() {
  if (lifeDragActive && lifeDragPendingAmount.value !== 0) {
    changeLifeBy(lifeDragPendingAmount.value)
  }
  lifeDragActive = false
  isDragLocked.value = false
  lifeDragPendingAmount.value = 0
}

function onLifeTouchCancel() {
  lifeDragActive = false
  isDragLocked.value = false
  lifeDragPendingAmount.value = 0
}

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

  // Sound effect
  if (Math.abs(amount) >= 5) {
    playLargeLifeChange(amount > 0)
  } else {
    playLifeChange(amount > 0)
  }

  emit('stateChanged')
}

function changePoisonBy(amount: number) {
  gameStore.changePoison(props.player.id, amount)
  if (settingsStore.hapticFeedback) tapFeedback()
  playPoisonChange()
  emit('stateChanged')
}

// Long-press to decrement poison on mobile (no right-click on touch)
let poisonLongPressTimer: ReturnType<typeof setTimeout> | null = null
function startPoisonLongPress() {
  poisonLongPressTimer = setTimeout(() => {
    changePoisonBy(-1)
    if (settingsStore.hapticFeedback) heavyFeedback()
    poisonLongPressTimer = null
  }, 500)
}
function cancelPoisonLongPress() {
  if (poisonLongPressTimer) {
    clearTimeout(poisonLongPressTimer)
    poisonLongPressTimer = null
  }
}

// --- Commander damage drag-drop ---

const commanderDamageInitialAttackerId = ref<string | null>(null)
let commanderDragActive = false
let commanderDragStartX = 0
let commanderDragStartY = 0
let commanderDragIndicator: HTMLElement | null = null
const DRAG_THRESHOLD = 10

// Watch external prop to open modal with pre-selected attacker
watch(() => props.commanderDamageAttackerId, (attackerId) => {
  if (attackerId) {
    commanderDamageInitialAttackerId.value = attackerId
    showCommanderDamage.value = true
  }
})

function onCommanderClick() {
  // Only open on tap, not after drag
  if (!commanderDragActive) {
    commanderDamageInitialAttackerId.value = null
    showCommanderDamage.value = true
  }
}

function onCommanderTouchStart(event: TouchEvent) {
  const touch = event.touches[0]
  if (!touch) return
  commanderDragActive = false
  commanderDragStartX = touch.clientX
  commanderDragStartY = touch.clientY
}

function onCommanderTouchMove(event: TouchEvent) {
  const touch = event.touches[0]
  if (!touch) return

  const deltaX = touch.clientX - commanderDragStartX
  const deltaY = touch.clientY - commanderDragStartY

  if (!commanderDragActive && Math.hypot(deltaX, deltaY) > DRAG_THRESHOLD) {
    commanderDragActive = true
    isDragLocked.value = true
    createCommanderDragIndicator()
  }

  if (commanderDragActive) {
    event.preventDefault()
    moveCommanderDragIndicator(touch.clientX, touch.clientY)
    highlightDropTarget(touch.clientX, touch.clientY)
  }
}

function onCommanderTouchEnd(event: TouchEvent) {
  if (commanderDragActive) {
    const touch = event.changedTouches[0]
    if (touch) {
      const targetPlayerId = findDropTarget(touch.clientX, touch.clientY)
      if (targetPlayerId && targetPlayerId !== props.player.id) {
        emit('commanderDragDrop', targetPlayerId)
      }
    }
    clearDropHighlights()
    removeCommanderDragIndicator()
    commanderDragActive = false
    isDragLocked.value = false
    return
  }
  commanderDragActive = false
}

function onCommanderTouchCancel() {
  clearDropHighlights()
  removeCommanderDragIndicator()
  commanderDragActive = false
  isDragLocked.value = false
}

function createCommanderDragIndicator() {
  commanderDragIndicator = document.createElement('div')
  commanderDragIndicator.textContent = `⚔ ${props.player.name}`
  Object.assign(commanderDragIndicator.style, {
    position: 'fixed',
    zIndex: '9999',
    pointerEvents: 'none',
    padding: '6px 14px',
    borderRadius: '999px',
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    transform: 'translate(-50%, -120%)',
    whiteSpace: 'nowrap',
  })
  document.body.appendChild(commanderDragIndicator)
}

function moveCommanderDragIndicator(x: number, y: number) {
  if (commanderDragIndicator) {
    commanderDragIndicator.style.left = `${x}px`
    commanderDragIndicator.style.top = `${y}px`
  }
}

function removeCommanderDragIndicator() {
  commanderDragIndicator?.remove()
  commanderDragIndicator = null
}

function findDropTarget(x: number, y: number): string | null {
  // Temporarily hide indicator to get element underneath
  if (commanderDragIndicator) commanderDragIndicator.style.display = 'none'
  const element = document.elementFromPoint(x, y)
  if (commanderDragIndicator) commanderDragIndicator.style.display = ''

  const commanderButton = element?.closest('[data-commander-player]') as HTMLElement | null
  return commanderButton?.dataset.commanderPlayer ?? null
}

function highlightDropTarget(x: number, y: number) {
  clearDropHighlights()
  if (commanderDragIndicator) commanderDragIndicator.style.display = 'none'
  const element = document.elementFromPoint(x, y)
  if (commanderDragIndicator) commanderDragIndicator.style.display = ''

  const commanderButton = element?.closest('[data-commander-player]') as HTMLElement | null
  if (commanderButton && commanderButton.dataset.commanderPlayer !== props.player.id) {
    commanderButton.style.outline = '2px solid #f59e0b'
    commanderButton.style.outlineOffset = '2px'
  }
}

function clearDropHighlights() {
  document.querySelectorAll('[data-commander-player]').forEach((el) => {
    ;(el as HTMLElement).style.outline = ''
    ;(el as HTMLElement).style.outlineOffset = ''
  })
}

function onCommanderDamageClose() {
  showCommanderDamage.value = false
  commanderDamageInitialAttackerId.value = null
  emit('stateChanged')
}

function onDetailClose() {
  showDetail.value = false
  emit('stateChanged')
}
</script>
