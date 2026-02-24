<template>
  <ion-item>
    <span slot="start" class="mana-dot" :style="{ background: `var(--color-mana-${effectiveColor})` }" />

    <!-- Player selection -->
    <ion-select
      :value="modelValue.playerProfileId ?? 'anonymous'"
      :label="t('players.selectPlayer')"
      label-placement="stacked"
      interface="popover"
      @ionChange="handleProfileChange($event.detail.value)"
    >
      <ion-select-option value="anonymous">{{ t('players.anonymous') }}</ion-select-option>
      <ion-select-option
        v-for="profile in registryStore.sortedProfiles"
        :key="profile.id"
        :value="profile.id"
      >
        {{ profile.name }}
      </ion-select-option>
    </ion-select>

    <ion-reorder slot="end" />
  </ion-item>

  <!-- Anonymous: name input -->
  <ion-item v-if="!modelValue.playerProfileId" class="nested-item">
    <ion-input
      :value="modelValue.name"
      :maxlength="PLAYER_NAME_MAX_LENGTH"
      :clear-input="true"
      :placeholder="t('game.defaultPlayerName', { index: playerIndex + 1 })"
      @ionInput="handleNameInput($event.detail.value ?? '')"
    />
  </ion-item>

  <!-- Registered player: deck selection -->
  <ion-item v-if="modelValue.playerProfileId && selectedProfile && selectedProfile.decks.length > 0" class="nested-item">
    <ion-select
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
  </ion-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonReorder,
} from '@ionic/vue'
import { usePlayerRegistryStore } from '@/stores/playerRegistryStore'
import { PLAYER_NAME_MAX_LENGTH } from '@/config/gameConstants'
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

function handleNameInput(value: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    name: value,
  })
}
</script>

<style scoped>
.mana-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.nested-item {
  --padding-start: 36px;
}
</style>
