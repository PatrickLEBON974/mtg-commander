<template>
  <AppModal :is-open="isOpen" :title="player.name" content-class="ion-padding" @close="$emit('close')">
    <!-- Player name edit -->
    <ion-item data-animate>
      <ion-input
        :label="t('playerDetail.name')"
        :value="player.name"
        :maxlength="30"
        @ionChange="updateName($event.detail.value ?? '')"
      />
    </ion-item>

    <!-- Commanders section -->
    <div class="mt-4" data-animate>
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-text-primary">{{ t('playerDetail.commanders') }}</h3>
        <ion-button
          v-if="player.commanders.length < MAX_COMMANDERS_PER_PLAYER"
          size="small"
          fill="clear"
          @click="showCommanderPicker = true"
        >
          {{ t('playerDetail.addCommander') }}
        </ion-button>
      </div>

      <p v-if="player.commanders.length === 0" class="mt-1 text-xs text-text-secondary">
        {{ t('playerDetail.commanderHint') }}
      </p>

      <div
        v-for="(commander, commanderIndex) in player.commanders"
        :key="commanderIndex"
        class="mt-2 flex items-center gap-3 rounded-xl bg-surface-card p-3 card-lift"
      >
        <img
          v-if="commander.imageUri"
          :src="commander.imageUri"
          :alt="commander.cardName"
          class="h-10 w-10 rounded-lg object-cover shadow-card"
        />
        <div class="flex-1">
          <p class="text-sm font-medium text-text-primary">{{ commander.cardName }}</p>
          <p class="text-xs text-text-secondary">
            {{ t('playerDetail.castInfo', { count: commander.castCount, tax: gameStore.getCommanderTax(player, commanderIndex) }) }}
          </p>
        </div>
        <ion-button size="small" fill="clear" color="primary" @click="castCommanderAction(commanderIndex)">
          {{ t('playerDetail.cast') }}
        </ion-button>
        <ion-button size="small" fill="clear" color="danger" @click="removeCommander(commanderIndex)">
          <ion-icon :icon="closeOutline" />
        </ion-button>
      </div>
    </div>

    <!-- Counters section -->
    <div class="mt-6 space-y-3" data-animate>
      <h3 class="text-base font-semibold text-text-primary">{{ t('playerDetail.counters') }}</h3>

      <!-- Experience -->
      <div class="flex items-center justify-between rounded-xl bg-surface-card p-3">
        <span class="flex items-center gap-2 text-sm text-text-primary">
          <IconExperience :size="16" class="text-arena-blue" />
          {{ t('playerDetail.experience') }}
        </span>
        <div data-sound="none">
          <NumberStepper
            :model-value="player.experienceCounters"
            :min="0"
            @update:model-value="setExperience"
          />
        </div>
      </div>

      <!-- Energy -->
      <div class="flex items-center justify-between rounded-xl bg-surface-card p-3">
        <span class="flex items-center gap-2 text-sm text-text-primary">
          <IconEnergy :size="16" class="text-arena-gold" />
          {{ t('playerDetail.energy') }}
        </span>
        <div data-sound="none">
          <NumberStepper
            :model-value="player.energyCounters"
            :min="0"
            @update:model-value="setEnergy"
          />
        </div>
      </div>

      <!-- Monarch -->
      <div class="flex items-center justify-between rounded-xl bg-surface-card p-3">
        <span class="flex items-center gap-2 text-sm text-text-primary">
          <IconCrown :size="16" color="#f0d078" />
          {{ t('playerDetail.monarch') }}
        </span>
        <ion-toggle :checked="player.isMonarch" data-sound="none" @ionChange="toggleMonarch" />
      </div>

      <!-- Initiative -->
      <div class="flex items-center justify-between rounded-xl bg-surface-card p-3">
        <span class="flex items-center gap-2 text-sm text-text-primary">
          <IconShield :size="16" />
          {{ t('playerDetail.initiative') }}
        </span>
        <ion-toggle :checked="player.hasInitiative" data-sound="none" @ionChange="toggleInitiative" />
      </div>
    </div>

    <!-- Commander damage received breakdown -->
    <div v-if="Object.keys(player.commanderDamageReceived).length > 0" class="mt-6" data-animate>
      <h3 class="text-base font-semibold text-text-primary">{{ t('playerDetail.commanderDamageReceived') }}</h3>
      <div
        v-for="(damage, commanderId) in player.commanderDamageReceived"
        :key="commanderId"
        class="mt-2 flex items-center justify-between rounded-xl bg-surface-card p-3"
      >
        <span class="flex items-center gap-2 text-sm text-text-secondary">
          <IconSwordSingle :size="14" class="text-commander-damage" />
          {{ resolveCommanderName(String(commanderId)) }}
        </span>
        <span class="text-lg font-bold tabular-nums text-commander-damage">
          {{ damage }} / {{ gameStore.settings.commanderDamageThreshold }}
        </span>
      </div>
    </div>

    <!-- Commander picker sub-modal (lives inside ion-modal, outside ion-content) -->
    <template #after-content>
      <CommanderPicker
        :is-open="showCommanderPicker"
        @close="showCommanderPicker = false"
        @select="addCommander"
      />
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonButton,
  IonIcon,
  IonItem,
  IonInput,
  IonToggle,
} from '@ionic/vue'
import { closeOutline } from 'ionicons/icons'
import type { PlayerState } from '@/types/game'
import { useGameStore } from '@/stores/gameStore'
import { MAX_COMMANDERS_PER_PLAYER } from '@/config/gameConstants'
import AppModal from '@/components/ui/AppModal.vue'
import CommanderPicker from '@/components/commander-zone/CommanderPicker.vue'
import NumberStepper from '@/components/ui/NumberStepper.vue'
import IconExperience from '@/components/icons/game/IconExperience.vue'
import IconEnergy from '@/components/icons/game/IconEnergy.vue'
import IconCrown from '@/components/icons/game/IconCrown.vue'
import IconShield from '@/components/icons/game/IconShield.vue'
import IconSwordSingle from '@/components/icons/game/IconSwordSingle.vue'
import { playExperienceChange, playEnergyChange, playCommanderCast, playInitiative } from '@/services/sounds'

