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

  const filters = computed<CardSearchFilters>(() => ({
    commanderOnly: commanderOnly.value,
    colorIdentity: colorIdentity.value,
  }))

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

  // Re-run search when filters change
  watch([commanderOnly, colorIdentity], () => {
    if (searchQuery.value.length >= 2) {
      onSearchInput()
    }
  })

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

  return {
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
  }
}
