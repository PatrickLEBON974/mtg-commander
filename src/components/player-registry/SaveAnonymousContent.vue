<template>
  <div class="save-content ion-padding">
    <div class="save-decor" aria-hidden="true">
      <CornerAccent position="top-left" />
      <CornerAccent position="top-right" />
      <div class="save-top-accent" />
    </div>

    <!-- Header -->
    <div class="save-header">
      <h2 class="save-title">{{ t('players.saveAnonymous') }}</h2>
      <button class="save-close-btn" :aria-label="t('common.close')" @click="dismiss(null, 'skip')">
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
        <ion-label>{{ t('players.preferredColor') }}</ion-label>
        <div slot="end" class="flex gap-2">
          <button
            v-for="color in PLAYER_COLORS"
            :key="color"
            class="mana-dot-button"
            :class="{ 'mana-dot-selected': selectedColor === color }"
            :style="{ background: `var(--color-mana-${color})` }"
            @click="selectedColor = color"
          />
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
import type { ManaColor } from '@/types/game'
import CornerAccent from '@/components/icons/decorative/CornerAccent.vue'

interface AnonymousCommander {
  cardName: string
  imageUri?: string
}

const props = defineProps<{
  playerName: string
  playerColor: ManaColor
  commanders: AnonymousCommander[]
  dismiss: (data?: unknown, role?: string) => void
}>()

const { t } = useI18n()
const registryStore = usePlayerRegistryStore()

const editableName = ref(props.playerName)
const selectedColor = ref<ManaColor>(props.playerColor)
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

.save-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  overflow: hidden;
  border-radius: inherit;
}

.save-top-accent {
  position: absolute;
  top: 0;
  left: 10%;
  right: 10%;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, rgba(212, 168, 67, 0.15) 20%, rgba(212, 168, 67, 0.4) 50%, rgba(212, 168, 67, 0.15) 80%, transparent 100%);
  box-shadow: 0 0 12px rgba(212, 168, 67, 0.15);
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
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  -webkit-tap-highlight-color: transparent;
}

.save-close-btn:active {
  background: rgba(255, 255, 255, 0.12);
}

.mana-dot-button {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color 150ms ease, transform 150ms ease;
  -webkit-tap-highlight-color: transparent;
}

.mana-dot-selected {
  border-color: var(--ion-color-primary);
  box-shadow: 0 0 8px rgba(232, 96, 10, 0.5);
  transform: scale(1.15);
}
</style>
