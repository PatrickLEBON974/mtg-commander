<template>
  <ion-page>
    <ion-content>
      <div v-if="!gameStore.isGameActive" class="flex h-full flex-col items-center justify-center gap-4">
        <IllustrationEmptyGame :size="120" data-animate />
        <div class="text-center" data-animate>
          <p class="text-text-secondary">{{ t('game.noActiveGame') }}</p>
          <ion-button class="mt-4" @click="router.push('/home')">
            {{ t('game.startGame') }}
          </ion-button>
        </div>
      </div>

      <div v-else-if="gameStore.currentGame?.gamePhase === 'seating'" class="relative flex h-full flex-col">
        <SeatingPhase />
      </div>

      <div v-else-if="gameStore.currentGame?.gamePhase === 'initiative'" class="relative flex h-full flex-col">
        <InitiativePhase />
      </div>

      <div v-else class="relative flex h-full flex-col">
        <!-- Game content wrapper — desaturates when paused -->
        <div
          class="game-content-wrapper flex min-h-0 flex-1 flex-col"
          :class="{ 'game-paused-desaturate': !isTimerRunning && gameStore.settings.enableTimer }"
        >
        <!-- Multiplayer indicator -->
        <div v-if="multiplayerStore.isMultiplayer" class="flex items-center justify-center gap-2 bg-mana-blue/20 px-4 py-2">
          <div class="h-2 w-2 rounded-full bg-life-positive animate-pulse" />
          <span class="text-xs text-text-secondary">
            {{ t('game.roomStatus', { code: multiplayerStore.roomCode, count: multiplayerStore.connectedPlayerCount }) }}
          </span>
        </div>

        <!-- Turn indicator + timer + action buttons -->
        <div
          class="flex items-center gap-2 px-3 py-1.5"
          :class="{ 'game-timer-flash': flashTimerZone }"
          role="status"
        >
          <span class="text-xs text-text-secondary">
            {{ t('game.turn', { n: gameStore.currentGame?.turnNumber }) }}
          </span>
          <span class="text-xs font-semibold text-accent">
            {{ gameStore.currentTurnPlayer?.name }}
          </span>

          <!-- Inline game timer -->
          <span
            v-if="gameStore.settings.enableTimer"
            class="font-mono text-xs tabular-nums"
            :class="isTimerRunning ? 'text-text-secondary' : 'text-life-negative animate-pulse'"
          >
            {{ isTimerRunning ? formattedGameTime : t('game.pause') }}
          </span>

          <div class="ml-auto flex items-center gap-1">
            <button
              class="topbar-action-btn"
              :aria-label="t('dice.title')"
              @click="showDiceRoller = true"
            >
              <IconDie :size="16" :style="iconRotationStyle" />
            </button>
            <button
              class="topbar-action-btn"
              :aria-label="t('game.menu')"
              @click="openGameMenu"
            >
              <ion-icon :icon="menuOutline" :style="iconRotationStyle" />
            </button>
          </div>
        </div>

        <!-- Behavior rule announce messages -->
        <TransitionGroup name="announce-slide" tag="div" class="flex flex-col gap-1 px-4">
          <div
            v-for="messageKey in announceMessages"
            :key="messageKey"
            class="announce-banner flex items-center justify-center gap-2 rounded-lg px-3 py-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="shrink-0 text-arena-gold-light" :style="iconRotationStyle">
              <path d="M12 2L1 21h22L12 2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
              <path d="M12 9v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <circle cx="12" cy="17" r="1" fill="currentColor" />
            </svg>
            <span class="text-xs font-semibold text-white/90">{{ t(messageKey) }}</span>
          </div>
        </TransitionGroup>

        <!-- Player grid -->
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
            <LifeTracker
              class="h-full"
              :style="cardRotationStyle(index)"
              :player="player"
              :is-current-turn="player.id === gameStore.currentTurnPlayer?.id"
              :is-flashing="flashingPlayerIds.includes(player.id)"
              :card-rotation="getCardRotation(index)"
              :inner-corner-style="getInnerCornerStyle(index)"
              :commander-damage-attacker-id="commanderDragState?.targetPlayerId === player.id ? commanderDragState.attackerPlayerId : null"
              @state-changed="onPlayerStateChanged"
              @turn-advanced="onTurnAdvanced"
              @commander-drag-drop="(targetId: string) => handleCommanderDragDrop(player.id, targetId)"
            />
          </div>
        </div>
        </div><!-- /game-content-wrapper -->

        <!-- Floating next turn button (draggable, snaps back to center) -->
        <div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <!-- Pause ripple waves (outside button so they don't get clipped) -->
          <div
            v-if="showPauseRipple"
            class="pause-ripple-container"
            :style="nextTurnTransformStyle"
          >
            <span class="pause-ripple-ring pause-ripple-ring-1" />
            <span class="pause-ripple-ring pause-ripple-ring-2" />
          </div>
          <!-- Undo button — slides in when paused -->
          <Transition name="pause-undo">
            <button
              v-if="!isTimerRunning && gameStore.settings.enableTimer && canGoToPreviousTurn"
              class="pause-undo-btn pointer-events-auto"
              :style="nextTurnTransformStyle"
              :aria-label="t('game.previousTurn')"
              @click="goToPreviousTurn()"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M4 10h12a4 4 0 0 1 0 8H11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="m7 7-3 3 3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </Transition>
          <button
            ref="nextTurnBtnRef"
            class="floating-next-turn-btn pointer-events-auto"
            :class="{
              'floating-next-turn-dragging': isNextTurnDragging,
              'floating-next-turn-paused': !isTimerRunning && gameStore.settings.enableTimer,
            }"
            :style="nextTurnTransformStyle"
            :aria-label="t('game.nextTurn')"
            data-sound="none"
            @pointerdown.prevent="onNextTurnPointerDown"
          >
            <!-- Pause icon when game is paused -->
            <svg v-if="!isTimerRunning && gameStore.settings.enableTimer" width="30" height="30" viewBox="0 0 24 24" fill="none" class="text-life-negative drop-shadow-sm">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" opacity="0.3" />
              <rect x="8" y="7" width="3" height="10" rx="1" fill="currentColor" />
              <rect x="13" y="7" width="3" height="10" rx="1" fill="currentColor" />
            </svg>
            <!-- Normal next-turn arrow -->
            <svg v-else width="30" height="30" viewBox="0 0 24 24" fill="none" class="text-white/80 drop-shadow-sm">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" opacity="0.3" />
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" />
              <path d="M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <path d="m12 16 4-4-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </ion-content>

    <!-- History modal -->
    <GameHistoryModal
      :is-open="showHistory"
      @close="showHistory = false"
    />

    <!-- Layout picker modal -->
    <AppModal :is-open="showLayoutPicker" :initial-breakpoint="0.3" :breakpoints="[0, 0.3]" @close="showLayoutPicker = false">
      <div class="px-4 py-5">
        <h3 class="mb-4 text-center text-base font-semibold text-text-primary">{{ t('game.layoutTitle') }}</h3>
        <div class="flex flex-wrap justify-center gap-3">
          <!-- Default (hidden at 5 players) -->
          <button
            v-if="currentPlayerCount !== 5"
            class="flex flex-col items-center gap-2 rounded-xl px-4 py-3 card-lift"
            :class="settingsStore.layoutMode === 'default' ? 'bg-accent/20 ring-2 ring-accent' : 'bg-surface-card'"
            @click="selectLayoutMode('default')"
          >
            <svg viewBox="0 0 24 24" class="h-8 w-8" fill="currentColor" :opacity="settingsStore.layoutMode === 'default' ? 1 : 0.6">
              <rect x="2" y="2" width="9" height="9" rx="2" />
              <rect x="13" y="2" width="9" height="9" rx="2" />
              <rect x="2" y="13" width="9" height="9" rx="2" />
              <rect x="13" y="13" width="9" height="9" rx="2" />
            </svg>
            <span class="text-xs" :class="settingsStore.layoutMode === 'default' ? 'text-accent font-semibold' : 'text-text-secondary'">
              {{ t('game.layoutDefault') }}
            </span>
          </button>

          <!-- Face-to-face -->
          <button
            class="flex flex-col items-center gap-2 rounded-xl px-4 py-3 card-lift"
            :class="settingsStore.layoutMode === 'faceToFace' ? 'bg-accent/20 ring-2 ring-accent' : 'bg-surface-card'"
            @click="selectLayoutMode('faceToFace')"
          >
            <svg viewBox="0 0 24 24" class="h-8 w-8" fill="currentColor" :opacity="settingsStore.layoutMode === 'faceToFace' ? 1 : 0.6">
              <rect x="2" y="2" width="9" height="9" rx="2" opacity="0.5" />
              <rect x="13" y="2" width="9" height="9" rx="2" opacity="0.5" />
              <rect x="2" y="13" width="9" height="9" rx="2" />
              <rect x="13" y="13" width="9" height="9" rx="2" />
              <line x1="0" y1="12" x2="24" y2="12" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" opacity="0.4" />
            </svg>
            <span class="text-xs" :class="settingsStore.layoutMode === 'faceToFace' ? 'text-accent font-semibold' : 'text-text-secondary'">
              {{ t('game.layoutFaceToFace') }}
            </span>
          </button>

          <!-- Face-to-face side -->
          <button
            class="flex flex-col items-center gap-2 rounded-xl px-4 py-3 card-lift"
            :class="settingsStore.layoutMode === 'faceToFaceSide' ? 'bg-accent/20 ring-2 ring-accent' : 'bg-surface-card'"
            @click="selectLayoutMode('faceToFaceSide')"
          >
            <svg viewBox="0 0 24 24" class="h-8 w-8" fill="currentColor" :opacity="settingsStore.layoutMode === 'faceToFaceSide' ? 1 : 0.6">
              <rect x="2" y="2" width="9" height="9" rx="2" opacity="0.5" />
              <rect x="2" y="13" width="9" height="9" rx="2" opacity="0.5" />
              <rect x="13" y="2" width="9" height="9" rx="2" />
              <rect x="13" y="13" width="9" height="9" rx="2" />
              <line x1="12" y1="0" x2="12" y2="24" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" opacity="0.4" />
            </svg>
            <span class="text-xs" :class="settingsStore.layoutMode === 'faceToFaceSide' ? 'text-accent font-semibold' : 'text-text-secondary'">
              {{ t('game.layoutFaceToFaceSide') }}
            </span>
          </button>

          <!-- Star (only for 4 players) -->
          <button
            v-if="currentPlayerCount === 4"
            class="flex flex-col items-center gap-2 rounded-xl px-4 py-3 card-lift"
            :class="settingsStore.layoutMode === 'star' ? 'bg-accent/20 ring-2 ring-accent' : 'bg-surface-card'"
            @click="selectLayoutMode('star')"
          >
            <svg viewBox="0 0 24 24" class="h-8 w-8" fill="currentColor" :opacity="settingsStore.layoutMode === 'star' ? 1 : 0.6">
              <rect x="7" y="1" width="10" height="7" rx="2" />
              <rect x="16" y="8.5" width="7" height="7" rx="2" />
              <rect x="7" y="16" width="10" height="7" rx="2" />
              <rect x="1" y="8.5" width="7" height="7" rx="2" />
            </svg>
            <span class="text-xs" :class="settingsStore.layoutMode === 'star' ? 'text-accent font-semibold' : 'text-text-secondary'">
              {{ t('game.layoutStar') }}
            </span>
          </button>
        </div>
      </div>
    </AppModal>

    <!-- Dice roller -->
    <DiceRollerSheet :is-open="showDiceRoller" :content-rotation="priorityPlayerRotation" @close="showDiceRoller = false" />

    <!-- Game menu -->
    <AppModal :is-open="showGameMenu" :initial-breakpoint="0.5" :breakpoints="[0, 0.5]" @close="closeGameMenu">
      <div class="px-4 pb-20 pt-5 transition-transform duration-300 ease-in-out" :style="iconRotationStyle">
        <h3 class="mb-4 text-center text-base font-semibold text-text-primary">{{ t('game.menu') }}</h3>
        <div class="grid grid-cols-3 gap-3">
          <button class="menu-action-btn" :disabled="!gameStore.canUndo" data-sound="none" @click="menuUndo">
            <ion-icon :icon="arrowUndoOutline" />
            <span>{{ t('game.undo') }}</span>
          </button>
          <button class="menu-action-btn" :disabled="!gameStore.canRedo" data-sound="none" @click="menuRedo">
            <ion-icon :icon="arrowRedoOutline" />
            <span>{{ t('game.redo') }}</span>
          </button>
          <button class="menu-action-btn" @click="menuDice">
            <IconDie :size="22" />
            <span>{{ t('dice.title') }}</span>
          </button>
          <button class="menu-action-btn" @click="menuLayout">
            <ion-icon :icon="gridOutline" />
            <span>{{ t('game.layoutTitle') }}</span>
          </button>
          <button class="menu-action-btn" @click="menuHistory">
            <ion-icon :icon="listOutline" />
            <span>{{ t('game.history') }}</span>
          </button>
          <button
            class="menu-action-btn"
            :class="{ 'menu-action-active': settingsStore.autoOrientIcons }"
            @click="settingsStore.autoOrientIcons = !settingsStore.autoOrientIcons"
          >
            <ion-icon :icon="compassOutline" />
            <span>{{ t('game.orientation') }}</span>
          </button>
          <button class="menu-action-btn menu-action-danger" @click="menuEndGame">
            <ion-icon :icon="flagOutline" />
            <span>{{ t('game.endGame') }}</span>
          </button>
        </div>
      </div>
    </AppModal>

    <!-- Save anonymous player modal (sequential, one at a time) -->
    <SaveAnonymousPlayerModal
      :is-open="showSaveAnonymousModal"
      :player-name="currentAnonymousPlayer?.name ?? ''"
      :player-color="currentAnonymousPlayer?.color ?? 'white'"
      :commanders="currentAnonymousPlayer?.commanders ?? []"
      @save="handleSaveAnonymousPlayer"
      @skip="handleSkipAnonymousPlayer"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  IonPage,
  IonContent,
  IonButton,
  IonIcon,
  alertController,
  toastController,
} from '@ionic/vue'
import { arrowUndoOutline, arrowRedoOutline, listOutline, flagOutline, gridOutline, menuOutline, compassOutline } from 'ionicons/icons'
import { useGameStore } from '@/stores/gameStore'
import { useMultiplayerStore } from '@/stores/multiplayerStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { usePlayerRegistryStore } from '@/stores/playerRegistryStore'
import type { LayoutMode } from '@/services/persistence'
import LifeTracker from '@/components/life-tracker/LifeTracker.vue'
import { useGameClock } from '@/composables/useGameClock'
import { useLongPress } from '@/composables/useLongPress'
import { formatMsToTimer } from '@/utils/time'
import { usePlayerGridLayout } from '@/composables/usePlayerGridLayout'
import GameHistoryModal from '@/components/life-tracker/GameHistoryModal.vue'
import AppModal from '@/components/ui/AppModal.vue'
import IllustrationEmptyGame from '@/components/icons/illustrations/IllustrationEmptyGame.vue'
import IconDie from '@/components/icons/dice/IconDie.vue'
import DiceRollerSheet from '@/components/dice/DiceRollerSheet.vue'
import SeatingPhase from '@/components/game/SeatingPhase.vue'
import InitiativePhase from '@/components/game/InitiativePhase.vue'
import SaveAnonymousPlayerModal from '@/components/player-registry/SaveAnonymousPlayerModal.vue'
import { playTurnAdvance, playUndo, playEndGame } from '@/services/sounds'
import { useBehaviorRuleEngine } from '@/rules/behaviorRuleEngine'
import { isGameMenuOpen } from '@/composables/useGameFullscreen'