const props = defineProps<{
  isOpen: boolean
  player: PlayerState
}>()

defineEmits<{
  close: []
}>()

const { t } = useI18n()
const gameStore = useGameStore()
const showCommanderPicker = ref(false)

function updateName(newName: string) {
  if (!newName.trim()) return
  gameStore.updatePlayerName(props.player.id, newName.trim())
}

function addCommander(cardName: string, imageUri: string) {
  gameStore.addPlayerCommander(props.player.id, cardName, imageUri)
}

function removeCommander(commanderIndex: number) {
  gameStore.removePlayerCommander(props.player.id, commanderIndex)
}

function setExperience(newValue: number) {
  const delta = newValue - props.player.experienceCounters
  if (delta !== 0) {
    gameStore.changeExperience(props.player.id, delta)
    playExperienceChange()
  }
}

function setEnergy(newValue: number) {
  const delta = newValue - props.player.energyCounters
  if (delta !== 0) {
    gameStore.changeEnergy(props.player.id, delta)
    playEnergyChange()
  }
}

function castCommanderAction(commanderIndex: number) {
  gameStore.castCommander(props.player.id, commanderIndex)
  playCommanderCast()
}

function toggleMonarch() {
  gameStore.toggleMonarch(props.player.id)
}

function toggleInitiative() {
  gameStore.toggleInitiative(props.player.id)
  playInitiative()
}

function resolveCommanderName(commanderId: string): string {
  if (!gameStore.currentGame) return commanderId
  for (const player of gameStore.currentGame.players) {
    for (const commander of player.commanders) {
      if (commander.id === commanderId) {
        return commander.cardName
      }
    }
  }
  return commanderId
}
</script>
