# Behavior Rules Visual Effects Wiring — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the 4 visual outputs from the behavior rule engine (`flashingPlayerIds`, `flashTimerZone`, `announceMessages`, `isOvertimeDisplayActive`) to the rendering layer so they produce visible feedback.

**Architecture:** The engine already computes all reactive state. We sync `flashingPlayerIds` to `gameStore.currentGame.activeFlashPlayerIds` (existing field, already read by `usePlayerTimerDisplay`), pass props from `GameView` to `LifeTracker` and `GameTimer`, and render announce messages as a floating banner in `GameView`.

**Tech Stack:** Vue 3 (Composition API), Tailwind CSS, Ionic Vue

---

### Task 1: Sync engine flashingPlayerIds to gameStore

**Files:**
- Modify: `src/rules/behaviorRuleEngine.ts` (add watch after line ~416)

**Step 1: Add a watcher that syncs `flashingPlayerIds` to `gameStore.currentGame.activeFlashPlayerIds`**

In `useBehaviorRuleEngine()`, after the main watcher block (line ~416) and before the cleanup, add:

```typescript
// Sync flashing player IDs to gameStore for consumption by usePlayerTimerDisplay
watch(flashingPlayerIds, (playerIds) => {
  if (gameStore.currentGame) {
    gameStore.currentGame.activeFlashPlayerIds = playerIds
  }
}, { immediate: true })
```

This bridges the engine to the existing `hasTimerFlashEffect` in `usePlayerTimerDisplay`, which already reads `activeFlashPlayerIds` and applies `timer-aggressive-flash` CSS in LifeTracker.

**Step 2: Verify manually**

Run: `npm run dev`
Enable the "Critical life" rule (which has `visual_flash: affected_player`), drop a player below 5 life. The per-player timer zone should start flashing red.

**Step 3: Commit**

```bash
git add src/rules/behaviorRuleEngine.ts
git commit -m "feat: sync behavior engine flashingPlayerIds to gameStore.activeFlashPlayerIds"
```

---

### Task 2: Add player card border flash (red glow) to LifeTracker

**Files:**
- Modify: `src/views/GameView.vue` (template line ~83, script line ~238)
- Modify: `src/components/life-tracker/LifeTracker.vue` (props, template line ~4, styles)

**Step 1: Pass `isFlashing` prop from GameView to LifeTracker**

In `GameView.vue`, the LifeTracker already receives several props (line 83-91). Add the `isFlashing` prop:

```vue
<LifeTracker
  class="h-full"
  :style="cardRotationStyle(index)"
  :player="player"
  :is-current-turn="player.id === gameStore.currentTurnPlayer?.id"
  :is-flashing="flashingPlayerIds.includes(player.id)"
  :commander-damage-attacker-id="commanderDragState?.targetPlayerId === player.id ? commanderDragState.attackerPlayerId : null"
  @state-changed="onPlayerStateChanged"
  @turn-advanced="onTurnAdvanced"
  @commander-drag-drop="(targetId: string) => handleCommanderDragDrop(player.id, targetId)"
/>
```

**Step 2: Accept and render the prop in LifeTracker**

In `LifeTracker.vue`, add `isFlashing` to props (line ~417):

```typescript
const props = defineProps<{
  player: PlayerState
  isCurrentTurn: boolean
  isFlashing?: boolean
  commanderDamageAttackerId?: string | null
}>()
```

In the template, add the flashing class to the root div (line ~4), alongside existing dynamic classes:

```vue
:class="[
  playerBgClass,
  turnBorderClass,
  dangerPulseClass,
  isFlashing ? 'behavior-rule-flash' : '',
]"
```

**Step 3: Add the CSS animation in LifeTracker scoped styles**

```css
/* Behavior rule — player card flash (red glow border) */
@keyframes behavior-rule-flash {
  0%, 100% { box-shadow: inset 0 0 0 2px rgba(239, 68, 68, 0.2), 0 0 12px rgba(239, 68, 68, 0.1); }
  50% { box-shadow: inset 0 0 0 2px rgba(239, 68, 68, 0.7), 0 0 20px rgba(239, 68, 68, 0.3); }
}
.behavior-rule-flash {
  animation: behavior-rule-flash 1.2s ease-in-out infinite;
}
```

**Step 4: Commit**

```bash
git add src/views/GameView.vue src/components/life-tracker/LifeTracker.vue
git commit -m "feat: add player card border flash for behavior rule visual_flash effect"
```

---

### Task 3: Add flash to GameTimer for `flashTimerZone`

**Files:**
- Modify: `src/views/GameView.vue` (template line ~58)
- Modify: `src/components/game-timer/GameTimer.vue` (props, template, styles)

**Step 1: Pass `isFlashing` prop from GameView to GameTimer**

In `GameView.vue` (line ~58):

```vue
<GameTimer v-show="gameStore.settings.enableTimer" :is-flashing="flashTimerZone" />
```

**Step 2: Accept and render in GameTimer**

Add props to `GameTimer.vue`:

```typescript
const props = defineProps<{
  isFlashing?: boolean
}>()
```

