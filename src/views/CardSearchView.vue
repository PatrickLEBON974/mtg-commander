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
          animated
          @ionInput="onSearchInput"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Autocomplete suggestions -->
      <ion-list v-if="suggestions.length > 0 && !selectedCard" :inset="true">
        <ion-item
          v-for="(suggestion, index) in suggestions"
          :key="suggestion"
          button
          detail
          :lines="index === suggestions.length - 1 ? 'none' : 'inset'"
          @click="selectSuggestion(suggestion)"
        >
          <ion-icon :icon="documentTextOutline" slot="start" color="medium" />
          <ion-label>{{ suggestion }}</ion-label>
        </ion-item>
      </ion-list>

      <!-- Selected card detail -->
      <div v-if="selectedCard" class="ion-padding">
        <ion-card>
          <img
            :src="cardImageUrl"
            :alt="selectedCard.name"
            class="w-full"
            loading="lazy"
          />
          <ion-card-header>
            <ion-card-title>{{ selectedCard.name }}</ion-card-title>
            <ion-card-subtitle>
              {{ selectedCard.type_line }}
              <span v-if="selectedCard.mana_cost"> — {{ selectedCard.mana_cost }}</span>
            </ion-card-subtitle>
          </ion-card-header>

          <ion-card-content>
            <p v-if="selectedCard.oracle_text" class="whitespace-pre-line" style="color: var(--ion-text-color); line-height: 1.6">
              {{ selectedCard.oracle_text }}
            </p>

            <p v-if="selectedCard.power" class="ion-margin-top" style="color: var(--ion-color-medium)">
              Force / Endurance : {{ selectedCard.power }}/{{ selectedCard.toughness }}
            </p>

            <div class="flex flex-wrap gap-2 ion-margin-top">
              <ion-badge
                :color="selectedCard.legalities.commander === 'legal' ? 'success' : 'danger'"
              >
                Commander: {{ selectedCard.legalities.commander }}
              </ion-badge>
              <ion-badge color="tertiary">
                {{ selectedCard.set_name }}
              </ion-badge>
              <ion-badge color="medium">
                {{ selectedCard.rarity }}
              </ion-badge>
            </div>
          </ion-card-content>
        </ion-card>

        <ion-button expand="block" fill="outline" class="ion-margin" @click="clearSelection">
          <ion-icon :icon="searchOutline" slot="start" />
          Nouvelle recherche
        </ion-button>
      </div>

      <!-- Empty state -->
      <div
        v-if="!selectedCard && suggestions.length === 0 && searchQuery.length === 0"
        class="flex h-full flex-col items-center justify-center gap-3"
      >
        <ion-icon :icon="searchOutline" style="font-size: 56px; color: var(--ion-color-medium)" />
        <p style="color: var(--ion-color-medium)">Tapez pour rechercher une carte MTG</p>
        <p class="text-xs" style="color: var(--ion-color-medium)">Filtre automatique : legal en Commander</p>
        <ion-chip v-if="offlineStore.hasLocalData" color="success" outline>
          <ion-icon :icon="checkmarkCircleOutline" />
          <ion-label>{{ offlineStore.cardCount.toLocaleString('fr-FR') }} cartes en local</ion-label>
        </ion-chip>
        <ion-chip v-else color="medium" outline>
          <ion-icon :icon="cloudOutline" />
          <ion-label>Mode API (telecharger dans Reglages)</ion-label>
        </ion-chip>
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
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonBadge,
  IonChip,
  IonButton,
  IonSpinner,
} from '@ionic/vue'
import {
  searchOutline,
  documentTextOutline,
  checkmarkCircleOutline,
  cloudOutline,
} from 'ionicons/icons'
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
