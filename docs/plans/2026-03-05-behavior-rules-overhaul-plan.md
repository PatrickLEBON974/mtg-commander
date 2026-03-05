# Behavior Rules Overhaul + Hourglass Token System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce 17 behavior rules to 6 essential ones, replace life-loss penalties with a new hourglass token system (persistent, opt-in, two modes: fixed and time bank).

**Architecture:** The hourglass system adds a per-player counter (`hourglassTokens`) that accumulates in the game clock tick loop. Two modes share the same accumulation logic but differ in how the time allowance is computed. The behavior rule engine handles the lethal threshold via a new `hourglass_above` trigger type.

**Tech Stack:** Vue 3, Pinia, TypeScript, Ionic, vitest, vue-i18n

---

### Task 1: Types — Add hourglass fields and settings

**Files:**
- Modify: `src/types/game.ts:8-24` (PlayerState)
- Modify: `src/types/game.ts:84-94` (GameSettings)
- Modify: `src/types/game.ts:28-44` (GameState)
- Modify: `src/types/game.ts:96-152` (BehaviorRuleTrigger union)
- Modify: `src/types/game.ts:205-213` (RuleCategory)
- Modify: `src/types/game.ts:249-259` (DEFAULT_GAME_SETTINGS)

**Step 1: Add hourglass fields to PlayerState**

Add after `radCounters`:
```typescript
hourglassTokens: number
```

**Step 2: Add hourglass fields to GameState**

Add after `dayNightState`:
```typescript
hourglassTimeBankRemainingMs: Record<string, number> // playerId -> remaining ms in time bank mode
```

**Step 3: Add hourglass settings to GameSettings**

Add after `selectedBehaviorProfileId`:
```typescript
hourglassEnabled: boolean
hourglassMode: 'fixed' | 'time_bank'
hourglassGracePeriodSeconds: number
hourglassLossThreshold: number
hourglassTimeBankCapEnabled: boolean
hourglassTimeBankCapSeconds: number
```

**Step 4: Add HourglassAboveThresholdTrigger**

Add new trigger interface:
```typescript
export interface HourglassAboveThresholdTrigger {
  type: 'hourglass_above'
  threshold: number
}
```

Add `HourglassAboveThresholdTrigger` to `BehaviorRuleTrigger` union.

**Step 5: Add 'hourglass' to RuleCategory**

```typescript
export type RuleCategory =
  | 'life'
  | 'poison'
  | 'commander_damage'
  | 'turn_timer'
  | 'game_time'
  | 'death'
  | 'penalty'
  | 'hourglass'
```

**Step 6: Update DEFAULT_GAME_SETTINGS**

```typescript
export const DEFAULT_GAME_SETTINGS: GameSettings = {
  startingLife: 40,
  commanderDamageThreshold: 21,
  poisonThreshold: 10,
  playerCount: 4,
  enableTimer: true,
  enableTurnTimer: false,
  turnTimerSeconds: 120,
  activeBehaviorRuleIds: [],
  selectedBehaviorProfileId: 'default',
  hourglassEnabled: false,
  hourglassMode: 'fixed',
  hourglassGracePeriodSeconds: 300,
  hourglassLossThreshold: 10,
  hourglassTimeBankCapEnabled: false,
  hourglassTimeBankCapSeconds: 900,
}
```

**Step 7: Commit**

```bash
git add src/types/game.ts
git commit -m "feat: add hourglass token types and settings to game types"
```

---

### Task 2: GameStore — Initialize hourglass fields

**Files:**
- Modify: `src/stores/gameStore.ts:21-40` (createPlayer)
- Modify: `src/stores/gameStore.ts:160-182` (startNewGame)
- Modify: `src/stores/gameStore.ts:60-79` (legacy save backfill)

**Step 1: Add hourglassTokens to createPlayer**

Add `hourglassTokens: 0` to the returned PlayerState object.

**Step 2: Add hourglassTimeBankRemainingMs to startNewGame**

