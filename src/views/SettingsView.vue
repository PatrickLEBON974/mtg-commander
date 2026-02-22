<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Reglages</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-list-header>
          <ion-label>Regles</ion-label>
        </ion-list-header>

        <ion-item>
          <ion-label>
            <h3>Points de vie de depart</h3>
            <p>Standard Commander : 40</p>
          </ion-label>
          <ion-select
            v-model="settingsStore.gameSettings.startingLife"
            interface="popover"
          >
            <ion-select-option :value="40">40</ion-select-option>
            <ion-select-option :value="30">30</ion-select-option>
            <ion-select-option :value="25">25</ion-select-option>
            <ion-select-option :value="20">20</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-label>
            <h3>Seuil degats commandant</h3>
            <p>Defaut : 21</p>
          </ion-label>
          <ion-select
            v-model="settingsStore.gameSettings.commanderDamageThreshold"
            interface="popover"
          >
            <ion-select-option :value="21">21 (officiel)</ion-select-option>
            <ion-select-option :value="0">Desactive</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-label>
            <h3>Seuil poison</h3>
            <p>Defaut : 10 (houserule possible)</p>
          </ion-label>
          <ion-select
            v-model="settingsStore.gameSettings.poisonThreshold"
            interface="popover"
          >
            <ion-select-option :value="10">10 (officiel)</ion-select-option>
            <ion-select-option :value="15">15 (houserule)</ion-select-option>
            <ion-select-option :value="20">20 (houserule)</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-list-header>
          <ion-label>Application</ion-label>
        </ion-list-header>

        <ion-item>
          <ion-label>Retour haptique</ion-label>
          <ion-toggle v-model="settingsStore.hapticFeedback" />
        </ion-item>

        <ion-item>
          <ion-label>Ecran toujours allume</ion-label>
          <ion-toggle v-model="settingsStore.keepScreenOn" />
        </ion-item>

        <ion-item>
          <ion-label>Timer de partie</ion-label>
          <ion-toggle v-model="settingsStore.gameSettings.enableTimer" />
        </ion-item>

        <ion-item button @click="resetSettings">
          <ion-label color="danger">Reinitialiser les reglages</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonToggle,
} from '@ionic/vue'
import { useSettingsStore } from '@/stores/settingsStore'

const settingsStore = useSettingsStore()

function resetSettings() {
  settingsStore.resetToDefaults()
}
</script>
