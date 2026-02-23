<template>
  <AppModal :is-open="isOpen" :title="t('commanderDamage.title')" content-class="ion-padding" @close="$emit('close')">
    <!-- Step 1: Choose attacker -->
    <div v-if="!selectedAttacker" class="flex flex-col gap-3 px-1" data-animate>
      <p class="text-center text-sm text-text-secondary">{{ t('commanderDamage.whoAttacks') }}</p>
      <button
        v-for="attackerPlayer in otherPlayers"
        :key="attackerPlayer.id"
        class="attacker-card flex items-center gap-4 rounded-2xl p-4 active:scale-[0.97]"
        :style="{ '--card-mana': `var(--color-mana-${attackerPlayer.color})` }"
        @click="selectAttacker(attackerPlayer)"
      >
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style="background: rgba(245, 158, 11, 0.2)">
          <IconSwordSingle :size="22" class="text-commander-damage" />
        </div>
        <div class="min-w-0 flex-1 text-left">
          <span class="block truncate text-base font-bold text-white">{{ attackerPlayer.name }}</span>
          <span v-if="attackerPlayer.commanders.length > 0" class="block truncate text-xs text-white/50">
            {{ attackerPlayer.commanders.map(c => c.cardName).join(' / ') }}
          </span>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="shrink-0 text-white/30">
          <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <!-- Step 2: Choose which commander (if attacker has multiple) -->
    <div v-else-if="selectedAttacker.commanders.length > 1 && selectedCommanderIndex === null" class="flex flex-col gap-3 px-1" data-animate>
      <p class="text-center text-sm text-text-secondary">{{ t('commanderDamage.whichCommander') }}</p>
      <button
        v-for="(commander, commanderIndex) in selectedAttacker.commanders"
        :key="commanderIndex"
        class="attacker-card flex items-center gap-4 rounded-2xl p-4 active:scale-[0.97]"
        :style="{ '--card-mana': `var(--color-mana-${selectedAttacker.color})` }"
        @click="selectedCommanderIndex = commanderIndex"
      >
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style="background: rgba(245, 158, 11, 0.2)">
          <IconSwordSingle :size="22" class="text-commander-damage" />
        </div>
        <span class="min-w-0 flex-1 truncate text-left text-base font-bold text-white">{{ commander.cardName }}</span>
      </button>
      <button class="mt-2 self-center rounded-lg px-4 py-2 text-sm text-text-secondary active:bg-white/5" @click="selectedAttacker = null">
        {{ t('common.back') }}
      </button>
    </div>

    <!-- Step 3: Choose amount -->
    <div v-else class="flex flex-col items-center gap-5 px-1" data-animate>
      <!-- Context header -->
      <div class="w-full rounded-xl bg-white/5 px-4 py-3 text-center">
        <p class="text-sm font-medium text-white/90">
          {{ selectedAttacker.name }}
          <span v-if="activeCommanderName" class="text-white/50"> — {{ activeCommanderName }}</span>
        </p>
        <p class="mt-1 text-xs text-text-secondary">
          {{ t('commanderDamage.dealsTo', { target: targetPlayer.name }) }}
        </p>
        <!-- Damage progress -->
        <div class="mt-3 flex items-center gap-3">
          <div class="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="damageProgressRatio >= 1 ? 'bg-life-negative' : 'bg-commander-damage'"
              :style="{ width: `${Math.min(damageProgressRatio * 100, 100)}%` }"
            />
          </div>
          <span class="shrink-0 text-xs font-bold tabular-nums" :class="damageProgressRatio >= 1 ? 'text-life-negative' : 'text-commander-damage'">
            {{ currentDamageFromAttacker + damageAmount }} / {{ gameStore.settings.commanderDamageThreshold }}
          </span>
        </div>
      </div>

      <!-- Damage stepper -->
      <NumberStepper
        v-model="damageAmount"
        :min="0"
        size="lg"
        value-class="text-commander-damage"
        decrement-class="text-life-negative"
        increment-class="text-life-positive"
      />

      <!-- Quick amounts -->
      <div class="flex gap-2">
        <button
          v-for="quickAmount in QUICK_COMMANDER_DAMAGE_OPTIONS"
          :key="quickAmount"
          class="flex h-12 w-12 items-center justify-center rounded-xl text-base font-bold tabular-nums transition-colors"
          :class="damageAmount === quickAmount
            ? 'bg-commander-damage/30 text-commander-damage ring-1 ring-commander-damage/40'
            : 'bg-white/5 text-white/60 active:bg-white/10'"
          @click="damageAmount = quickAmount"
        >
          {{ quickAmount }}
        </button>
      </div>

      <!-- Actions -->
      <div class="flex w-full gap-3 pt-1">
        <button
          class="flex-1 rounded-xl bg-white/5 py-3.5 text-center text-sm font-medium text-text-secondary active:bg-white/10"
          @click="resetSelection"
        >
          {{ t('common.back') }}
        </button>
        <button
          class="flex-[2] rounded-xl py-3.5 text-center text-base font-bold text-white transition-opacity active:scale-[0.97]"
          :class="damageAmount > 0 ? 'bg-commander-damage' : 'bg-commander-damage/30 opacity-50'"
          :disabled="damageAmount <= 0"
          @click="confirmDamage"
        >
          {{ t('commanderDamage.deal', { amount: damageAmount }) }}
        </button>
      </div>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PlayerState } from '@/types/game'
import { useGameStore } from '@/stores/gameStore'
import { QUICK_COMMANDER_DAMAGE_OPTIONS } from '@/config/gameConstants'
import AppModal from '@/components/ui/AppModal.vue'
import NumberStepper from '@/components/ui/NumberStepper.vue'
import IconSwordSingle from '@/components/icons/game/IconSwordSingle.vue'

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

const damageProgressRatio = computed(() => {
  const threshold = gameStore.settings.commanderDamageThreshold
  if (threshold <= 0) return 0
  return (currentDamageFromAttacker.value + damageAmount.value) / threshold
})

function selectAttacker(player: PlayerState) {
  selectedAttacker.value = player
  if (player.commanders.length <= 1) {
    selectedCommanderIndex.value = 0
  }
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

<style scoped>
.attacker-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 0 20px color-mix(in srgb, var(--card-mana) 8%, transparent);
  transition: transform 0.15s ease, background 0.15s ease;
}
</style>