const { t } = useI18n()
const router = useRouter()
const gameStore = useGameStore()
const multiplayerStore = useMultiplayerStore()
const settingsStore = useSettingsStore()
const registryStore = usePlayerRegistryStore()
// Initialize behavior rules engine (watches game state, fires effects)
const { flashingPlayerIds, flashTimerZone, announceMessages, isOvertimeDisplayActive } = useBehaviorRuleEngine()

// Game clock (singleton — starts the RAF tick loop)
const { isRunning: isTimerRunning, toggleTimer } = useGameClock()
const formattedGameTime = computed(() =>
  formatMsToTimer(gameStore.currentGame?.elapsedMs ?? 0),
)

// Pause ripple animation — fires once when timer transitions to paused
const showPauseRipple = ref(false)
let pauseRippleTimeout: ReturnType<typeof setTimeout> | null = null
watch(isTimerRunning, (running, wasRunning) => {
  if (!running && wasRunning) {
    showPauseRipple.value = true
    if (pauseRippleTimeout) clearTimeout(pauseRippleTimeout)
    pauseRippleTimeout = setTimeout(() => {
      showPauseRipple.value = false
    }, 800)
  }
})

const { gridStyle, getCardRotation, getInnerCornerStyle, cardOuterClasses, cardOuterStyle, cardRotationStyle } = usePlayerGridLayout()

