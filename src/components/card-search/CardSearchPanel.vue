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

    <!-- Filter panel -->
    <div class="filter-panel">
      <!-- Row 1: Commander + Color Identity -->
      <div class="filter-row">
        <button
          class="filter-chip"
          :class="{ 'filter-chip--active': commanderOnly }"
          @click="commanderOnly = !commanderOnly"
        >
          <svg class="filter-chip-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
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

      <!-- Type section -->
      <div class="filter-section">
        <div class="filter-section-header">
          <span>{{ t('search.type') }}</span>
        </div>
        <div class="filter-row filter-row--wrap">
          <button
            v-for="cardType in CARD_TYPE_OPTIONS"
            :key="cardType.value"
            class="type-chip"
            :class="{ 'type-chip--active': cardTypes.includes(cardType.value) }"
            @click="toggleCardType(cardType.value)"
          >
            {{ t(cardType.labelKey) }}
          </button>
        </div>
      </div>

      <!-- Mana Value section -->
      <div class="filter-section">
        <div class="filter-section-header">
          <span>{{ t('search.manaValue') }}</span>
        </div>
        <div class="filter-row cmc-row">
          <button
            v-for="n in CMC_VALUES"
            :key="n"
            class="cmc-pip"
            :class="{ 'cmc-pip--active': cmcValues.includes(n) }"
            @click="toggleCmc(n)"
          >
            {{ n >= 8 ? '8+' : n }}
          </button>
        </div>
      </div>

      <!-- More Filters toggle -->
      <button class="more-toggle" @click="showMoreFilters = !showMoreFilters">
        <span class="more-toggle-label">{{ t('search.moreFilters') }}</span>
        <span v-if="moreFiltersActiveCount > 0" class="more-badge">{{ moreFiltersActiveCount }}</span>
        <svg
          class="more-chevron"
          :class="{ 'more-chevron--open': showMoreFilters }"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <!-- Expandable more filters -->
      <div class="more-content" :class="{ 'more-content--open': showMoreFilters }">
        <div class="more-inner">
          <!-- Rarity -->
          <div class="filter-section">
            <div class="filter-section-header">
              <span>{{ t('search.rarity') }}</span>
            </div>
            <div class="filter-row">
              <button
                v-for="rarity in RARITY_OPTIONS"
                :key="rarity.value"
                class="rarity-chip"
                :class="[
                  rarity.cssClass,
                  { 'rarity-chip--active': rarities.includes(rarity.value) },
                ]"
                @click="toggleRarity(rarity.value)"
              >
                <span class="rarity-gem">&#9670;</span>
                {{ t(rarity.labelKey) }}
              </button>
            </div>
          </div>

          <!-- Stats -->
          <div class="filter-section">
            <div class="filter-section-header">
              <span>{{ t('search.stats') }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">{{ t('search.power') }}</span>
              <input
                :value="powerMin ?? ''"
                type="number"
                inputmode="numeric"
                :placeholder="t('search.min')"
                class="stat-input"
                @change="onStatChange('powerMin', $event)"
              />
              <span class="stat-separator">&mdash;</span>
              <input
                :value="powerMax ?? ''"
                type="number"
                inputmode="numeric"
                :placeholder="t('search.max')"
                class="stat-input"
                @change="onStatChange('powerMax', $event)"
              />
            </div>
            <div class="stat-row">
              <span class="stat-label">{{ t('search.toughness') }}</span>
              <input
                :value="toughnessMin ?? ''"
                type="number"
                inputmode="numeric"
                :placeholder="t('search.min')"
                class="stat-input"
                @change="onStatChange('toughnessMin', $event)"
              />
              <span class="stat-separator">&mdash;</span>
              <input
                :value="toughnessMax ?? ''"
                type="number"
                inputmode="numeric"
                :placeholder="t('search.max')"
                class="stat-input"
                @change="onStatChange('toughnessMax', $event)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Clear all filters -->
      <button
        v-if="activeFilterCount > 0"
        class="clear-btn"
        @click="clearAllFilters"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        {{ t('search.clearFilters') }}
        <span class="clear-count">{{ activeFilterCount }}</span>
      </button>
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
import { ref, type Ref } from 'vue'
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

const showMoreFilters = ref(false)

const COLOR_IDENTITY_OPTIONS = [
  { id: 'W', cssVar: 'var(--color-mana-white)' },
  { id: 'U', cssVar: 'var(--color-mana-blue)' },
  { id: 'B', cssVar: 'var(--color-mana-black)' },
  { id: 'R', cssVar: 'var(--color-mana-red)' },
  { id: 'G', cssVar: 'var(--color-mana-green)' },
]

const CARD_TYPE_OPTIONS = [
  { value: 'Creature', labelKey: 'search.typeCreature' },
  { value: 'Instant', labelKey: 'search.typeInstant' },
  { value: 'Sorcery', labelKey: 'search.typeSorcery' },
  { value: 'Enchantment', labelKey: 'search.typeEnchantment' },
  { value: 'Artifact', labelKey: 'search.typeArtifact' },
  { value: 'Planeswalker', labelKey: 'search.typePlaneswalker' },
  { value: 'Land', labelKey: 'search.typeLand' },
]

const CMC_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8]

