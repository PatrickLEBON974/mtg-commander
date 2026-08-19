<template>
  <div class="search-panel">
    <!-- Search bar -->
    <!-- No :debounce here — useCardSearch already debounces (350ms);
         without the debounce prop, ion-searchbar emits ionInput on every keystroke -->
    <ion-searchbar
      v-model="searchQuery"
      :placeholder="t('search.placeholder')"
      show-clear-button="focus"
      animated
      @ionInput="onSearchInput"
    />

    <!-- Filter panel -->
    <div class="filter-panel">
      <!-- Row 1: Commander + Color Identity -->
      <div class="filter-row filter-row--primary">
        <button
          type="button"
          class="filter-chip"
          :class="{ 'filter-chip--active': commanderOnly }"
          :aria-pressed="commanderOnly"
          @click="commanderOnly = !commanderOnly"
        >
          <svg class="filter-chip-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          {{ t('search.commanderFilter') }}
        </button>

        <div class="color-filters" role="group" :aria-label="t('search.colorIdentity')">
          <span class="color-filter-label" aria-hidden="true">{{ t('search.colorIdentity') }}</span>
          <button
            v-for="color in COLOR_IDENTITY_OPTIONS"
            :key="color.id"
            type="button"
            class="color-dot"
            :class="{ 'color-dot--active': colorIdentity.includes(color.id) }"
            :style="{ '--dot-color': color.cssVar }"
            :aria-label="t(color.labelKey)"
            :aria-pressed="colorIdentity.includes(color.id)"
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
            type="button"
            class="type-chip"
            :class="{ 'type-chip--active': cardTypes.includes(cardType.value) }"
            :aria-pressed="cardTypes.includes(cardType.value)"
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
            type="button"
            class="cmc-pip"
            :class="{ 'cmc-pip--active': cmcValues.includes(n) }"
            :aria-label="`${t('search.manaValue')} ${n >= 8 ? '8+' : n}`"
            :aria-pressed="cmcValues.includes(n)"
            @click="toggleCmc(n)"
          >
            {{ n >= 8 ? '8+' : n }}
          </button>
        </div>
      </div>

      <!-- More Filters toggle -->
      <button
        type="button"
        class="more-toggle"
        :aria-expanded="showMoreFilters"
        aria-controls="advanced-card-filters"
        @click="showMoreFilters = !showMoreFilters"
      >
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
      <div id="advanced-card-filters" class="more-content" :class="{ 'more-content--open': showMoreFilters }">
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
                type="button"
                class="rarity-chip"
                :class="[
                  rarity.cssClass,
                  { 'rarity-chip--active': rarities.includes(rarity.value) },
                ]"
                :aria-pressed="rarities.includes(rarity.value)"
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
                :aria-label="`${t('search.power')} — ${t('search.min')}`"
                class="stat-input"
                @change="onStatChange('powerMin', $event)"
              />
              <span class="stat-separator">&mdash;</span>
              <input
                :value="powerMax ?? ''"
                type="number"
                inputmode="numeric"
                :placeholder="t('search.max')"
                :aria-label="`${t('search.power')} — ${t('search.max')}`"
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
                :aria-label="`${t('search.toughness')} — ${t('search.min')}`"
                class="stat-input"
                @change="onStatChange('toughnessMin', $event)"
              />
              <span class="stat-separator">&mdash;</span>
              <input
                :value="toughnessMax ?? ''"
                type="number"
                inputmode="numeric"
                :placeholder="t('search.max')"
                :aria-label="`${t('search.toughness')} — ${t('search.max')}`"
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
        type="button"
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
    <div v-if="selectedCard" class="selected-card-wrap ion-padding" data-animate>
      <ion-card class="card-lift">
        <img
          :src="cardImageUrl"
          :alt="selectedCard.name"
          class="w-full"
          loading="lazy"
        />

        <ion-card-content>
          <!-- Header: Name + Mana Cost -->
          <div class="detail-header">
            <h2 class="detail-card-name">{{ selectedCard.name }}</h2>
            <span v-if="selectedCard.mana_cost" class="detail-mana-cost">
              <i
                v-for="(symbol, symbolIndex) in parseManaCostToSymbols(selectedCard.mana_cost)"
                :key="symbolIndex"
                class="ms ms-cost ms-shadow"
                :class="`ms-${symbol}`"
              />
            </span>
          </div>

          <!-- Type line -->
          <p class="detail-type-line">{{ selectedCard.type_line }}</p>

          <!-- Oracle text with inline mana symbols -->
          <div v-if="selectedCard.oracle_text" class="detail-oracle">
            <template v-for="(segment, segmentIndex) in parseOracleText(selectedCard.oracle_text)" :key="segmentIndex">
              <span v-if="segment.type === 'text'" class="whitespace-pre-line">{{ segment.value }}</span>
              <i v-else class="ms" :class="`ms-${segment.value}`" />
            </template>
          </div>

          <!-- Power/Toughness -->
          <div v-if="selectedCard.power" class="detail-stat-row">
            <span class="stat-box">{{ selectedCard.power }} / {{ selectedCard.toughness }}</span>
          </div>

          <!-- Loyalty -->
          <div v-if="selectedCard.loyalty" class="detail-stat-row">
            <span class="loyalty-badge">
              <i class="ms ms-loyalty-start" :class="`ms-loyalty-${selectedCard.loyalty}`" />
              {{ t('search.loyalty') }}: {{ selectedCard.loyalty }}
            </span>
          </div>

          <!-- Keywords -->
          <div v-if="selectedCard.keywords && selectedCard.keywords.length > 0" class="detail-section">
            <div class="detail-section-header">
              <span>{{ t('search.keywords') }}</span>
            </div>
            <div class="keyword-list">
              <span v-for="keyword in selectedCard.keywords" :key="keyword" class="keyword-pill">
                {{ keyword }}
              </span>
            </div>
          </div>

          <!-- Meta info -->
          <div class="detail-section">
            <div class="meta-row">
              <span class="meta-label">{{ t('search.setName') }}</span>
              <span class="meta-value">{{ selectedCard.set_name }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">{{ t('search.rarity') }}</span>
              <span class="meta-value">
                <span class="rarity-gem" :class="`rarity--${selectedCard.rarity}`">&#9670;</span>
                {{ capitalizeFirst(selectedCard.rarity) }}
              </span>
            </div>
            <div v-if="selectedCard.artist" class="meta-row">
              <span class="meta-label">{{ t('search.artist') }}</span>
              <span class="meta-value">{{ selectedCard.artist }}</span>
            </div>
          </div>

          <!-- Legalities -->
          <div class="detail-section">
            <div class="detail-section-header">
              <span>{{ t('search.legalities') }}</span>
            </div>

            <!-- Commander status (always visible) -->
            <div class="meta-row">
              <span class="meta-label">Commander</span>
              <span class="meta-value">
                <span class="legality-dot" :class="`legality--${selectedCard.legalities.commander}`" />
                {{ legalityLabel(selectedCard.legalities.commander ?? '') }}
              </span>
            </div>

            <!-- Expandable all formats -->
            <button
              type="button"
              class="more-toggle legality-toggle"
              :aria-expanded="showAllLegalities"
              aria-controls="all-card-legalities"
              @click="showAllLegalities = !showAllLegalities"
            >
              <span class="more-toggle-label">{{ t('search.showAllFormats') }}</span>
              <svg
                class="more-chevron"
                :class="{ 'more-chevron--open': showAllLegalities }"
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

            <div id="all-card-legalities" class="more-content" :class="{ 'more-content--open': showAllLegalities }">
              <div class="legality-grid">
                <template v-for="formatName in LEGALITY_FORMAT_ORDER" :key="formatName">
                  <div v-if="selectedCard.legalities[formatName]" class="legality-cell">
                    <span class="legality-dot" :class="`legality--${selectedCard.legalities[formatName]}`" />
                    <span class="legality-format-name">{{ formatName }}</span>
                  </div>
                </template>
              </div>
            </div>
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
      class="search-empty-state flex flex-col items-center justify-center gap-3"
    >
      <IllustrationNoResults :size="120" data-animate />
      <p data-animate style="color: var(--ion-color-medium)">{{ t('search.emptyState') }}</p>
      <p data-animate class="text-xs" style="color: var(--ion-color-medium)">{{ t('search.autoFilter') }}</p>
      <div v-if="offlineStore.hasLocalData" class="search-source-status search-source-status--ready" role="status" data-animate>
        <ion-icon :icon="checkmarkCircleOutline" />
        <span>{{ t('search.localCards', { count: offlineStore.cardCount.toLocaleString() }) }}</span>
      </div>
      <div v-else class="search-source-status" role="status" data-animate>
        <ion-icon :icon="cloudOutline" />
        <span>{{ t('search.apiMode') }}</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="search-loading-state flex justify-center p-8">
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
  IonCardContent,
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
import { parseManaCostToSymbols, parseOracleText } from '@/utils/mana'

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
const showAllLegalities = ref(false)

/** Priority-sorted format names for legalities display */
const LEGALITY_FORMAT_ORDER = [
  'commander', 'standard', 'modern', 'legacy', 'vintage', 'pioneer',
  'pauper', 'historic', 'explorer', 'alchemy', 'brawl', 'penny',
  'oathbreaker', 'predh', 'oldschool', 'premodern', 'paupercommander',
  'duel', 'gladiator', 'timeless', 'standardbrawl',
] as const

function legalityLabel(status: string): string {
  const labelMap: Record<string, string> = {
    legal: t('search.legalityLegal'),
    banned: t('search.legalityBanned'),
    not_legal: t('search.legalityNotLegal'),
    restricted: t('search.legalityRestricted'),
  }
  return labelMap[status] ?? status
}

function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const COLOR_IDENTITY_OPTIONS = [
  { id: 'W', cssVar: 'var(--color-mana-white)', labelKey: 'search.colorWhite' },
  { id: 'U', cssVar: 'var(--color-mana-blue)', labelKey: 'search.colorBlue' },
  { id: 'B', cssVar: 'var(--color-mana-black)', labelKey: 'search.colorBlack' },
  { id: 'R', cssVar: 'var(--color-mana-red)', labelKey: 'search.colorRed' },
  { id: 'G', cssVar: 'var(--color-mana-green)', labelKey: 'search.colorGreen' },
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

.search-panel {
  min-height: 100%;
  padding-top: 10px;
  padding-right: max(12px, var(--ion-safe-area-right, 0px));
  padding-bottom: 32px;
  padding-left: max(12px, var(--ion-safe-area-left, 0px));
}

.search-panel :deep(ion-searchbar) {
  --background: rgba(5, 10, 12, 0.88);
  --box-shadow: inset 0 0 0 1px rgba(215, 184, 115, 0.14), inset 0 2px 7px rgba(0, 0, 0, 0.4);
  --color: var(--ion-text-color);
  --icon-color: #cfaa63;
  --placeholder-color: #b8c2be;
  --placeholder-opacity: 0.82;
  padding: 2px 2px 10px;
}

.filter-panel {
  position: relative;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
  border: 1px solid rgba(204, 171, 99, 0.18);
  border-radius: 15px;
  background:
    linear-gradient(150deg, rgba(19, 28, 31, 0.95), rgba(7, 12, 14, 0.97)),
    radial-gradient(circle at 92% 0%, rgba(214, 105, 29, 0.1), transparent 36%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 12px 28px rgba(0, 0, 0, 0.36);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
}

.filter-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 18%;
  width: 64%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(230, 190, 104, 0.52), transparent);
  box-shadow: 0 0 9px rgba(221, 129, 36, 0.25);
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-row--wrap {
  flex-wrap: wrap;
  gap: 8px;
}

.filter-row--primary {
  flex-wrap: wrap;
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
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(232, 202, 136, 0.76);
  white-space: nowrap;
}

/* ── Commander chip ── */

.filter-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  min-height: 48px;
  justify-content: center;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.3px;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(231, 237, 234, 0.72);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 180ms ease, border-color 180ms ease, color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
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
  transform: scale(0.93) translateY(1px);
  box-shadow: var(--shadow-btn-pressed);
}

/* ── WUBRG color dots ── */

.color-filters {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(5, minmax(44px, 1fr));
  gap: 4px;
  align-items: center;
  margin-left: 0;
}

.color-filter-label {
  grid-column: 1 / -1;
  color: rgba(220, 229, 224, 0.68);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}

.color-dot {
  position: relative;
  width: 44px;
  height: 44px;
  justify-self: center;
  border-radius: 50%;
  border: 1px solid rgba(222, 231, 226, 0.16);
  background: rgba(255, 255, 255, 0.035);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  opacity: 0.82;
  flex-shrink: 0;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.42);
}

