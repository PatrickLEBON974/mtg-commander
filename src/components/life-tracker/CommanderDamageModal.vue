<template>
  <AppModal
    :is-open="isOpen"
    :show-header="false"
    class="cmdr-dialog"
    @close="$emit('close')"
  >
    <div class="cmdr-content">
      <!-- Custom header -->
      <div class="cmdr-header">
        <h2 class="cmdr-title">{{ t('commanderDamage.title') }}</h2>
        <button class="cmdr-close-btn" :aria-label="t('common.close')" @click="$emit('close')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      <p class="mb-3 text-center text-xs text-white/40">{{ targetPlayer.name }}</p>

      <!-- Attacker rows — all opponents when tapped, filtered to one when dragged -->
      <div class="cmdr-rows">
        <div
          v-for="(row, rowIndex) in visibleRows"
          :key="row.commanderId"
          class="cmdr-row"
          :data-animate="rowIndex"
        >
          <!-- Attacker identity + stepper -->
          <div class="flex items-center gap-2.5">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              :style="{ background: `color-mix(in srgb, var(--color-mana-${row.attackerColor}) 25%, transparent)` }"
            >
              <img
                v-if="row.commanderImage"
                :src="row.commanderImage"
                :alt="row.commanderName ?? row.attackerName"
                class="h-7 w-7 rounded-full object-cover"
              />
              <IconSwordSingle v-else :size="16" class="text-commander-damage" />
            </div>

            <div class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold text-white/90">
                {{ row.attackerName }}
              </span>
              <span v-if="row.commanderName" class="block truncate text-[10px] text-white/50">
                {{ row.commanderName }}
              </span>
            </div>

            <!-- Inline stepper -->
            <button
              class="cmdr-stepper-btn"
              :disabled="row.damage <= 0"
              :aria-label="t('commanderDamage.removeDamage')"
              data-sound="none"
              @click="changeDamage(row, -1)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
              </svg>
            </button>
            <span
              class="cmdr-damage-value tabular-nums"
              :class="row.damage > 0 ? 'text-commander-damage' : 'text-white/30'"
            >
              {{ row.damage }}
            </span>
            <button
              class="cmdr-stepper-btn cmdr-stepper-plus"
              :aria-label="t('commanderDamage.deal', { amount: 1 })"
              data-sound="none"
              @click="changeDamage(row, 1)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
              </svg>
            </button>

            <!-- Fraction -->
            <span
              class="shrink-0 text-xs font-bold tabular-nums"
              :class="row.progressRatio >= 1 ? 'text-life-negative' : 'text-white/50'"
            >
              {{ row.damage }}/{{ commanderDamageThreshold }}
            </span>
          </div>

          <!-- Progress bar -->
          <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              class="cmdr-progress h-full rounded-full transition-all duration-200"
              :class="row.progressRatio >= 1 ? 'cmdr-progress-lethal' : 'cmdr-progress-normal'"
              :style="{ width: `${Math.min(row.progressRatio * 100, 100)}%` }"
            />
          </div>
        </div>
      </div>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PlayerState } from '@/types/game'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import AppModal from '@/components/ui/AppModal.vue'
import IconSwordSingle from '@/components/icons/game/IconSwordSingle.vue'
import { playCommanderDamage } from '@/services/sounds'
import { tapFeedback } from '@/services/haptics'

interface AttackerRow {
  attackerPlayerId: string
  attackerName: string
  attackerColor: string
  commanderId: string
  commanderName: string | null
  commanderImage: string | null
  damage: number
  progressRatio: number
}

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
const settingsStore = useSettingsStore()

const commanderDamageThreshold = computed(() => gameStore.settings.commanderDamageThreshold)

const otherPlayers = computed(() =>
  gameStore.currentGame?.players.filter(
    (p) => p.id !== props.targetPlayer.id,
  ) ?? [],
)

/**
 * Build a flat list of attacker rows. Each commander gets its own row.
 * Players with no commanders get a single row keyed by player ID.
 */
const allAttackerRows = computed<AttackerRow[]>(() => {
  const threshold = commanderDamageThreshold.value
  const rows: AttackerRow[] = []

  for (const player of otherPlayers.value) {
    if (player.commanders.length === 0) {
      const damage = props.targetPlayer.commanderDamageReceived[player.id] ?? 0
      rows.push({
        attackerPlayerId: player.id,
        attackerName: player.name,
        attackerColor: player.color,
        commanderId: player.id,
        commanderName: null,
        commanderImage: null,
        damage,
        progressRatio: threshold > 0 ? damage / threshold : 0,
      })
    } else {
      for (const commander of player.commanders) {
        const damage = props.targetPlayer.commanderDamageReceived[commander.id] ?? 0
        rows.push({
          attackerPlayerId: player.id,
          attackerName: player.name,
          attackerColor: player.color,
          commanderId: commander.id,
          commanderName: commander.cardName,
          commanderImage: commander.imageUri ?? null,
          damage,
          progressRatio: threshold > 0 ? damage / threshold : 0,
        })
      }
    }
  }

  return rows
})

/**
 * When opened via drag-drop (initialAttackerId set), only show
 * the attacker player's commanders. On tap, show everyone.
 */
const visibleRows = computed(() => {
  if (props.initialAttackerId) {
    return allAttackerRows.value.filter(
      (row) => row.attackerPlayerId === props.initialAttackerId,
    )
  }
  return allAttackerRows.value
})

function changeDamage(row: AttackerRow, amount: number) {
  if (amount < 0 && row.damage <= 0) return
  gameStore.dealCommanderDamage(props.targetPlayer.id, row.commanderId, amount)
  playCommanderDamage()
  if (settingsStore.hapticFeedback) tapFeedback()
}

</script>

<style scoped>
/* Centered dialog — bypasses ion-content (auto-height incompatible) */
.cmdr-dialog {
  --width: 92%;
  --max-width: 360px;
  --height: auto;
  --max-height: 80vh;
  --border-radius: 16px;
}

.cmdr-content {
  padding: 16px;
  max-height: 70vh;
  overflow-y: auto;
}

.cmdr-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.cmdr-title {
  font-family: var(--font-beleren);
  font-size: 18px;
  color: var(--color-arena-gold-light);
  letter-spacing: 0.5px;
  text-shadow: 0 0 16px rgba(212, 168, 67, 0.15);
}

.cmdr-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  transition: background 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.cmdr-close-btn:active {
  background: rgba(255, 255, 255, 0.12);
}

.cmdr-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cmdr-row {
  padding: 10px 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: var(--shadow-inset-panel);
}

.cmdr-stepper-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
  box-shadow: var(--shadow-btn-beveled);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  -webkit-tap-highlight-color: transparent;
}

.cmdr-stepper-btn:active {
  transform: scale(0.85) translateY(1px);
  box-shadow: var(--shadow-btn-pressed);
}

.cmdr-stepper-btn:disabled {
  opacity: 0.3;
  pointer-events: none;
}

.cmdr-stepper-plus {
  color: var(--color-commander-damage);
  background: rgba(245, 158, 11, 0.12);
}

.cmdr-damage-value {
  min-width: 24px;
  text-align: center;
  font-size: 18px;
  font-weight: 800;
  font-family: var(--font-beleren);
}

.cmdr-progress-normal {
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.6), rgba(245, 158, 11, 0.9));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.cmdr-progress-lethal {
  background: linear-gradient(90deg, rgba(239, 68, 68, 0.7), rgba(239, 68, 68, 1));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 0 8px rgba(239, 68, 68, 0.4);
}
</style>
