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
        <!-- Multiplayer indicator -->
        <div v-if="multiplayerStore.isMultiplayer" class="flex items-center justify-center gap-2 bg-mana-blue/20 px-4 py-2">
          <div class="h-2 w-2 rounded-full bg-life-positive animate-pulse" />
          <span class="text-xs text-text-secondary">
            {{ t('game.roomStatus', { code: multiplayerStore.roomCode, count: multiplayerStore.connectedPlayerCount }) }}
          </span>
        </div>

        <!-- Game timer (v-show to ensure per-player timer tick always runs) -->
        <GameTimer v-show="gameStore.settings.enableTimer" :is-flashing="flashTimerZone" :is-overtime="isOvertimeDisplayActive" />

        <!-- Turn indicator + action buttons -->
        <div class="flex items-center gap-2 px-3 py-1.5" role="status">
          <span class="text-xs text-text-secondary">
            {{ t('game.turn', { n: gameStore.currentGame?.turnNumber }) }}
          </span>
          <span class="text-xs font-semibold text-accent">
            {{ gameStore.currentTurnPlayer?.name }}
          </span>
          <div class="ml-auto flex items-center gap-1">
            <button
              class="topbar-action-btn"
              :aria-label="t('dice.title')"
              @click="showDiceRoller = true"
            >
              <IconDie :size="16" />
            </button>
            <button
              class="topbar-action-btn"
              :aria-label="t('game.menu')"
              @click="openGameMenu"
            >
              <ion-icon :icon="menuOutline" />
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="shrink-0 text-arena-gold-light">
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
          :class="playerGridClass"
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

        <!-- Floating next turn button (draggable, snaps back to center) -->
        <div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <button
            ref="nextTurnBtnRef"
            class="floating-next-turn-btn pointer-events-auto"
            :class="{ 'floating-next-turn-dragging': isNextTurnDragging }"
            :style="nextTurnTransformStyle"
            :aria-label="t('game.nextTurn')"
            data-sound="none"
            @pointerdown.prevent="onNextTurnPointerDown"
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" class="text-white/80 drop-shadow-sm">
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
    <DiceRollerSheet :is-open="showDiceRoller" @close="showDiceRoller = false" />

    <!-- Game menu -->
    <AppModal :is-open="showGameMenu" :initial-breakpoint="0.5" :breakpoints="[0, 0.5]" @close="closeGameMenu">
      <div class="px-4 pb-20 pt-5">
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
import { arrowUndoOutline, arrowRedoOutline, listOutline, flagOutline, gridOutline, menuOutline } from 'ionicons/icons'
import { useGameStore } from '@/stores/gameStore'
import { useMultiplayerStore } from '@/stores/multiplayerStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { usePlayerRegistryStore } from '@/stores/playerRegistryStore'
import type { LayoutMode } from '@/services/persistence'
import LifeTracker from '@/components/life-tracker/LifeTracker.vue'
import GameTimer from '@/components/game-timer/GameTimer.vue'
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

const { playerGridClass, gridStyle, getCardRotation, getInnerCornerStyle, cardOuterClasses, cardOuterStyle, cardRotationStyle } = usePlayerGridLayout()

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
let nextTurnHasMoved = false
let nextTurnLastTapTime = 0
const DRAG_THRESHOLD = 6
const DOUBLE_TAP_DELAY = 300

const currentTurnRotation = computed(() => {
  const turnIndex = gameStore.currentGame?.currentTurnPlayerIndex ?? 0
  return getCardRotation(turnIndex)
})

const nextTurnTransformStyle = computed(() => {
  const tx = nextTurnOffsetX.value
  const ty = nextTurnOffsetY.value
  const hasOffset = tx !== 0 || ty !== 0
  const rot = currentTurnRotation.value
  if (!hasOffset && rot === 0) return {}
  const parts: string[] = []
  if (hasOffset) parts.push(`translate(${tx}px, ${ty}px)`)
  if (rot !== 0) parts.push(`rotate(${rot}deg)`)
  return { transform: parts.join(' ') }
})

