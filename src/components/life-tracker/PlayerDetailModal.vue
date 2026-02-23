<template>
  <ion-modal :is-open="isOpen" @didDismiss="$emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ player.name }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')">{{ t('common.close') }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Player name edit -->
      <ion-item>
        <ion-input
          :label="t('playerDetail.name')"
          :value="player.name"
          :maxlength="30"
          @ionChange="updateName($event.detail.value ?? '')"
        />
      </ion-item>

      <!-- Commanders section -->
      <div class="mt-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-text-primary">{{ t('playerDetail.commanders') }}</h3>
          <ion-button
            v-if="player.commanders.length < 2"
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
          class="mt-2 flex items-center gap-3 rounded-xl bg-surface-card p-3"
        >
          <img
            v-if="commander.imageUri"
            :src="commander.imageUri"
            :alt="commander.cardName"
            class="h-10 w-10 rounded-lg object-cover"
          />
          <div class="flex-1">
            <p class="text-sm font-medium text-text-primary">{{ commander.cardName }}</p>
            <p class="text-xs text-text-secondary">
              {{ t('playerDetail.castInfo', { count: commander.castCount, tax: gameStore.getCommanderTax(player, commanderIndex) }) }}
            </p>
          </div>
          <ion-button size="small" fill="clear" color="medium" @click="castCommanderAction(commanderIndex)">
            {{ t('playerDetail.cast') }}
          </ion-button>
          <ion-button size="small" fill="clear" color="danger" @click="removeCommander(commanderIndex)">
            X
          </ion-button>
        </div>
      </div>

      <!-- Counters section -->
      <div class="mt-6 space-y-3">
        <h3 class="text-base font-semibold text-text-primary">{{ t('playerDetail.counters') }}</h3>

        <!-- Experience -->
        <div class="flex items-center justify-between rounded-xl bg-surface-card p-3">
          <span class="text-sm text-text-primary">{{ t('playerDetail.experience') }}</span>
          <div class="flex items-center gap-3">
            <button class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg active:bg-white/20" @click="gameStore.changeExperience(player.id, -1)">-</button>
            <span class="min-w-[2rem] text-center text-lg font-bold tabular-nums text-text-primary">{{ player.experienceCounters }}</span>
            <button class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg active:bg-white/20" @click="gameStore.changeExperience(player.id, 1)">+</button>
          </div>
        </div>

        <!-- Energy -->
        <div class="flex items-center justify-between rounded-xl bg-surface-card p-3">
          <span class="text-sm text-text-primary">{{ t('playerDetail.energy') }}</span>
          <div class="flex items-center gap-3">
            <button class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg active:bg-white/20" @click="gameStore.changeEnergy(player.id, -1)">-</button>
            <span class="min-w-[2rem] text-center text-lg font-bold tabular-nums text-text-primary">{{ player.energyCounters }}</span>
            <button class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg active:bg-white/20" @click="gameStore.changeEnergy(player.id, 1)">+</button>
          </div>
        </div>

        <!-- Monarch -->
        <div class="flex items-center justify-between rounded-xl bg-surface-card p-3">
          <span class="text-sm text-text-primary">{{ t('playerDetail.monarch') }}</span>
          <ion-toggle :checked="player.isMonarch" @ionChange="toggleMonarch" />
        </div>

        <!-- Initiative -->
        <div class="flex items-center justify-between rounded-xl bg-surface-card p-3">
          <span class="text-sm text-text-primary">{{ t('playerDetail.initiative') }}</span>
          <ion-toggle :checked="player.hasInitiative" @ionChange="toggleInitiative" />
        </div>
      </div>

      <!-- Commander damage received breakdown -->
      <div v-if="Object.keys(player.commanderDamageReceived).length > 0" class="mt-6">
        <h3 class="text-base font-semibold text-text-primary">{{ t('playerDetail.commanderDamageReceived') }}</h3>
        <div
          v-for="(damage, cmdId) in player.commanderDamageReceived"
          :key="cmdId"
          class="mt-2 flex items-center justify-between rounded-xl bg-surface-card p-3"
        >
          <span class="text-sm text-text-secondary">{{ resolveCommanderName(String(cmdId)) }}</span>
          <span class="text-lg font-bold tabular-nums text-commander-damage">
            {{ damage }} / {{ gameStore.settings.commanderDamageThreshold }}
          </span>
        </div>
      </div>
    </ion-content>

    <!-- Commander picker sub-modal -->
    <CommanderPicker
      :is-open="showCommanderPicker"
      @close="showCommanderPicker = false"
      @select="addCommander"
    />
  </ion-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonItem,
  IonInput,
  IonToggle,
} from '@ionic/vue'
import type { PlayerState } from '@/types/game'
import { useGameStore } from '@/stores/gameStore'
import CommanderPicker from '@/components/commander-zone/CommanderPicker.vue'

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
  if (!newName.trim() || !gameStore.currentGame) return
  const player = gameStore.currentGame.players.find(p => p.id === props.player.id)
  if (player) player.name = newName.trim()
}

function addCommander(cardName: string, imageUri: string) {
  if (!gameStore.currentGame) return
  const player = gameStore.currentGame.players.find(p => p.id === props.player.id)
  if (player) player.commanders.push({ id: crypto.randomUUID(), cardName, imageUri, castCount: 0 })
}

function removeCommander(commanderIndex: number) {
  if (!gameStore.currentGame) return
  const player = gameStore.currentGame.players.find(p => p.id === props.player.id)
  if (player) player.commanders.splice(commanderIndex, 1)
}

function castCommanderAction(commanderIndex: number) {
  gameStore.castCommander(props.player.id, commanderIndex)
}

function toggleMonarch() {
  gameStore.toggleMonarch(props.player.id)
}

function toggleInitiative() {
  gameStore.toggleInitiative(props.player.id)
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
