<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('notFound.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="flex flex-col items-center justify-center gap-4 pt-24">
        <ion-icon
          :icon="alertCircleOutline"
          class="text-text-secondary"
          style="font-size: 64px"
        />
        <h1 class="text-xl font-semibold text-text-secondary">
          {{ t('notFound.title') }}
        </h1>
        <p class="text-sm text-text-secondary" style="opacity: 0.7">
          {{ t('notFound.description') }}
        </p>
        <ion-button fill="outline" color="primary" @click="router.push('/home')">
          <ion-icon :icon="homeOutline" slot="start" />
          {{ t('notFound.backHome') }}
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
} from '@ionic/vue'
import { alertCircleOutline, homeOutline } from 'ionicons/icons'

const { t } = useI18n()
const router = useRouter()
</script>