const showHistory = ref(false)
const showLayoutPicker = ref(false)
const showDiceRoller = ref(false)
const showGameMenu = ref(false)

/* ── Draggable next-turn button ── */
const nextTurnBtnRef = ref<HTMLButtonElement | null>(null)
const nextTurnOffsetX = ref(0)
const nextTurnOffsetY = ref(0)
const isNextTurnDragging = ref(false)
let nextTurnDragStartX = 0
let nextTurnDragStartY = 0
const DRAG_THRESHOLD = 6
const SNAP_BACK_INACTIVITY_MS = 5000
const LONG_PRESS_DELAY_MS = 500
let snapBackTimer: ReturnType<typeof setTimeout> | null = null

const longPress = useLongPress(() => {
  if (gameStore.settings.enableTimer) {
    toggleTimer()
  }
}, LONG_PRESS_DELAY_MS)

const priorityPlayerRotation = computed(() => {
  if (!settingsStore.autoOrientIcons) return 0
  const priorityPlayer = gameStore.effectivePriorityPlayer
  if (!priorityPlayer || !gameStore.currentGame) return 0
  const playerIndex = gameStore.currentGame.players.findIndex(
    p => p.id === priorityPlayer.id,
  )
  return playerIndex >= 0 ? getCardRotation(playerIndex) : 0
})

