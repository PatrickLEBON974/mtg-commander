<template>
  <Teleport to="body">
    <Transition :css="false" @enter="onEnter" @leave="onLeave">
      <div v-if="isOpen" class="sheet-overlay" @click.self="handleClose">
        <GameFrame
          ref="frameComp"
          :title="t('commanderDamage.title')"
          :subtitle="sourcePlayer.name"
          show-close
          class="cmdr-frame"
          :style="popupRotationStyle"
          @close="handleClose"
        >
          <!-- Attacker rows -->
          <div class="cmdr-rows">
            <div
              v-for="row in visibleRows"
              :key="`${row.targetPlayerId}-${row.commanderId}`"
              class="cmdr-row"
            >
              <div class="flex items-center gap-2.5">
                <div
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  :style="{ background: `color-mix(in srgb, var(--color-mana-${row.targetPlayerColor}) 25%, transparent)` }"
                >
                  <img
                    v-if="row.commanderImage"
                    :src="row.commanderImage"
                    :alt="row.commanderName ?? row.targetPlayerName"
                    class="h-7 w-7 rounded-full object-cover"
                  />
                  <IconSwordSingle v-else :size="16" class="text-commander-damage" />
                </div>

                <div class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold text-white/90">
                    {{ row.targetPlayerName }}
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
        </GameFrame>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PlayerState } from '@/types/game'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useSheetAnimation } from '@/composables/useSheetAnimation'
import GameFrame from '@/components/GameFrame.vue'
import IconSwordSingle from '@/components/icons/game/IconSwordSingle.vue'
import { playCommanderDamage } from '@/services/sounds'
import { tapFeedback } from '@/services/haptics'

interface DamageRow {
  targetPlayerId: string
  targetPlayerName: string
  targetPlayerColor: string
  commanderId: string
  commanderName: string | null
  commanderImage: string | null
  damage: number
  progressRatio: number
}

const props = defineProps<{
  isOpen: boolean
  sourcePlayer: PlayerState
  initialTargetId?: string | null
  contentRotation?: number
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const gameStore = useGameStore()
const settingsStore = useSettingsStore()

const frameComp = ref<InstanceType<typeof GameFrame>>()

const { popupRotationStyle, onEnter, onLeave } = useSheetAnimation({
  rotation: () => props.contentRotation ?? 0,
  getFrameElement: () => frameComp.value?.el,
  sidewaysConstraints: { maxWidth: 'calc(100vh - 80px)', maxHeight: 'calc(100vw - 32px)' },
})

function handleClose() {
  emit('close')
}

// --- Commander damage logic ---

const commanderDamageThreshold = computed(() => settingsStore.gameSettings.commanderDamageThreshold)

const targetPlayers = computed(() =>
  gameStore.currentGame?.players.filter(
    (playerState) => playerState.id !== props.sourcePlayer.id,
  ) ?? [],
)

/** Source player's commander IDs (or player ID as fallback if no commanders registered) */
const sourceCommanderEntries = computed(() => {
  const source = props.sourcePlayer
  if (source.commanders.length === 0) {
    return [{ id: source.id, cardName: null as string | null, imageUri: undefined as string | undefined }]
  }
  return source.commanders
})

function buildTargetRows(targetPlayer: PlayerState, displayName: string, threshold: number): DamageRow[] {
  const rows: DamageRow[] = []

  for (const commander of sourceCommanderEntries.value) {
    const damage = targetPlayer.commanderDamageReceived[commander.id] ?? 0
    rows.push({
      targetPlayerId: targetPlayer.id,
      targetPlayerName: displayName,
      targetPlayerColor: targetPlayer.color,
      commanderId: commander.id,
      commanderName: sourceCommanderEntries.value.length > 1 ? commander.cardName : null,
      commanderImage: sourceCommanderEntries.value.length > 1 ? (commander.imageUri ?? null) : null,
      damage,
      progressRatio: threshold > 0 ? damage / threshold : 0,
    })
  }

  return rows
}

const allDamageRows = computed<DamageRow[]>(() => {
  const threshold = commanderDamageThreshold.value
  const rows: DamageRow[] = []

  for (const player of targetPlayers.value) {
    rows.push(...buildTargetRows(player, player.name, threshold))
  }

  const selfLabel = `${props.sourcePlayer.name} ${t('commanderDamage.yourself')}`
  rows.push(...buildTargetRows(props.sourcePlayer, selfLabel, threshold))

  return rows
})

const visibleRows = computed(() => {
  if (props.initialTargetId) {
    return allDamageRows.value.filter(
      (row) => row.targetPlayerId === props.initialTargetId,
    )
  }
  return allDamageRows.value
})

function changeDamage(row: DamageRow, amount: number) {
  if (amount < 0 && row.damage <= 0) return
  gameStore.dealCommanderDamage(row.targetPlayerId, row.commanderId, amount)
  playCommanderDamage()
  if (settingsStore.hapticFeedback) tapFeedback()
}
</script>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
}

.cmdr-frame {
  min-width: 280px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 80px);
  overflow-y: auto;
}

/* Rows */
.cmdr-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
