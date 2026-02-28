<template>
  <div class="commander-picker-content">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('commanderPicker.title') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="dismiss()">{{ t('common.close') }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          v-model="searchQuery"
          :placeholder="t('commanderPicker.searchPlaceholder')"
          :debounce="300"
          @ionInput="onSearchInput"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list v-if="suggestions.length > 0">
        <ion-item
          v-for="name in suggestions"
          :key="name"
          button
          @click="selectCard(name)"
        >
          <ion-label>{{ name }}</ion-label>
        </ion-item>
      </ion-list>

      <!-- Selected commander preview -->
      <div v-if="selectedCard" class="flex flex-col items-center gap-3 p-4">
        <img
          :src="cardImageUrl"
          :alt="selectedCard.name"
          class="w-48 rounded-xl shadow-lg"
        />
        <p class="text-sm text-text-secondary">{{ selectedCard.type_line }}</p>
        <ion-button expand="block" @click="confirmSelection">
          {{ t('commanderPicker.confirm', { name: selectedCard.name }) }}
        </ion-button>
      </div>

      <div v-if="isLoading" class="flex justify-center p-8">
        <ion-spinner name="crescent" />
      </div>
    </ion-content>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonSpinner,
} from '@ionic/vue'
import { getCardImageUrl } from '@/services/scryfall'
import { useCardSearch } from '@/composables/useCardSearch'

const props = defineProps<{
  dismiss: (data?: unknown, role?: string) => void
}>()

const { t } = useI18n()

const { searchQuery, suggestions, selectedCard, isLoading, cardImageUrl, onSearchInput, selectCard } = useCardSearch()

function confirmSelection() {
  if (!selectedCard.value) return
  const cardName = selectedCard.value.name
  const imageUri = getCardImageUrl(selectedCard.value, 'art_crop')
  searchQuery.value = ''
  selectedCard.value = null
  props.dismiss({ cardName, imageUri }, 'select')
}
</script>

<style scoped>
.commander-picker-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