const iconRotationStyle = computed(() => {
  const rotation = priorityPlayerRotation.value
  if (rotation === 0) return {}
  return { transform: `rotate(${rotation}deg)` }
})

const nextTurnTransformStyle = computed(() => {
  const tx = nextTurnOffsetX.value
  const ty = nextTurnOffsetY.value
  const hasOffset = tx !== 0 || ty !== 0
  const rot = priorityPlayerRotation.value
  if (!hasOffset && rot === 0) return {}
  const parts: string[] = []
  if (hasOffset) parts.push(`translate(${tx}px, ${ty}px)`)
  if (rot !== 0) parts.push(`rotate(${rot}deg)`)
  return { transform: parts.join(' ') }
})

function onNextTurnPointerDown(event: PointerEvent) {
  nextTurnDragStartX = event.clientX
  nextTurnDragStartY = event.clientY
  isNextTurnDragging.value = true
  longPress.start()
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  const target = event.currentTarget as HTMLElement
  target.addEventListener('pointermove', onNextTurnPointerMove)
  target.addEventListener('pointerup', onNextTurnPointerUp, { once: true })
  target.addEventListener('pointercancel', onNextTurnPointerUp, { once: true })
  // Cancel any pending snap-back while interacting
  if (snapBackTimer) { clearTimeout(snapBackTimer); snapBackTimer = null }
}

