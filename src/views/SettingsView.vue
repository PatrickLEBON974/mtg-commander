<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Reglages</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <!-- Offline Data Section -->
        <ion-list-header>
          <ion-label>Donnees Offline</ion-label>
        </ion-list-header>

        <ion-item>
          <ion-label>
            <h3>Base de cartes locale</h3>
            <p v-if="offlineStore.hasLocalData">
              {{ offlineStore.cardCount.toLocaleString('fr-FR') }} cartes
              (~{{ offlineStore.estimatedSizeMb }} MB)
            </p>
            <p v-else>Non telechargee</p>
          </ion-label>
          <ion-badge
            slot="end"
            :color="offlineStore.hasLocalData ? 'success' : 'medium'"
          >
            {{ offlineStore.hasLocalData ? 'OK' : 'Vide' }}
          </ion-badge>
        </ion-item>

        <ion-item>
          <ion-label>
            <h3>Derniere mise a jour</h3>
            <p>{{ offlineStore.formattedLastUpdate }}</p>
          </ion-label>
        </ion-item>

        <!-- Download progress -->
        <ion-item v-if="offlineStore.isDownloading && offlineStore.downloadProgress">
          <ion-label>
            <h3>{{ offlineStore.downloadProgress.message }}</h3>
            <ion-progress-bar
              v-if="offlineStore.downloadProgress.phase === 'downloading' && offlineStore.downloadProgress.totalMb"
              :value="(offlineStore.downloadProgress.downloadedMb ?? 0) / offlineStore.downloadProgress.totalMb"
            />
            <ion-progress-bar
              v-else-if="offlineStore.downloadProgress.phase === 'importing' && offlineStore.downloadProgress.importProgress"
              :value="offlineStore.downloadProgress.importProgress.inserted / offlineStore.downloadProgress.importProgress.total"
            />
            <ion-progress-bar v-else type="indeterminate" />
          </ion-label>
        </ion-item>

        <!-- Error message -->
        <ion-item v-if="offlineStore.downloadError">
          <ion-label color="danger">
            <h3>Erreur</h3>
            <p>{{ offlineStore.downloadError }}</p>
          </ion-label>
        </ion-item>

        <ion-item>
          <ion-button
            expand="block"
            :disabled="offlineStore.isDownloading"
            @click="offlineStore.startDownload()"
          >
            <ion-spinner v-if="offlineStore.isDownloading" name="crescent" slot="start" />
            <ion-icon v-else :icon="cloudDownloadOutline" slot="start" />
            {{ offlineStore.hasLocalData ? 'Mettre a jour' : 'Telecharger' }} (~162 MB)
          </ion-button>
        </ion-item>

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
  IonButton,
  IonBadge,
  IonIcon,
  IonSpinner,
  IonProgressBar,
} from '@ionic/vue'
import { cloudDownloadOutline } from 'ionicons/icons'
import { useSettingsStore } from '@/stores/settingsStore'
import { useOfflineStore } from '@/stores/offlineStore'

const settingsStore = useSettingsStore()
const offlineStore = useOfflineStore()

function resetSettings() {
  settingsStore.resetToDefaults()
}
</script>
