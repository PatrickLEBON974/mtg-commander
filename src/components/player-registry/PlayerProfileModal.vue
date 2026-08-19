<template>
  <AppModal :is-open="isOpen" :title="isEditing ? t('players.editPlayer') : t('players.addPlayer')" @close="$emit('close')">
    <ion-list :inset="true">
      <ion-item>
        <ion-input
          v-model="playerName"
          :label="t('players.playerName')"
          label-placement="stacked"
          :maxlength="PLAYER_NAME_MAX_LENGTH"
          :clear-input="true"
          :placeholder="t('players.playerName')"
          :class="{ 'ion-invalid ion-touched': nameErrorMessage }"
          @ion-input="nameErrorMessage = ''"
        />
      </ion-item>

      <ion-item class="color-picker-item">
        <div class="color-picker-layout">
          <ion-label>{{ t('players.preferredColor') }}</ion-label>
          <div class="color-picker-controls" role="group" :aria-label="t('players.preferredColor')">
          <button
            v-for="color in PLAYER_COLORS"
            :key="color"
            type="button"
            class="mana-dot-button"
            :class="{ 'mana-dot-selected': selectedColor === color }"
            :style="{ '--mana-color': `var(--color-mana-${color})` }"
            :aria-label="t(`players.colors.${color}`)"
            :aria-pressed="selectedColor === color"
            @click="selectedColor = color"
          />
          </div>
        </div>
      </ion-item>
    </ion-list>

    <div v-if="nameErrorMessage" class="px-6 pb-2">
      <p class="text-xs text-life-negative">{{ nameErrorMessage }}</p>
    </div>

    <div class="p-4">
      <ion-button expand="block" color="primary" :disabled="!playerName.trim()" @click="handleSave">
        {{ t('players.save') }}
      </ion-button>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonList,
  IonItem,
  IonInput,
  IonLabel,
  IonButton,
} from '@ionic/vue'
import AppModal from '@/components/ui/AppModal.vue'
import { usePlayerRegistryStore } from '@/stores/playerRegistryStore'
import { PLAYER_COLORS, PLAYER_NAME_MAX_LENGTH } from '@/config/gameConstants'
import type { PlayerColor } from '@/types/game'

const props = defineProps<{
  isOpen: boolean
  profileId?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const registryStore = usePlayerRegistryStore()

const playerName = ref('')
const selectedColor = ref<PlayerColor>('white')
const nameErrorMessage = ref('')

const isEditing = ref(false)

watch(() => props.isOpen, (open) => {
  if (!open) return
  nameErrorMessage.value = ''
  if (props.profileId) {
    const profile = registryStore.getProfileById(props.profileId)
    if (profile) {
      isEditing.value = true
      playerName.value = profile.name
      selectedColor.value = profile.preferredColor
      return
    }
  }
  isEditing.value = false
  playerName.value = ''
  selectedColor.value = 'white'
})

function isNameTaken(name: string): boolean {
  const normalized = name.toLowerCase()
  return registryStore.playerProfiles.some(
    (profile) =>
      profile.name.toLowerCase() === normalized &&
      profile.id !== props.profileId,
  )
}

function handleSave() {
  const name = playerName.value.trim()
  if (!name) return

  if (isNameTaken(name)) {
    nameErrorMessage.value = t('players.duplicateNameError')
    return
  }

  if (isEditing.value && props.profileId) {
    registryStore.updatePlayerProfile(props.profileId, {
      name,
      preferredColor: selectedColor.value,
    })
  } else {
    registryStore.addPlayerProfile(name, selectedColor.value)
  }
  emit('close')
}
</script>

<style scoped>
.color-picker-layout {
  display: grid;
  width: 100%;
  gap: 10px;
  padding: 10px 0;
}

.color-picker-controls {
  display: grid;
  grid-template-columns: repeat(6, 44px);
  justify-content: space-between;
  gap: 3px;
}

.mana-dot-button {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(236, 224, 193, 0.16);
  background: rgba(255, 255, 255, 0.035);
  cursor: pointer;
  transition: border-color 150ms ease, transform 150ms ease;
  -webkit-tap-highlight-color: transparent;
}

.mana-dot-button::before {
  content: '';
  position: absolute;
  inset: 8px;
  border: 2px solid rgba(255, 255, 255, 0.28);
  border-radius: 50%;
  background: var(--mana-color);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.45);
}

@media (hover: hover) {
  .mana-dot-button:hover {
    transform: scale(1.15);
  }
}

.mana-dot-button:active:not(.mana-dot-selected) {
  transform: scale(1.1);
}

.mana-dot-selected {
  border-color: var(--color-arena-gold-light);
  background: rgba(212, 168, 67, 0.1);
  box-shadow: 0 0 8px rgba(232, 96, 10, 0.5);
}

@media (max-width: 359px) {
  .color-picker-controls {
    grid-template-columns: repeat(3, 44px);
    justify-content: start;
    gap: 8px;
  }
}
</style>
