<template>
  <ion-modal :is-open="isOpen" @didDismiss="$emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>Choisir un commandant</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')">Fermer</ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          v-model="searchQuery"
          placeholder="Rechercher un commandant..."
          :debounce="300"
          @ionInput="onSearch"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list v-if="suggestions.length > 0">
        <ion-item
          v-for="name in suggestions"
          :key="name"
          button
          @click="selectCommander(name)"
        >
          <ion-label>{{ name }}</ion-label>
        </ion-item>
      </ion-list>

      <!-- Selected commander preview -->
      <div v-if="selectedCard" class="flex flex-col items-center gap-3 p-4">
        <img
          :src="selectedCardImage"
          :alt="selectedCard.name"
          class="w-48 rounded-xl shadow-lg"
        />
        <p class="text-sm text-text-secondary">{{ selectedCard.type_line }}</p>
        <ion-button expand="block" @click="confirmSelection">
          Confirmer {{ selectedCard.name }}
        </ion-button>
      </div>

      <div v-if="isLoading" class="flex justify-center p-8">
        <ion-spinner name="crescent" />
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonSearchbar,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonSpinner,
} from '@ionic/vue'
import type { ScryfallCard } from '@/types/card'
import { autocompleteCards, getCardByName, getCardImageUrl } from '@/services/scryfall'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  select: [cardName: string, imageUri: string]
}>()

const searchQuery = ref('')
const suggestions = ref<string[]>([])
const selectedCard = ref<ScryfallCard | null>(null)
const isLoading = ref(false)

const selectedCardImage = computed(() =>
  selectedCard.value ? getCardImageUrl(selectedCard.value, 'normal') : '',
)

async function onSearch() {
  selectedCard.value = null
  if (searchQuery.value.length < 2) {
    suggestions.value = []
    return
  }
  suggestions.value = await autocompleteCards(searchQuery.value)
}

async function selectCommander(cardName: string) {
  suggestions.value = []
  searchQuery.value = cardName
  isLoading.value = true
  selectedCard.value = await getCardByName(cardName)
  isLoading.value = false
}

function confirmSelection() {
  if (!selectedCard.value) return
  emit('select', selectedCard.value.name, getCardImageUrl(selectedCard.value, 'art_crop'))
  searchQuery.value = ''
  selectedCard.value = null
  emit('close')
}
</script>