function onNextTurnPointerDown(event: PointerEvent) {
  nextTurnDragStartX = event.clientX
  nextTurnDragStartY = event.clientY
  nextTurnHasMoved = false
  const target = event.currentTarget as HTMLElement
  target.setPointerCapture(event.pointerId)
  target.addEventListener('pointermove', onNextTurnPointerMove)
  target.addEventListener('pointerup', onNextTurnPointerUp, { once: true })
  target.addEventListener('pointercancel', onNextTurnPointerUp, { once: true })
}

function onNextTurnPointerMove(event: PointerEvent) {
  const deltaX = event.clientX - nextTurnDragStartX + nextTurnOffsetX.value
  const deltaY = event.clientY - nextTurnDragStartY + nextTurnOffsetY.value
  const distance = Math.sqrt(
    (event.clientX - nextTurnDragStartX) ** 2 +
    (event.clientY - nextTurnDragStartY) ** 2,
  )
  if (!nextTurnHasMoved && distance < DRAG_THRESHOLD) return
  nextTurnHasMoved = true
  isNextTurnDragging.value = true
  nextTurnOffsetX.value = deltaX
  nextTurnOffsetY.value = deltaY
  nextTurnDragStartX = event.clientX
  nextTurnDragStartY = event.clientY
}

function onNextTurnPointerUp(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement
  target.removeEventListener('pointermove', onNextTurnPointerMove)
  isNextTurnDragging.value = false
  if (!nextTurnHasMoved) {
    const now = Date.now()
    if (now - nextTurnLastTapTime < DOUBLE_TAP_DELAY && (nextTurnOffsetX.value !== 0 || nextTurnOffsetY.value !== 0)) {
      // Double-tap: snap back to center
      snapNextTurnToCenter()
    } else {
      handleAdvanceTurn()
    }
    nextTurnLastTapTime = now
  }
  // Snap back to center if released near center (within 30px)
  const distFromCenter = Math.sqrt(nextTurnOffsetX.value ** 2 + nextTurnOffsetY.value ** 2)
  if (distFromCenter < 30) {
    snapNextTurnToCenter()
  }
}

function snapNextTurnToCenter() {
  nextTurnOffsetX.value = 0
  nextTurnOffsetY.value = 0
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

// --- Game actions ---

/**
 * If the given action targeted a remote player (e.g. commander damage dealt
 * to another device's player), push that player's updated state to Firebase.
 */
function pushRemotePlayerIfNeeded(action: { type: string; playerId: string }) {
  if (
    action.type === 'commander_damage' &&
    action.playerId &&
    !multiplayerStore.isLocalPlayer(action.playerId)
  ) {
    multiplayerStore.pushRemotePlayerState(action.playerId)
  }
}

function syncAfterAction() {
  if (!multiplayerStore.isMultiplayer) return

  multiplayerStore.pushLocalPlayerState()

  // Check the most recent history entry for cross-device modifications
  const history = gameStore.currentGame?.history
  if (history && history.length > 0) {
    pushRemotePlayerIfNeeded(history[history.length - 1]!)
  }
}

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
      pushRemotePlayerIfNeeded(actionToUndo)
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
      pushRemotePlayerIfNeeded(actionToRedo)
    }
  }
}

function handleAdvanceTurn() {
  gameStore.advanceTurn()
  playTurnAdvance()
  syncTurnAdvance()
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
  syncAfterAction()
}

function syncTurnAdvance() {
  if (!multiplayerStore.isMultiplayer) return
  multiplayerStore.pushTurnAdvance()
  multiplayerStore.pushLocalPlayerState()
}

function onTurnAdvanced() {
  syncTurnAdvance()
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

.topbar-action-btn:active {
  transform: scale(0.9);
  background: rgba(255, 255, 255, 0.12);
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

.floating-next-turn-btn:active:not(.floating-next-turn-dragging) {
  transform: scale(0.9);
  background: rgba(0, 0, 0, 0.6);
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

.announce-banner {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.08));
  border: 1px solid rgba(239, 68, 68, 0.2);
  backdrop-filter: blur(4px);
}

.announce-slide-enter-active {
  transition: all 0.3s ease-out;
}
.announce-slide-leave-active {
  transition: all 0.2s ease-in;
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
