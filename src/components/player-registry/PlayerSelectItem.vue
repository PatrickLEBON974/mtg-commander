<template>
  <ion-item>
    <span slot="start" class="player-number-bubble" :style="{ background: `var(--color-mana-${effectiveColor})` }">
      {{ playerIndex + 1 }}
    </span>

    <!-- Player selection -->
    <ion-select
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

    <ion-reorder slot="end" />
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
}

.nested-item {
  --padding-start: 48px;
}
</style>
