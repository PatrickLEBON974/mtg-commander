<template>
  <ion-page :class="{ 'app-screen': !gameStore.isGameActive }">
    <SanctumHeader
      v-if="!gameStore.isGameActive"
      :title="t('game.title')"
      :eyebrow="t('game.headerEyebrow')"
      badge="01"
    />
    <ion-content :class="{ 'sanctum-content game-idle-content': !gameStore.isGameActive }">
      <div v-if="!gameStore.isGameActive" class="game-idle-wrap">
        <section class="game-idle-panel" data-animate>
          <p class="game-idle-panel__eyebrow">{{ t('game.emptyEyebrow') }}</p>
          <div class="game-idle-panel__crest">
            <span aria-hidden="true" />
            <img src="@/assets/icons/ui/logo.svg" alt="" />
          </div>
          <h2>{{ t('game.noActiveGame') }}</h2>
          <p class="game-idle-panel__hint">{{ t('game.noActiveHint') }}</p>
          <ion-button class="game-idle-panel__cta" @click="router.push('/home')">
            <ion-icon :icon="playOutline" slot="start" />
            {{ t('game.startGame') }}
          </ion-button>
        </section>
      </div>

      <div v-else-if="gameStore.currentGame?.gamePhase === 'seating'" class="safe-area-top safe-area-bottom safe-area-x relative flex h-full flex-col">
        <SeatingPhase :is-authority="!pregameReadOnly" :inert="pregameReadOnly" />
        <div v-if="pregameReadOnly" class="pregame-waiting-banner">
          {{ t('multiplayer.hostControlsSetup') }}
        </div>
      </div>

      <div v-else-if="gameStore.currentGame?.gamePhase === 'initiative'" class="safe-area-top safe-area-bottom safe-area-x relative flex h-full flex-col">
        <InitiativePhase :is-authority="!pregameReadOnly" :inert="pregameReadOnly" />
        <div v-if="pregameReadOnly" class="pregame-waiting-banner">
          {{ t('multiplayer.hostControlsSetup') }}
        </div>
      </div>

      <!-- safe-area-* : additive padding so the topbar (top edge) and player
           grid (bottom edge) stay clear of notches / home indicator -->
      <div v-else ref="gameSafeShellRef" class="safe-area-top safe-area-bottom safe-area-x relative flex h-full flex-col">
        <!-- Game content wrapper — desaturates when paused -->
        <div
          class="game-content-wrapper flex min-h-0 flex-1 flex-col"
          :class="{ 'game-paused-desaturate': multiplayerStore.gameFinished || (!isTimerRunning && settingsStore.gameSettings.enableTimer) }"
          :inert="multiplayerStore.gameFinished || (!isTimerRunning && settingsStore.gameSettings.enableTimer)"
        >
        <!-- Multiplayer indicator -->
        <div
          v-if="multiplayerStore.isMultiplayer || multiplayerStore.connectionError"
          class="flex items-center justify-center gap-2 px-4 py-2"
          :class="multiplayerConnectionHealthy ? 'bg-mana-blue/20' : 'bg-amber-500/20'"
        >
          <div
            class="h-2 w-2 rounded-full"
            :class="multiplayerConnectionHealthy ? 'bg-life-positive animate-pulse' : 'bg-amber-400'"
          />
          <span class="text-xs text-text-secondary">
            {{ multiplayerStatusLabel }}
          </span>
          <button
            v-if="multiplayerStore.errorState?.recoverable || multiplayerStore.connectionState === 'offline'"
            class="multiplayer-retry-btn"
            :aria-label="t('common.retry')"
            @click="multiplayerStore.retryConnection()"
          >
            <ion-icon :icon="refreshOutline" />
          </button>
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
            v-if="settingsStore.gameSettings.enableTimer && !isChessClockActive"
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
              :aria-label="t('game.toggleView')"
              @click="toggleDisplayMode"
            >
              <!-- List icon (switch to list) -->
              <svg v-if="gameDisplayMode === 'grid'" width="16" height="16" viewBox="0 0 24 24" fill="none" :style="iconRotationStyle">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
              <!-- Grid icon (switch back to grid) -->
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" :style="iconRotationStyle">
                <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="2" />
                <rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="2" />
                <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="2" />
                <rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="2" />
              </svg>
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

        <div v-if="chessClockState" class="px-3 pb-1.5">
          <ChessClockHud
            :turn-player-name="gameStore.currentTurnPlayer?.name ?? ''"
            :clock-owner-name="gameStore.effectivePriorityPlayer?.name ?? ''"
            :turn-elapsed-ms="chessTurnElapsedMs"
            :clock-used-ms="chessClockUsedMs"
            :player-budget-ms="chessClockState.playerBudgetMs"
            :theoretical-turn-ms="chessClockState.theoreticalTurnMs"
            :is-running="isTimerRunning"
          />
        </div>

        <!-- Behavior rule announce messages -->
        <TransitionGroup name="announce-slide" tag="div" class="flex flex-col gap-1 px-4">
          <div
            v-for="messageKey in announceMessages"
            :key="messageKey"
            class="announce-banner flex items-center gap-2 rounded-lg px-3 py-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="shrink-0 text-arena-gold-light" :style="iconRotationStyle">
              <path d="M12 2L1 21h22L12 2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
              <path d="M12 9v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <circle cx="12" cy="17" r="1" fill="currentColor" />
            </svg>
            <span class="text-xs font-semibold text-white/90">{{ t(messageKey) }}</span>
          </div>
        </TransitionGroup>

        <PlayerGrid
          :display-mode="gameDisplayMode"
          :players="gameStore.currentGame?.players ?? []"
          :turn-order-players="turnOrderPlayers"
          :current-turn-player-id="gameStore.currentTurnPlayer?.id"
          :flashing-player-ids="flashingPlayerIds"
          :commander-drag-state="commanderDragState"
          :editable-player-ids="editablePlayerIds"
          :read-only-label="t('multiplayer.remotePlayerReadOnly')"
          @player-state-changed="onPlayerStateChanged"
          @turn-advanced="onTurnAdvanced"
          @commander-drag-drop="handleCommanderDragDrop"
        />
        </div><!-- /game-content-wrapper -->

        <!-- Floating next turn button (draggable, snaps back to center) -->
        <div
          v-if="!multiplayerStore.gameFinished && (!settingsStore.gameSettings.enableTimer || isTimerRunning || canControlTimer)"
          class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        >
          <!-- Translate wrapper — handles drag position with smooth snap-back -->
          <div ref="nextTurnGroupRef" class="next-turn-group" :style="nextTurnTranslateStyle">
            <!-- Pause ripple waves (outside button so they don't get clipped) -->
            <div
              v-if="showPauseRipple"
              class="pause-ripple-container"
              :style="nextTurnRotateStyle"
            >
              <span class="pause-ripple-ring pause-ripple-ring-1" />
              <span class="pause-ripple-ring pause-ripple-ring-2" />
            </div>
            <!-- Undo button — slides in when paused -->
            <Transition name="pause-undo">
              <button
                v-if="!isTimerRunning && settingsStore.gameSettings.enableTimer && canGoToPreviousTurn && canControlTimer"
                class="pause-undo-btn pointer-events-auto"
                :style="nextTurnRotateStyle"
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
                'floating-next-turn-paused': !isTimerRunning && settingsStore.gameSettings.enableTimer,
              }"
              :style="nextTurnRotateStyle"
              :aria-label="t('game.nextTurn')"
              data-sound="none"
              @pointerdown.prevent="onNextTurnPointerDown"
            >
              <!-- Pause icon when game is paused -->
              <svg v-if="!isTimerRunning && settingsStore.gameSettings.enableTimer" width="30" height="30" viewBox="0 0 24 24" fill="none" class="text-life-negative drop-shadow-sm">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" opacity="0.3" />
                <rect x="8" y="7" width="3" height="10" rx="1" fill="currentColor" />
                <rect x="13" y="7" width="3" height="10" rx="1" fill="currentColor" />
              </svg>
              <!-- Normal next-turn arrow — points toward next player -->
              <svg v-else width="30" height="30" viewBox="0 0 24 24" fill="none" class="text-white/80 drop-shadow-sm" :style="nextTurnArrowStyle">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" opacity="0.3" />
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" />
                <path d="M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                <path d="m12 16 4-4-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </ion-content>


    <!-- Dice roller -->
    <DiceRollerSheet :is-open="showDiceRoller" :content-rotation="priorityPlayerRotation" @close="showDiceRoller = false" />


  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, provide } from 'vue'
