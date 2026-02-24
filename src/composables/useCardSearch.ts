/**
 * Shared card search composable.
 * Extracts the duplicated autocomplete + select logic from
 * CardSearchView and CommanderPicker.
 */
import { ref, computed, watch } from 'vue'
import type { ScryfallCard, CardSearchFilters } from '@/types/card'
import { autocompleteCards, getCardByName, getCardImageUrl } from '@/services/scryfall'

export interface UseCardSearchOptions {
  initialCommanderOnly?: boolean
}

export function useCardSearch(options: UseCardSearchOptions = {}) {
  const searchQuery = ref('')
  const suggestions = ref<string[]>([])
  const selectedCard = ref<ScryfallCard | null>(null)
  const isLoading = ref(false)
  let currentSearchId = 0

  // Filters
  const commanderOnly = ref(options.initialCommanderOnly ?? false)
  const colorIdentity = ref<string[]>([])
  const cardTypes = ref<string[]>([])
  const cmcValues = ref<number[]>([])
  const rarities = ref<string[]>([])
  const powerMin = ref<number | null>(null)
  const powerMax = ref<number | null>(null)
  const toughnessMin = ref<number | null>(null)
  const toughnessMax = ref<number | null>(null)

  const filters = computed<CardSearchFilters>(() => ({
    commanderOnly: commanderOnly.value,
    colorIdentity: colorIdentity.value,
    cardTypes: cardTypes.value,
    cmcValues: cmcValues.value,
    rarities: rarities.value,
    powerMin: powerMin.value,
    powerMax: powerMax.value,
    toughnessMin: toughnessMin.value,
    toughnessMax: toughnessMax.value,
  }))

  const activeFilterCount = computed(() => {
    let count = 0
    if (commanderOnly.value) count++
    if (colorIdentity.value.length > 0) count++
    if (cardTypes.value.length > 0) count++
    if (cmcValues.value.length > 0) count++
    if (rarities.value.length > 0) count++
    if (powerMin.value != null || powerMax.value != null) count++
    if (toughnessMin.value != null || toughnessMax.value != null) count++
    return count
  })

  const moreFiltersActiveCount = computed(() => {
    let count = 0
    if (rarities.value.length > 0) count++
    if (powerMin.value != null || powerMax.value != null) count++
    if (toughnessMin.value != null || toughnessMax.value != null) count++
    return count
  })

  const cardImageUrl = computed(() => {
    if (!selectedCard.value) return ''
    return getCardImageUrl(selectedCard.value, 'normal')
  })

  async function onSearchInput() {
    const searchId = ++currentSearchId
    selectedCard.value = null

    if (searchQuery.value.length < 2) {
      suggestions.value = []
      return
    }

    const results = await autocompleteCards(searchQuery.value, filters.value)
    if (searchId !== currentSearchId) return
    suggestions.value = results
  }

  // Re-run search when any filter changes
  watch(
    [commanderOnly, colorIdentity, cardTypes, cmcValues, rarities, powerMin, powerMax, toughnessMin, toughnessMax],
    () => {
      if (searchQuery.value.length >= 2) {
        onSearchInput()
      }
    },
  )

  async function selectCard(cardName: string) {
    const searchId = ++currentSearchId
    suggestions.value = []
    searchQuery.value = cardName
    isLoading.value = true
    try {
      const card = await getCardByName(cardName)
      if (searchId !== currentSearchId) return
      selectedCard.value = card
    } finally {
      if (searchId === currentSearchId) {
        isLoading.value = false
      }
    }
  }

  function clearSelection() {
    selectedCard.value = null
    searchQuery.value = ''
    suggestions.value = []
  }

  function toggleColor(color: string) {
    const index = colorIdentity.value.indexOf(color)
    if (index === -1) {
      colorIdentity.value = [...colorIdentity.value, color]
    } else {
      colorIdentity.value = colorIdentity.value.filter((c) => c !== color)
    }
  }

  function toggleCardType(type: string) {
    const index = cardTypes.value.indexOf(type)
    if (index === -1) {
      cardTypes.value = [...cardTypes.value, type]
    } else {
      cardTypes.value = cardTypes.value.filter((t) => t !== type)
    }
  }

  function toggleCmc(value: number) {
    const index = cmcValues.value.indexOf(value)
    if (index === -1) {
      cmcValues.value = [...cmcValues.value, value]
    } else {
      cmcValues.value = cmcValues.value.filter((v) => v !== value)
    }
  }

  function toggleRarity(rarity: string) {
    const index = rarities.value.indexOf(rarity)
    if (index === -1) {
      rarities.value = [...rarities.value, rarity]
    } else {
      rarities.value = rarities.value.filter((r) => r !== rarity)
    }
  }

  function clearAllFilters() {
    commanderOnly.value = false
    colorIdentity.value = []
    cardTypes.value = []
    cmcValues.value = []
    rarities.value = []
    powerMin.value = null
    powerMax.value = null
    toughnessMin.value = null
    toughnessMax.value = null
  }

  return {
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
  }
}