.color-dot::before {
  content: '';
  position: absolute;
  inset: 8px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  background: var(--dot-color);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.46);
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.color-dot--active {
  opacity: 1;
  border-color: rgba(239, 207, 136, 0.72);
  background: rgba(212, 168, 67, 0.08);
  box-shadow:
    0 0 12px color-mix(in srgb, var(--dot-color) 46%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.color-dot--active::before {
  transform: scale(1.08);
  box-shadow:
    0 0 9px color-mix(in srgb, var(--dot-color) 65%, transparent),
    inset 0 1px 3px rgba(0, 0, 0, 0.32);
}

.color-dot:active {
  transform: scale(0.9);
}

/* ── Card type chips ── */

.type-chip {
  min-height: 44px;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(226, 233, 229, 0.68);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 180ms ease, border-color 180ms ease, color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
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
  transform: scale(0.93) translateY(1px);
  box-shadow: var(--shadow-btn-pressed);
}

/* ── CMC mana pips ── */

.cmc-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(44px, 1fr));
  gap: 6px;
}

.cmc-pip {
  width: 44px;
  height: 44px;
  justify-self: center;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  border: 1.5px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(228, 235, 231, 0.66);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 180ms ease, border-color 180ms ease, color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
}

.cmc-pip--active {
  background: radial-gradient(circle at 35% 35%, rgba(212, 168, 67, 0.35), rgba(232, 96, 10, 0.15));
  border-color: rgba(212, 168, 67, 0.5);
  color: var(--color-arena-gold-light);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 0 10px rgba(212, 168, 67, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.3);
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
  min-height: 48px;
  padding: 10px 12px;
  margin-top: 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(212, 168, 67, 0.08);
  color: rgba(232, 203, 140, 0.78);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 180ms ease, border-color 180ms ease, color 180ms ease;
  width: 100%;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
}

