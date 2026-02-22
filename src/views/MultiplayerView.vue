<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Multijoueur</ion-title>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Not in a room: show create/join -->
      <div v-if="!multiplayerStore.isMultiplayer" class="flex flex-col gap-6 pt-4">
        <!-- Local player count -->
        <ion-item>
          <ion-label>Joueurs sur cet appareil</ion-label>
          <ion-select v-model="localPlayerCount" interface="popover">
            <ion-select-option :value="1">1</ion-select-option>
            <ion-select-option :value="2">2</ion-select-option>
            <ion-select-option :value="3">3</ion-select-option>
          </ion-select>
        </ion-item>

        <!-- Player names -->
        <div class="space-y-2">
          <ion-item v-for="(_, index) in localPlayerCount" :key="index">
            <ion-input
              v-model="localPlayerNames[index]"
              :label="localPlayerCount > 1 ? `Joueur ${index + 1}` : 'Votre nom'"
              label-placement="floating"
              :placeholder="`Joueur ${index + 1}`"
            />
          </ion-item>
        </div>

        <!-- Create room -->
        <div class="space-y-3">
          <h2 class="text-lg font-semibold text-text-primary">Creer une partie</h2>

          <ion-item>
            <ion-label>Joueurs total</ion-label>
            <ion-select v-model="totalPlayerCount" interface="popover">
              <ion-select-option :value="2">2</ion-select-option>
              <ion-select-option :value="3">3</ion-select-option>
              <ion-select-option :value="4">4</ion-select-option>
              <ion-select-option :value="5">5</ion-select-option>
              <ion-select-option :value="6">6</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-button
            expand="block"
            :disabled="!canSubmit || multiplayerStore.isConnecting"
            @click="createNewRoom"
          >
            <ion-spinner v-if="multiplayerStore.isConnecting" name="crescent" slot="start" />
            Creer la room
          </ion-button>
        </div>

        <!-- Join room -->
        <div class="space-y-3">
          <h2 class="text-lg font-semibold text-text-primary">Rejoindre une partie</h2>

          <ion-item>
            <ion-input
              v-model="joinCode"
              label="Code de la room"
              label-placement="floating"
              placeholder="ABCD"
              :maxlength="4"
              class="uppercase"
              @ionInput="joinCode = joinCode.toUpperCase()"
            />
          </ion-item>

          <ion-button
            expand="block"
            fill="outline"
            :disabled="joinCode.length !== 4 || !canSubmit || multiplayerStore.isConnecting"
            @click="joinExisting"
          >
            <ion-spinner v-if="multiplayerStore.isConnecting" name="crescent" slot="start" />
            Rejoindre
          </ion-button>
        </div>

        <!-- Error -->
        <ion-text v-if="multiplayerStore.connectionError" color="danger" class="text-center text-sm">
          {{ multiplayerStore.connectionError }}
        </ion-text>
      </div>

      <!-- In a room: show lobby -->
      <div v-else class="flex flex-col items-center gap-6 pt-4">
        <!-- Room code display -->
        <div class="text-center">
          <p class="text-sm text-text-secondary">Code de la room</p>
          <p class="mt-1 text-5xl font-bold tracking-[0.3em] text-accent">
            {{ multiplayerStore.roomCode }}
          </p>
          <p class="mt-2 text-xs text-text-secondary">
            Partagez ce code aux autres joueurs
          </p>
        </div>

        <!-- Connected players -->
        <div class="w-full space-y-2">
          <h3 class="text-base font-semibold text-text-primary">
            Joueurs ({{ multiplayerStore.connectedPlayerCount }} / {{ multiplayerStore.roomData?.settings.playerCount }})
          </h3>

          <div
            v-for="player in multiplayerStore.allPlayers"
            :key="player.id"
            class="flex items-center gap-3 rounded-xl bg-surface-card p-3"
          >
            <div
              class="h-3 w-3 rounded-full"
              :class="player.connected ? 'bg-life-positive' : 'bg-life-negative'"
            />
            <span class="flex-1 text-text-primary">
              {{ player.name }}
              <span v-if="multiplayerStore.isLocalPlayer(player.id)" class="text-xs text-text-secondary">(vous)</span>
              <span v-if="player.deviceId === multiplayerStore.roomData?.hostId" class="text-xs text-accent"> (host)</span>
            </span>
            <span class="text-xs text-text-secondary">
              {{ player.connected ? 'Connecte' : 'Deconnecte' }}
            </span>
          </div>
        </div>

        <!-- Start game (host only) -->
        <ion-button
          v-if="multiplayerStore.isHost"
          expand="block"
          color="danger"
          size="large"
          :disabled="!multiplayerStore.isRoomReady"
          @click="startMultiplayerGame"
        >
          Lancer la partie ({{ multiplayerStore.connectedPlayerCount }} joueurs)
        </ion-button>

        <p v-if="!multiplayerStore.isHost" class="text-center text-sm text-text-secondary">
          En attente que le host lance la partie...
        </p>

        <!-- Leave -->
        <ion-button expand="block" fill="clear" color="medium" @click="leave">
          Quitter la room
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonItem,
  IonInput,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonSpinner,
  IonText,
} from '@ionic/vue'
import { useMultiplayerStore } from '@/stores/multiplayerStore'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'

const router = useRouter()
const multiplayerStore = useMultiplayerStore()
const gameStore = useGameStore()
const settingsStore = useSettingsStore()

const localPlayerCount = ref(1)
const localPlayerNames = ref<string[]>(['Joueur 1'])
const joinCode = ref('')
const totalPlayerCount = ref(settingsStore.gameSettings.playerCount)

// Keep names array in sync with count
watch(localPlayerCount, (newCount) => {
  while (localPlayerNames.value.length < newCount) {
    localPlayerNames.value.push(`Joueur ${localPlayerNames.value.length + 1}`)
  }
  localPlayerNames.value.length = newCount
})

const validPlayerNames = computed(() =>
  localPlayerNames.value.slice(0, localPlayerCount.value).filter((n) => n.trim()),
)

const canSubmit = computed(() => validPlayerNames.value.length === localPlayerCount.value)

async function createNewRoom() {
  try {
    await multiplayerStore.hostRoom(validPlayerNames.value, {
      startingLife: settingsStore.gameSettings.startingLife,
      commanderDamageThreshold: settingsStore.gameSettings.commanderDamageThreshold,
      poisonThreshold: settingsStore.gameSettings.poisonThreshold,
      playerCount: totalPlayerCount.value,
    })
  } catch {
    // Error is already in store
  }
}

async function joinExisting() {
  try {
    await multiplayerStore.joinExistingRoom(joinCode.value.trim(), validPlayerNames.value)
  } catch {
    // Error is already in store
  }
}

function startMultiplayerGame() {
  const players = multiplayerStore.createMultiplayerGame()

  gameStore.settings = {
    ...settingsStore.gameSettings,
    playerCount: players.length,
  }

  gameStore.currentGame = {
    id: crypto.randomUUID(),
    players,
    currentTurnPlayerIndex: 0,
    turnNumber: 1,
    startedAt: Date.now(),
    elapsedMs: 0,
    isRunning: true,
    history: [],
  }

  multiplayerStore.pushFullGameState()
  router.push('/game')
}

async function leave() {
  await multiplayerStore.disconnect()
}
</script>
