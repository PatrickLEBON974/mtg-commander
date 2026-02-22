<template>
  <div class="flex flex-col items-center gap-3 p-4">
    <img
      v-if="imageUrl"
      :src="imageUrl"
      :alt="card.name"
      class="w-48 rounded-xl shadow-lg"
      loading="lazy"
    />

    <div class="text-center">
      <h3 class="text-lg font-bold text-text-primary">{{ card.name }}</h3>
      <p class="text-sm text-text-secondary">{{ card.type_line }}</p>
      <p v-if="card.mana_cost" class="text-sm text-text-secondary">{{ card.mana_cost }}</p>
    </div>

    <p v-if="card.oracle_text" class="text-sm text-text-primary whitespace-pre-line text-center">
      {{ card.oracle_text }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ScryfallCard } from '@/types/card'
import { getCardImageUrl } from '@/services/scryfall'

const props = defineProps<{
  card: ScryfallCard
}>()

const imageUrl = computed(() => getCardImageUrl(props.card, 'normal'))
</script>