In `startNewGame`, add `hourglassTimeBankRemainingMs: {}` to the initial GameState.

**Step 3: Backfill legacy saves**

In the saved game restoration block, add:
```typescript
if (savedGame.hourglassTimeBankRemainingMs === undefined) {
  savedGame.hourglassTimeBankRemainingMs = {}
}
for (const player of savedGame.players) {
  // ... existing backfills ...
  if (player.hourglassTokens === undefined) player.hourglassTokens = 0
}
```

**Step 4: Add changeHourglassTokens method**

```typescript
function changeHourglassTokens(playerId: string, amount: number) {
  if (!currentGame.value) return
  const player = findPlayerById(playerId)
  if (!player) return
  player.hourglassTokens = Math.max(0, player.hourglassTokens + amount)
}
```

Export it from the store return object.

**Step 5: Commit**

```bash
git add src/stores/gameStore.ts
git commit -m "feat: add hourglass token fields to game store"
```

---

### Task 3: Presets — Replace 17 rules with 6

**Files:**
- Rewrite: `src/rules/behaviorRulePresets.ts`

**Step 1: Replace BEHAVIOR_RULE_TEMPLATES**

Replace the entire array with these 6 rules:
```typescript
export const BEHAVIOR_RULE_TEMPLATES: BehaviorRule[] = [
  {
    id: 'critical-life',
    name: 'rules.critical-life',
    trigger: { type: 'life_below', threshold: 5 },
    effects: [
      { type: 'visual_flash', target: 'affected_player' },
      { type: 'play_sound', soundName: 'urgent' },
      { type: 'haptic_buzz', pattern: 'single' },
    ],
    scope: 'per_player',
    fireOnce: true,
    category: 'life',
    isPreset: true,
  },
  {
    id: 'poison-warning',
    name: 'rules.poison-warning',
    trigger: { type: 'poison_above', threshold: 7 },
    effects: [
      { type: 'play_sound', soundName: 'warning' },
      { type: 'visual_flash', target: 'affected_player' },
    ],
    scope: 'per_player',
    fireOnce: true,
    category: 'poison',
    isPreset: true,
  },
  {
    id: 'commander-damage-warning',
    name: 'rules.commander-damage-warning',
    trigger: { type: 'commander_damage_above', threshold: 15 },
    effects: [
      { type: 'play_sound', soundName: 'warning' },
      { type: 'visual_flash', target: 'affected_player' },
    ],
    scope: 'per_player',
    fireOnce: true,
    category: 'commander_damage',
    isPreset: true,
  },
  {
    id: 'turn-timer-warning',
    name: 'rules.turn-timer-warning',
    trigger: { type: 'turn_timer_remaining', thresholdSeconds: 30 },
    effects: [
      { type: 'play_sound', soundName: 'warning' },
      { type: 'visual_flash', target: 'timer_zone' },
    ],
    scope: 'global',
    fireOnce: true,
    category: 'turn_timer',
    isPreset: true,
  },
  {
    id: 'player-elimination',
    name: 'rules.player-elimination',
    trigger: { type: 'player_death' },
    effects: [
      { type: 'play_sound', soundName: 'urgent' },
      { type: 'haptic_buzz', pattern: 'single' },
      { type: 'visual_flash', target: 'all_players' },
    ],
    scope: 'global',
    fireOnce: true,
    category: 'death',
    isPreset: true,
  },
  {
    id: 'hourglass-lethal',
    name: 'rules.hourglass-lethal',
    trigger: { type: 'hourglass_above', threshold: 10 },
    effects: [
      { type: 'play_sound', soundName: 'urgent' },
      { type: 'haptic_buzz', pattern: 'single' },
      { type: 'visual_flash', target: 'affected_player' },
    ],
    scope: 'per_player',
    fireOnce: true,
    category: 'hourglass',
    isPreset: true,
  },
]
```

**Step 2: Update profiles**

