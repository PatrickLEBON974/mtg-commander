<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom" class="border-t border-white/10">
        <ion-tab-button tab="home" href="/home">
          <ion-icon :icon="homeOutline" />
          <ion-label>Accueil</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="game" href="/game">
          <ion-icon :icon="heartOutline" />
          <ion-label>Partie</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="search" href="/search">
          <ion-icon :icon="searchOutline" />
          <ion-label>Cartes</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="stats" href="/stats">
          <ion-icon :icon="statsChartOutline" />
          <ion-label>Stats</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="settings" href="/settings">
          <ion-icon :icon="settingsOutline" />
          <ion-label>Reglages</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonTabs,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from '@ionic/vue'
import {
  homeOutline,
  heartOutline,
  searchOutline,
  statsChartOutline,
  settingsOutline,
} from 'ionicons/icons'
</script>
