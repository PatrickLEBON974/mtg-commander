<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('search.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <CardSearchPanel />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
} from '@ionic/vue'
import { usePageEnterAnimation } from '@/composables/usePageEnterAnimation'
import CardSearchPanel from '@/components/card-search/CardSearchPanel.vue'

const { t } = useI18n()

usePageEnterAnimation()
</script>