function onNextTurnPointerMove(event: PointerEvent) {
  if (!isNextTurnDragging.value) return
  const deltaX = event.clientX - nextTurnDragStartX
  const deltaY = event.clientY - nextTurnDragStartY
  // Cancel long-press if finger moves beyond drag threshold
  if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
    longPress.cancel()
  }
  nextTurnOffsetX.value += deltaX
  nextTurnOffsetY.value += deltaY
  nextTurnDragStartX = event.clientX
  nextTurnDragStartY = event.clientY
}

function onNextTurnPointerUp(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement
  target.removeEventListener('pointermove', onNextTurnPointerMove)
  longPress.cancel()
  if (!isNextTurnDragging.value) return
  isNextTurnDragging.value = false
  // If long-press already fired (pause toggled), skip tap/drag actions
  if (longPress.isTriggered()) {
    longPress.reset()
    return
  }
  const distance = Math.sqrt(
    nextTurnOffsetX.value ** 2 + nextTurnOffsetY.value ** 2,
  )
  if (distance < DRAG_THRESHOLD) {
    // In pause mode, tap resumes the timer instead of advancing the turn
    if (gameStore.settings.enableTimer && !isTimerRunning.value) {
      toggleTimer()
    } else {
      handleAdvanceTurn()
    }
  } else {
    // Schedule snap back to center after inactivity
    scheduleSnapBack()
  }
}