import gsap from 'gsap'
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
import { menuOutline, playOutline, refreshOutline } from 'ionicons/icons'
import { useGameStore } from '@/stores/gameStore'
import { useMultiplayerStore } from '@/stores/multiplayerStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { usePlayerRegistryStore } from '@/stores/playerRegistryStore'
import type { LayoutMode } from '@/services/persistence'
import PlayerGrid from '@/components/game/PlayerGrid.vue'
import { useGameClock } from '@/composables/useGameClock'
import { useLongPress } from '@/composables/useLongPress'
import { formatMsToTimer } from '@/utils/time'
import { usePlayerGridLayout } from '@/composables/usePlayerGridLayout'
import { presentModal } from '@/composables/useControllerModal'
import GameMenuContent from '@/components/game/GameMenuContent.vue'
import SanctumHeader from '@/components/ui/SanctumHeader.vue'
import IconDie from '@/components/icons/dice/IconDie.vue'
import DiceRollerSheet from '@/components/dice/DiceRollerSheet.vue'
import SeatingPhase from '@/components/game/SeatingPhase.vue'
import InitiativePhase from '@/components/game/InitiativePhase.vue'
import ChessClockHud from '@/components/game-timer/ChessClockHud.vue'
import { prefersReducedMotion } from '@/utils/motion'
import { playTurnAdvance, playUndo, playEndGame } from '@/services/sounds'
import { gameDisplayModeKey, type GameDisplayMode } from '@/types/injectionKeys'
import { useBehaviorRuleEngine } from '@/rules/behaviorRuleEngine'
import { isGameMenuOpen } from '@/composables/useGameFullscreen'

