<template>
  <ion-modal :is-open="isOpen" @didDismiss="$emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('commanderDamage.title') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')">{{ t('common.close') }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Step 1: Choose attacker -->
      <div v-if="!selectedAttacker">
        <h3 class="mb-3 text-lg font-semibold text-text-primary">{{ t('commanderDamage.whoAttacks') }}</h3>
        <div class="flex flex-col gap-2">
          <button
            v-for="attackerPlayer in otherPlayers"
            :key="attackerPlayer.id"
            class="flex items-center gap-3 rounded-xl bg-surface-card p-3 text-left active:bg-white/10"
            @click="selectAttacker(attackerPlayer)"
          >
            <span class="text-base font-medium text-text-primary">{{ attackerPlayer.name }}</span>
            <span v-if="attackerPlayer.commanders.length > 0" class="text-xs text-text-secondary">
              ({{ attackerPlayer.commanders.map(c => c.cardName).join(', ') }})
            </span>
          </button>
        </div>
      </div>

      <!-- Step 2: Choose which commander (if attacker has multiple) -->
      <div v-else-if="selectedAttacker.commanders.length > 1 && !selectedCommanderIndex">
        <h3 class="mb-3 text-lg font-semibold text-text-primary">{{ t('commanderDamage.whichCommander') }}</h3>
        <div class="flex flex-col gap-2">
          <button
            v-for="(commander, commanderIndex) in selectedAttacker.commanders"
            :key="commanderIndex"
            class="rounded-xl bg-surface-card p-3 text-left active:bg-white/10"
            @click="selectedCommanderIndex = commanderIndex"
          >
            <span class="text-base text-text-primary">{{ commander.cardName }}</span>
          </button>
        </div>
        <ion-button fill="clear" class="mt-4" @click="selectedAttacker = null">
          {{ t('common.back') }}
        </ion-button>
      </div>

      <!-- Step 3: Choose amount -->
      <div v-else>
        <div class="mb-4 text-center">
          <p class="text-sm text-text-secondary">
            {{ selectedAttacker.name }}
            <span v-if="activeCommanderName"> ({{ activeCommanderName }})</span>
            {{ t('commanderDamage.dealsTo', { target: targetPlayer.name }) }}
          </p>
          <p class="text-xs text-text-secondary">
            {{ t('commanderDamage.currentDamage', { current: currentDamageFromAttacker, threshold: gameStore.settings.commanderDamageThreshold }) }}
          </p>
        </div>

        <div class="flex items-center justify-center gap-6">
          <button
            class="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-2xl font-bold text-life-negative active:bg-white/20"
            @click="adjustAmount(-1)"
          >
            -
          </button>

          <span class="min-w-[4rem] text-center text-5xl font-bold tabular-nums text-commander-damage">
            {{ damageAmount }}
          </span>

          <button
            class="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-2xl font-bold text-life-positive active:bg-white/20"
            @click="adjustAmount(1)"
          >
            +
          </button>
        </div>

        <!-- Quick amounts -->
        <div class="mt-4 flex justify-center gap-2">
          <button
            v-for="quickAmount in [1, 2, 3, 5, 10]"
            :key="quickAmount"
            class="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-text-secondary active:bg-white/10"
            @click="damageAmount = quickAmount"
          >
            {{ quickAmount }}
          </button>
        </div>

        <div class="mt-6 flex gap-3">
          <ion-button fill="clear" expand="block" class="flex-1" @click="resetSelection">
            {{ t('common.back') }}
          </ion-button>
          <ion-button
            expand="block"
            color="warning"
            class="flex-1"
            :disabled="damageAmount <= 0"
            @click="confirmDamage"
          >
            {{ t('commanderDamage.deal', { amount: damageAmount }) }}
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
} from '@ionic/vue'
import type { PlayerState } from '@/types/game'
import { useGameStore } from '@/stores/gameStore'

const props = defineProps<{
  isOpen: boolean
  targetPlayer: PlayerState
  initialAttackerId?: string | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const gameStore = useGameStore()

const selectedAttacker = ref<PlayerState | null>(null)
const selectedCommanderIndex = ref<number | null>(null)
const damageAmount = ref(1)

// Auto-select attacker when opened via drag-drop
watch(() => props.isOpen, (open) => {
  if (open && props.initialAttackerId) {
    const attacker = otherPlayers.value.find((p) => p.id === props.initialAttackerId)
    if (attacker) {
      selectAttacker(attacker)
    }
  }
  if (!open) {
    resetSelection()
  }
})

const otherPlayers = computed(() =>
  gameStore.currentGame?.players.filter(
    (p) => p.id !== props.targetPlayer.id,
  ) ?? [],
)

const activeCommanderName = computed(() => {
  if (!selectedAttacker.value) return null
  const commanderIndex = selectedCommanderIndex.value ?? 0
  return selectedAttacker.value.commanders[commanderIndex]?.cardName ?? null
})

const commanderId = computed(() => {
  if (!selectedAttacker.value) return ''
  const commander = selectedAttacker.value.commanders[selectedCommanderIndex.value ?? 0]
  return commander ? commander.id : selectedAttacker.value.id
})

const currentDamageFromAttacker = computed(() =>
  props.targetPlayer.commanderDamageReceived[commanderId.value] ?? 0,
)

function selectAttacker(player: PlayerState) {
  selectedAttacker.value = player
  if (player.commanders.length <= 1) {
    selectedCommanderIndex.value = 0
  }
}

function adjustAmount(delta: number) {
  damageAmount.value = Math.max(0, damageAmount.value + delta)
}

function confirmDamage() {
  if (damageAmount.value <= 0) return
  gameStore.dealCommanderDamage(props.targetPlayer.id, commanderId.value, damageAmount.value)
  resetSelection()
  emit('close')
}

function resetSelection() {
  selectedAttacker.value = null
  selectedCommanderIndex.value = null
  damageAmount.value = 1
}
</script>