```typescript
const DEFAULT_ENABLED_RULE_IDS = new Set([
  'critical-life',
  'poison-warning',
  'commander-damage-warning',
  'turn-timer-warning',
  'player-elimination',
])

const FAST_GAME_ENABLED_RULE_IDS = new Set([
  'critical-life',
  'poison-warning',
  'commander-damage-warning',
  'turn-timer-warning',
  'player-elimination',
  'hourglass-lethal',
])

const RELAXED_ENABLED_RULE_IDS = new Set([
  'critical-life',
  'commander-damage-warning',
  'player-elimination',
])

export const DEFAULT_PROFILES: BehaviorRuleProfile[] = [
  createProfile('default', 'rules.profiles.default', BEHAVIOR_RULE_TEMPLATES, DEFAULT_ENABLED_RULE_IDS),

  createProfile('fast-game', 'rules.profiles.fastGame', BEHAVIOR_RULE_TEMPLATES, FAST_GAME_ENABLED_RULE_IDS, {
    'turn-timer-warning': { trigger: { thresholdSeconds: 20 } },
    'hourglass-lethal': { trigger: { threshold: 7 } },
  }),

  createProfile('relaxed', 'rules.profiles.relaxed', BEHAVIOR_RULE_TEMPLATES, RELAXED_ENABLED_RULE_IDS),
]
```

Remove the `ALL_RULE_IDS` constant (no longer needed).

**Step 3: Commit**

```bash
git add src/rules/behaviorRulePresets.ts
git commit -m "feat: replace 17 behavior rules with 6 essential presets"
```

---

### Task 4: Evaluator — Add hourglass trigger

**Files:**
- Modify: `src/rules/behaviorRuleEvaluator.ts:24-71` (evaluatePlayerTrigger)
- Modify: `src/rules/behaviorRuleEvaluator.ts:75-114` (evaluateGlobalTrigger)

**Step 1: Add hourglass_above to evaluatePlayerTrigger**

Add case before the global trigger fallthrough:
```typescript
case 'hourglass_above':
  return player.hourglassTokens >= trigger.threshold
```

**Step 2: Add hourglass_above to evaluateGlobalTrigger fallthrough**

Add `'hourglass_above'` to the per-player trigger types that return false in global evaluation.

**Step 3: Commit**

```bash
git add src/rules/behaviorRuleEvaluator.ts
git commit -m "feat: add hourglass_above trigger evaluation"
```

---

### Task 5: Hourglass accumulation in game clock

**Files:**
- Modify: `src/composables/useGameClock.ts:78-106` (tick function)

**Step 1: Add hourglass accumulation logic to tick()**

After the existing round time accumulation block, add:

```typescript
// Hourglass token accumulation
const settingsStore = useSettingsStore()
const hourglassSettings = settingsStore.gameSettings
if (hourglassSettings.hourglassEnabled && clockOwner) {
  const roundTimeMs = game.playerRoundTimeMs[clockOwner.id] ?? 0

  let allowanceMs: number
  if (hourglassSettings.hourglassMode === 'time_bank') {
    // Time bank: allowance is the remaining bank for this player
    const bankRemaining = game.hourglassTimeBankRemainingMs[clockOwner.id]
    if (bankRemaining === undefined) {
      // Initialize bank on first tick for this player
      game.hourglassTimeBankRemainingMs[clockOwner.id] = hourglassSettings.hourglassGracePeriodSeconds * 1000
      allowanceMs = hourglassSettings.hourglassGracePeriodSeconds * 1000
    } else {
      allowanceMs = bankRemaining
    }
  } else {
    // Fixed mode: grace period per turn
    allowanceMs = hourglassSettings.hourglassGracePeriodSeconds * 1000
  }

  if (roundTimeMs > allowanceMs) {
    const overtimeMs = roundTimeMs - allowanceMs
    const expectedTokens = Math.floor(overtimeMs / 60000) // 1 token per minute
    const currentTokens = clockOwner.hourglassTokens
    if (expectedTokens > currentTokens) {
      gameStore.changeHourglassTokens(clockOwner.id, expectedTokens - currentTokens)
    }
  }
}
```

