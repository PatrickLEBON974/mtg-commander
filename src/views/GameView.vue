<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button :disabled="!gameStore.canUndo" @click="handleUndo">
            <ion-icon :icon="arrowUndoOutline" />
          </ion-button>
          <ion-button :disabled="!gameStore.canRedo" @click="handleRedo">
            <ion-icon :icon="arrowRedoOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title>Partie</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="showHistory = true">
            <ion-icon :icon="listOutline" />
          </ion-button>
          <ion-button @click="handleAdvanceTurn">
            <ion-icon :icon="playForwardOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="!gameStore.isGameActive" class="flex h-full items-center justify-center">
        <div class="text-center">
          <p class="text-text-secondary">Aucune partie en cours</p>
          <ion-button class="mt-4" @click="router.push('/home')">
            Demarrer une partie
          </ion-button>
        </div>
      </div>

      <div v-else class="flex h-full flex-col">
        <!-- Multiplayer indicator -->
        <div v-if="multiplayerStore.isMultiplayer" class="flex items-center justify-center gap-2 bg-mana-blue/20 px-4 py-1">
          <div class="h-2 w-2 rounded-full bg-life-positive animate-pulse" />
          <span class="text-xs text-text-secondary">
            Room {{ multiplayerStore.roomCode }} — {{ multiplayerStore.connectedPlayerCount }} connectes
          </span>
        </div>

        <!-- Game timer -->
        <GameTimer v-if="gameStore.settings.enableTimer" />

        <!-- Turn indicator -->
        <div class="flex items-center justify-between px-4 py-1.5">
          <span class="text-xs text-text-secondary">
            Tour {{ gameStore.currentGame?.turnNumber }}
          </span>
          <span class="text-xs font-semibold text-accent">
            {{ gameStore.currentTurnPlayer?.name }}
          </span>
        </div>

        <!-- Player grid -->
        <div
          class="grid flex-1 gap-1.5 p-1.5"
          :class="playerGridClass"
        >
          <LifeTracker
            v-for="player in gameStore.currentGame?.players"
            :key="player.id"
            :player="player"
            :is-current-turn="player.id === gameStore.currentTurnPlayer?.id"
            @state-changed="onPlayerStateChanged"
          />
        </div>
      </div>
    </ion-content>

    <!-- History modal -->
    <GameHistoryModal
      :is-open="showHistory"
      @close="showHistory = false"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
} from '@ionic/vue'
import { arrowUndoOutline, arrowRedoOutline, playForwardOutline, listOutline } from 'ionicons/icons'
import { useGameStore } from '@/stores/gameStore'
import { useMultiplayerStore } from '@/stores/multiplayerStore'
import LifeTracker from '@/components/life-tracker/LifeTracker.vue'
import GameTimer from '@/components/game-timer/GameTimer.vue'
import GameHistoryModal from '@/components/life-tracker/GameHistoryModal.vue'

const router = useRouter()
const gameStore = useGameStore()
const multiplayerStore = useMultiplayerStore()
const showHistory = ref(false)

const playerGridClass = computed(() => {
  const playerCount = gameStore.currentGame?.players.length ?? 4
  if (playerCount <= 2) return 'grid-cols-1 grid-rows-2'
  if (playerCount <= 4) return 'grid-cols-2 grid-rows-2'
  return 'grid-cols-2 grid-rows-3'
})

function syncAfterAction() {
  if (multiplayerStore.isMultiplayer) {
    multiplayerStore.pushLocalPlayerState()
  }
}

function handleUndo() {
  gameStore.undoLastAction()
  syncAfterAction()
}

function handleRedo() {
  gameStore.redoLastAction()
  syncAfterAction()
}

function handleAdvanceTurn() {
  gameStore.advanceTurn()
  if (multiplayerStore.isMultiplayer) {
    multiplayerStore.pushTurnAdvance()
  }
}

function onPlayerStateChanged() {
  syncAfterAction()
}
</script>