.more-toggle:active {
  background: rgba(212, 168, 67, 0.05);
}

.more-toggle-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  flex: 1;
  text-align: left;
}

.more-badge {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-arena-orange);
  color: #fff;
  font-size: 11px;
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
  max-height: 560px;
  opacity: 1;
}

.more-inner {
  padding: 4px 0 8px;
  border-left: 2px solid rgba(212, 168, 67, 0.08);
  margin-left: 4px;
  padding-left: 10px;
}

.more-inner .filter-row {
  flex-wrap: wrap;
}

/* ── Rarity chips ── */

.rarity-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.3px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(226, 233, 229, 0.66);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 180ms ease, border-color 180ms ease, color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
  flex: 1 1 calc(50% - 4px);
  justify-content: center;
}

.rarity-gem {
  font-size: 10px;
  transition: color 180ms ease;
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
  transform: scale(0.93) translateY(1px);
  box-shadow: var(--shadow-btn-pressed);
}

/* ── Stat inputs ── */

.stat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.stat-label {
  font-size: 13px;
  font-weight: 600;
  color: rgba(225, 233, 228, 0.72);
  width: 78px;
  flex-shrink: 0;
}

.stat-input {
  width: 64px;
  height: 48px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--color-arena-gold-light);
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 180ms ease, box-shadow 180ms ease;
  -moz-appearance: textfield;
  box-shadow: var(--shadow-inset-panel);
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
  border-color: rgba(212, 168, 67, 0.4);
  box-shadow: 0 0 8px rgba(212, 168, 67, 0.15);
}

