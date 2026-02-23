<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('search.title') }}</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          v-model="searchQuery"
          :placeholder="t('search.placeholder')"
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
          @click="selectCard(suggestion)"
        >
          <ion-icon :icon="documentTextOutline" slot="start" color="medium" />
          <ion-label>{{ suggestion }}</ion-label>
        </ion-item>
      </ion-list>

      <!-- Selected card detail -->
      <div v-if="selectedCard" class="ion-padding" data-animate>
        <ion-card class="card-lift">
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
              {{ t('search.powerToughness') }} : {{ selectedCard.power }}/{{ selectedCard.toughness }}
            </p>

            <div class="flex flex-wrap gap-2 ion-margin-top">
              <ion-badge
                :color="selectedCard.legalities.commander === 'legal' ? 'success' : 'danger'"
              >
                {{ t('search.commanderLegality') }}: {{ selectedCard.legalities.commander }}
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
          {{ t('search.newSearch') }}
        </ion-button>
      </div>

      <!-- Empty state -->
      <div
        v-if="!selectedCard && suggestions.length === 0 && searchQuery.length === 0"
        class="flex h-full flex-col items-center justify-center gap-3"
      >
        <IllustrationNoResults :size="120" data-animate />
        <p data-animate style="color: var(--ion-color-medium)">{{ t('search.emptyState') }}</p>
        <p data-animate class="text-xs" style="color: var(--ion-color-medium)">{{ t('search.autoFilter') }}</p>
        <ion-chip v-if="offlineStore.hasLocalData" color="success" outline data-animate>
          <ion-icon :icon="checkmarkCircleOutline" />
          <ion-label>{{ t('search.localCards', { count: offlineStore.cardCount.toLocaleString() }) }}</ion-label>
        </ion-chip>
        <ion-chip v-else color="medium" outline data-animate>
          <ion-icon :icon="cloudOutline" />
          <ion-label>{{ t('search.apiMode') }}</ion-label>
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
import { useI18n } from 'vue-i18n'
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
import { useOfflineStore } from '@/stores/offlineStore'
import { usePageEnterAnimation } from '@/composables/usePageEnterAnimation'
import { useCardSearch } from '@/composables/useCardSearch'
import IllustrationNoResults from '@/components/icons/illustrations/IllustrationNoResults.vue'

const { t } = useI18n()
const offlineStore = useOfflineStore()

usePageEnterAnimation()

const { searchQuery, suggestions, selectedCard, isLoading, cardImageUrl, onSearchInput, selectCard, clearSelection } = useCardSearch()
</script>
