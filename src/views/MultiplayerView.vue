<template>
  <ion-page class="app-screen">
    <SanctumHeader
      :title="t('multiplayer.title')"
      :eyebrow="t('multiplayer.headerEyebrow')"
      badge="LAN"
      back-href="/home"
      :back-label="t('common.back')"
    />

    <ion-content class="sanctum-content multiplayer-sanctum-content ion-padding">
      <!-- Not in a room: show create/join -->
      <div v-if="!multiplayerStore.isMultiplayer" class="multiplayer-layout multiplayer-layout--setup">
        <!-- Local player setup -->
        <ion-list :inset="true" data-animate>
          <ion-list-header>
            <ion-label>{{ t('multiplayer.localPlayers') }}</ion-label>
          </ion-list-header>

          <ion-item lines="inset">
            <ion-icon :icon="phonePortraitOutline" slot="start" color="medium" />
            <ion-label>{{ t('multiplayer.count') }}</ion-label>
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
              :label="localPlayerCount > 1 ? t('multiplayer.playerN', { n: index + 1 }) : t('multiplayer.yourName')"
              label-placement="floating"
              :placeholder="t('multiplayer.playerN', { n: index + 1 })"
              :maxlength="PLAYER_NAME_MAX_LENGTH"
            />
          </ion-item>
        </ion-list>

        <!-- Create room -->
        <ion-list :inset="true" data-animate>
          <ion-list-header>
            <ion-label>{{ t('multiplayer.createGame') }}</ion-label>
          </ion-list-header>

          <ion-item lines="inset">
            <ion-icon :icon="peopleOutline" slot="start" color="tertiary" />
            <ion-label>{{ t('multiplayer.totalPlayers') }}</ion-label>
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
              {{ t('multiplayer.createRoom') }}
            </ion-button>
          </ion-item>
        </ion-list>

        <!-- Join room -->
        <ion-list :inset="true" data-animate>
          <ion-list-header>
            <ion-label>{{ t('multiplayer.joinGame') }}</ion-label>
          </ion-list-header>

          <ion-item lines="inset">
            <ion-icon :icon="keyOutline" slot="start" color="warning" />
            <ion-input
              v-model="joinCode"
              :label="t('multiplayer.roomCodeLabel')"
              label-placement="floating"
              placeholder="ABCDEF"
              :maxlength="6"
              class="uppercase"
              @ionInput="joinCode = joinCode.toUpperCase()"
            />
          </ion-item>

          <ion-item lines="none">
            <ion-button
              expand="block"
              fill="outline"
              :disabled="joinCode.length !== ROOM_CODE_LENGTH || !canSubmit || multiplayerStore.isConnecting"
              @click="joinExisting"
              class="ion-margin-vertical"
              style="width: 100%"
            >
              <ion-spinner v-if="multiplayerStore.isConnecting" name="crescent" slot="start" />
              <ion-icon v-else :icon="enterOutline" slot="start" />
              {{ t('multiplayer.join') }}
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
      <div v-else class="multiplayer-layout multiplayer-layout--lobby">
        <!-- Room code display -->
        <div class="flex flex-col items-center gap-2 py-6" data-animate>
          <ion-icon :icon="qrCodeOutline" size="large" color="medium" />
          <p class="text-sm" style="color: var(--ion-color-medium)">{{ t('multiplayer.roomCode') }}</p>
          <p class="text-5xl font-bold tracking-[0.3em]" style="color: var(--ion-color-primary)">
            {{ multiplayerStore.roomCode }}
          </p>
          <p class="text-xs" style="color: var(--ion-color-medium)">
            {{ t('multiplayer.shareCode') }}
          </p>
        </div>

        <!-- Connected players -->
        <ion-list :inset="true" data-animate>
          <ion-list-header>
            <ion-label>
              {{ t('multiplayer.playersList', { count: multiplayerStore.connectedPlayerCount, total: multiplayerStore.roomData?.settings.playerCount }) }}
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
                <ion-text v-if="multiplayerStore.isLocalPlayer(player.id)" color="medium"> {{ t('multiplayer.you') }}</ion-text>
              </h2>
              <p v-if="player.deviceId === multiplayerStore.roomData?.hostId">{{ t('multiplayer.host') }}</p>
            </ion-label>
            <ion-note slot="end" :color="player.connected ? 'success' : 'danger'">
              {{ player.connected ? t('multiplayer.connected') : t('multiplayer.disconnected') }}
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
            {{ t('multiplayer.startGame', { count: multiplayerStore.connectedPlayerCount }) }}
          </ion-button>

          <p v-if="!multiplayerStore.isHost" class="ion-text-center ion-padding" style="color: var(--ion-color-medium); font-size: 14px;">
            {{ t('multiplayer.waitingForHost') }}
          </p>

          <ion-button expand="block" fill="clear" color="medium" @click="leave" class="ion-margin-top">
            <ion-icon :icon="exitOutline" slot="start" />
            {{ t('multiplayer.leaveRoom') }}
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  IonPage,
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
import { usePageEnterAnimation } from '@/composables/usePageEnterAnimation'
import { ROOM_CODE_LENGTH, PLAYER_NAME_MAX_LENGTH } from '@/config/gameConstants'
import SanctumHeader from '@/components/ui/SanctumHeader.vue'

const { t } = useI18n()
const router = useRouter()
const multiplayerStore = useMultiplayerStore()
const gameStore = useGameStore()
const settingsStore = useSettingsStore()

usePageEnterAnimation()

const localPlayerCount = ref(1)
const localPlayerNames = ref<string[]>([t('multiplayer.playerN', { n: 1 })])
const joinCode = ref('')
const totalPlayerCount = ref(settingsStore.gameSettings.playerCount)

// Keep names array in sync with count
watch(localPlayerCount, (newCount) => {
  while (localPlayerNames.value.length < newCount) {
    localPlayerNames.value.push(t('multiplayer.playerN', { n: localPlayerNames.value.length + 1 }))
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

  // startNewGame creates default players; replace them with multiplayer-coordinated ones.
  // Direct mutation is acceptable — no store action exists for bulk player replacement.
  gameStore.startNewGame(players.length)
  if (gameStore.currentGame) {
    gameStore.currentGame.players = players
  }

  multiplayerStore.pushFullGameState()
  router.push('/game')
}

async function leave() {
  await multiplayerStore.disconnect()
}
</script>

<style scoped>
.multiplayer-sanctum-content {
  --padding-start: max(16px, var(--ion-safe-area-left, 0px));
  --padding-end: max(16px, var(--ion-safe-area-right, 0px));
  --padding-top: 8px;
  --padding-bottom: 28px;
}

.multiplayer-sanctum-content ion-list-header ion-label::before {
  content: '◆';
  margin-right: 8px;
  color: rgba(216, 171, 79, 0.55);
  font-size: 7px;
  vertical-align: 1px;
}

.multiplayer-layout {
  width: min(100%, 900px);
  margin: 0 auto;
}

@media (min-width: 700px) {
  .multiplayer-sanctum-content {
    --padding-top: 20px;
    --padding-start: max(24px, var(--ion-safe-area-left, 0px));
    --padding-end: max(24px, var(--ion-safe-area-right, 0px));
  }

  .multiplayer-layout--setup {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start;
    gap: 16px;
  }

  .multiplayer-layout--setup > ion-list {
    margin: 0;
  }

  .multiplayer-layout--setup > ion-list:first-of-type,
  .multiplayer-layout--setup > ion-item {
    grid-column: 1 / -1;
  }

  .multiplayer-layout--lobby {
    max-width: 720px;
  }
}
</style>
