<template>
  <AppModal :is-open="isOpen" :title="t('commanderPicker.title')" @close="$emit('close')">
    <template #header-extra>
      <ion-toolbar>
        <ion-searchbar
          v-model="searchQuery"
          :placeholder="t('commanderPicker.searchPlaceholder')"
          :debounce="300"
          @ionInput="onSearchInput"
        />
      </ion-toolbar>
    </template>

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
  </AppModal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  IonToolbar,
  IonSearchbar,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonSpinner,
} from '@ionic/vue'
import { getCardImageUrl } from '@/services/scryfall'
import { useCardSearch } from '@/composables/useCardSearch'
import AppModal from '@/components/ui/AppModal.vue'

defineProps<{
  isOpen: boolean
}>()

const { t } = useI18n()

const emit = defineEmits<{
  close: []
  select: [cardName: string, imageUri: string]
}>()

const { searchQuery, suggestions, selectedCard, isLoading, cardImageUrl, onSearchInput, selectCard } = useCardSearch()

function confirmSelection() {
  if (!selectedCard.value) return
  emit('select', selectedCard.value.name, getCardImageUrl(selectedCard.value, 'art_crop'))
  searchQuery.value = ''
  selectedCard.value = null
  emit('close')
}
</script>