Add import for `useSettingsStore` at the top of the file.

**Step 2: Add time bank credit update on turn change**

In the existing turn change watcher (line ~146), add time bank logic after the round time reset:

```typescript
// Time bank: credit unused time to next turn
const settingsStore = useSettingsStore()
if (settingsStore.gameSettings.hourglassEnabled && settingsStore.gameSettings.hourglassMode === 'time_bank') {
  // Find the player who just finished their turn (previous turn player)
  // The watcher fires when currentTurnPlayerIndex changes, so we need the old player
  // We use the round time that was accumulated before the reset
  const previousPlayer = game.players[oldIndex]
  if (previousPlayer && oldIndex !== undefined) {
    const usedTimeMs = game.playerPlayTimeMs?.[previousPlayer.id] ?? 0
    const previousRoundTimeMs = usedTimeMs % 1000 // approximation: the round time was just reset
    // Actually, we need to capture round time BEFORE the reset happens
    // Better approach: compute remaining bank from the bank value minus time used
  }
}
```

**Actually, better approach:** Handle the time bank update in `advanceTurn()` in the gameStore, where we have clear before/after state. See Task 6.

**Step 3: Commit**

```bash
git add src/composables/useGameClock.ts
git commit -m "feat: add hourglass token accumulation to game clock"
```

---

### Task 6: Time bank logic in advanceTurn

**Files:**
- Modify: `src/stores/gameStore.ts:560-607` (advanceTurn)

**Step 1: Capture round time and update time bank before resetting**

At the start of `advanceTurn()`, before the turn index changes, add:

```typescript
// Update time bank for the current player before advancing
const hourglassSettings = settings.value as GameSettings
if (hourglassSettings.hourglassEnabled && hourglassSettings.hourglassMode === 'time_bank' && currentGame.value) {
  const currentPlayer = currentGame.value.players[currentGame.value.currentTurnPlayerIndex]
  if (currentPlayer) {
    const roundTimeMs = currentGame.value.playerRoundTimeMs?.[currentPlayer.id] ?? 0
    const currentBank = currentGame.value.hourglassTimeBankRemainingMs[currentPlayer.id]
      ?? (hourglassSettings.hourglassGracePeriodSeconds * 1000)

    // Subtract used time, add next turn's credit
    let newBank = currentBank - roundTimeMs + (hourglassSettings.hourglassGracePeriodSeconds * 1000)

    // Apply cap if enabled
    if (hourglassSettings.hourglassTimeBankCapEnabled) {
      newBank = Math.min(newBank, hourglassSettings.hourglassTimeBankCapSeconds * 1000)
    }

    // Bank cannot go below the base grace period (player always gets at least 1 turn's worth)
    newBank = Math.max(newBank, hourglassSettings.hourglassGracePeriodSeconds * 1000)

    currentGame.value.hourglassTimeBankRemainingMs[currentPlayer.id] = newBank
  }
}
```

Wait — if the bank goes negative (player exceeded their bank), should they still get a fresh credit next turn? Yes — the penalty was already applied via hourglass tokens. The bank resets to at least the base grace period.

Actually, reconsider: the bank should reflect reality. If the player used more than their bank, the overtime already generated hourglass tokens. Next turn they get a fresh grace period added.

Better formula:
```typescript
let newBank = (currentBank - roundTimeMs) + (hourglassSettings.hourglassGracePeriodSeconds * 1000)
// Floor at 0 — if deeply negative, don't let it recover to a full turn instantly
newBank = Math.max(newBank, 0)
// But guarantee at least the base grace period (otherwise a player who went overtime once is permanently behind)
// Actually no — the whole point is that unused time accumulates. If you went over, you start with less next turn.
// Let's keep it simple: newBank = max(0, bank - used + credit). If they went way over, they start near 0.
```

Actually the simplest and most intuitive: `newBank = max(0, currentBank - roundTimeMs) + gracePeriodMs`, then cap if enabled. This way:
- If you use less than your bank → surplus carries over + new credit
- If you use more than your bank → you start with just the base credit next turn (hourglasses already punished the overtime)