Add flash class to the root `<div>` (line ~2):

```vue
<div
  class="flex items-center justify-center gap-3 bg-surface-light px-4 py-2"
  :class="isFlashing ? 'game-timer-flash' : ''"
>
```

**Step 3: Add CSS animation**

```css
@keyframes game-timer-flash {
  0%, 100% { background-color: rgba(239, 68, 68, 0.05); }
  50% { background-color: rgba(239, 68, 68, 0.25); }
}
.game-timer-flash {
  animation: game-timer-flash 0.8s ease-in-out infinite;
}
```

**Step 4: Commit**

```bash
git add src/views/GameView.vue src/components/game-timer/GameTimer.vue
git commit -m "feat: add GameTimer flash for behavior rule flashTimerZone effect"
```

---

### Task 4: Render announce messages as floating banner

**Files:**
- Modify: `src/views/GameView.vue` (template + script + styles)

**Step 1: Add the announce banner to the template**

In `GameView.vue`, insert after the turn indicator div (after line ~68) and before the player grid:

```vue
<!-- Behavior rule announce messages -->
<TransitionGroup name="announce-slide" tag="div" class="flex flex-col gap-1 px-4">
  <div
    v-for="messageKey in announceMessages"
    :key="messageKey"
    class="announce-banner flex items-center justify-center gap-2 rounded-lg px-3 py-1.5"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="shrink-0 text-arena-gold-light">
      <path d="M12 2L1 21h22L12 2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
      <path d="M12 9v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
    <span class="text-xs font-semibold text-white/90">{{ t(messageKey) }}</span>
  </div>
</TransitionGroup>
```

**Step 2: Add CSS for the banner and transition**

```css
.announce-banner {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.08));
  border: 1px solid rgba(239, 68, 68, 0.2);
  backdrop-filter: blur(4px);
}

.announce-slide-enter-active {
  transition: all 0.3s ease-out;
}
.announce-slide-leave-active {
  transition: all 0.2s ease-in;
}
.announce-slide-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.announce-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
```

**Step 3: Commit**

```bash
git add src/views/GameView.vue
git commit -m "feat: render behavior rule announce messages as floating banners"
```

---

### Task 5: Export `isOvertimeDisplayActive` and wire to GameTimer

**Files:**
- Modify: `src/rules/behaviorRuleEngine.ts` (return statement, line ~426)
- Modify: `src/views/GameView.vue` (destructure + prop)
- Modify: `src/components/game-timer/GameTimer.vue` (prop + visual)

**Step 1: Export `isOvertimeDisplayActive` from engine**

In `behaviorRuleEngine.ts`, update the return (line ~426):

```typescript
return {
  activeRuleStates,
  isOvertimeDisplayActive,
  flashingPlayerIds,
  flashTimerZone,
  announceMessages,
}
```

**Step 2: Destructure and pass in GameView**

Update the engine destructure in `GameView.vue` (line ~238):

```typescript
const { flashingPlayerIds, flashTimerZone, announceMessages, isOvertimeDisplayActive } = useBehaviorRuleEngine()
```

Update GameTimer template:

```vue
<GameTimer
  v-show="gameStore.settings.enableTimer"
  :is-flashing="flashTimerZone"
  :is-overtime="isOvertimeDisplayActive"
/>
```

**Step 3: Accept prop in GameTimer and render overtime indicator**

Add to props:

```typescript
const props = defineProps<{
  isFlashing?: boolean
  isOvertime?: boolean
}>()
```

Add overtime visual to the GameTimer template, after the time span:

```vue
<span v-if="isOvertime" class="text-xs font-bold text-life-negative animate-pulse">
  OVERTIME
</span>
```

**Step 4: Commit**

```bash
git add src/rules/behaviorRuleEngine.ts src/views/GameView.vue src/components/game-timer/GameTimer.vue
git commit -m "feat: wire overtime display indicator to GameTimer"
```

---

### Task 6: Add i18n keys for announce messages (future-proofing)

**Files:**
- Modify: `src/i18n/locales/en.ts`
- Modify: `src/i18n/locales/fr.ts`

**Step 1: Check that no preset currently uses `announce_text` effects**

Currently no preset rule uses `announce_text` — it's available for custom rules. But the rendering is ready. No i18n keys are needed now unless we add preset announce rules.

No action needed — the `t(messageKey)` call in the template will resolve whatever key a custom rule provides.

**Step 2: Commit (skip — no changes)**

---

### Summary of changes per file

| File | Changes |
|------|---------|
| `behaviorRuleEngine.ts` | Add watch to sync `flashingPlayerIds` → `activeFlashPlayerIds`; export `isOvertimeDisplayActive` |
| `GameView.vue` | Destructure `isOvertimeDisplayActive`; pass `isFlashing` to LifeTracker; pass `isFlashing`+`isOvertime` to GameTimer; render announce banners |
| `LifeTracker.vue` | Accept `isFlashing` prop; apply `behavior-rule-flash` CSS class; add keyframe animation |
| `GameTimer.vue` | Accept `isFlashing`+`isOvertime` props; apply `game-timer-flash` CSS class; render OVERTIME label |