.stat-input:focus:not(:focus-visible) {
  outline: none;
}

.stat-input:focus-visible {
  outline: 2px solid var(--color-arena-gold);
  outline-offset: 2px;
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
  min-height: 48px;
  padding: 10px 14px;
  margin-top: 6px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ff8585;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.3px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 150ms ease, border-color 150ms ease, color 150ms ease, transform 150ms ease;
  width: 100%;
}

.clear-btn:active {
  background: rgba(239, 68, 68, 0.15);
  transform: scale(0.97);
}

.clear-count {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.25);
  font-size: 11px;
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

.search-empty-state {
  position: relative;
  min-height: 280px;
  margin: 14px 2px 0;
  padding: 34px 18px;
  overflow: hidden;
  border: 1px solid rgba(204, 171, 99, 0.14);
  border-radius: 16px;
  background:
    radial-gradient(circle at 50% 22%, rgba(208, 139, 44, 0.1), transparent 34%),
    linear-gradient(150deg, rgba(17, 25, 28, 0.88), rgba(7, 11, 13, 0.9));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035), 0 12px 28px rgba(0, 0, 0, 0.3);
  text-align: center;
}

.search-empty-state::after {
  content: '';
  position: absolute;
  right: 24%;
  bottom: 17px;
  left: 24%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(205, 170, 96, 0.26), transparent);
}