const { t } = useI18n()
const router = useRouter()
const gameStore = useGameStore()
const multiplayerStore = useMultiplayerStore()
const settingsStore = useSettingsStore()
const registryStore = usePlayerRegistryStore()
// Initialize behavior rules engine (watches game state, fires effects)
const { flashingPlayerIds, flashTimerZone, announceMessages } = useBehaviorRuleEngine({
  canMutateGameState: () => !multiplayerStore.isMultiplayer || multiplayerStore.isHost,
})

// Game clock (singleton — starts the RAF tick loop)
const { isRunning: isTimerRunning, toggleTimer } = useGameClock()
const chessClockState = computed(() => gameStore.currentGame?.chessClock ?? null)
const isChessClockActive = computed(() => chessClockState.value !== null)
const chessTurnElapsedMs = computed(() => {
  const playerId = gameStore.currentTurnPlayer?.id
  return playerId ? gameStore.currentGame?.playerRoundTimeMs?.[playerId] ?? 0 : 0
})
const chessClockUsedMs = computed(() => {
  const playerId = gameStore.effectivePriorityPlayer?.id
  return playerId ? gameStore.currentGame?.playerPlayTimeMs?.[playerId] ?? 0 : 0
})
const formattedGameTime = computed(() =>
  formatMsToTimer(gameStore.currentGame?.elapsedMs ?? 0),
)
const multiplayerStatusLabel = computed(() => {
  if (multiplayerStore.gameFinished) return t('multiplayer.gameFinished')
  if (multiplayerStore.connectionError) return multiplayerStore.connectionError
  if (!multiplayerStore.isConnected) {
    return t(`multiplayer.connectionStates.${multiplayerStore.connectionState}`)
  }
  return t('game.roomStatus', {
    code: multiplayerStore.roomCode,
    count: multiplayerStore.connectedPlayerCount,
  })
})
const multiplayerConnectionHealthy = computed(() =>
  multiplayerStore.isConnected && !multiplayerStore.errorState,
)
const canControlTimer = computed(() => !multiplayerStore.isMultiplayer || multiplayerStore.isHost)
const editablePlayerIds = computed(() => {
  if (!multiplayerStore.isMultiplayer || multiplayerStore.isHost) return null
  return multiplayerStore.localPlayerIds
})
const pregameReadOnly = computed(() => multiplayerStore.isMultiplayer && !multiplayerStore.isHost)

