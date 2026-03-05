# Behavior Rules Overhaul + Hourglass Token System

Date: 2026-03-05

## Problem

The current behavior rules system has 17 preset rules. Many are redundant (graduated alerts for the same danger), patronizing (repeated buzzing at 1 life), or alerting on normal game states (90min/2h games are standard in Commander). The penalty rules corrupt life totals, breaking the tracker's role as source of truth.

## Design

### Retained Rules (6 presets)

| ID | Trigger | Effects | Scope | Mode |
|----|---------|---------|-------|------|
| critical-life | life < 5 | flash + urgent sound + haptic | per_player | fire once |
| poison-warning | poison >= 7 | warning sound + flash | per_player | fire once |
| commander-damage-warning | cmd damage >= 15 | warning sound + flash | per_player | fire once |
| turn-timer-warning | 30s remaining | warning sound + flash | global | fire once |
| player-elimination | player dies | urgent sound + haptic + flash | global | fire once |
| hourglass-lethal | hourglasses >= threshold | urgent sound + haptic + flash + elimination | per_player | fire once |

All thresholds remain configurable via the existing rule editor.

### Removed Rules (11)

| ID | Reason |
|----|--------|
| low-life-warning (life < 10) | 10 HP is normal in Commander (40 life format), redundant with critical-life |
| last-breath (life = 1, repeating) | Patronizing — player knows they're at 1 life, repeated buzzing every 15s is annoying |
| poison-lethal-imminent (>= 9) | Too close to poison-warning at 7, double alert in same turn |
| commander-damage-lethal (>= 18) | Redundant with warning at 15, gap too small |
| turn-timer-urgent (10s) | Double alert after 30s warning, creates stress without actionable time |
| turn-timer-expired-display | Should be a UI state on the timer component, not a behavior rule |
| turn-timer-expired-reminder | Replaced by hourglass system |
| long-game (90min) | Normal Commander game length |
| very-long-game (2h) | Normal Commander game length |
| penalty-turn-expired | Corrupts life totals, replaced by hourglass |
| penalty-turn-very-long | Corrupts life totals, replaced by hourglass |
| penalty-endless-game | Corrupts life totals, normal game length |

### Hourglass Token System (new)

A custom non-MTG token that penalizes slow play without corrupting life totals.

**Core behavior:**
- Opt-in, disabled by default
- Hourglass tokens persist across turns (no reset between turns)
- Accumulation: +1 hourglass per minute once time allowance is exceeded
- Loss condition: configurable threshold (default: 10 hourglasses)

**Two modes:**

#### Fixed Mode (default)
- Each turn has a fixed grace period (configurable, default: 5 minutes)
- If the player exceeds the grace period, +1 hourglass per minute of overtime

#### Time Bank Mode
- Each turn grants a time credit (configurable, default: 5 minutes)
- Unused time carries over to the next turn
- Example: player uses 1 min on turn 1 -> has 9 min available on turn 2
- No credit cap by default
- Optional cap rule: maximum accumulated credit (default: 15 min when enabled)

**Configurable parameters:**
- `hourglassEnabled`: boolean (default: false)
- `hourglassMode`: 'fixed' | 'time_bank' (default: 'fixed')
- `hourglassGracePeriodSeconds`: number (default: 300 = 5 min)
- `hourglassLossThreshold`: number (default: 10)
- `hourglassTimeBankCapEnabled`: boolean (default: false)
- `hourglassTimeBankCapSeconds`: number (default: 900 = 15 min)

### Updated Profiles

**Default:** critical-life, poison-warning, commander-damage-warning, turn-timer-warning, player-elimination. Hourglass off.

**Fast Game:** All 5 default rules + hourglass enabled (fixed mode, grace 3 min, loss at 7). Turn timer warning at 20s.

**Relaxed:** critical-life, commander-damage-warning, player-elimination only. Hourglass off.

## Implementation Areas

### Types (`src/types/game.ts`)
- Add hourglass fields to `PlayerState`: `hourglassTokens: number`, `hourglassTimeBankRemainingSeconds: number`
- Add `HourglassAboveThresholdTrigger` to `BehaviorRuleTrigger` union
- Add hourglass settings to `GameSettings`
- Add `'hourglass'` to `RuleCategory`
- Remove unused trigger/effect types if no remaining rule uses them

### Presets (`src/rules/behaviorRulePresets.ts`)
- Replace 17 rules with 6 rules
- Update 3 profiles (default, fast-game, relaxed)

### Evaluator (`src/rules/behaviorRuleEvaluator.ts`)
- Add `hourglass_above` trigger evaluation
- Remove dead code paths for removed trigger types (if any)

### Engine (`src/rules/behaviorRuleEngine.ts`)
- Add hourglass accumulation logic (runs on game clock tick)
- Handle fixed mode vs time bank mode
- Track per-player time bank credit
- Fire hourglass-lethal rule + player elimination

### UI
- Display hourglass token count on player panels (new badge/counter)
- Add hourglass configuration to game settings / NewGameModal
- Update BehaviorRuleEditor for new trigger type
- Show time bank remaining in player timer display (when in time bank mode)
- Overtime display should be a UI feature of the timer component (moved out of rules)

### i18n
- Remove translation keys for deleted rules
- Add keys for hourglass system

### Sounds
- Hourglass accumulation tick sound (subtle, distinct from warning/urgent)
