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
      <div v-if="!multiplayerStore.isMultiplayer">
        <!-- Local player setup -->
        <ion-list :inset="true">
          <ion-list-header>
            <ion-label>Joueurs sur cet appareil</ion-label>
          </ion-list-header>

          <ion-item lines="inset">
            <ion-icon :icon="phonePortraitOutline" slot="start" color="medium" />
            <ion-label>Nombre</ion-label>
            <ion-select v-model="localPlayerCount" interface="action-sheet">
              <ion-select-option :value="1">1</ion-select-option>
              <ion-select-option :value="2">2</ion-select-option>
              <ion-select-option :value="3">3</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item v-for="(_, index) in localPlayerCount" :key="index" :lines="index === localPlayerCount - 1 ? 'none' : 'inset'">
            <ion-icon :icon="personOutline" slot="start" color="tertiary" />
            <ion-input
              v-model="localPlayerNames[index]"
              :label="localPlayerCount > 1 ? `Joueur ${index + 1}` : 'Votre nom'"
              label-placement="floating"
              :placeholder="`Joueur ${index + 1}`"
            />
          </ion-item>
        </ion-list>

        <!-- Create room -->
        <ion-list :inset="true">
          <ion-list-header>
            <ion-label>Creer une partie</ion-label>
          </ion-list-header>

          <ion-item lines="inset">
            <ion-icon :icon="peopleOutline" slot="start" color="tertiary" />
            <ion-label>Joueurs total</ion-label>
            <ion-select v-model="totalPlayerCount" interface="action-sheet">
              <ion-select-option :value="2">2</ion-select-option>
              <ion-select-option :value="3">3</ion-select-option>
              <ion-select-option :value="4">4</ion-select-option>
              <ion-select-option :value="5">5</ion-select-option>
              <ion-select-option :value="6">6</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item lines="none">
            <ion-button
              expand="block"
              :disabled="!canSubmit || multiplayerStore.isConnecting"
              @click="createNewRoom"
              class="ion-margin-vertical"
              style="width: 100%"
            >
              <ion-spinner v-if="multiplayerStore.isConnecting" name="crescent" slot="start" />
              <ion-icon v-else :icon="addCircleOutline" slot="start" />
              Creer la room
            </ion-button>
          </ion-item>
        </ion-list>

        <!-- Join room -->
        <ion-list :inset="true">
          <ion-list-header>
            <ion-label>Rejoindre une partie</ion-label>
          </ion-list-header>

          <ion-item lines="inset">
            <ion-icon :icon="keyOutline" slot="start" color="warning" />
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

          <ion-item lines="none">
            <ion-button
              expand="block"
              fill="outline"
              :disabled="joinCode.length !== 4 || !canSubmit || multiplayerStore.isConnecting"
              @click="joinExisting"
              class="ion-margin-vertical"
              style="width: 100%"
            >
              <ion-spinner v-if="multiplayerStore.isConnecting" name="crescent" slot="start" />
              <ion-icon v-else :icon="enterOutline" slot="start" />
              Rejoindre
            </ion-button>
          </ion-item>
        </ion-list>

        <!-- Error -->
        <ion-item v-if="multiplayerStore.connectionError" lines="none" class="ion-margin-horizontal">
          <ion-icon :icon="alertCircleOutline" slot="start" color="danger" />
          <ion-label color="danger" class="ion-text-wrap">
            {{ multiplayerStore.connectionError }}
          </ion-label>
        </ion-item>
      </div>

      <!-- In a room: show lobby -->
      <div v-else>
        <!-- Room code display -->
        <div class="flex flex-col items-center gap-2 py-6">
          <ion-icon :icon="qrCodeOutline" size="large" color="medium" />
          <p class="text-sm" style="color: var(--ion-color-medium)">Code de la room</p>
          <p class="text-5xl font-bold tracking-[0.3em]" style="color: var(--ion-color-primary)">
            {{ multiplayerStore.roomCode }}
          </p>
          <p class="text-xs" style="color: var(--ion-color-medium)">
            Partagez ce code aux autres joueurs
          </p>
        </div>

        <!-- Connected players -->
        <ion-list :inset="true">
          <ion-list-header>
            <ion-label>
              Joueurs ({{ multiplayerStore.connectedPlayerCount }} / {{ multiplayerStore.roomData?.settings.playerCount }})
            </ion-label>
          </ion-list-header>

          <ion-item
            v-for="(player, index) in multiplayerStore.allPlayers"
            :key="player.id"
            :lines="index === multiplayerStore.allPlayers.length - 1 ? 'none' : 'inset'"
          >
            <ion-icon
              :icon="player.connected ? radioButtonOnOutline : radioButtonOffOutline"
              slot="start"
              :color="player.connected ? 'success' : 'danger'"
            />
            <ion-label>
              <h2>
                {{ player.name }}
                <ion-text v-if="multiplayerStore.isLocalPlayer(player.id)" color="medium"> (vous)</ion-text>
              </h2>
              <p v-if="player.deviceId === multiplayerStore.roomData?.hostId">Host</p>
            </ion-label>
            <ion-note slot="end" :color="player.connected ? 'success' : 'danger'">
              {{ player.connected ? 'Connecte' : 'Deconnecte' }}
            </ion-note>
          </ion-item>
        </ion-list>

        <!-- Start game (host only) -->
        <div class="ion-padding-horizontal">
          <ion-button
            v-if="multiplayerStore.isHost"
            expand="block"
            color="primary"
            size="large"
            :disabled="!multiplayerStore.isRoomReady"
            @click="startMultiplayerGame"
          >
            <ion-icon :icon="playOutline" slot="start" />
            Lancer la partie ({{ multiplayerStore.connectedPlayerCount }} joueurs)
          </ion-button>

          <p v-if="!multiplayerStore.isHost" class="ion-text-center ion-padding" style="color: var(--ion-color-medium); font-size: 14px;">
            En attente que le host lance la partie...
          </p>

          <ion-button expand="block" fill="clear" color="medium" @click="leave" class="ion-margin-top">
            <ion-icon :icon="exitOutline" slot="start" />
            Quitter la room
          </ion-button>
        </div>
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
  IonList,
  IonListHeader,
  IonItem,
  IonInput,
  IonLabel,
  IonNote,
  IonText,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonSpinner,
} from '@ionic/vue'
import {
  phonePortraitOutline,
  personOutline,
  peopleOutline,
  addCircleOutline,
  keyOutline,
  enterOutline,
  alertCircleOutline,
  qrCodeOutline,
  radioButtonOnOutline,
  radioButtonOffOutline,
  playOutline,
  exitOutline,
} from 'ionicons/icons'
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