// Auto-resume timer when entering game page with a paused game in playing phase
if (
  gameStore.currentGame?.gamePhase === 'playing'
  && settingsStore.gameSettings.enableTimer
  && !isTimerRunning.value
  && (!multiplayerStore.isMultiplayer || multiplayerStore.isHost)
  && !multiplayerStore.gameFinished
) {
  toggleTimer()
}

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

const { getCardRotation, getDirectionAngle } = usePlayerGridLayout()

const showDiceRoller = ref(false)

/* ── Display mode: grid (default) or turn-order list ── */
const gameDisplayMode = ref<GameDisplayMode>('grid')
provide(gameDisplayModeKey, gameDisplayMode)

function toggleDisplayMode() {
  gameDisplayMode.value = gameDisplayMode.value === 'grid' ? 'list' : 'grid'
}

const turnOrderPlayers = computed(() => {
  const game = gameStore.currentGame
  if (!game) return []
  const players = game.players
  const startIndex = game.currentTurnPlayerIndex
  const ordered = []
  for (let i = 0; i < players.length; i++) {
    ordered.push(players[(startIndex + i) % players.length]!)
  }
  return ordered
})

/* ── Draggable next-turn button ── */
const nextTurnBtnRef = ref<HTMLButtonElement | null>(null)
const nextTurnGroupRef = ref<HTMLElement | null>(null)
const gameSafeShellRef = ref<HTMLElement | null>(null)
const nextTurnOffsetX = ref(0)
const nextTurnOffsetY = ref(0)
const isNextTurnDragging = ref(false)
let nextTurnDragStartX = 0
let nextTurnDragStartY = 0
let nextTurnGestureStartX = 0
let nextTurnGestureStartY = 0
const DRAG_THRESHOLD = 6
const DRAG_SAFE_MARGIN_PX = 8
const SNAP_BACK_INACTIVITY_MS = 5000
const LONG_PRESS_DELAY_MS = 500
let snapBackTimer: ReturnType<typeof setTimeout> | null = null

const longPress = useLongPress(() => {
  if (settingsStore.gameSettings.enableTimer && canControlTimer.value) {
    toggleTimer()
  }
}, LONG_PRESS_DELAY_MS)

const priorityPlayerRotation = computed(() => {
  if (!settingsStore.autoOrientIcons || !gameStore.currentGame) return 0
  // If orientation is locked to a specific player, use that player
  const lockedId = settingsStore.orientationLockedPlayerId
  const targetPlayer = lockedId
    ? gameStore.currentGame.players.find(p => p.id === lockedId)
    : gameStore.effectivePriorityPlayer
  if (!targetPlayer) return 0
  const playerIndex = gameStore.currentGame.players.findIndex(
    p => p.id === targetPlayer.id,
  )
  return playerIndex >= 0 ? getCardRotation(playerIndex) : 0
})

const iconRotationStyle = computed(() => {
  const rotation = priorityPlayerRotation.value
  if (rotation === 0) return {}
  return { transform: `rotate(${rotation}deg)` }
})

const nextTurnTranslateStyle = computed(() => {
  const tx = nextTurnOffsetX.value
  const ty = nextTurnOffsetY.value
  if (tx === 0 && ty === 0) return {}
  return { transform: `translate(${tx}px, ${ty}px)` }
})

const nextTurnRotateStyle = computed(() => {
  const rot = priorityPlayerRotation.value
  if (rot === 0) return {}
  return { transform: `rotate(${rot}deg)` }
})

const nextTurnArrowStyle = computed(() => {
  const game = gameStore.currentGame
  if (!game || game.players.length < 2) return {}
  const currentIndex = game.currentTurnPlayerIndex
  const nextIndex = (currentIndex + 1) % game.players.length
  const rawAngle = getDirectionAngle(currentIndex, nextIndex)
  // Snap to nearest 90° — no diagonal arrows
  const screenAngle = Math.round(rawAngle / 90) * 90
  // Compensate for the button's own rotation so the arrow points correctly on screen
  const arrowRotation = screenAngle - priorityPlayerRotation.value
  if (arrowRotation === 0) return {}
  return { transform: `rotate(${arrowRotation}deg)` }
})