function snapNextTurnToCenter() {
  nextTurnOffsetX.value = 0
  nextTurnOffsetY.value = 0
}

function scheduleSnapBack() {
  if (snapBackTimer) clearTimeout(snapBackTimer)
  snapBackTimer = setTimeout(() => {
    snapNextTurnToCenter()
    snapBackTimer = null
  }, SNAP_BACK_INACTIVITY_MS)
}

const currentPlayerCount = computed(() => gameStore.currentGame?.players.length ?? 4)

// Sync game menu modal state with shared fullscreen composable
watch(isGameMenuOpen, (open) => {
  if (!open && showGameMenu.value) {
    showGameMenu.value = false
  }
})

function openGameMenu() {
  showGameMenu.value = true
  isGameMenuOpen.value = true
}

function closeGameMenu() {
  showGameMenu.value = false
  isGameMenuOpen.value = false
}

function menuUndo() { closeGameMenu(); handleUndo() }
function menuRedo() { closeGameMenu(); handleRedo() }
function menuDice() { closeGameMenu(); showDiceRoller.value = true }
function menuLayout() { closeGameMenu(); showLayoutPicker.value = true }
function menuHistory() { closeGameMenu(); showHistory.value = true }
function menuEndGame() { closeGameMenu(); confirmEndGame() }

// --- Anonymous player save queue ---
interface AnonymousPlayerCommander {
  cardName: string
  imageUri?: string
}
interface AnonymousPlayerEntry {
  name: string
  color: import('@/types/game').ManaColor
  commanders: AnonymousPlayerCommander[]
}
const anonymousPlayerQueue = ref<AnonymousPlayerEntry[]>([])
const showSaveAnonymousModal = ref(false)
const currentAnonymousPlayer = computed(() => anonymousPlayerQueue.value[0] ?? null)

// --- Commander drag-drop ---

const commanderDragState = ref<{ targetPlayerId: string; attackerPlayerId: string } | null>(null)

function handleCommanderDragDrop(attackerPlayerId: string, targetPlayerId: string) {
  commanderDragState.value = { targetPlayerId, attackerPlayerId }
  // Clear after one tick so the watcher in LifeTracker fires, then resets
  nextTick(() => {
    commanderDragState.value = null
  })
}

// --- Layout mode ---

function selectLayoutMode(mode: LayoutMode) {
  settingsStore.layoutMode = mode
  showLayoutPicker.value = false
}

// Auto-correct layout mode for player counts that don't support it
watch(currentPlayerCount, (count) => {
  if (count === 5 && settingsStore.layoutMode === 'default') {
    settingsStore.layoutMode = 'faceToFace'
  }
  if (count !== 4 && settingsStore.layoutMode === 'star') {
    settingsStore.layoutMode = 'faceToFace'
  }
}, { immediate: true })

// --- Previous turn (pause mode) ---
const canGoToPreviousTurn = computed(() => {
  const game = gameStore.currentGame
  if (!game) return false
  return game.turnNumber > 1 || game.currentTurnPlayerIndex > 0
})

