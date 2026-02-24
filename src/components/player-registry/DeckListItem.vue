<template>
  <ion-item-sliding>
    <ion-item button @click="$emit('tap', deck.id)">
      <div slot="start" class="commander-thumbnails">
        <img
          v-for="(commander, index) in deck.commanders"
          :key="index"
          :src="commander.imageUri"
          :alt="commander.name"
          class="commander-thumb"
        />
        <div v-if="deck.commanders.length === 0" class="commander-thumb-placeholder" />
      </div>
      <ion-label>
        <h2>{{ deck.name || t('players.noDeck') }}</h2>
        <p v-if="deck.commanders.length > 0">
          {{ deck.commanders.map(c => c.name).join(', ') }}
        </p>
      </ion-label>
    </ion-item>

    <ion-item-options side="end">
      <ion-item-option color="danger" @click="$emit('delete', deck.id)">
        <ion-icon :icon="trashOutline" slot="icon-only" />
      </ion-item-option>
    </ion-item-options>
  </ion-item-sliding>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonLabel,
  IonIcon,
} from '@ionic/vue'
import { trashOutline } from 'ionicons/icons'
import type { Deck } from '@/types/playerRegistry'

defineProps<{
  deck: Deck
}>()

defineEmits<{
  tap: [deckId: string]
  delete: [deckId: string]
}>()

const { t } = useI18n()
</script>

<style scoped>
.commander-thumbnails {
  display: flex;
  gap: 4px;
  align-items: center;
}

.commander-thumb {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  object-fit: cover;
}

.commander-thumb-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: var(--ion-color-step-100);
}
</style>
