<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button :disabled="!gameStore.canUndo" :aria-label="t('game.undo')" data-sound="none" @click="handleUndo">
            <ion-icon :icon="arrowUndoOutline" />
          </ion-button>
          <ion-button :disabled="!gameStore.canRedo" :aria-label="t('game.redo')" data-sound="none" @click="handleRedo">
            <ion-icon :icon="arrowRedoOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ t('game.title') }}</ion-title>
        <ion-buttons slot="end">
          <!-- Dice roller -->
          <ion-button v-if="gameStore.isGameActive" @click="showDiceRoller = true">
            <IconDie :size="20" />
          </ion-button>
          <!-- Layout mode picker -->
          <ion-button v-if="gameStore.isGameActive" @click="showLayoutPicker = true">
            <ion-icon :icon="gridOutline" />
          </ion-button>

          <ion-button :aria-label="t('game.history')" @click="showHistory = true">
            <ion-icon :icon="listOutline" />
          </ion-button>
          <ion-button :aria-label="t('game.nextTurn')" data-sound="none" @click="handleAdvanceTurn">
            <ion-icon :icon="playForwardOutline" />
          </ion-button>
          <ion-button :aria-label="t('game.endGame')" @click="confirmEndGame">
            <ion-icon :icon="flagOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

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

      <div v-else class="flex h-full flex-col">
        <!-- Multiplayer indicator -->
        <div v-if="multiplayerStore.isMultiplayer" class="flex items-center justify-center gap-2 bg-mana-blue/20 px-4 py-2">
          <div class="h-2 w-2 rounded-full bg-life-positive animate-pulse" />
          <span class="text-xs text-text-secondary">
            {{ t('game.roomStatus', { code: multiplayerStore.roomCode, count: multiplayerStore.connectedPlayerCount }) }}
          </span>
        </div>

        <!-- Game timer (v-show to ensure per-player timer tick always runs) -->
        <GameTimer v-show="gameStore.settings.enableTimer" :is-flashing="flashTimerZone" :is-overtime="isOvertimeDisplayActive" />

        <!-- Turn indicator -->
        <div class="flex items-center justify-between px-4 py-2" role="status">
          <span class="text-xs text-text-secondary">
            {{ t('game.turn', { n: gameStore.currentGame?.turnNumber }) }}
          </span>
          <span class="text-xs font-semibold text-accent">
            {{ gameStore.currentTurnPlayer?.name }}
          </span>
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
          class="grid flex-1 gap-2 p-2"
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
              :commander-damage-attacker-id="commanderDragState?.targetPlayerId === player.id ? commanderDragState.attackerPlayerId : null"
              @state-changed="onPlayerStateChanged"
              @turn-advanced="onTurnAdvanced"
              @commander-drag-drop="(targetId: string) => handleCommanderDragDrop(player.id, targetId)"
            />
          </div>
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
          <!-- Default -->
          <button
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

          <!-- Star -->
          <button
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
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  alertController,
  toastController,
} from '@ionic/vue'
import { arrowUndoOutline, arrowRedoOutline, playForwardOutline, listOutline, flagOutline, gridOutline } from 'ionicons/icons'
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
import SaveAnonymousPlayerModal from '@/components/player-registry/SaveAnonymousPlayerModal.vue'
import { playTurnAdvance, playUndo, playEndGame } from '@/services/sounds'
import { useBehaviorRuleEngine } from '@/rules/behaviorRuleEngine'

const { t } = useI18n()
const router = useRouter()
const gameStore = useGameStore()
const multiplayerStore = useMultiplayerStore()
const settingsStore = useSettingsStore()
const registryStore = usePlayerRegistryStore()
// Initialize behavior rules engine (watches game state, fires effects)
const { flashingPlayerIds, flashTimerZone, announceMessages, isOvertimeDisplayActive } = useBehaviorRuleEngine()

const { playerGridClass, gridStyle, cardOuterClasses, cardOuterStyle, cardRotationStyle } = usePlayerGridLayout()

const showHistory = ref(false)
const showLayoutPicker = ref(false)
const showDiceRoller = ref(false)

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