function goToPreviousTurn() {
  const game = gameStore.currentGame
  if (!game) return
  const playerCount = game.players.length
  if (playerCount === 0) return
  const previousIndex = (game.currentTurnPlayerIndex - 1 + playerCount) % playerCount
  if (previousIndex >= game.currentTurnPlayerIndex) {
    game.turnNumber = Math.max(1, game.turnNumber - 1)
  }
  game.currentTurnPlayerIndex = previousIndex
  playUndo()
  toggleTimer()
}

// --- Game actions ---

function handleUndo() {
  // Capture the action that will be undone (last in history, before it's popped)
  const history = gameStore.currentGame?.history
  const actionToUndo = history && history.length > 0 ? history[history.length - 1] : null

  gameStore.undoLastAction()
  playUndo()

  if (multiplayerStore.isMultiplayer) {
    multiplayerStore.pushLocalPlayerState()
    // If the undone action modified a remote player, push their reverted state
    if (actionToUndo) {
      multiplayerStore.pushRemotePlayerIfNeeded(actionToUndo)
    }
  }
}

function handleRedo() {
  // Capture the action that will be redone (last in redoStack, before it's popped)
  const actionToRedo = gameStore.nextRedoAction

  gameStore.redoLastAction()
  playUndo()

  if (multiplayerStore.isMultiplayer) {
    multiplayerStore.pushLocalPlayerState()
    // If the redone action modified a remote player, push their updated state
    if (actionToRedo) {
      multiplayerStore.pushRemotePlayerIfNeeded(actionToRedo)
    }
  }
}

function handleAdvanceTurn() {
  gameStore.advanceTurn()
  playTurnAdvance()
  multiplayerStore.syncTurnAdvance()
}

async function confirmEndGame() {
  const alert = await alertController.create({
    header: t('game.endGameTitle'),
    message: t('game.endGameConfirm'),
    buttons: [
      {
        text: t('common.cancel'),
        role: 'cancel',
      },
      {
        text: t('common.confirm'),
        role: 'confirm',
        handler: async () => {
          // Collect anonymous players before ending (for save proposal)
          const anonymousPlayers = gameStore.currentGame?.players.filter(
            (player) => !gameStore.playerProfileMapping[player.id],
          ) ?? []

          gameStore.endGame()
          playEndGame()

          const toast = await toastController.create({
            message: t('game.gameRecorded'),
            duration: 3000,
            position: 'bottom',
            color: 'success',
          })
          await toast.present()

          // Queue anonymous players for sequential save proposal
          if (anonymousPlayers.length > 0) {
            anonymousPlayerQueue.value = anonymousPlayers.map((player) => ({
              name: player.name,
              color: player.color,
              commanders: player.commanders.map((commander) => ({
                cardName: commander.cardName,
                imageUri: commander.imageUri,
              })),
            }))
            showSaveAnonymousModal.value = true
          } else {
            gameStore.resetGame()
          }
        },
      },
    ],
  })
  await alert.present()
}

// Guard: AppModal fires didDismiss on programmatic close, which would
// call handleSkipAnonymousPlayer a second time and skip a player.
let isAdvancingQueue = false

function advanceAnonymousQueue() {
  isAdvancingQueue = true
  anonymousPlayerQueue.value.shift()
  if (anonymousPlayerQueue.value.length === 0) {
    showSaveAnonymousModal.value = false
    gameStore.resetGame()
    isAdvancingQueue = false
  } else {
    // Brief close/reopen for visual transition between players
    showSaveAnonymousModal.value = false
    setTimeout(() => {
      showSaveAnonymousModal.value = true
      isAdvancingQueue = false
    }, 350)
  }
}

async function handleSaveAnonymousPlayer(name: string, color: import('@/types/game').ManaColor) {
  const currentEntry = currentAnonymousPlayer.value
  const profile = registryStore.addPlayerProfile(name, color)

  // Auto-create a deck if the player had commanders during the game
  if (profile && currentEntry && currentEntry.commanders.length > 0) {
    const commanderSnapshots = currentEntry.commanders.map((commander) => ({
      scryfallId: '',
      name: commander.cardName,
      imageUri: commander.imageUri ?? '',
      colorIdentity: [] as string[],
      typeLine: '',
    }))
    const deckName = currentEntry.commanders.map((c) => c.cardName).join(' / ')
    registryStore.addDeck(profile.id, deckName, commanderSnapshots)
  }

  const toast = await toastController.create({
    message: t('players.playerSaved', { name }),
    duration: 1500,
    position: 'bottom',
    color: 'success',
  })
  await toast.present()

  advanceAnonymousQueue()
}