const RARITY_OPTIONS = [
  { value: 'common', labelKey: 'search.rarityCommon', cssClass: 'rarity--common' },
  { value: 'uncommon', labelKey: 'search.rarityUncommon', cssClass: 'rarity--uncommon' },
  { value: 'rare', labelKey: 'search.rarityRare', cssClass: 'rarity--rare' },
  { value: 'mythic', labelKey: 'search.rarityMythic', cssClass: 'rarity--mythic' },
]

const {
  searchQuery,
  suggestions,
  selectedCard,
  isLoading,
  cardImageUrl,
  commanderOnly,
  colorIdentity,
  cardTypes,
  cmcValues,
  rarities,
  powerMin,
  powerMax,
  toughnessMin,
  toughnessMax,
  activeFilterCount,
  moreFiltersActiveCount,
  onSearchInput,
  selectCard,
  clearSelection,
  toggleColor,
  toggleCardType,
  toggleCmc,
  toggleRarity,
  clearAllFilters,
} = useCardSearch({ initialCommanderOnly: props.initialCommanderOnly })

const statRefs: Record<string, Ref<number | null>> = {
  powerMin,
  powerMax,
  toughnessMin,
  toughnessMax,
}

function onStatChange(field: string, event: Event) {
  const value = (event.target as HTMLInputElement).value
  const target = statRefs[field]
  if (target) {
    target.value = value === '' ? null : Number(value)
  }
}
</script>

<style scoped>
/* =============================================
   FILTER PANEL — Arena game UI
   ============================================= */

.filter-panel {
  padding: 0 12px 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-row--wrap {
  flex-wrap: wrap;
  gap: 6px;
}

/* ── Section header: ornamental gold divider ── */

.filter-section {
  margin-top: 6px;
}

.filter-section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.filter-section-header::before,
.filter-section-header::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212, 168, 67, 0.2), transparent);
}

.filter-section-header span {
  font-family: var(--font-beleren);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(212, 168, 67, 0.5);
  white-space: nowrap;
}

/* ── Commander chip ── */

.filter-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.3px;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 180ms ease;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
}

.filter-chip-icon {
  opacity: 0.5;
  transition: opacity 180ms ease;
}

.filter-chip--active {
  background: rgba(232, 96, 10, 0.12);
  border-color: rgba(232, 96, 10, 0.4);
  color: var(--color-arena-gold-light);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 0 12px rgba(232, 96, 10, 0.2);
  text-shadow: 0 0 8px rgba(232, 96, 10, 0.3);
}

.filter-chip--active .filter-chip-icon {
  opacity: 1;
  color: var(--color-arena-orange);
}

.filter-chip:active {
  transform: scale(0.95);
}

/* ── WUBRG color dots ── */

.color-filters {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-left: auto;
}

.color-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  background: var(--dot-color);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 180ms ease;
  opacity: 0.3;
  flex-shrink: 0;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4);
}