**Step 2: Commit**

```bash
git add src/stores/gameStore.ts
git commit -m "feat: update time bank on turn advance"
```

---

### Task 7: Engine — Handle hourglass elimination

**Files:**
- Modify: `src/rules/behaviorRuleEngine.ts:134-200` (fireEffect)

**Step 1: Add hourglass elimination logic in processResults**

When the `hourglass-lethal` rule activates (rising edge in `onRuleActivated`), the player should be eliminated. The rule already triggers `player_death` check via the evaluator. But we need to make the engine call `declareGameResult` for the affected player.

Add to `onRuleActivated`, after `fireEffect`:
```typescript
// If this is the hourglass-lethal rule, eliminate the affected players
if (rule.id === 'hourglass-lethal') {
  for (const playerId of effectivePlayerIds) {
    gameStore.declareGameResult(playerId, 'eliminated')
  }
}
```

This is cleaner than adding a new effect type — the elimination is inherent to the hourglass system, not a generic effect.

**Step 2: Commit**

```bash
git add src/rules/behaviorRuleEngine.ts
git commit -m "feat: hourglass-lethal rule triggers player elimination"
```

---

### Task 8: i18n — Update translations

**Files:**
- Modify: `src/i18n/locales/en.ts:382-499` (rules section)
- Modify: `src/i18n/locales/fr.ts:384-499` (rules section)

**Step 1: Update EN translations**

Remove keys for deleted rules (lowLifeWarning, lastBreath, poisonLethalImminent, commanderDamageLethal, turnTimerUrgent, turnTimerExpiredDisplay, turnTimerExpiredReminder, longGame, veryLongGame, penaltyTurnExpired, penaltyTurnVeryLong, penaltyEndlessGame) and their Desc counterparts.

Add hourglass keys:
```typescript
hourglassLethal: 'Hourglass — Game loss',
hourglassLethalDesc: 'Player is eliminated at {threshold} hourglass tokens',
categoryHourglass: 'Hourglass',

// Hourglass settings
hourglassEnabled: 'Hourglass tokens',
hourglassMode: 'Mode',
hourglassModeFixed: 'Fixed per turn',
hourglassModeTimeBank: 'Time bank',
hourglassGracePeriod: 'Grace period',
hourglassLossThreshold: 'Loss threshold',
hourglassTimeBankCap: 'Time bank cap',
hourglassTimeBankCapEnabled: 'Limit time bank',

// Trigger
triggers: {
  // ... existing ...
  hourglassAbove: 'Hourglass tokens at least',
},
```

**Step 2: Update FR translations**

Same structure:
```typescript
hourglassLethal: 'Sablier — Defaite',
hourglassLethalDesc: 'Le joueur est elimine a {threshold} jetons sablier',
categoryHourglass: 'Sablier',

hourglassEnabled: 'Jetons sablier',
hourglassMode: 'Mode',
hourglassModeFixed: 'Fixe par tour',
hourglassModeTimeBank: 'Banque de temps',
hourglassGracePeriod: 'Delai de grace',
hourglassLossThreshold: 'Seuil de defaite',
hourglassTimeBankCap: 'Plafond banque de temps',
hourglassTimeBankCapEnabled: 'Limiter la banque de temps',

triggers: {
  // ... existing ...
  hourglassAbove: 'Jetons sablier au moins',
},
```

**Step 3: Remove dead i18n keys for deleted rules**

Remove all keys for: lowLifeWarning*, lastBreath*, poisonLethalImminent*, commanderDamageLethal*, turnTimerUrgent*, turnTimerExpiredDisplay*, turnTimerExpiredReminder*, longGame*, veryLongGame*, penaltyTurnExpired*, penaltyTurnVeryLong*, penaltyEndlessGame*, categoryGameTime, categoryPenalty.

**Step 4: Commit**