function handleSkipAnonymousPlayer() {
  if (isAdvancingQueue) return
  advanceAnonymousQueue()
}

function onPlayerStateChanged() {
  multiplayerStore.syncAfterAction()
}

function onTurnAdvanced() {
  multiplayerStore.syncTurnAdvance()
}
</script>

<style scoped>
.topbar-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
  transition: transform 0.15s ease, background 0.15s ease;
}

.topbar-action-btn ion-icon,
.topbar-action-btn :deep(svg) {
  transition: transform 0.3s ease;
}

.topbar-action-btn:active {
  transform: scale(0.9);
  background: rgba(255, 255, 255, 0.12);
}

/* Pause undo button */
.pause-undo-btn {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.8);
  margin-right: 120px;
  transition: background 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.pause-undo-btn:active {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(0.9);
}

/* Pause undo slide-in transition */
.pause-undo-enter-active {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
}
.pause-undo-leave-active {
  transition: transform 0.2s ease-in, opacity 0.2s ease-in;
}
.pause-undo-enter-from {
  transform: translateX(30px) scale(0.5);
  opacity: 0;
}
.pause-undo-leave-to {
  transform: translateX(30px) scale(0.5);
  opacity: 0;
}

/* Desaturate game content when paused */
.game-content-wrapper {
  transition: filter 0.4s ease, opacity 0.4s ease;
}

.game-paused-desaturate {
  filter: grayscale(0.75) brightness(0.7);
  opacity: 0.6;
}

.floating-next-turn-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 66px;
  height: 66px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  font-size: 30px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.15s ease;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
}

.floating-next-turn-dragging {
  transition: none;
  opacity: 0.85;
  cursor: grabbing;
}

.floating-next-turn-paused {
  background: rgba(239, 68, 68, 0.25);
  border-color: rgba(239, 68, 68, 0.4);
  animation: pause-pulse 2s ease-in-out infinite;
}

@keyframes pause-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
  50% { box-shadow: 0 0 12px 4px rgba(239, 68, 68, 0.3); }
}

/* Pause ripple wave animation */
.pause-ripple-container {
  position: absolute;
  width: 66px;
  height: 66px;
  border-radius: 50%;
  pointer-events: none;
}

.pause-ripple-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(239, 68, 68, 0.6);
  animation: pause-ripple-expand 800ms ease-out forwards;
}

.pause-ripple-ring-2 {
  animation-delay: 150ms;
}

@keyframes pause-ripple-expand {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  100% {
    transform: scale(2.8);
    opacity: 0;
  }
}

.floating-next-turn-btn:active:not(.floating-next-turn-dragging) {
  transform: scale(0.9);
  background: rgba(0, 0, 0, 0.6);
}

.game-timer-flash {
  animation: game-timer-flash 0.8s ease-in-out infinite;
}

.menu-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.75rem;
  border: none;
  transition: background 0.15s ease;
}

.menu-action-btn ion-icon,
.menu-action-btn :deep(svg) {
  font-size: 1.5rem;
}

.menu-action-btn:active {
  background: rgba(255, 255, 255, 0.1);
}

.menu-action-btn:disabled {
  opacity: 0.3;
  pointer-events: none;
}

.menu-action-danger {
  color: var(--color-life-negative);
}

.menu-action-active {
  background: rgba(232, 96, 10, 0.15);
  color: var(--color-accent);
  border: 1px solid rgba(232, 96, 10, 0.3);
}

.announce-banner {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.08));
  border: 1px solid rgba(239, 68, 68, 0.2);
  backdrop-filter: blur(4px);
}

.announce-slide-enter-active {
  transition: opacity 0.3s ease-out, transform 0.3s ease-out;
}
.announce-slide-leave-active {
  transition: opacity 0.2s ease-in, transform 0.2s ease-in;
}
.announce-slide-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.announce-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

</style>
