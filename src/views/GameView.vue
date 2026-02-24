<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button :disabled="!gameStore.canUndo" :aria-label="t('game.undo')" @click="handleUndo">
            <ion-icon :icon="arrowUndoOutline" />
          </ion-button>
          <ion-button :disabled="!gameStore.canRedo" :aria-label="t('game.redo')" @click="handleRedo">
            <ion-icon :icon="arrowRedoOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ t('game.title') }}</ion-title>
        <ion-buttons slot="end">
          <!-- Layout mode picker -->
          <ion-button v-if="gameStore.isGameActive" @click="showLayoutPicker = true">
            <ion-icon :icon="gridOutline" />
          </ion-button>

          <ion-button :aria-label="t('game.history')" @click="showHistory = true">
            <ion-icon :icon="listOutline" />
          </ion-button>
          <ion-button :aria-label="t('game.nextTurn')" @click="handleAdvanceTurn">
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
        <GameTimer v-show="gameStore.settings.enableTimer" />

        <!-- Turn indicator -->
        <div class="flex items-center justify-between px-4 py-2" role="status">
          <span class="text-xs text-text-secondary">
            {{ t('game.turn', { n: gameStore.currentGame?.turnNumber }) }}
          </span>
          <span class="text-xs font-semibold text-accent">
            {{ gameStore.currentTurnPlayer?.name }}
          </span>
        </div>

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
import GameHistoryModal from '@/components/life-tracker/GameHistoryModal.vue'
import AppModal from '@/components/ui/AppModal.vue'
import IllustrationEmptyGame from '@/components/icons/illustrations/IllustrationEmptyGame.vue'

const { t } = useI18n()
const router = useRouter()
const gameStore = useGameStore()
const multiplayerStore = useMultiplayerStore()
const settingsStore = useSettingsStore()
const registryStore = usePlayerRegistryStore()
const showHistory = ref(false)
const showLayoutPicker = ref(false)

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

const isStarLayout = computed(() => {
  const playerCount = gameStore.currentGame?.players.length ?? 4
  return settingsStore.layoutMode === 'star' && playerCount === 4
})

const playerGridClass = computed(() => {
  const playerCount = gameStore.currentGame?.players.length ?? 4

  // 4 players and star use inline grid-template-areas
  if (isStarLayout.value || playerCount === 4) return ''

  if (playerCount <= 2) return 'grid-cols-1 grid-rows-2'
  if (playerCount === 3) return 'grid-cols-2 grid-rows-2'
  return 'grid-cols-2 grid-rows-3'
})

const gridStyle = computed(() => {
  const playerCount = gameStore.currentGame?.players.length ?? 4

  if (isStarLayout.value) {
    return {
      gridTemplateAreas: '". north ." "west . east" ". south ."',
      gridTemplateColumns: '1fr 1fr 1fr',
      gridTemplateRows: '1fr 1fr 1fr',
    }
  }

  // 4 players: clockwise order TL(0) → TR(1) → BR(2) → BL(3)
  if (playerCount === 4) {
    return {
      gridTemplateAreas: '"p0 p1" "p3 p2"',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
    }
  }

  return {}
})

function getGridArea(index: number): string | undefined {
  const playerCount = gameStore.currentGame?.players.length ?? 4

  if (isStarLayout.value) {
    return ['north', 'east', 'south', 'west'][index]
  }

  if (playerCount === 4) {
    return `p${index}`
  }

  return undefined
}

function getCardRotation(index: number): number {
  const mode = settingsStore.layoutMode
  const playerCount = gameStore.currentGame?.players.length ?? 4

  if (mode === 'default') return 0

  // Star with 4 players: N=180, E=270, S=0, W=90
  if (mode === 'star' && playerCount === 4) {
    return [180, 270, 0, 90][index] ?? 0
  }

  // Face-to-face side (4 players clockwise): TL=90, TR=270, BR=270, BL=90
  if (mode === 'faceToFaceSide') {
    if (playerCount === 4) return [90, 270, 270, 90][index] ?? 90
    return index % 2 === 0 ? 90 : 270
  }

  // Face-to-face: top row (first half) → 180°, bottom row → 0°
  const halfCount = Math.ceil(playerCount / 2)
  return index < halfCount ? 180 : 0
}

function cardOuterClasses(index: number): string[] {
  const classes: string[] = []
  const rotation = getCardRotation(index)
  const playerCount = gameStore.currentGame?.players.length ?? 0

  // 3-player col-span
  if (playerCount === 3 && index === 2 && !isStarLayout.value) {
    classes.push('col-span-2')
  }

  // Side cards need flex centering for dimension swap
  if (rotation === 90 || rotation === 270) {
    classes.push('flex', 'items-center', 'justify-center')
  }

  return classes
}

function cardOuterStyle(index: number): Record<string, string> {
  const style: Record<string, string> = {}

  const area = getGridArea(index)
  if (area) style.gridArea = area

  // Side cards need size containment for cqw/cqh units
  const rotation = getCardRotation(index)
  if (rotation === 90 || rotation === 270) {
    style.containerType = 'size'
  }

  return style
}

function cardRotationStyle(index: number): Record<string, string> {
  const rotation = getCardRotation(index)
  if (rotation === 0) return {}
  if (rotation === 180) return { transform: 'rotate(180deg)' }

  // 90 or 270: swap dimensions using container query units
  // Parent has container-type: size, so cqw = parent width, cqh = parent height
  // After rotation, visual width = original height and vice versa
  return {
    width: '100cqh',
    height: '100cqw',
    flexShrink: '0',
    transform: `rotate(${rotation}deg)`,
  }
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

          const toast = await toastController.create({
            message: t('game.gameRecorded'),
            duration: 3000,
            position: 'bottom',
            color: 'success',
          })
          await toast.present()

          // Propose to save anonymous players
          for (const player of anonymousPlayers) {
            await proposeAnonymousSave(player.name, player.color)
          }

          gameStore.resetGame()
        },
      },
    ],
  })
  await alert.present()
}

async function proposeAnonymousSave(playerName: string, playerColor: import('@/types/game').ManaColor) {
  const saveAlert = await alertController.create({
    header: t('players.saveAnonymous'),
    message: t('players.saveAnonymousMessage', { name: playerName }),
    buttons: [
      { text: t('common.cancel'), role: 'cancel' },
      {
        text: t('players.save'),
        handler: () => {
          registryStore.addPlayerProfile(playerName, playerColor)
        },
      },
    ],
  })
  await saveAlert.present()
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