```bash
git add src/i18n/locales/en.ts src/i18n/locales/fr.ts
git commit -m "feat: update i18n for hourglass system, remove dead rule keys"
```

---

### Task 9: UI — NewGameModal hourglass settings

**Files:**
- Modify: `src/components/home/NewGameModal.vue`

**Step 1: Add hourglass toggle section**

After the turn timer section, add a new section:
```vue
<!-- Hourglass tokens (nested under game timer) -->
<template v-if="settingsStore.gameSettings.enableTimer">
  <ion-item :lines="settingsStore.gameSettings.hourglassEnabled ? 'inset' : 'none'">
    <ion-icon :icon="hourglassOutline" slot="start" color="warning" />
    <ion-label>{{ t('rules.hourglassEnabled') }}</ion-label>
    <ion-toggle slot="end" v-model="settingsStore.gameSettings.hourglassEnabled" />
  </ion-item>

  <template v-if="settingsStore.gameSettings.hourglassEnabled">
    <ion-item lines="inset">
      <ion-label>{{ t('rules.hourglassMode') }}</ion-label>
      <ion-select v-model="settingsStore.gameSettings.hourglassMode" interface="action-sheet">
        <ion-select-option value="fixed">{{ t('rules.hourglassModeFixed') }}</ion-select-option>
        <ion-select-option value="time_bank">{{ t('rules.hourglassModeTimeBank') }}</ion-select-option>
      </ion-select>
    </ion-item>

    <ion-item lines="inset">
      <ion-label>{{ t('rules.hourglassGracePeriod') }}</ion-label>
      <SettingStepper
        slot="end"
        v-model="settingsStore.gameSettings.hourglassGracePeriodSeconds"
        :options="HOURGLASS_GRACE_OPTIONS"
        :label="t('rules.hourglassGracePeriod')"
      />
    </ion-item>

    <ion-item lines="inset">
      <ion-label>{{ t('rules.hourglassLossThreshold') }}</ion-label>
      <SettingStepper
        slot="end"
        v-model="settingsStore.gameSettings.hourglassLossThreshold"
        :options="HOURGLASS_THRESHOLD_OPTIONS"
        :label="t('rules.hourglassLossThreshold')"
      />
    </ion-item>

    <!-- Time bank cap (only shown in time_bank mode) -->
    <template v-if="settingsStore.gameSettings.hourglassMode === 'time_bank'">
      <ion-item :lines="settingsStore.gameSettings.hourglassTimeBankCapEnabled ? 'inset' : 'none'">
        <ion-label>{{ t('rules.hourglassTimeBankCapEnabled') }}</ion-label>
        <ion-toggle slot="end" v-model="settingsStore.gameSettings.hourglassTimeBankCapEnabled" />
      </ion-item>

      <ion-item v-if="settingsStore.gameSettings.hourglassTimeBankCapEnabled" lines="none">
        <ion-label>{{ t('rules.hourglassTimeBankCap') }}</ion-label>
        <SettingStepper
          slot="end"
          v-model="settingsStore.gameSettings.hourglassTimeBankCapSeconds"
          :options="HOURGLASS_CAP_OPTIONS"
          :label="t('rules.hourglassTimeBankCap')"
        />
      </ion-item>
    </template>
  </template>
</template>
```

Add stepper options constants:
```typescript
const HOURGLASS_GRACE_OPTIONS = [
  { value: 120, label: '2 min' },
  { value: 180, label: '3 min' },
  { value: 300, label: '5 min' },
  { value: 420, label: '7 min' },
  { value: 600, label: '10 min' },
]
const HOURGLASS_THRESHOLD_OPTIONS = [
  { value: 5, label: '5' },
  { value: 7, label: '7' },
  { value: 10, label: '10' },
  { value: 15, label: '15' },
  { value: 20, label: '20' },
]
const HOURGLASS_CAP_OPTIONS = [
  { value: 600, label: '10 min' },
  { value: 900, label: '15 min' },
  { value: 1200, label: '20 min' },
  { value: 1800, label: '30 min' },
]
```

**Step 2: Commit**

