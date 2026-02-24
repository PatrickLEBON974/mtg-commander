<template>
  <div class="search-panel">
    <!-- Search bar -->
    <ion-searchbar
      v-model="searchQuery"
      :placeholder="t('search.placeholder')"
      :debounce="300"
      show-clear-button="focus"
      animated
      @ionInput="onSearchInput"
    />

    <!-- Filter bar -->
    <div class="filter-bar">
      <button
        class="filter-chip"
        :class="{ 'filter-chip--active': commanderOnly }"
        @click="commanderOnly = !commanderOnly"
      >
        {{ t('search.commanderFilter') }}
      </button>

      <div class="color-filters">
        <button
          v-for="color in COLOR_IDENTITY_OPTIONS"
          :key="color.id"
          class="color-dot"
          :class="{ 'color-dot--active': colorIdentity.includes(color.id) }"
          :style="{ '--dot-color': color.cssVar }"
          :aria-label="color.id"
          @click="toggleColor(color.id)"
        />
      </div>
    </div>

    <!-- Autocomplete suggestions -->
    <ion-list v-if="suggestions.length > 0 && !selectedCard" :inset="true" class="suggestion-list">
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

      <!-- Selection mode: confirm button -->
      <ion-button
        v-if="selectionMode"
        expand="block"
        color="primary"
        class="ion-margin"
        @click="$emit('select', selectedCard!)"
      >
        {{ t('search.confirmSelection', { name: selectedCard.name }) }}
      </ion-button>

      <ion-button expand="block" fill="outline" class="ion-margin" @click="clearSelection">
        <ion-icon :icon="searchOutline" slot="start" />
        {{ t('search.newSearch') }}
      </ion-button>
    </div>

    <!-- Empty state -->
    <div
      v-if="!selectedCard && suggestions.length === 0 && searchQuery.length === 0"
      class="flex h-full flex-col items-center justify-center gap-3 py-12"
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
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
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
import { useCardSearch } from '@/composables/useCardSearch'
import type { ScryfallCard } from '@/types/card'
import IllustrationNoResults from '@/components/icons/illustrations/IllustrationNoResults.vue'

const props = withDefaults(defineProps<{
  selectionMode?: boolean
  initialCommanderOnly?: boolean
}>(), {
  selectionMode: false,
  initialCommanderOnly: false,
})

defineEmits<{
  select: [card: ScryfallCard]
}>()

const { t } = useI18n()
const offlineStore = useOfflineStore()

const COLOR_IDENTITY_OPTIONS = [
  { id: 'W', cssVar: 'var(--color-mana-white)' },
  { id: 'U', cssVar: 'var(--color-mana-blue)' },
  { id: 'B', cssVar: 'var(--color-mana-black)' },
  { id: 'R', cssVar: 'var(--color-mana-red)' },
  { id: 'G', cssVar: 'var(--color-mana-green)' },
]

const {
  searchQuery,
  suggestions,
  selectedCard,
  isLoading,
  cardImageUrl,
  commanderOnly,
  colorIdentity,
  onSearchInput,
  selectCard,
  clearSelection,
  toggleColor,
} = useCardSearch({ initialCommanderOnly: props.initialCommanderOnly })
</script>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px 8px;
}

.filter-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  background: transparent;
  color: var(--text-secondary, #8a8f98);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 150ms ease;
  white-space: nowrap;
}

.filter-chip--active {
  background: rgba(232, 96, 10, 0.15);
  border-color: var(--color-accent, #e8600a);
  color: var(--color-accent, #e8600a);
}

.color-filters {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid transparent;
  background: var(--dot-color);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 150ms ease;
  opacity: 0.4;
  flex-shrink: 0;
}

.color-dot--active {
  opacity: 1;
  border-color: var(--text-primary, #fff);
  box-shadow: 0 0 8px color-mix(in srgb, var(--dot-color) 50%, transparent);
}

.suggestion-list {
  max-height: 50vh;
  overflow-y: auto;
}
</style>