.search-empty-state :deep(svg) {
  filter: drop-shadow(0 0 18px rgba(205, 143, 42, 0.18));
}

.search-empty-state p {
  margin: 0;
}

.search-empty-state p:first-of-type {
  color: rgba(237, 229, 207, 0.78) !important;
  font-family: var(--font-beleren);
  font-size: 16px;
  letter-spacing: 0.25px;
}

.search-empty-state p:nth-of-type(2) {
  color: rgba(211, 221, 215, 0.7) !important;
  font-size: 12px;
  letter-spacing: 0.45px;
}

.search-source-status {
  display: inline-flex;
  min-height: 40px;
  margin-top: 4px;
  padding: 8px 12px;
  align-items: center;
  gap: 7px;
  border: 1px solid rgba(210, 178, 105, 0.25);
  border-radius: 999px;
  background: rgba(8, 14, 16, 0.86);
  color: rgba(210, 221, 215, 0.76);
  font-size: 12px;
  line-height: 1.3;
}

.search-source-status ion-icon {
  flex: 0 0 auto;
  color: #8faaa2;
  font-size: 17px;
}

.search-source-status--ready {
  border-color: rgba(64, 190, 137, 0.3);
  color: #a9dbc4;
}

.search-source-status--ready ion-icon {
  color: #5bc796;
}

@media (min-width: 600px) and (max-width: 759px) {
  .search-panel {
    width: min(calc(100% - 48px), 680px);
    margin: 0 auto;
    padding-top: 18px;
  }
}