function onNextTurnPointerDown(event: PointerEvent) {
  nextTurnDragStartX = event.clientX
  nextTurnDragStartY = event.clientY
  nextTurnGestureStartX = event.clientX
  nextTurnGestureStartY = event.clientY
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
  const requestedDeltaX = event.clientX - nextTurnDragStartX
  const requestedDeltaY = event.clientY - nextTurnDragStartY
  // Cancel long-press if finger moves beyond drag threshold
  if (Math.abs(requestedDeltaX) > DRAG_THRESHOLD || Math.abs(requestedDeltaY) > DRAG_THRESHOLD) {
    longPress.cancel()
  }

  let deltaX = requestedDeltaX
  let deltaY = requestedDeltaY
  const group = nextTurnGroupRef.value
  const safeShell = gameSafeShellRef.value

  if (group && safeShell) {
    const groupRect = group.getBoundingClientRect()
    const shellRect = safeShell.getBoundingClientRect()
    const shellStyle = getComputedStyle(safeShell)
    const safeLeft = shellRect.left + Number.parseFloat(shellStyle.paddingLeft || '0') + DRAG_SAFE_MARGIN_PX
    const safeRight = shellRect.right - Number.parseFloat(shellStyle.paddingRight || '0') - DRAG_SAFE_MARGIN_PX
    const safeTop = shellRect.top + Number.parseFloat(shellStyle.paddingTop || '0') + DRAG_SAFE_MARGIN_PX
    const safeBottom = shellRect.bottom - Number.parseFloat(shellStyle.paddingBottom || '0') - DRAG_SAFE_MARGIN_PX

    deltaX = Math.min(Math.max(deltaX, safeLeft - groupRect.left), safeRight - groupRect.right)
    deltaY = Math.min(Math.max(deltaY, safeTop - groupRect.top), safeBottom - groupRect.bottom)
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
  const gestureDistance = Math.sqrt(
    (event.clientX - nextTurnGestureStartX) ** 2 + (event.clientY - nextTurnGestureStartY) ** 2,
  )
  if (gestureDistance < DRAG_THRESHOLD) {
    // In pause mode, tap resumes the timer instead of advancing the turn
    if (settingsStore.gameSettings.enableTimer && !isTimerRunning.value) {
      if (canControlTimer.value) toggleTimer()
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

async function openGameMenu() {
  isGameMenuOpen.value = true
  await presentModal({
    component: GameMenuContent,
    componentProps: { contentRotation: priorityPlayerRotation.value },
    cssClass: 'game-sheet',
    breakpoints: [0, 0.55],
    initialBreakpoint: 0.55,
    onDismiss: ({ data, role }) => {
      isGameMenuOpen.value = false
      if (role === 'action' && typeof data === 'string') {
        const actions: Record<string, () => void> = {
          undo: handleUndo,
          redo: handleRedo,
          dice: () => { showDiceRoller.value = true },
          layout: openLayoutPicker,
          orientation: openOrientationPicker,
          history: openHistory,
          endGame: confirmEndGame,
        }
        actions[data]?.()
      }
    },
  })
}

async function openLayoutPicker() {
  const { default: LayoutPickerContent } = await import('@/components/game/LayoutPickerContent.vue')
  await presentModal({
    component: LayoutPickerContent,
    componentProps: { currentPlayerCount: currentPlayerCount.value, currentLayout: settingsStore.layoutMode },
    breakpoints: [0, 0.3],
    initialBreakpoint: 0.3,
    onDismiss: ({ data, role }) => {
      if (role === 'confirm' && data) {
        settingsStore.layoutMode = data as LayoutMode
      }
    },
  })
}

async function openOrientationPicker() {
  const { default: OrientationPickerContent } = await import('@/components/game/OrientationPickerContent.vue')
  await presentModal({
    component: OrientationPickerContent,
    breakpoints: [0, 0.55],
    initialBreakpoint: 0.55,
  })
}

async function openHistory() {
  const { default: GameHistoryContent } = await import('@/components/life-tracker/GameHistoryContent.vue')
  await presentModal({
    component: GameHistoryContent,
  })
}

// --- Anonymous player save queue ---
interface AnonymousPlayerCommander {
  cardName: string
  imageUri?: string
}
interface AnonymousPlayerEntry {
  name: string
  color: import('@/types/game').PlayerColor
  commanders: AnonymousPlayerCommander[]
}
const anonymousPlayerQueue = ref<AnonymousPlayerEntry[]>([])
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
  if (!canControlTimer.value) return
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
  if (!isTimerRunning.value) {
    toggleTimer()
  }
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

  // Turn advance pulse — only boxShadow glow, no scale (would overwrite SVG rotation)
  if (!prefersReducedMotion.value && nextTurnBtnRef.value) {
    gsap.fromTo(nextTurnBtnRef.value,
      { boxShadow: '0 0 30px rgba(232, 96, 10, 0.6)' },
      { boxShadow: '0 0 0 rgba(232, 96, 10, 0)', duration: 0.5, ease: 'power2.out' },
    )
  }
}

async function confirmEndGame() {
  if (multiplayerStore.isMultiplayer && !multiplayerStore.isHost) {
    const toast = await toastController.create({
      message: t('multiplayer.errors.hostOnly'),
      duration: 2500,
      position: 'bottom',
      color: 'warning',
    })
    await toast.present()
    return
  }

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
          if (multiplayerStore.isMultiplayer) {
            try {
              await multiplayerStore.finishGame()
            } catch {
              const errorToast = await toastController.create({
                message: multiplayerStore.connectionError ?? t('multiplayer.connectionError'),
                duration: 3000,
                position: 'bottom',
                color: 'danger',
              })
              await errorToast.present()
              return
            }
          }

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
            openSaveAnonymousModal()
          } else {
            gameStore.resetGame()
          }
        },
      },
    ],
  })
  await alert.present()
}

