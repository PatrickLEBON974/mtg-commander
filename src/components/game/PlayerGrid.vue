<template>
  <!-- Player grid (default) -->
  <div
    v-if="displayMode === 'grid'"
    class="grid min-h-0 flex-1 gap-2 p-2"
    :style="gridStyle"
  >
    <div
      v-for="(player, index) in players"
      :key="player.id"
      class="relative min-h-0 min-w-0 overflow-hidden"
      :class="cardOuterClasses(index)"
      :style="cardOuterStyle(index)"
    >
      <LifeTracker
        class="h-full"
        :inert="isPlayerReadOnly(player.id)"
        :aria-disabled="isPlayerReadOnly(player.id)"
        :player="player"
        :is-current-turn="player.id === currentTurnPlayerId"
        :is-flashing="flashingPlayerIds.includes(player.id)"
        :commander-damage-target-id="commanderDamageTargetIdFor(player.id)"
        @state-changed="emit('player-state-changed')"
        @turn-advanced="emit('turn-advanced')"
        @commander-drag-drop="(targetId: string) => emit('commander-drag-drop', player.id, targetId)"
      />
      <div
        v-if="isPlayerReadOnly(player.id)"
        class="player-readonly-badge"
        aria-hidden="true"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        {{ readOnlyLabel }}
      </div>
    </div>
  </div>

  <!-- Turn-order list view -->
  <TransitionGroup
    v-else
    name="turn-order"
    tag="div"
    class="flex min-h-0 flex-1 flex-col gap-2 p-2"
  >
    <div
      v-for="player in turnOrderPlayers"
      :key="player.id"
      class="relative min-h-0 flex-1 overflow-hidden rounded-2xl"
    >
      <LifeTracker
        class="h-full"
        :inert="isPlayerReadOnly(player.id)"
        :aria-disabled="isPlayerReadOnly(player.id)"
        :player="player"
        :is-current-turn="player.id === currentTurnPlayerId"
        :is-flashing="flashingPlayerIds.includes(player.id)"
        :commander-damage-target-id="commanderDamageTargetIdFor(player.id)"
        @state-changed="emit('player-state-changed')"
        @turn-advanced="emit('turn-advanced')"
        @commander-drag-drop="(targetId: string) => emit('commander-drag-drop', player.id, targetId)"
      />
      <div
        v-if="isPlayerReadOnly(player.id)"
        class="player-readonly-badge"
        aria-hidden="true"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        {{ readOnlyLabel }}
      </div>
    </div>
  </TransitionGroup>
</template>

<script setup lang="ts">
import LifeTracker from '@/components/life-tracker/LifeTracker.vue'
import { usePlayerGridLayout } from '@/composables/usePlayerGridLayout'
import type { PlayerState } from '@/types/game'
import type { GameDisplayMode } from '@/types/injectionKeys'

interface CommanderDragState {
  targetPlayerId: string
  attackerPlayerId: string
}

const props = defineProps<{
  displayMode: GameDisplayMode
  players: PlayerState[]
  turnOrderPlayers: PlayerState[]
  currentTurnPlayerId: string | null | undefined
  flashingPlayerIds: string[]
  commanderDragState: CommanderDragState | null
  editablePlayerIds?: string[] | null
  readOnlyLabel?: string
}>()

const emit = defineEmits<{
  'player-state-changed': []
  'turn-advanced': []
  'commander-drag-drop': [attackerPlayerId: string, targetPlayerId: string]
}>()

// Stateless layout maths — used here for grid styling only. GameView keeps its
// own instance for the floating turn button's rotation/direction.
const { gridStyle, cardOuterClasses, cardOuterStyle } = usePlayerGridLayout()

function commanderDamageTargetIdFor(playerId: string): string | null {
  const dragState = props.commanderDragState
  return dragState?.attackerPlayerId === playerId ? dragState.targetPlayerId : null
}

function isPlayerReadOnly(playerId: string): boolean {
  return Array.isArray(props.editablePlayerIds) && !props.editablePlayerIds.includes(playerId)
}
</script>

<style scoped>
.player-readonly-badge {
  position: absolute;
  z-index: 12;
  top: 8px;
  right: 8px;
  display: inline-flex;
  padding: 3px 7px;
  align-items: center;
  gap: 4px;
  border: 1px solid rgba(216, 171, 79, 0.28);
  border-radius: 999px;
  background: rgba(7, 12, 14, 0.82);
  color: rgba(238, 223, 190, 0.82);
  font-size: 9px;
  font-weight: 650;
  letter-spacing: 0.04em;
  line-height: 1;
  pointer-events: none;
  text-transform: uppercase;
}
</style>
