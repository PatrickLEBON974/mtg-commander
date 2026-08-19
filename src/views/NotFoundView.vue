<template>
  <ion-page class="app-screen">
    <SanctumHeader
      :title="t('notFound.title')"
      :eyebrow="t('notFound.headerEyebrow')"
      badge="404"
    />

    <ion-content class="sanctum-content ion-padding">
      <div class="not-found-panel">
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
  IonContent,
  IonButton,
  IonIcon,
} from '@ionic/vue'
import { alertCircleOutline, homeOutline } from 'ionicons/icons'
import SanctumHeader from '@/components/ui/SanctumHeader.vue'

const { t } = useI18n()
const router = useRouter()
</script>

<style scoped>
.not-found-panel {
  display: flex;
  width: min(100%, 430px);
  margin: 22vh auto 0;
  padding: 28px 22px;
  align-items: center;
  flex-direction: column;
  gap: 14px;
  border: 1px solid rgba(205, 172, 99, 0.2);
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(20, 29, 32, 0.95), rgba(7, 12, 14, 0.97));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 18px 42px rgba(0, 0, 0, 0.42);
  text-align: center;
}
</style>