@media (min-width: 760px) {
  .search-panel {
    display: grid;
    width: min(calc(100% - 48px), 960px);
    margin: 0 auto;
    padding: 20px 0 34px;
    grid-template-columns: minmax(320px, 0.88fr) minmax(360px, 1.12fr);
    grid-template-rows: auto 1fr;
    align-items: start;
    gap: 16px;
  }

  .search-panel :deep(ion-searchbar) {
    grid-column: 1 / -1;
    padding-bottom: 0;
  }

  .filter-panel {
    grid-row: 2;
    grid-column: 1;
    padding: 16px;
  }

  .suggestion-list,
  .selected-card-wrap,
  .search-empty-state,
  .search-loading-state {
    grid-row: 2;
    grid-column: 2;
    align-self: start;
    margin-top: 0;
  }

  .search-empty-state {
    min-height: 430px;
    padding: 44px 28px;
  }

  .selected-card-wrap {
    padding: 0;
  }

  .selected-card-wrap :deep(ion-card) {
    margin-top: 0;
  }
}

/* =============================================
   CARD DETAIL — redesigned layout
   ============================================= */

/* ── Header: name + mana cost ── */

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
}

.detail-card-name {
  font-family: var(--font-beleren);
  font-size: 18px;
  font-weight: 700;
  color: var(--color-arena-gold-light);
  line-height: 1.3;
  margin: 0;
  flex: 1;
  min-width: 0;
}

.detail-mana-cost {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  font-size: 16px;
}

/* ── Type line ── */

.detail-type-line {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.3px;
  margin: 0 0 10px;
}

/* ── Oracle text ── */

.detail-oracle {
  color: var(--ion-text-color);
  line-height: 1.65;
  font-size: 15px;
  padding: 12px 14px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.2);
}

.detail-oracle .ms {
  font-size: 15px;
  vertical-align: -1px;
  margin: 0 1px;
}

/* ── P/T + Loyalty ── */

.detail-stat-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.stat-box {
  display: inline-flex;
  align-items: center;
  padding: 4px 14px;
  border-radius: 10px;
  border: 1.5px solid rgba(212, 168, 67, 0.4);
  background: rgba(212, 168, 67, 0.08);
  font-family: var(--font-beleren);
  font-size: 15px;
  font-weight: 700;
  color: var(--color-arena-gold-light);
  letter-spacing: 1px;
}

.loyalty-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 10px;
  border: 1.5px solid rgba(156, 163, 175, 0.3);
  background: rgba(156, 163, 175, 0.08);
  font-size: 13px;
  font-weight: 600;
  color: #d1d5db;
}

/* ── Detail section + header (reuses gold divider pattern) ── */

.detail-section {
  margin-top: 12px;
}

.detail-section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.detail-section-header::before,
.detail-section-header::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212, 168, 67, 0.2), transparent);
}

.detail-section-header span {
  font-family: var(--font-beleren);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(212, 168, 67, 0.5);
  white-space: nowrap;
}

/* ── Keywords ── */

.keyword-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.keyword-pill {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.3px;
  background: rgba(74, 144, 226, 0.1);
  border: 1px solid rgba(74, 144, 226, 0.25);
  color: rgba(74, 144, 226, 0.85);
}

/* ── Meta rows ── */

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 44px;
  padding: 8px 0;
}

.meta-row + .meta-row {
  border-top: 1px solid rgba(255, 255, 255, 0.03);
}

.meta-label {
  font-size: 14px;
  color: rgba(224, 232, 227, 0.68);
  font-weight: 500;
}

.meta-value {
  font-size: 14px;
  color: rgba(242, 244, 241, 0.86);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  text-align: right;
}

/* ── Legality dots ── */

.legality-toggle {
  margin-top: 6px;
  padding: 6px 12px;
}

.legality-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
  padding: 8px 0;
}

.legality-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legality-format-name {
  font-size: 13px;
  color: rgba(224, 232, 227, 0.72);
  text-transform: capitalize;
}

.legality-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legality--legal {
  background: #22c55e;
  box-shadow: 0 0 4px rgba(34, 197, 94, 0.4);
}

.legality--banned {
  background: #ef4444;
  box-shadow: 0 0 4px rgba(239, 68, 68, 0.4);
}

.legality--not_legal {
  background: #6b7280;
}

.legality--restricted {
  background: #f59e0b;
  box-shadow: 0 0 4px rgba(245, 158, 11, 0.4);
}
</style>
