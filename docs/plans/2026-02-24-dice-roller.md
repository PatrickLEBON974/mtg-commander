# Dice Roller Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dice roller to GameView — tap a die icon in the header, pick a die type (d4/d6/d8/d20) from a bottom sheet, see an animated result, with option to reroll.

**Architecture:** A new `DiceRollerSheet.vue` component opened from GameView header. On die type selection, a GSAP-animated result displays in an overlay that auto-dismisses after 4s. No persistent floating elements — the dice UI lives in its own layer and doesn't interfere with life tracking.

**Tech Stack:** Vue 3 Composition API, Ionic (IonButton, bottom sheet via AppModal), GSAP for roll animation, SVG die icons, crypto.getRandomValues for randomness.

---

### Task 1: Die SVG Icons

**Files:**
- Create: `src/components/icons/dice/IconDie4.vue`
- Create: `src/components/icons/dice/IconDie6.vue`
- Create: `src/components/icons/dice/IconDie8.vue`
- Create: `src/components/icons/dice/IconDie20.vue`
- Create: `src/components/icons/dice/IconDie.vue` (generic die for header button)

**Step 1:** Create 5 SVG icon components following the exact pattern of `src/components/icons/nav/IconHome.vue`:
- `withDefaults(defineProps<{ size?: number | string }>(), { size: 24 })`
- SVG with `viewBox="0 0 24 24"`, `:width="size"`, `:height="size"`
- Each die shape is distinct: d4=triangle, d6=cube, d8=octahedron, d20=icosahedron
- The generic `IconDie.vue` is a simple cube outline for the header button

**Step 2:** Verify build: `npx vue-tsc --noEmit`

**Step 3:** Commit: `feat: add SVG die icons (d4, d6, d8, d20, generic)`

---

### Task 2: i18n Keys

**Files:**
- Modify: `src/i18n/locales/en.ts`
- Modify: `src/i18n/locales/fr.ts`

**Step 1:** Add `dice` section to both locale files:

```typescript
// en.ts
dice: {
  title: 'Dice',
  rollD4: 'D4',
  rollD6: 'D6',
  rollD8: 'D8',
  rollD20: 'D20',
  result: 'Result',
  reroll: 'Reroll',
  close: 'Close',
},

// fr.ts
dice: {
  title: 'Des',
  rollD4: 'D4',
  rollD6: 'D6',
  rollD8: 'D8',
  rollD20: 'D20',
  result: 'Resultat',
  reroll: 'Relancer',
  close: 'Fermer',
},
```

**Step 2:** Verify build: `npx vue-tsc --noEmit`

**Step 3:** Commit: `feat: add dice roller i18n keys`

---

### Task 3: DiceRollerSheet Component

**Files:**
- Create: `src/components/dice/DiceRollerSheet.vue`

**Step 1:** Create the component with this behavior:

- **Props:** `isOpen: boolean`
- **Emits:** `close`
- **Uses:** `AppModal` (no header, sheet mode with breakpoints `[0, 0.55]`, `initialBreakpoint: 0.55`)
- **State:** `selectedDieType: null | 4 | 6 | 8 | 20`, `rollResult: number | null`, `isRolling: boolean`

**Template structure:**
1. When no die selected (`rollResult === null && !isRolling`): show 4 die buttons in a 2x2 grid. Each button = die SVG icon (size 48) + label (D4/D6/D8/D20). Tap → calls `rollDie(type)`.
2. When rolling/result showing: large animated result display
   - Die type icon at top (small, 32px)
   - Result number in the center (font-size ~72px, font-weight 900)
   - GSAP animation: the number spins through 8 random values over 600ms, then lands on final value with a scale bounce (1 → 1.3 → 1)
   - Below: two buttons — "Reroll" (same type) and "Close"
   - Auto-dismiss after 4s via `setTimeout`, cancelled if user interacts

**Roll logic:**
```typescript
function rollDie(sides: number) {
  selectedDieType = sides
  isRolling = true
  // Animate through random values
  const duration = 600
  const steps = 8
  const interval = duration / steps
  let step = 0
  const timer = setInterval(() => {
    rollResult = Math.floor(Math.random() * sides) + 1
    step++
    if (step >= steps) {
      clearInterval(timer)
      // Final value using crypto for fairness
      const array = new Uint32Array(1)
      crypto.getRandomValues(array)
      rollResult = (array[0] % sides) + 1
      isRolling = false
      // Start auto-dismiss timer
    }
  }, interval)
}
```

**Styling:**
- Die type buttons: `bg-surface-card` with `border-radius: 16px`, hover glow
- Result number: white text, `text-shadow: 0 0 20px rgba(232, 96, 10, 0.6)` for magic glow
- Reroll button: `fill="outline"`, color primary
- Dark background matching app theme

**Step 2:** Verify build: `npx vue-tsc --noEmit`

**Step 3:** Commit: `feat: add DiceRollerSheet component with animated rolls`

---

### Task 4: Integrate into GameView

**Files:**
- Modify: `src/views/GameView.vue`

**Step 1:** Add die button to the header toolbar (slot="end"), between layout picker and history buttons:

```html
<ion-button v-if="gameStore.isGameActive" @click="showDiceRoller = true">
  <ion-icon :icon="diceOutline" />
</ion-button>
```

Since ionicons doesn't have a die icon, use the custom `IconDie` component instead:
```html
<ion-button v-if="gameStore.isGameActive" @click="showDiceRoller = true">
  <IconDie :size="20" />
</ion-button>
```

**Step 2:** Add state and import:
```typescript
import IconDie from '@/components/icons/dice/IconDie.vue'
import DiceRollerSheet from '@/components/dice/DiceRollerSheet.vue'

const showDiceRoller = ref(false)
```

**Step 3:** Add the component in the template (after the layout picker AppModal):
```html
<DiceRollerSheet :is-open="showDiceRoller" @close="showDiceRoller = false" />
```

**Step 4:** Verify build: `npx vue-tsc --noEmit`

**Step 5:** Verify lint: `npm run lint`

**Step 6:** Commit: `feat: integrate dice roller into game view header`

---

### Verification Checklist

1. Die icon visible in GameView header when a game is active
2. Tapping die icon opens bottom sheet with 4 die type buttons
3. Tapping a die type shows animated roll (numbers cycling for 600ms)
4. Final result displayed large with glow effect
5. "Reroll" button re-rolls same die type
6. Sheet auto-dismisses after 4s of inactivity
7. No interference with life tracking — dice UI is in its own modal layer
8. `npx vue-tsc --noEmit` passes
9. `npm run lint` has no new errors