async function openSaveAnonymousModal() {
  const player = currentAnonymousPlayer.value
  if (!player) return

  const { default: SaveAnonymousContent } = await import('@/components/player-registry/SaveAnonymousContent.vue')
  await presentModal({
    component: SaveAnonymousContent,
    componentProps: {
      playerName: player.name,
      playerColor: player.color,
      commanders: player.commanders,
    },
    onDismiss: ({ data, role }) => {
      if (role === 'save' && data) {
        const { name, color } = data as { name: string; color: string }
        handleSaveAnonymousPlayer(name, color as import('@/types/game').PlayerColor)
      } else {
        handleSkipAnonymousPlayer()
      }
    },
  })
}

async function handleSaveAnonymousPlayer(name: string, color: import('@/types/game').PlayerColor) {
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

function advanceAnonymousQueue() {
  anonymousPlayerQueue.value.shift()
  if (anonymousPlayerQueue.value.length === 0) {
    gameStore.resetGame()
  } else {
    // Brief delay for visual transition, then open next player's modal
    setTimeout(() => {
      openSaveAnonymousModal()
    }, 350)
  }
}

function handleSkipAnonymousPlayer() {
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
.game-idle-content {
  --padding-start: max(16px, var(--ion-safe-area-left, 0px));
  --padding-end: max(16px, var(--ion-safe-area-right, 0px));
  --padding-top: 16px;
  --padding-bottom: 28px;
}

.pregame-waiting-banner {
  position: absolute;
  z-index: 20;
  bottom: calc(24px + var(--app-safe-bottom));
  left: 50%;
  width: min(calc(100% - 32px), 420px);
  padding: 11px 16px;
  border: 1px solid rgba(216, 171, 79, 0.3);
  border-radius: 999px;
  background: rgba(7, 12, 14, 0.9);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.32);
  color: rgba(238, 223, 190, 0.9);
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  transform: translateX(-50%);
}

.game-idle-wrap {
  display: grid;
  min-height: 100%;
  place-items: center;
}

.game-idle-panel {
  position: relative;
  display: flex;
  overflow: hidden;
  width: min(100%, 430px);
  padding: 28px 22px 24px;
  align-items: center;
  flex-direction: column;
  border: 1px solid rgba(205, 172, 99, 0.24);
  border-radius: 18px;
  background:
    radial-gradient(circle at 50% 26%, rgba(209, 127, 33, 0.14), transparent 31%),
    linear-gradient(145deg, rgba(20, 29, 32, 0.96), rgba(7, 12, 14, 0.97));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.045),
    inset 0 -28px 45px rgba(0, 0, 0, 0.18),
    0 18px 42px rgba(0, 0, 0, 0.44);
  text-align: center;
}

