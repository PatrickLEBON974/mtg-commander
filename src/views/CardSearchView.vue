<template>
  <ion-page class="app-screen">
    <SanctumHeader
      :title="t('search.title')"
      :eyebrow="t('search.headerEyebrow')"
      badge="S"
    />

    <ion-content class="sanctum-content search-sanctum-content">
      <CardSearchPanel />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  IonPage,
  IonContent,
} from '@ionic/vue'
import { usePageEnterAnimation } from '@/composables/usePageEnterAnimation'
import CardSearchPanel from '@/components/card-search/CardSearchPanel.vue'
import SanctumHeader from '@/components/ui/SanctumHeader.vue'

const { t } = useI18n()

usePageEnterAnimation()
</script>

<style scoped>
.search-sanctum-content {
  --padding-bottom: 24px;
}
</style>
