<template>
  <div class="save-content ion-padding">
    <!-- Header -->
    <div class="save-header">
      <h2 class="save-title">{{ t('players.saveAnonymous') }}</h2>
      <button type="button" class="save-close-btn" :aria-label="t('common.close')" @click="dismiss(null, 'skip')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <!-- Player context -->
    <div class="flex flex-col items-center gap-3 pb-4 pt-2">
      <div
        class="flex h-14 w-14 items-center justify-center rounded-full"
        :style="{ background: `color-mix(in srgb, var(--color-mana-${selectedColor}) 25%, transparent)` }"
      >
        <span
          class="block h-8 w-8 rounded-full"
          :style="{ background: `var(--color-mana-${selectedColor})` }"
        />
      </div>
      <p class="text-center text-sm text-text-secondary">
        {{ t('players.saveAnonymousHint', { name: playerName }) }}
      </p>
    </div>

    <!-- Commander preview -->
    <div v-if="commanders.length > 0" class="flex flex-col gap-2 px-4 pb-3">
      <p class="text-xs font-medium text-text-secondary">{{ t('players.willCreateDeck') }}</p>
      <div class="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
        <div v-for="(commander, index) in commanders" :key="index" class="flex items-center gap-2">
          <img
            v-if="commander.imageUri"
            :src="commander.imageUri"
            :alt="commander.cardName"
            class="h-8 w-8 rounded-md object-cover"
          />
          <span class="text-sm font-medium text-white/80">{{ commander.cardName }}</span>
          <span v-if="index < commanders.length - 1" class="text-white/30">/</span>
        </div>
      </div>
    </div>

    <!-- Name input -->
    <ion-list :inset="true">
      <ion-item>
        <ion-input
          v-model="editableName"
          :label="t('players.playerName')"
          label-placement="stacked"
          :maxlength="PLAYER_NAME_MAX_LENGTH"
          :clear-input="true"
          :placeholder="t('players.playerName')"
          :class="{ 'ion-invalid ion-touched': nameErrorMessage }"
          @ion-input="nameErrorMessage = ''"
        />
      </ion-item>
    </ion-list>

    <!-- Error message -->
    <div v-if="nameErrorMessage" class="px-6 pb-2">
      <p class="text-xs text-life-negative">{{ nameErrorMessage }}</p>
    </div>

    <!-- Color picker -->
    <ion-list :inset="true">
      <ion-item>
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

    <!-- Actions -->
    <div class="flex gap-3 px-4 pb-4 pt-2">
      <ion-button
        expand="block"
        fill="outline"
        color="medium"
        class="flex-1"
        @click="dismiss(null, 'skip')"
      >
        {{ t('players.skipSave') }}
      </ion-button>
      <ion-button
        expand="block"
        color="primary"
        class="flex-[2]"
        @click="handleSave"
      >
        {{ t('players.save') }}
      </ion-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonList, IonItem, IonInput, IonLabel, IonButton } from '@ionic/vue'
import { usePlayerRegistryStore } from '@/stores/playerRegistryStore'
import { PLAYER_COLORS, PLAYER_NAME_MAX_LENGTH } from '@/config/gameConstants'
import type { PlayerColor } from '@/types/game'
interface AnonymousCommander {
  cardName: string
  imageUri?: string
}

const props = defineProps<{
  playerName: string
  playerColor: PlayerColor
  commanders: AnonymousCommander[]
  dismiss: (data?: unknown, role?: string) => void
}>()

const { t } = useI18n()
const registryStore = usePlayerRegistryStore()

const editableName = ref(props.playerName)
const selectedColor = ref<PlayerColor>(props.playerColor)
const nameErrorMessage = ref('')

const DEFAULT_NAME_PATTERN = /^(player|joueur)\s+\d+$/i

function isNameTaken(name: string): boolean {
  const normalized = name.toLowerCase()
  return registryStore.playerProfiles.some(
    (profile) => profile.name.toLowerCase() === normalized,
  )
}

function handleSave() {
  const trimmedName = editableName.value.trim()
  if (!trimmedName) return

  if (DEFAULT_NAME_PATTERN.test(trimmedName)) {
    nameErrorMessage.value = t('players.defaultNameError')
    return
  }

  if (isNameTaken(trimmedName)) {
    nameErrorMessage.value = t('players.duplicateNameError')
    return
  }

  props.dismiss({ name: trimmedName, color: selectedColor.value }, 'save')
}
</script>

<style scoped>
.save-content {
  position: relative;
}

.save-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
}

.save-title {
  font-family: var(--font-beleren);
  font-size: 18px;
  color: var(--color-arena-gold-light);
  letter-spacing: 0.5px;
  text-shadow: 0 0 16px rgba(212, 168, 67, 0.15);
}

.save-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  -webkit-tap-highlight-color: transparent;
}

.save-close-btn:active {
  background: rgba(255, 255, 255, 0.12);
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

.mana-dot-selected {
  border-color: var(--color-arena-gold-light);
  background: rgba(212, 168, 67, 0.1);
  box-shadow: 0 0 8px rgba(232, 96, 10, 0.5);
}

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

@media (max-width: 359px) {
  .color-picker-controls {
    grid-template-columns: repeat(3, 44px);
    justify-content: start;
    gap: 8px;
  }
}
</style>
