<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Recherche de Cartes</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          v-model="searchQuery"
          placeholder="Rechercher une carte..."
          :debounce="300"
          show-clear-button="focus"
          @ionInput="onSearchInput"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Autocomplete suggestions -->
      <ion-list v-if="suggestions.length > 0 && !selectedCard">
        <ion-item
          v-for="suggestion in suggestions"
          :key="suggestion"
          button
          @click="selectSuggestion(suggestion)"
        >
          <ion-label>{{ suggestion }}</ion-label>
        </ion-item>
      </ion-list>

      <!-- Selected card detail -->
      <div v-if="selectedCard" class="p-4">
        <div class="flex flex-col items-center gap-4">
          <img
            :src="cardImageUrl"
            :alt="selectedCard.name"
            class="w-64 rounded-xl shadow-lg"
            loading="lazy"
          />

          <div class="w-full space-y-3">
            <h2 class="text-xl font-bold text-text-primary">{{ selectedCard.name }}</h2>

            <div class="flex items-center gap-2">
              <span class="text-sm text-text-secondary">{{ selectedCard.type_line }}</span>
              <span v-if="selectedCard.mana_cost" class="text-sm text-text-secondary">
                {{ selectedCard.mana_cost }}
              </span>
            </div>

            <p v-if="selectedCard.oracle_text" class="text-sm text-text-primary whitespace-pre-line">
              {{ selectedCard.oracle_text }}
            </p>

            <div v-if="selectedCard.power" class="text-sm text-text-secondary">
              {{ selectedCard.power }}/{{ selectedCard.toughness }}
            </div>

            <div class="flex flex-wrap gap-2 pt-2">
              <ion-badge
                :color="selectedCard.legalities.commander === 'legal' ? 'success' : 'danger'"
              >
                Commander: {{ selectedCard.legalities.commander }}
              </ion-badge>
              <ion-badge color="medium">
                {{ selectedCard.set_name }}
              </ion-badge>
              <ion-badge color="medium">
                {{ selectedCard.rarity }}
              </ion-badge>
            </div>
          </div>

          <ion-button expand="block" fill="outline" @click="clearSelection">
            Nouvelle recherche
          </ion-button>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="!selectedCard && suggestions.length === 0 && searchQuery.length === 0" class="flex h-full items-center justify-center">
        <div class="text-center text-text-secondary">
          <ion-icon :icon="searchOutline" class="text-5xl" />
          <p class="mt-2">Tapez pour rechercher une carte MTG</p>
          <p class="text-xs">Filtre automatique : legal en Commander</p>
          <ion-badge v-if="offlineStore.hasLocalData" color="success" class="mt-2">
            {{ offlineStore.cardCount.toLocaleString('fr-FR') }} cartes en local
          </ion-badge>
          <ion-badge v-else color="medium" class="mt-2">
            Mode API (telecharger les cartes dans Reglages)
          </ion-badge>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="flex justify-center p-8">
        <ion-spinner name="crescent" />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonButton,
  IonIcon,
  IonSpinner,
} from '@ionic/vue'
import { searchOutline } from 'ionicons/icons'
import type { ScryfallCard } from '@/types/card'
import { autocompleteCards, getCardByName, getCardImageUrl } from '@/services/scryfall'
import { useOfflineStore } from '@/stores/offlineStore'

const offlineStore = useOfflineStore()

const searchQuery = ref('')
const suggestions = ref<string[]>([])
const selectedCard = ref<ScryfallCard | null>(null)
const isLoading = ref(false)

const cardImageUrl = computed(() => {
  if (!selectedCard.value) return ''
  return getCardImageUrl(selectedCard.value, 'normal')
})

async function onSearchInput() {
  selectedCard.value = null

  if (searchQuery.value.length < 2) {
    suggestions.value = []
    return
  }

  suggestions.value = await autocompleteCards(searchQuery.value)
}

async function selectSuggestion(cardName: string) {
  searchQuery.value = cardName
  suggestions.value = []
  isLoading.value = true

  selectedCard.value = await getCardByName(cardName)
  isLoading.value = false
}

function clearSelection() {
  selectedCard.value = null
  searchQuery.value = ''
  suggestions.value = []
}
</script>