```bash
git add src/components/home/NewGameModal.vue
git commit -m "feat: add hourglass token settings to NewGameModal"
```

---

### Task 10: UI — Display hourglass tokens on player panels

**Files:**
- Identify the player panel component (likely in `src/components/life-tracker/`) — search for where `poisonCounters` is displayed and add hourglass display next to it.

**Step 1: Find player panel component**

Search for where counters (poison, experience, energy) are rendered on the player UI. Add hourglass token display using the same pattern.

Display logic:
- Only show when `settingsStore.gameSettings.hourglassEnabled` is true
- Show count with an hourglass icon
- Use warning color when tokens > 0, danger color when tokens >= threshold - 3

**Step 2: Commit**

```bash
git add src/components/life-tracker/*.vue
git commit -m "feat: display hourglass token count on player panels"
```

---

### Task 11: BehaviorRuleEditor — Add hourglass trigger option

**Files:**
- Modify: `src/components/home/BehaviorRuleEditor.vue:266-296`

**Step 1: Add hourglass category and trigger to dropdowns**

Add to CATEGORY_OPTIONS:
```typescript
{ value: 'hourglass', label: t('rules.categoryHourglass') },
```

Add to TRIGGER_TYPE_OPTIONS:
```typescript
{ value: 'hourglass_above', label: t('rules.triggers.hourglassAbove') },
```

**Step 2: Add hourglass_above to buildTrigger()**

```typescript
case 'hourglass_above':
  return { type: 'hourglass_above', threshold }
```

**Step 3: Commit**

```bash
git add src/components/home/BehaviorRuleEditor.vue
git commit -m "feat: add hourglass trigger type to rule editor"
```

---

### Task 12: Cleanup — Remove dead code from engine

**Files:**
- Modify: `src/rules/behaviorRuleEngine.ts`

**Step 1: Check for dead code paths**

Review `fireEffect` for effect types that are no longer used by any preset rule. The `overtime_display` effect was only used by `turn-timer-expired-display` (now removed). However, keep it in the engine since custom user rules might use it.

The `modify_life` and `modify_counter` effects were only used by penalty rules (now removed). Same reasoning — keep for custom rules but they are no longer in any preset.

No dead code to remove — the engine supports custom rules that may use any effect type.

**Step 2: Move overtime display to UI**

The overtime display was previously handled by a behavior rule (`turn-timer-expired-display`). Now it should be a native UI feature of the timer display.

In `src/composables/usePlayerTimerDisplay.ts`, add:
```typescript
const isOvertime = computed(() =>
  settingsStore.gameSettings.enableTurnTimer && roundTimeRemainingSeconds.value <= 0,
)
```

Export `isOvertime` from the composable. The `formattedRoundTime` already shows negative time, so the visual is already handled.

**Step 3: Commit**

```bash
git add src/rules/behaviorRuleEngine.ts src/composables/usePlayerTimerDisplay.ts
git commit -m "refactor: move overtime display to timer composable, clean up engine"
```

---

### Task 13: Verification and type check

**Step 1: Run TypeScript compiler**

```bash
npx vue-tsc --noEmit
```

Expected: No errors. Fix any type errors from the changes.

**Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 3: Run tests (if any exist)**

```bash
npx vitest run
```

**Step 4: Manual verification checklist**

- [ ] Start new game → no hourglass tokens visible (disabled by default)
- [ ] Enable hourglass in settings → hourglass count appears on player panels
- [ ] Fixed mode: wait > grace period on a turn → tokens accumulate
- [ ] Time bank mode: short turn → next turn has more time before tokens start
- [ ] Time bank cap: verify cap limits accumulation
- [ ] 10 tokens → player eliminated
- [ ] Profiles: default (no hourglass), fast-game (hourglass on), relaxed (no hourglass)
- [ ] Only 6 rules visible in behavior rules list
- [ ] Rule editor: can create custom rule with hourglass_above trigger

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: behavior rules overhaul — 6 rules + hourglass token system"
```
