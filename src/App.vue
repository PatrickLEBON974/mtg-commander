<template>
  <ion-app>
    <ion-router-outlet />
    <SplashOverlay />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import SplashOverlay from '@/components/SplashOverlay.vue'
</script>