.game-idle-panel::after {
  content: '';
  position: absolute;
  top: 0;
  right: 19%;
  left: 19%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(235, 190, 94, 0.64), transparent);
  box-shadow: 0 0 12px rgba(217, 124, 35, 0.34);
}

.game-idle-panel__eyebrow {
  margin: 0;
  color: rgba(233, 204, 140, 0.82);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.game-idle-panel__crest {
  position: relative;
  display: grid;
  width: 144px;
  height: 144px;
  margin: 9px 0 4px;
  place-items: center;
}

.game-idle-panel__crest > span {
  position: absolute;
  inset: 4px;
  border: 1px solid rgba(211, 175, 96, 0.17);
  border-radius: 50%;
  background:
    repeating-radial-gradient(circle, transparent 0 22px, rgba(205, 171, 95, 0.045) 23px 24px),
    radial-gradient(circle, rgba(210, 128, 32, 0.08), transparent 64%);
  box-shadow: inset 0 0 28px rgba(0, 0, 0, 0.34);
}

.game-idle-panel__crest > span::before,
.game-idle-panel__crest > span::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 6px;
  height: 6px;
  border: 1px solid rgba(218, 180, 99, 0.48);
  background: #11181a;
  transform: translateY(-50%) rotate(45deg);
}

.game-idle-panel__crest > span::before { left: -4px; }
.game-idle-panel__crest > span::after { right: -4px; }

.game-idle-panel__crest img {
  position: relative;
  z-index: 1;
  width: 88px;
  height: 88px;
  filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.62)) drop-shadow(0 0 18px rgba(217, 146, 43, 0.2));
}

.game-idle-panel h2 {
  margin: 0;
  color: rgba(242, 231, 204, 0.9);
  font-family: var(--font-beleren);
  font-size: 21px;
  letter-spacing: 0.25px;
}

.game-idle-panel__hint {
  max-width: 300px;
  margin: 7px 0 17px;
  color: rgba(214, 225, 219, 0.72);
  font-size: 14px;
  line-height: 1.5;
}

.game-idle-panel__cta {
  --border-radius: 10px;
  width: 100%;
  max-width: 290px;
  margin: 0;
}

@media (min-width: 700px) {
  .game-idle-content {
    --padding-start: max(28px, var(--app-safe-left));
    --padding-end: max(28px, var(--app-safe-right));
    --padding-top: 28px;
  }

  .game-idle-panel {
    width: min(100%, 540px);
    padding: 38px 38px 34px;
  }

  .game-idle-panel__crest {
    width: 168px;
    height: 168px;
  }

  .game-idle-panel__crest img {
    width: 100px;
    height: 100px;
  }

  .game-idle-panel h2 {
    font-size: 25px;
  }

  .game-idle-panel__hint {
    max-width: 360px;
    font-size: 15px;
  }

  .game-idle-panel__cta {
    max-width: 330px;
  }
}

.topbar-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
  transition: transform 0.15s ease, background 0.15s ease;
  box-shadow: var(--shadow-btn-beveled);
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
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  -webkit-backdrop-filter: blur(8px);
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

.multiplayer-retry-btn {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.22);
  color: rgba(255, 255, 255, 0.86);
}

.multiplayer-retry-btn:active {
  transform: scale(0.92);
}

/* Wrapper that handles drag translate — smooth snap-back */
.next-turn-group {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.floating-next-turn-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 66px;
  height: 66px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  font-size: 30px;
  transition: background 0.15s ease;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  box-shadow: var(--shadow-btn-beveled), 0 0 12px rgba(255, 255, 255, 0.05);
}

.floating-next-turn-dragging {
  opacity: 0.85;
  cursor: grabbing;
}

/* Disable snap-back transition on wrapper during drag */
.next-turn-group:has(.floating-next-turn-dragging) {
  transition: none;
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

@keyframes game-timer-flash {
  0%, 100% { background-color: rgba(239, 68, 68, 0.05); }
  50% { background-color: rgba(239, 68, 68, 0.25); }
}
.game-timer-flash {
  animation: game-timer-flash 0.8s ease-in-out infinite;
}

.announce-banner {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.08));
  border: 1px solid rgba(239, 68, 68, 0.2);
  -webkit-backdrop-filter: blur(4px);
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

/* Turn-order list — FLIP move animation */
.turn-order-move {
  transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}

</style>
