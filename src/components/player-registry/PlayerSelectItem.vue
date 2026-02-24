<template>
  <ion-item>
    <div slot="start" class="player-start">
      <span class="player-index">{{ playerIndex + 1 }}</span>
      <!-- Commander avatar when a deck with commanders is selected -->
      <img
        v-if="selectedDeckCommander"
        class="commander-avatar"
        :style="{ borderColor: `var(--color-mana-${effectiveColor})` }"
        :src="selectedDeckCommander.imageUri"
        :alt="selectedDeckCommander.name"
      />
      <!-- Color dot fallback -->
      <span v-else class="color-dot" :style="{ background: `var(--color-mana-${effectiveColor})` }" />
    </div>

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
          v-for="profile in availableProfiles"
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
  usedProfileIds?: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: PlayerConfigExtended]
}>()

const { t } = useI18n()
const registryStore = usePlayerRegistryStore()

const availableProfiles = computed(() => {
  const used = new Set(props.usedProfileIds ?? [])
  return registryStore.sortedProfiles.filter(
    (profile) => !used.has(profile.id) || profile.id === props.modelValue.playerProfileId,
  )
})

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
.player-start {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 8px;
}

.player-index {
  font-size: 14px;
  font-weight: 700;
  color: var(--ion-color-medium);
  min-width: 14px;
  text-align: center;
}

.commander-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid;
  flex-shrink: 0;
}

.color-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
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
