<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>MTG Commander</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="flex flex-col items-center gap-6 pt-8">
        <div class="text-center">
          <h1 class="text-3xl font-bold text-text-primary">Commander</h1>
          <p class="mt-2 text-text-secondary">Tracker de partie EDH</p>
        </div>

        <div class="flex w-full flex-col gap-4 px-4">
          <ion-button expand="block" size="large" color="danger" @click="startNewGame">
            <ion-icon :icon="playOutline" slot="start" />
            Nouvelle Partie
          </ion-button>

          <ion-button
            v-if="gameStore.isGameActive"
            expand="block"
            size="large"
            fill="outline"
            @click="resumeGame"
          >
            <ion-icon :icon="returnUpForwardOutline" slot="start" />
            Reprendre la Partie
          </ion-button>

          <ion-button
            expand="block"
            size="large"
            fill="outline"
            color="primary"
            @click="router.push('/multiplayer')"
          >
            <ion-icon :icon="peopleOutline" slot="start" />
            Multijoueur
          </ion-button>
        </div>

        <div class="mt-8 flex w-full flex-col gap-3 px-4">
          <h2 class="text-lg font-semibold text-text-primary">Configuration Rapide</h2>

          <ion-item>
            <ion-label>Nombre de joueurs</ion-label>
            <ion-select
              v-model="settingsStore.gameSettings.playerCount"
              interface="popover"
            >
              <ion-select-option :value="2">2 joueurs</ion-select-option>
              <ion-select-option :value="3">3 joueurs</ion-select-option>
              <ion-select-option :value="4">4 joueurs</ion-select-option>
              <ion-select-option :value="5">5 joueurs</ion-select-option>
              <ion-select-option :value="6">6 joueurs</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-label>Points de vie</ion-label>
            <ion-select
              v-model="settingsStore.gameSettings.startingLife"
              interface="popover"
            >
              <ion-select-option :value="40">40 (Commander)</ion-select-option>
              <ion-select-option :value="30">30 (Brawl)</ion-select-option>
              <ion-select-option :value="25">25 (Oathbreaker)</ion-select-option>
              <ion-select-option :value="20">20 (Standard)</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-label>Timer de partie</ion-label>
            <ion-toggle v-model="settingsStore.gameSettings.enableTimer" />
          </ion-item>
        </div>
      </div>
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
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonToggle,
} from '@ionic/vue'
import { playOutline, returnUpForwardOutline, peopleOutline } from 'ionicons/icons'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'

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
