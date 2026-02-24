<template>
  <ion-item>
    <!-- Commander avatar when a deck with commanders is selected -->
    <img
      v-if="selectedDeckCommander"
      slot="start"
      class="commander-avatar"
      :style="{ borderColor: `var(--color-mana-${effectiveColor})` }"
      :src="selectedDeckCommander.imageUri"
      :alt="selectedDeckCommander.name"
    />
    <!-- Numbered bubble fallback -->
    <span v-else slot="start" class="player-number-bubble" :style="{ background: `var(--color-mana-${effectiveColor})` }">
      {{ playerIndex + 1 }}
    </span>

    <div class="select-row">
      <!-- Player selection -->
      <ion-select
        class="player-select"
        :value="modelValue.playerProfileId ?? 'anonymous'"
        :label="t('players.selectPlayer')"
        label-placement="stacked"
        interface="popover"
        @ionChange="handleProfileChange($event.detail.value)"
      >
        <ion-select-option value="anonymous">{{ t('game.defaultPlayerName', { index: playerIndex + 1 }) }}</ion-select-option>
        <ion-select-option
          v-for="profile in registryStore.sortedProfiles"
          :key="profile.id"
          :value="profile.id"
        >
          {{ profile.name }}
        </ion-select-option>
      </ion-select>

      <!-- Deck selection (visible when a registered player with decks is selected) -->
      <ion-select
        v-if="modelValue.playerProfileId && selectedProfile && selectedProfile.decks.length > 0"
        class="deck-select"
        :value="modelValue.deckId ?? ''"
        :label="t('players.selectDeck')"
        label-placement="stacked"
        interface="popover"
        @ionChange="handleDeckChange($event.detail.value)"
      >
        <ion-select-option value="">{{ t('players.noDeck') }}</ion-select-option>
        <ion-select-option
          v-for="deck in selectedProfile.decks"
          :key="deck.id"
          :value="deck.id"
        >
          {{ deck.name }}
        </ion-select-option>
      </ion-select>
    </div>

    <ion-reorder slot="end" />
  </ion-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonItem,
  IonSelect,
  IonSelectOption,
  IonReorder,
} from '@ionic/vue'
import { usePlayerRegistryStore } from '@/stores/playerRegistryStore'
import type { ManaColor } from '@/types/game'

export interface PlayerConfigExtended {
  id: number
  name: string
  color: ManaColor
  playerProfileId?: string
  deckId?: string
}

const props = defineProps<{
  modelValue: PlayerConfigExtended
  playerIndex: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: PlayerConfigExtended]
}>()

const { t } = useI18n()
const registryStore = usePlayerRegistryStore()

const selectedProfile = computed(() => {
  if (!props.modelValue.playerProfileId) return undefined
  return registryStore.getProfileById(props.modelValue.playerProfileId)
})

const effectiveColor = computed(() => {
  if (selectedProfile.value) return selectedProfile.value.preferredColor
  return props.modelValue.color
})

const selectedDeckCommander = computed(() => {
  if (!props.modelValue.deckId || !selectedProfile.value) return undefined
  const deck = registryStore.getDeckById(selectedProfile.value.id, props.modelValue.deckId)
  if (!deck || deck.commanders.length === 0) return undefined
  return deck.commanders[0]
})

function handleProfileChange(profileId: string) {
  if (profileId === 'anonymous') {
    emit('update:modelValue', {
      ...props.modelValue,
      playerProfileId: undefined,
      deckId: undefined,
    })
  } else {
    const profile = registryStore.getProfileById(profileId)
    if (profile) {
      emit('update:modelValue', {
        ...props.modelValue,
        playerProfileId: profileId,
        name: profile.name,
        color: profile.preferredColor,
        deckId: undefined,
      })
    }
  }
}

function handleDeckChange(deckId: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    deckId: deckId || undefined,
  })
}

</script>

<style scoped>
.commander-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid;
  flex-shrink: 0;
  margin-right: 8px;
}

.player-number-bubble {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0.6);
  margin-right: 8px;
}

.select-row {
  display: flex;
  flex: 1;
  gap: 4px;
  min-width: 0;
}

.player-select {
  flex: 1;
  min-width: 0;
}

.deck-select {
  flex: 1;
  min-width: 0;
}
</style>
