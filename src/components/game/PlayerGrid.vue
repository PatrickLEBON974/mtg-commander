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
      class="min-h-0 min-w-0 overflow-hidden"
      :class="cardOuterClasses(index)"
      :style="cardOuterStyle(index)"
    >
      <LifeTracker
        class="h-full"
        :player="player"
        :is-current-turn="player.id === currentTurnPlayerId"
        :is-flashing="flashingPlayerIds.includes(player.id)"
        :commander-damage-target-id="commanderDamageTargetIdFor(player.id)"
        @state-changed="emit('player-state-changed')"
        @turn-advanced="emit('turn-advanced')"
        @commander-drag-drop="(targetId: string) => emit('commander-drag-drop', player.id, targetId)"
      />
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
      class="min-h-0 flex-1 overflow-hidden rounded-2xl"
    >
      <LifeTracker
        class="h-full"
        :player="player"
        :is-current-turn="player.id === currentTurnPlayerId"
        :is-flashing="flashingPlayerIds.includes(player.id)"
        :commander-damage-target-id="commanderDamageTargetIdFor(player.id)"
        @state-changed="emit('player-state-changed')"
        @turn-advanced="emit('turn-advanced')"
        @commander-drag-drop="(targetId: string) => emit('commander-drag-drop', player.id, targetId)"
      />
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
</script>