.color-dot--active {
  opacity: 1;
  border-color: rgba(255, 255, 255, 0.8);
  box-shadow:
    0 0 10px color-mix(in srgb, var(--dot-color) 60%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.color-dot:active {
  transform: scale(0.9);
}

/* ── Card type chips ── */

.type-chip {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 180ms ease;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
}

.type-chip--active {
  background: rgba(232, 96, 10, 0.1);
  border-color: rgba(232, 96, 10, 0.35);
  color: var(--color-arena-gold-light);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 0 10px rgba(232, 96, 10, 0.15);
  text-shadow: 0 0 6px rgba(232, 96, 10, 0.3);
}

.type-chip:active {
  transform: scale(0.93);
}

/* ── CMC mana pips ── */

.cmc-row {
  gap: 5px;
  justify-content: center;
}

.cmc-pip {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  border: 1.5px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 180ms ease;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
}

.cmc-pip--active {
  background: radial-gradient(circle at 35% 35%, rgba(212, 168, 67, 0.35), rgba(232, 96, 10, 0.15));
  border-color: rgba(212, 168, 67, 0.5);
  color: var(--color-arena-gold-light);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 0 10px rgba(212, 168, 67, 0.3);
  text-shadow: 0 0 6px rgba(212, 168, 67, 0.5);
}

.cmc-pip:active {
  transform: scale(0.88);
}

/* ── More Filters toggle ── */

.more-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-top: 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(212, 168, 67, 0.08);
  color: rgba(212, 168, 67, 0.5);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 180ms ease;
  width: 100%;
}

.more-toggle:active {
  background: rgba(212, 168, 67, 0.05);
}

.more-toggle-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  flex: 1;
  text-align: left;
}

.more-badge {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-arena-orange);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 8px rgba(232, 96, 10, 0.4);
}

.more-chevron {
  transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.5;
}

.more-chevron--open {
  transform: rotate(180deg);
}

/* ── Expandable content ── */

.more-content {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition:
    max-height 300ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 200ms ease;
}

.more-content--open {
  max-height: 280px;
  opacity: 1;
}

.more-inner {
  padding: 4px 0 8px;
  border-left: 2px solid rgba(212, 168, 67, 0.08);
  margin-left: 12px;
  padding-left: 12px;
}

/* ── Rarity chips ── */

.rarity-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 180ms ease;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
}

.rarity-gem {
  font-size: 10px;
  transition: all 180ms ease;
}

.rarity--common .rarity-gem { color: #6b7280; }
.rarity--uncommon .rarity-gem { color: #9ca3af; }
.rarity--rare .rarity-gem { color: #d4a843; }
.rarity--mythic .rarity-gem { color: #e8600a; }

.rarity-chip--active.rarity--common {
  border-color: rgba(107, 114, 128, 0.4);
  background: rgba(107, 114, 128, 0.1);
  color: #d1d5db;
  box-shadow: 0 0 8px rgba(107, 114, 128, 0.2);
}

.rarity-chip--active.rarity--uncommon {
  border-color: rgba(192, 192, 192, 0.4);
  background: rgba(192, 192, 192, 0.08);
  color: #e5e7eb;
  box-shadow: 0 0 8px rgba(192, 192, 192, 0.2);
}

.rarity-chip--active.rarity--rare {
  border-color: rgba(212, 168, 67, 0.5);
  background: rgba(212, 168, 67, 0.1);
  color: var(--color-arena-gold-light);
  box-shadow: 0 0 10px rgba(212, 168, 67, 0.25);
  text-shadow: 0 0 6px rgba(212, 168, 67, 0.3);
}

.rarity-chip--active.rarity--mythic {
  border-color: rgba(232, 96, 10, 0.5);
  background: rgba(232, 96, 10, 0.12);
  color: #ff8c42;
  box-shadow: 0 0 12px rgba(232, 96, 10, 0.3);
  text-shadow: 0 0 6px rgba(232, 96, 10, 0.4);
}

.rarity-chip:active {
  transform: scale(0.93);
}

/* ── Stat inputs ── */

.stat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.stat-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  width: 70px;
  flex-shrink: 0;
}

.stat-input {
  width: 52px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--color-arena-gold-light);
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 180ms ease, box-shadow 180ms ease;
  -moz-appearance: textfield;
}

.stat-input::-webkit-inner-spin-button,
.stat-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.stat-input::placeholder {
  color: rgba(255, 255, 255, 0.15);
  font-weight: 400;
}

.stat-input:focus {
  outline: none;
  border-color: rgba(212, 168, 67, 0.4);
  box-shadow: 0 0 8px rgba(212, 168, 67, 0.15);
}

.stat-separator {
  color: rgba(255, 255, 255, 0.15);
  font-size: 14px;
}

/* ── Clear filters button ── */

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 14px;
  margin-top: 6px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: rgba(239, 68, 68, 0.7);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 150ms ease;
  width: 100%;
}

.clear-btn:active {
  background: rgba(239, 68, 68, 0.15);
  transform: scale(0.97);
}

.clear-count {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.25);
  font-size: 10px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Suggestion list ── */

.suggestion-list {
  max-height: 50vh;
  overflow-y: auto;
}
</style>
