/**
 * Shared card search composable.
 * Extracts the duplicated autocomplete + select logic from
 * CardSearchView and CommanderPicker.
 */
import { ref, computed } from 'vue'
import type { ScryfallCard } from '@/types/card'
import { autocompleteCards, getCardByName, getCardImageUrl } from '@/services/scryfall'

export function useCardSearch() {
  const searchQuery = ref('')
  const suggestions = ref<string[]>([])
  const selectedCard = ref<ScryfallCard | null>(null)
  const isLoading = ref(false)
  let currentSearchId = 0

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

    const results = await autocompleteCards(searchQuery.value)
    if (searchId !== currentSearchId) return
    suggestions.value = results
  }

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

  return {
    searchQuery,
    suggestions,
    selectedCard,
    isLoading,
    cardImageUrl,
    onSearchInput,
    selectCard,
    clearSelection,
  }
}
