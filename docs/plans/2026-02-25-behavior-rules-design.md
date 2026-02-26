# Behavior Rules Engine — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a configurable behavior rules engine that triggers visual/audio/haptic/game-state effects when game conditions are met, with an editor for custom rules and saveable profiles.

**Architecture:** Reactive evaluation (Pinia watchers + pure evaluator function) with edge detection for one-shot effects. Rules are templates stored in profiles. Profiles are persisted in localStorage. The engine is a self-contained composable instantiated in GameView.

**Tech Stack:** Vue 3, Pinia, TypeScript, Ionic Vue, Capacitor (sounds/haptics)

---

## Design Decisions

- **No event bus** — half the triggers are continuous state (life thresholds, timer remaining), not discrete events. Watchers on reactive Pinia state are idiomatic Vue and catch everything.
- **Pure evaluator function** — testable without Vue. Takes (gameState, settings, rules, timerState) → results.
- **Edge detection** — tracks rising/falling edges so one-shot effects (sound, haptic) fire exactly once when a threshold is crossed.
- **Profiles own rule copies** — each profile contains full BehaviorRule[] copies, not just IDs. Rules can be customized per-profile.
- **Presets + editor** — 17 preset rule templates + free editor. Presets serve as starting point, fully editable within profiles.
- **Game-state mutation effects** — modify_life and modify_counter effects go through gameStore.changeLife()/changeCounter(), creating undoable GameActions in history.

## Triggers

| Type | Scope | Threshold | Description |
|------|-------|-----------|-------------|
| life_below | per_player | number (PV) | Player life < N |
| life_exact | per_player | number (PV) | Player life === N |
| poison_above | per_player | number | Poison counters >= N |
| commander_damage_above | per_player | number | Commander damage from any single source >= N |
| turn_timer_remaining | global | seconds | Turn timer <= N seconds remaining |
| turn_timer_expired | global | — | Turn timer hit 0 |
| turn_timer_overtime | global | seconds | Turn timer in overtime >= N seconds |
| game_time_exceeded | global | seconds | Total game time > N seconds |
| player_death | per_player | — | Player meets any death condition |

## Effects

| Type | Category | Config |
|------|----------|--------|
| play_sound | alert | soundName: 'warning' \| 'urgent' |
| haptic_buzz | alert | pattern: 'single' \| 'repeated', repeatIntervalSeconds? |
| visual_flash | visual | target: 'affected_player' \| 'all_players' \| 'timer_zone' |
| overtime_display | visual | — |
| modify_life | mutation | amount: number (logged, undoable) |
| modify_counter | mutation | counterType + amount (logged, undoable) |
| announce_text | visual | messageKey: i18n key for overlay text |

## 17 Preset Rules

### Vie
1. Alerte vie basse — life_below 10 → play_sound warning
2. Vie critique — life_below 5 → visual_flash + play_sound urgent + haptic_buzz single
3. Dernier souffle — life_exact 1 → play_sound urgent + haptic_buzz repeated + visual_flash

### Poison
4. Alerte poison — poison_above 7 → play_sound warning + visual_flash
5. Poison lethal imminent — poison_above 9 → play_sound urgent + haptic_buzz single

### Dégâts commandant
6. Alerte dégâts commandant — commander_damage_above 15 → play_sound warning + visual_flash
7. Commandant lethal imminent — commander_damage_above 18 → play_sound urgent + haptic_buzz + visual_flash

### Timer de tour
8. Avertissement fin de tour — turn_timer_remaining 30 → play_sound warning + visual_flash timer_zone
9. Urgence fin de tour — turn_timer_remaining 10 → play_sound urgent + haptic_buzz repeated 5s + visual_flash
10. Tour expiré - Affichage — turn_timer_expired → overtime_display + visual_flash
11. Tour expiré - Rappel — turn_timer_expired → haptic_buzz repeated 30s

### Temps de partie
12. Partie longue — game_time_exceeded 5400 (90min) → play_sound warning + visual_flash all
13. Partie très longue — game_time_exceeded 7200 (2h) → play_sound urgent + haptic_buzz

### Mort
14. Élimination globale — player_death → play_sound urgent + haptic_buzz + visual_flash all

### Pénalités
15. Pénalité tour expiré — turn_timer_expired → modify_life -1 every 60s
16. Pénalité tour très long — turn_timer_overtime 120 → modify_life -2 every 60s
17. Pénalité partie interminable — game_time_exceeded 7200 → modify_life -1 every 300s (all players)

## 3 Profiles

### Défaut
Active: V1, V2, V3, P1, P2, C1, C2, T1, T2, T3, D1

### Partie rapide
Active: Toutes. Seuils ajustés: T1→20s, T2→5s, T4 repeat→15s, G1→3600, G2→5400, X1 repeat→30s, X2 seuil→60s, X3→5400/180s

### Partie tranquille
Active: V1 (seuil→5), V3, P1 (seuil→8), C1 (seuil→18), D1

## Task Dependency Graph

```
#6 Types ─┬─ #7 Presets ─┬─ #8 Store ──┬─ #11 UI
           │              │             │
           ├─ #9 Evaluator┴─ #10 Engine─┴─ #12 GameView
           │
           └─ #13 i18n
```

Tasks #7, #9, #13 are parallelizable after #6.
Tasks #8, #10 depend on #7.
Task #11 depends on #8.
Task #12 depends on #10, #11.
