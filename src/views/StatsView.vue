<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Statistiques</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="flex h-full items-center justify-center">
        <div class="text-center text-text-secondary">
          <ion-icon :icon="statsChartOutline" class="text-5xl" />
          <p class="mt-2">Les statistiques apparaitront ici</p>
          <p class="text-xs">apres vos premieres parties</p>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon } from '@ionic/vue'
import { statsChartOutline } from 'ionicons/icons'
</script>
