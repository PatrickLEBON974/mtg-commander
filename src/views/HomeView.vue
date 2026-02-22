<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>MTG Commander</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Hero -->
      <div class="arena-hero-bg flex flex-col items-center gap-3 pb-6 pt-8">
        <img
          src="@/assets/icons/ui/logo.svg"
          alt="MTG Commander"
          class="h-24 w-24"
          style="filter: drop-shadow(0 0 16px rgba(212, 168, 67, 0.3))"
        />
        <h1 class="arena-heading" style="font-family: var(--font-beleren); font-size: 28px; letter-spacing: 3px;">
          COMMANDER
        </h1>
        <div class="flex items-center gap-2">
          <i class="ms ms-w ms-cost" />
          <i class="ms ms-u ms-cost" />
          <i class="ms ms-b ms-cost" />
          <i class="ms ms-r ms-cost" />
          <i class="ms ms-g ms-cost" />
        </div>
        <p class="text-xs" style="color: var(--ion-color-medium)">Tracker de partie EDH</p>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-3 px-4">
        <ion-button expand="block" size="large" color="primary" @click="startNewGame">
          <ion-icon :icon="playOutline" slot="start" />
          Nouvelle Partie
        </ion-button>

        <ion-button
          v-if="gameStore.isGameActive"
          expand="block"
          size="large"
          fill="outline"
          color="primary"
          @click="resumeGame"
        >
          <ion-icon :icon="returnUpForwardOutline" slot="start" />
          Reprendre la Partie
        </ion-button>

        <ion-button
          expand="block"
          size="large"
          fill="outline"
          color="secondary"
          @click="router.push('/multiplayer')"
        >
          <ion-icon :icon="peopleOutline" slot="start" />
          Multijoueur
        </ion-button>
      </div>

      <!-- Quick settings -->
      <ion-list :inset="true" class="ion-margin-top">
        <ion-list-header>
          <ion-label>Configuration rapide</ion-label>
        </ion-list-header>

        <ion-item lines="inset">
          <ion-icon :icon="peopleOutline" slot="start" color="tertiary" />
          <ion-label>Joueurs</ion-label>
          <SettingStepper
            slot="end"
            v-model="settingsStore.gameSettings.playerCount"
            :options="playerCountOptions"
            label="joueurs"
          />
        </ion-item>

        <ion-item lines="inset">
          <ion-icon :icon="heartOutline" slot="start" color="danger" />
          <ion-label>Vie</ion-label>
          <SettingStepper
            slot="end"
            v-model="settingsStore.gameSettings.startingLife"
            :options="startingLifeOptions"
            label="vie"
          />
        </ion-item>

        <ion-item lines="none">
          <ion-icon :icon="timerOutline" slot="start" color="medium" />
          <ion-label>Timer de partie</ion-label>
          <ion-toggle slot="end" v-model="settingsStore.gameSettings.enableTimer" />
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonToggle,
} from '@ionic/vue'
import {
  playOutline,
  returnUpForwardOutline,
  peopleOutline,
  heartOutline,
  timerOutline,
} from 'ionicons/icons'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import SettingStepper from '@/components/ui/SettingStepper.vue'

const playerCountOptions = [2, 3, 4, 5, 6].map((v) => ({ value: v, label: String(v) }))
const startingLifeOptions = [
  { value: 20, label: '20' },
  { value: 25, label: '25' },
  { value: 30, label: '30' },
  { value: 40, label: '40' },
]

const router = useRouter()
const gameStore = useGameStore()
const settingsStore = useSettingsStore()

function startNewGame() {
  gameStore.settings = { ...settingsStore.gameSettings }
  gameStore.startNewGame()
  router.push('/game')
}

function resumeGame() {
  router.push('/game')
}
</script>
