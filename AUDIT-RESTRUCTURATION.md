# Audit de restructuration — MTG Commander

## 1. Synthèse exécutive

Le projet est globalement **sain et bien outillé** : Composition API idiomatique, props/emits typés, i18n correctement augmenté, `prefersReducedMotion` centralisé (`utils/motion.ts`), persistance debouncée avec flush `onScopeDispose`, undo/redo robuste et nettoyage `onUnmounted` systématique dans la plupart des composables. La dette principale est une **symétrie de god-objects** : un god-store (`gameStore.ts`, 821 l., ~47 membres exposés, 12+ responsabilités) et deux god-components (`LifeTracker.vue` 1563 l., `CardSearchPanel.vue` 1191 l.), plus une `GameView.vue` (954 l.) hébergeant mécanique de geste brute et flux métier post-partie. Les bugs réels sont peu nombreux et ciblés : un pool de floating numbers **partagé au niveau module** (glitch visuel multi-joueurs), des tweens GSAP `fire-and-forget` non tués, une boucle RAF d'horloge non suspendue hors partie, et des `any` aux frontières I/O. Les gains attendus : composants cibles < 250 lignes, logique testable unitairement (gestes, flip 3D, mort joueur, slices de store), et élimination de ~6 duplications structurelles (drop-target, rotation écran→local, seuils de drag, blocs LifeTracker). Aucun correctif ne requiert de nouvelle dépendance (`@vueuse/core` **n'est pas installé** — tous les helpers proposés sont maison).

## 2. Scorecard

| Dimension | Note (/10) | Verdict |
|---|---|---|
| Architecture & SOLID | 6 | God-store + god-components, mais bons réflexes (provide/inject, persistance centralisée) à généraliser. |
| KISS & DRY | 7 | Dossier composables sain ; restent ~5 duplications nettes (drop-target, rotation, seuils, constantes). |
| Performance (mobile) | 6 | Tweens/timers impératifs non nettoyés ; N timers 1s par joueur ; RAF d'horloge toujours active. |
| TypeScript & Standards | 7 | Props/emits/i18n typés ; trous ciblés (`any` Scryfall, `catch any` Firebase, `Symbol` nu vs `InjectionKey`). |
| État & flux (Pinia 3) | 7 | Setup store de bonne facture ; persistance via `watch deep`+`JSON.stringify` à migrer vers `$subscribe`. |
| Vue 3 / Ionic 8 / Capacitor 8 | 7 | Idiomatique ; `useGameFullscreen` crée un watch par appel, provide via clé string magique. |
| UI/UX ultra-polish | 6 | Cibles tactiles < 44px en compact, total de vie non focusable, tokens couleur incohérents, safe-area non consommée. |
| Animation & game feel | 7 | Socle GPU/easings solide ; pool floats partagé, reduced-motion absent en CSS de LifeTracker, flashs `box-shadow` infinis. |

## 3. Bonnes pratiques de référence (Context7)

- **Vue 3.5 (`/vuejs/docs`)** — Composer la logique en petites unités réutilisables (un composable peut en appeler d'autres : `useCardSwipeGesture` compose déjà `useLongPress`). `computed` est mis en cache (préférer aux méthodes dans le template pour les boucles coûteuses). `shallowRef`/`shallowReactive` pour grosses structures externes (objets GSAP, données Scryfall) où l'on remplace la racine. Vue nettoie automatiquement les effets créés dans `setup`, **mais PAS** les ressources impératives (`setTimeout`, `setInterval`, `gsap.to`, listeners manuels) : les annuler en `onUnmounted`. Typer provide/inject via `InjectionKey<T>` (pas un `Symbol` nu). En 3.5+ la destructuration de `defineProps` reste réactive, mais passer la variable à un `watch`/fonction externe perd la réactivité → `watch(() => props.x)` / `toRef`.
- **Pinia 3 (`/vuejs/pinia`)** — Setup store : déclarer refs/computed/fonctions et tout retourner. Getters = `computed` dérivés sans dupliquer l'état. `useOtherStore()` dans une action est idiomatique (placer les `useStore()` **avant** tout `await`). Persistance : préférer `store.$subscribe((mutation, state) => …)` + écriture debouncée plutôt qu'un `watch(..., {deep:true})` qui sérialise tout l'état. Pas de `$reset` sur setup store → `resetGame()` explicite.
- **Ionic 8 / Capacitor 8** — Consommer `env(safe-area-inset-*)` / `--ion-safe-area-*` sur les conteneurs de bord (crucial en plein écran `@boengli/capacitor-fullscreen`). `modalController` gère le cycle de vie du modal. Cibles tactiles ≥ 44×44 px (WCAG 2.5.5 / Apple HIG 44pt / Material 48dp). Recalculer les horloges sur `@capacitor/app` resume pour éviter la dérive en arrière-plan.
- **GSAP 3.14 (`/greensock/gsap`)** — `gsap.context()` track les tweens d'un scope et permet un cleanup unique via `ctx.revert()` (évite les tweens orphelins post-unmount). `gsap.matchMedia()` gère `prefers-reduced-motion` de façon déclarative. Animer `transform`/`opacity` (composés GPU) ; éviter d'animer `box-shadow`/`border-color`/`background-color`/`width`/`height` en boucle infinie (paint par frame).

> Note d'intégrité : le panel a documenté plusieurs auto-corrections (findings fabriqués retirés après lecture verbatim, ex. faux doublon de constante, faux `.orig`, fausse corruption CSS). Une seule divergence subsiste, **corrigée ci-dessous** : le finding « `gameConstants.ts` n'est importé par aucun fichier » est **erroné** (vérifié : ~14 fichiers l'importent dont `gameStore.ts`, `LifeTracker.vue`, `useLifeFeedback.ts`). Le vrai problème est partiel (constantes spécifiques non réutilisées), pas total — voir finding #16.

## 4. Top findings priorisés

*(dédupliqués entre dimensions, classés par ratio impact/effort)*

**#1 — Pool de floating numbers partagé au niveau MODULE → +N/-N supprimés en plein vol par un autre joueur**
Sévérité : medium · `src/composables/useFloatingNumbers.ts:5-6, 44-47` · Effort : **S**
`const activeFloats: HTMLElement[] = []` est au niveau module, donc partagé par les 4-6 cartes montées. Le plafond `MAX_ACTIVE_FLOATS=5` est global → `activeFloats.shift()` recycle le float d'un AUTRE joueur, et `oldest.remove()` ne tue pas le tween GSAP (continue sur nœud détaché). **Vérifié verbatim** (lignes 5-6 et 44-47 confirmées, composable bien câblé dans `LifeTracker.vue:552/676`).
**Reco** : plafonner sur `localFloats` (déjà présent l.35), `gsap.killTweensOf(oldest)` avant `oldest.remove()`, supprimer le tableau module `activeFloats` et toute sa comptabilité (push l.76, splice l.90-93/103-104).

**#2 — `any` aux frontières Scryfall alors qu'une interface `ScryfallCard` existe**
Sévérité : medium · `src/services/scryfall.ts:89-90, 143-144, 153-154` · Effort : **S**
```ts
const data: any = await response.json()
return data.data.map((card: any) => normalizeCard(card))
```
**Reco** : `interface ScryfallSearchResponse { data: ScryfallCard[] }` + `await response.json() as ScryfallSearchResponse` ; le `.map` se type seul, le `: any` disparaît. Idem `ScryfallAutocompleteResponse { data: string[] }` (vérifier au passage que ce n'est pas `data.results`).

**#3 — `catch (error: any)` avec `eslint-disable` réintroduit un `any` que TS interdit**
Sévérité : medium · `src/services/firebase.ts:42-43` · Effort : **S**
Désactive `useUnknownInCatchVariables`. **Reco** : `catch (error)` (type `unknown`) + narrowing (`if (error instanceof FirebaseError)` ou type-guard `isFirebaseError`). Supprime le `eslint-disable`.

**#4 — provide/inject via `Symbol` nu / clé string magique au lieu de `InjectionKey<T>`**
Sévérité : medium · `src/composables/useCardRotationContext.ts:14,42,47-48` + `src/views/GameView.vue:306-307` · Effort : **S**
Deux cas : `CARD_ROTATION_INJECTION_KEY = Symbol(...)` non typé, et `provide('gameDisplayMode', ...)` + `inject<Ref<...>>('gameDisplayMode', ref('grid') as ...)` (clé string dupliquée, cast, fallback ref isolé par consommateur → bug silencieux si provider absent).
**Reco** : `const key: InjectionKey<CardRotationContext> = Symbol(...)` et `const gameDisplayModeKey: InjectionKey<Ref<'grid'|'list'>> = Symbol(...)` dans un module partagé. `provide`/`inject` deviennent type-safe sans annotation manuelle.

**#5 — `useDamageShake` : tween de shake non tué (cumul + écriture post-démontage)**
Sévérité : medium · `src/composables/useDamageShake.ts:1-22` · Effort : **S**
`triggerShake` lance `gsap.fromTo` sans mémoriser ni tuer le tween précédent ni nettoyer au démontage (instancié par joueur). **Reco** : `let shakeTween` + `shakeTween?.kill()` avant relance + `onUnmounted(() => { shakeTween?.kill(); gsap.killTweensOf(shakeElement.value) })`.

**#6 — `useFloatingNumbers` : `setTimeout` non annulé + `ref` profond inutile**
Sévérité : medium · `src/composables/useFloatingNumbers.ts:12-25` · Effort : **S**
Chaque `spawn` programme un `setTimeout(1200)` jamais annulé. **Reco** : `const timers = new Set<number>()`, `clearTimeout` dans le callback + `onUnmounted(() => timers.forEach(clearTimeout))`. Passer à `shallowRef` (objets cosmétiques jamais mutés en place).

**#7 — `useLifeFeedback` : `setTimeout` du floating jamais annulé au unmount**
Sévérité : medium · `src/composables/useLifeFeedback.ts:76-79, 112-114` · Effort : **S**
`onUnmounted` ne fait que `unsubscribe()`, sans `clearTimeout` du delai d'apparition. **Reco** : suivre les ids dans un `Set` et `clearTimeout` au unmount, OU passer le délai à `addFloat` (qui gère déjà `killTweensOf`).

**#8 — `useGameClock` : boucle RAF jamais suspendue hors partie active (teardown HMR uniquement)**
Sévérité : low (batterie) · `src/composables/useGameClock.ts:~197-201, 233-237` · Effort : **M** · *(vérifié verbatim, sévérité ajustée high→low)*
Singleton délibéré ; la boucle `requestAnimationFrame` se reprogramme inconditionnellement même hors partie ; `teardownGameClock()` n'est appelé qu'en HMR. Pas de fuite (garde `initialized`), mais conso CPU/batterie inutile.
**Reco KISS** : piloter `startRafLoop()`/`stopRafLoop()` via le watch existant sur `gameStore.currentGame?.isRunning`, et au init ne démarrer que si une partie tourne. **NE PAS** ajouter `onUnmounted`/teardown prod (anti-idiomatique pour ce singleton).

**#9 — `usePlayerTimerDisplay` : un `setInterval(1s)` par carte joueur (jusqu'à 6 en parallèle)**
Sévérité : medium · `src/composables/usePlayerTimerDisplay.ts:17-34` · Effort : **M**
Le cleanup est correct, mais N timers 1s désynchronisés nuisent au coalescing/batterie. **Reco** : un tick unique mutualisé (dans `useGameClock`/store) exposant `elapsedSeconds` ; chaque carte dérive son affichage via un `computed`.

**#10 — Mécanique du bouton flottant « tour suivant » : ~135 lignes de geste brut dans la vue**
Sévérité : high · `src/views/GameView.vue:326-461` · Effort : **M**
Drag manuel + snap-back + long-press→pause + 3 computed styles + handlers pointer codés à la main. **Reco** : extraire `useFloatingTurnButton.ts` (+ `FloatingTurnButton.vue` pour le markup/CSS). Voir §5. *(Risque résiduel : aucun `onUnmounted` dans GameView → si démonté en plein drag, `pointermove` fuit ; `setPointerCapture`+`{once:true}` limitent le risque.)*

**#11 — Duplication de toute l'infra drop-target entre `useBadgeDrag` et `useCommanderDragDrop`**
Sévérité : medium · `useBadgeDrag.ts:159-181` vs `useCommanderDragDrop.ts:283-311` · Effort : **M** · *(vérifié verbatim)*
`findDropTarget`/`highlightDropTarget`/`clearDropHighlights` sur `[data-commander-player]` + flash gsap + haptique dupliqués (`clearDropHighlights` strictement identique). **Reco** : extraire `usePlayerDropTarget(playerId)` paramétré (couleur du glow, élément à masquer optionnel pour l'indicateur épée). **Ne PAS fusionner** les deux composables (ghost trail/modal restent spécifiques commander). Gain ~25-30 l. + un seul point de vérité pour le sélecteur DOM.

**#12 — Helper rotation écran→local dupliqué à l'identique (`useBadgeDrag` vs `useLifeDragGesture`)**
Sévérité : medium · `useBadgeDrag.ts:24-31` vs `useLifeDragGesture.ts:18-25` · Effort : **S**
Même matrice de rotation 0/90/180/270, seul le format de retour diffère ({x,y} vs tuple). **Reco** : `src/utils/rotateScreenDeltaToLocal(dx, dy, rotation): [number, number]` pur et testable.

**#13 — Bloc `<LifeTracker>` (5 props + 3 emits) dupliqué entre grille et liste**
Sévérité : high · `src/views/GameView.vue:110-159` · Effort : **M**
`PlayerGrid.vue` référencé par MEMORY.md **n'existe pas**. **Reco** : créer `src/components/game/PlayerGrid.vue` encapsulant les 2 modes (réutilise `usePlayerGridLayout`). Corriger MEMORY.md.

**#14 — Persistance : `watch deep` + `JSON.stringify` de tout le `GameState` à chaque salve**
Sévérité : medium · `src/stores/gameStore.ts:92-106` + `persistence.ts:24-26` · Effort : **M**
Deep-traversal + sérialisation synchrone de tout l'état (joueurs + historique jusqu'à `MAX_HISTORY_LENGTH`). **Reco** : `store.$subscribe((mutation, state) => scheduleSave(state))` en gardant le debounce + le flush `onScopeDispose`. Optionnel : ne pas persister l'historique complet.

**#15 — Cibles tactiles des badges orbitaux < 44px en cartes compactes**
Sévérité : medium · `src/components/life-tracker/LifeTracker.vue` (`.orbital-badge`, variante compacte ~l.1532-1535, plancher réel **22px**) · Effort : **M** · *(snippet d'origine corrigé : `.card-counter-badge` est un sélecteur mort, le `16px` n'existe pas)*
Les badges interactifs (`<button>` quand `interactive`) descendent à 22px en mode 4-6 joueurs. **Reco** : zone tactile ≥44px via `::after` (`width/height: max(100%,44px)`) appliquée **uniquement** aux badges interactifs (`.orbital-badge:not(.is-empty)`), en vérifiant l'absence de chevauchement avec les tap-zones de vie (NE PAS faire `inset:-50%`). Le total de vie (clamp 50-80px) est déjà correct.

**#16 — Constantes/seuils dispersés alors que `gameConstants.ts` centralise déjà**
Sévérité : medium · `useLifeDragGesture.ts:5`, `useCommanderDragDrop.ts:8`, `useBadgeDrag.ts:8`, `SeatingPhase.vue:144`, `GameView.vue:335` (+ `LONG_PRESS_DURATION_MS` ignoré par `useCardSwipeGesture.ts:9`) · Effort : **S**
Seuil de drag redéclaré dans 5 fichiers, 2 noms, 3 valeurs (10/15/6) ; `LONG_PRESS_DURATION_MS=500` ignoré au profit d'un `400` local. **Reco** : `DRAG_MOVEMENT_THRESHOLD_PX=10` + `SEAT_DRAG_THRESHOLD_PX`, `TAB_SWIPE_THRESHOLD_PX` nommés dans `gameConstants.ts`. *(NB : le finding « gameConstants importé par aucun fichier » est faux — il est importé par ~14 fichiers ; ne traiter que les littéraux réellement dispersés.)*

**#17 — Total de vie interactif mais en `role="status"` non focusable (édition inaccessible clavier)**
Sévérité : medium · `src/components/life-tracker/LifeTracker.vue:248-250` · Effort : **S**
`role="status"` (live region non activable) + `@click="openLifeNumpad"`. **Reco** : séparer la live region de l'action — envelopper l'ouverture du numpad dans un vrai `<button>` (ou `role=button tabindex=0 @keydown.enter.space.prevent`).

**#18 — `applyRemotePlayerSync` : `Object.assign` brut d'un `Partial` réseau dans l'état autoritaire**
Sévérité : low · `src/stores/gameStore.ts:744-749` · Effort : **M** · *(vérifié, sévérité ajustée high→low)*
Validation déléguée à l'appelant ; l'action publique ne garantit aucun invariant (`commanders`/`commanderDamageReceived` non clampés). Vecteur limité (types réseau = 8 champs `SyncedPlayerState`, `id/name/color` ne transitent pas). **Reco** : fusion explicite par liste blanche avec `Number.isFinite`/`Math.max` **dans l'action**, supprimant la duplication de validation côté `syncFromRemote`. Pas de zod/validateur générique (overkill).

**#19 — Bloc « détail de carte » inline dans CardSearchPanel (~120 l. template + ~225 l. CSS)**
Sévérité : high · `src/components/card-search/CardSearchPanel.vue:199-322 + 965-1190` · Effort : **M**
Plus grosse unité cohésive, couplage faible. **Reco** : extraire `CardDetailCard.vue`. Voir §5.

**#20 — Double debounce empilé sur la frappe (300ms searchbar + 350ms maison)**
Sévérité : medium · `CardSearchPanel.vue:7` + `useCardSearch.ts:80-86` · Effort : **S**
~650ms de latence perçue. **Reco** : garder un seul debounce (retirer `:debounce="300"` OU le `setTimeout(350)`).

**#21 — Animations CSS infinies sur `box-shadow`/`border-color` (paint par frame, non GPU)**
Sévérité : medium · `LifeTracker.vue:1257-1262, 1344-1354, 1370-1376` · Effort : **M**
`card-breathe`, `timer-aggressive-flash`, `behavior-rule-flash` peuvent flasher sur plusieurs cartes au pire moment (urgence chrono). **Reco** : porter les flashs sur un overlay `::after` animé en `opacity` uniquement + `will-change:opacity` pendant la phase active.

**#22 — Mapping zone→delta + import Capacitor Haptics directement dans la couche vue**
Sévérité : medium · `src/views/GameView.vue:480 (import), 590-593` · Effort : **S**
Règle métier (`zone→±1`) et SDK natif dispersés dans la vue. **Reco** : déléguer à `useTurnActions` + le service `haptics.ts` existant ; `handlePlayerTap` se réduit à un appel.

**#23 — Easing linéaire `ease:'none'` sur le death-shake (et le pulse de drag)**
Sévérité : medium · `LifeTracker.vue:956-961` · Effort : **S**
Va-et-vient `x:-4↔4 repeat:5` sans décroissance = mécanique, alors que `useDamageShake` voisin fait un shake organique. **Reco** : réutiliser `triggerDamageShake` pour le death-shake, OU easing organique `power2.inOut` + amplitude décroissante. Pulse de drag : `back.out(2)`/`power2.out`. Ajouter `will-change:transform`.

**#24 — `useGameFullscreen` crée un watch non arrêté à chaque appel**
Sévérité : medium · `src/composables/useGameFullscreen.ts:24-31` · Effort : **S**
État au niveau module (bien) mais le `watch(isFullscreen, …)` est créé dans la fonction → un watcher par composant appelant + appels `activateImmersiveMode` multiples. **Reco** : remonter le watch au niveau module (cohérent avec l'état singleton).

**#25 — Variables safe-area définies mais jamais consommées par les vues de jeu**
Sévérité : medium · `main.css:82-85` (définies) ; `GameView`/`SeatingPhase`/`InitiativePhase`/`LifeTracker` (0 usage `env()`/`safe-area`) · Effort : **M**
Bords à risque en plein écran sur device à encoche. **Reco** : consommer les insets sur les conteneurs de bord (`padding-top: var(--ion-safe-area-top)`, etc.) ; centraliser via util classes `.safe-pt`/`.safe-px`.

## 5. Plan de décomposition des hotspots

### 5.1 `LifeTracker.vue` (1563 l. → cible ~180-230 l.)

| Sous-unité | Type | Responsabilité | Contrat | Lignes migrées | ~L | Réutilise |
|---|---|---|---|---|---|---|
| `useCardFlip3D.ts` | composable | Logique pure flip 3D (FLIP_AXIS_MAP, styles, mémo axe) | `({cardRotation, isFlipped, isGestureActive, flipDragProgress, flipDirection}) => {flipInlineStyle, cardBackTransform, commitFlipAxis}` | 611-672 + 712-719 | 75 | `useCardRotationContext` |
| `useLifeAdjustment.ts` | composable | Taps batchés, repeat appui long, changeLifeBy, numpad | voir contrat détaillé data | 997-1067 | 100 | `gameStore.changeLife`, `useLifeFeedback`, services haptics/sounds |
| `useTokenBadges.ts` | composable | Config table jetons {get/set/icon/clamp}, visibleBadgeKeys, steppers | voir data | 862-926, 1071-1077, 1084-1150 | 130 | `gameStore.change*`, `useFloatingNumbers` |
| `useDeathState.ts` | composable | Machine de mort + watch+shake | `({player, panelRef, emitStateChanged}) => {deathReason, showDeathConfirmation, isConfirmedDead, confirm/revert}` | 928-970, 1176-1191 | 85 | `gameStore.isPlayerDead*`, `useCelebration` |
| `useLifeTrackerVisualState.ts` | composable | Classes d'état dérivées | `({player, isCurrentTurn, deathReason}) => {playerBgClass, lifeColorClass, dangerPulseClass, activeTurnBreathingClass}` | 835-858, 941-944 | 55 | `LOW_LIFE_WARNING_THRESHOLD` |
| `TokenBadges.vue` | composant | Rendu radial badges (boucle config) | props `{player, badgeStyle, hourglassAnimating}` ; emits open-counter/open-token-picker/badge-touchstart/change-poison | 99-242 | 150 | icônes `Icon*` existantes |
| `CounterStepperOverlay.vue` | composant | Overlay +/- jetons | props `{type, value}` ; emits step/close | template stepper | 70 | `IconPoison/Experience/Energy` |
| `CardActionButtons.vue` | composant | Boutons de tour + tooltip (propre `onUnmounted`) | props show* ; emits release-priority/respond | 806-824 + template | 110 | `ActionButton.vue` |
| `DeathOverlays.vue` | composant | Overlays confirmation/mort | props `{showConfirmation, isConfirmedDead, deathReason, playerName}` ; emits confirm/revert | template death-overlay ×2 | 90 | `IconSkull` |
| `LifeHeroZone.vue` | composant | Identité + vie animée + pending | props `{player, animatedLife, displayedPendingLife, lifeColorClass}` ; emits open-numpad/life-touch* | 77-267 (hors badges) | 95 | `useAnimatedNumber` (parent) |
| `PlayerTimerBar.vue` | composant | Barre timer total/round | props formatted*/classes | 269-300 | 60 | `usePlayerTimerDisplay` (parent) |
| `SwipeZones.vue` | composant | 2 zones tactiles (réutilisables 2 faces) | emits touchstart/move/end/cancel | 58-75 + ~466-481 | 35 | — |

**Étapes** : (1) `useCardFlip3D` (test table 4×4) → (2) `useLifeTrackerVisualState` → (3) `SwipeZones` (2 faces) → (4) `PlayerTimerBar`+`LifeHeroZone`+`TokenBadges` → (5) `useTokenBadges`+`CounterStepperOverlay` (supprime triple duplication + filtrage types steppables) → (6) `useLifeAdjustment` → (7) `useDeathState`+`DeathOverlays` → (8) `CardActionButtons` → (9) nettoyage parent, répartition de l'`onUnmounted` unique (985-995), trancher `poisonLongPress` orphelin (1079-1082).
**Risques** : chaîne d'événements tactiles fortement couplée (panelRef/heroZoneRef uniques, `touchmove` non-passif avec `preventDefault`, z-index multi-couches) → toute extraction présentationnelle DOIT **relayer** les handlers sans réattacher de listeners concurrents. `storedFlipAxis/Sign` figés AVANT le toggle `isFlipped` → `commitFlipAxis` doit préserver ce séquençage. Points à **traiter** (pas migrer tels quels) : `poisonLongPress` orphelin, absence de filtrage dans `openCounterStepper`.

### 5.2 `CardSearchPanel.vue` (1191 l. → cible ~120 l.)

| Sous-unité | Type | Responsabilité | Contrat | Lignes migrées | ~L | Réutilise |
|---|---|---|---|---|---|---|
| `CardDetailCard.vue` | composant | Détail carte (image/mana/oracle/légalités repliables) | props `{card, imageUrl}`, aucun emit | 199-322 + 409,412-431 + CSS 965-1190 | 240 | `utils/mana`, `types/card` |
| `CardSearchFilters.vue` | composant | Panneau filtres (couleurs/types/CMC/raretés/stats) | props valeurs filtre + fonctions toggle* de `useCardSearch` | 13-182 + 408,487-500 + CSS 503-963 | 240 | `useCardSearch`, `cardSearchOptions` |
| `config/cardSearchOptions.ts` | type-module | Constantes pures (COLOR/TYPE/CMC/RARITY/LEGALITY) | exports | 412-417, 433-458 | 45 | `types/card` |
| `utils/i18nHelpers.ts` (ajout) | util | `capitalizeFirst` générique | `(value:string)=>string` | 429-431 | 4 | fichier existant |
| `CardSearchPanel.vue` (coquille) | composant | Orchestrateur : searchbar + suggestions + composition + mode sélection | props `{selectionMode?, initialCommanderOnly?}` ; emit `select` (INCHANGÉ) | reste | 120 | `useCardSearch`, `IllustrationNoResults` |

**Étapes** : (1) test fumée → (2) `cardSearchOptions.ts` → (3) `capitalizeFirst` vers utils → (4) `CardDetailCard.vue` → (5) `CardSearchFilters.vue` → (6) nettoyage coquille → (7) trancher double debounce → (8) passe finale CSS/lint/visuel.
**Risques** : CSS scoped non partagé → dupliquer les classes **partagées** `.more-toggle`/`.more-content`/`.more-chevron` (utilisées par filtres ET section légalités) dans chaque sous-composant (oubli = style légalités cassé). Garder `statRefs`/`showMoreFilters` liés à `useCardSearch` (passés en props, pas recopiés). Contrat public `emit('select')` + props **INCHANGÉ**.

### 5.3 `GameView.vue` (954 l. → cible < 250 l.)

| Sous-unité | Type | Responsabilité | Contrat | Lignes migrées | ~L | Réutilise |
|---|---|---|---|---|---|---|
| `PlayerGrid.vue` | composant | Plateau grid+list (supprime duplication LifeTracker) | props displayMode/players/currentTurnPlayerId/flashing/commanderDragState ; emits commander-drag-drop/turn-advanced/player-state-changed | 110-159 + 314-324 + CSS 949-952 | 120 | `usePlayerGridLayout`, `LifeTracker` |
| `useFloatingTurnButton.ts` | composable | Drag + snap-back + long-press→pause + transforms | voir data | 326-461 | 130 | `useLongPress`, `motion` |
| `FloatingTurnButton.vue` | composant | Markup bouton + ripples + CSS | props isPaused/canGoToPrevious/showPauseRipple ; emits advance/previous-turn | 162-217 + CSS 783-918 | 150 | `useFloatingTurnButton` |
| `useAnonymousPlayerSaver.ts` | composable | File post-partie + persistance registry | `{currentAnonymousPlayer, enqueueFrom, saveCurrent, advance, skip, isEmpty}` | 522-533, 681-746 | 110 | `playerRegistryStore`, `presentModal` |
| `GameTopbar.vue` | composant | Tour + timer + 3 boutons | props turn/player/timer/displayMode/iconRotationStyle ; emits open-dice/toggle-display/open-menu | 37-92 + CSS 758-781 | 90 | `IconDie`, ionicons |
| `useGameMenuActions.ts` | composable | `presentModal` menu/layout/orientation/history | `{openGameMenu, openLayoutPicker, openOrientationPicker, openHistory}` | 465-520 | 80 | `presentModal`, `GameMenuContent` |

**Étapes** : (0) corriger MEMORY.md (PlayerGrid inexistant), vérifier couverture `useTurnActions` → (1) `PlayerGrid` → (2) `useFloatingTurnButton`+`FloatingTurnButton` (~-200 l.) → (3) `useAnonymousPlayerSaver` → (4) `GameTopbar` → (5) `useGameMenuActions` → (6) regrouper undo/redo/advance via `useTurnActions`, **supprimer la double sync** (`onTurnAdvanced` l.752 vs `handleAdvanceTurn` l.620), déplacer `watch currentPlayerCount` (549-557) vers `usePlayerGridLayout`/settings → (7) nettoyage final.
**Risques** : mécanique pointer-capture + snap-back subtile (tester sur device tactile). `priorityPlayerRotation` consommé par topbar + bouton flottant + flèche → garder UNE source passée en prop. **NE PAS** déplacer le `provide('gameDisplayMode')` hors de GameView (sinon rotation des cartes cassée). `useGameClock` singleton → l'instancier dans GameView et passer `isTimerRunning`/`toggleTimer` en props (éviter de dupliquer la boucle RAF). Double sync multijoueur déjà présente à clarifier.

### 5.4 `gameStore.ts` (821 l. → cible < 250 l.)

| Sous-unité | Type | Responsabilité | Contrat | Lignes migrées | ~L | Réutilise |
|---|---|---|---|---|---|---|
| `gameStore.ts` (orchestrateur) | store | refs + watch save + onScopeDispose + composition + return public identique | API ~47 membres INCHANGÉE | 55-118, 758-821 | 170 | persistence, statsStore |
| `game/migrateGameState.ts` | util | Migration/backfill legacy (pur) | `(saved: GameState) => GameState` | 61-90 | 40 | types/game |
| `game/useActionHistory.ts` | composable | addAction + undo/redo + undoUntilPlayerAlive + computeds | `(ctx) => {addAction, undo*, redo*, canUndo, canRedo, nextRedoAction}` | 241-270, 669-704 | 75 | gameActionHandlers, gameConstants |
| `game/usePlayerActions.ts` | composable | Mutations vie/compteurs/statuts (changeCounter généralisé) | `(ctx) => {changeLife, dealCommanderDamage, change*, toggle*, castCommander, getCommanderTax}` | 272-540 | 130 | gameConstants |
| `game/useGameDerivations.ts` | composable | Dérivations lecture seule (règle de mort unifiée) | `(ctx) => {playerDeadStatusMap, isPlayerDead*, currentTurnPlayer, nextTurnPlayer, effectivePriorityPlayer}` | 120-169, 389-403 | 80 | gameActionHandlers (`checkPlayerDead` unifié), settings |
| `game/useTurnFlow.ts` | composable | advanceTurn (+ helper time-bank) + takePriority/releasePriority | `(ctx) => {advanceTurn, takePriority, releasePriority}` | 588-667 | 85 | settings |
| `game/useSeatProfiles.ts` | composable | Mapping profil/deck + watch persistance + sièges | `(ctx) => {playerProfileMapping, setCustomPositionMap, swap*, reorder*, clearProfileMapping}` | 43-58, 108-114, 206-239, 760-761 | 85 | — |

**Étapes** : (0) test d'intégration figeant le comportement (startNewGame→changeLife×3→changePoison→advanceTurn→undo/redo→endGame) → (1) `migrateGameState` (pur) → (2) `useActionHistory` → (3) `useGameDerivations` (unifier `checkPlayerDead` avec celui de `gameActionHandlers`) → (4) `usePlayerActions` (généraliser `changeCounter` pour rad/hourglass/ring/cityBlessing) → (5) `useTurnFlow` (isoler `computeHourglassTimeBank`) → (6) `useSeatProfiles` → (7) réduire orchestrateur → (8) diff de l'API exportée contre les ~25 consommateurs.
**Risques** : passer la **ref** `currentGame` (pas une valeur destructurée) pour préserver la réactivité profonde + le watch deep. `addAction` partagé en closure (sinon undo/redo + batching de `changeLife` cassent — `changeLife` lit/mute le dernier élément de `history`). Fournir `getSettings` via le contexte (éviter `useSettingsStore()` hors scope de setup, actuellement appelé 6× inline). API publique (return l.771-820) consommée par ~25 fichiers → l'étape 8 est **obligatoire**.

## 6. Roadmap par phases

### Phase 0 — Quick wins (effort global : S, ~0,5 j)
**Objectif** : éliminer code mort, bugs cosmétiques et nombres magiques sans risque.
**Lots** : #1 (pool floats), #5 (#damageShake kill), #6 (floatingNumbers timers/shallowRef), #7 (lifeFeedback timers), #16 (constantes de seuils + LONG_PRESS), corriger MEMORY.md (PlayerGrid inexistant), retirer `import type Ref` inutilisé + `CardRotationDirection` mort (`useCardRotationContext.ts:1,3`).
**Done** : lint/oxlint + Vitest verts ; floats par-instance vérifiés ; aucune constante de drag/long-press en littéral local.

### Phase 1 — Durcissement types & ressources (effort : S-M, ~1 j)
**Objectif** : refermer les trous de typage I/O et les fuites de ressources impératives.
**Lots** : #2 (Scryfall `any`), #3 (Firebase catch), #4 (`InjectionKey` rotation + gameDisplayMode), #8 (RAF horloge suspendue), #24 (watch fullscreen module-level), #20 (double debounce). Reclasser `useControllerModal` → `services/modalPresenter.ts`.
**Done** : 0 `any` aux frontières ciblées ; RAF suspendue hors partie (vérifié en dev) ; un seul debounce de recherche.

### Phase 2 — DRY composables & a11y (effort : M, ~1,5 j)
**Objectif** : factoriser les duplications structurelles et corriger l'accessibilité critique.
**Lots** : #11 (`usePlayerDropTarget`), #12 (`rotateScreenDeltaToLocal`), #15 (hit-areas 44px), #17 (total de vie focusable), #25 (safe-area), #21 (flashs en overlay opacity), #23 (easings organiques), #22 (mapping/Haptics hors GameView).
**Done** : sélecteur `[data-commander-player]` unique ; cibles ≥44px en 6 joueurs sans chevauchement ; insets consommés sur device à encoche.

### Phase 3 — Décomposition `CardSearchPanel` + `GameView` (effort : M-L, ~3 j)
**Objectif** : ramener deux vues sous 250 lignes, livrables par sous-composant.
**Lots** : §5.2 intégral (CardDetailCard, CardSearchFilters, cardSearchOptions) ; §5.3 par étapes — #13/PlayerGrid d'abord, puis #10/FloatingTurnButton (plus gros gain), puis useAnonymousPlayerSaver, GameTopbar, useGameMenuActions, suppression double sync (#findings mineurs).
**Done** : `CardSearchPanel` ~120 l., `GameView` < 250 l. ; tests fumée + vérif tactile manuelle ; contrats publics inchangés.

### Phase 4 — Décomposition `gameStore` en slices (effort : L, ~3 j)
**Objectif** : réduire le god-store en composables de slice ré-exposés par un store unique.
**Lots** : §5.4 intégral, précédé du test d'intégration figeant le comportement (#14 `$subscribe` peut être intégré à l'orchestrateur final), #18 (durcir `applyRemotePlayerSync`).
**Done** : `gameStore.ts` < 250 l. ; diff de l'API exportée contre les ~25 consommateurs = 0 membre supprimé/renommé ; suite Vitest verte.

### Phase 5 — Décomposition `LifeTracker` (effort : L, ~4 j)
**Objectif** : décomposer le god-component le plus couplé, en dernier (dépend des helpers stabilisés en Phases 1-2).
**Lots** : §5.1 intégral, strictement incrémental (composables purs → présentationnels → gestes/vie/mort), répartition de l'`onUnmounted` unique, traitement du `poisonLongPress` orphelin et du filtrage `openCounterStepper`. Inclut #9 (timer mutualisé) une fois `useGameClock` stabilisé en Phase 1.
**Done** : parent ~180-230 l. ; flip 3D + gestes tactiles non régressés (test device) ; couverture Vitest des composables purs (flip 4×4, batching taps, machine de mort).

## 7. Annexe — findings mineurs

- `useControllerModal.ts` n'est pas un composable (pas de `use*`, aucun état réactif) → déplacer vers `services/modalPresenter.ts` (l.13-35).
- `useCardRotationContext.ts` : `import type Ref` inutilisé (l.1) + type `CardRotationDirection` jamais référencé (l.3).
- `applyRemoteGameSync` asymétrique : `startedAt`/`elapsedMs` émis vers Firebase mais jamais réappliqués côté clients (`gameStore.ts:751-756` vs `multiplayerStore.ts:254-259`) → aligner sur un type partagé, décider du sort des champs temporels.
- `statsStore` : `watch deep` superflu réécrivant tout `gameRecords` à chaque partie (2-6 écritures) → retirer `{deep:true}`, batcher les `recordGame` de fin de partie (`statsStore.ts:8-26`).
- Règle de mort dupliquée 3× dans `gameStore` (`checkPlayerDead`, `isPlayerDeadByCommanderDamage`, `isPlayerDeadByPoison`) + `useSettingsStore()` appelé 6× inline → lire les seuils une fois, unifier avec `gameActionHandlers.checkPlayerDead`.
- `gameStore` : 4 mutateurs de compteurs (`changeRadCounters`/`changeHourglassTokens`/`setRingLevel`/`toggleCityBlessing`) réimplémentent le pattern de `changeCounter` au lieu de l'étendre (l.332-509).
- Migration legacy inline dans le setup du store (`gameStore.ts:61-90`) → extraire `migrateGameState` pur testable.
- 9 composables de geste/animation câblés directement dans `LifeTracker.vue` (l.545-553, 775-862) → regrouper la grappe de gestes en `usePlayerCardInteractions`.
- `useLifeDragGesture` : pas de coalescing RAF sur `onPointerMove` (gating par palier déjà correct) — optionnel (`useLifeDragGesture.ts:22-33`).
- `usePageEnterAnimation` : tween d'entrée non tué au démontage (`onUnmounted(() => enterTween?.kill())` ou `gsap.context()`) (l.7-26 / 29-55).
- `useSheetAnimation` : tweens `fire-and-forget` sans kill ni garde `prefersReducedMotion` (l.1-2, 56, 77, 101-104).
- `useModalAnimation` : reduced-motion = `duration(1ms)` au lieu de supprimer la transform ; stagger `onFinish` non tué (l.31-37, 41-59).
- Services `haptics.ts` : appels `Haptics.impact` non enrobés de try/catch → risque d'`Unhandled rejection` (l.7-11) ; vérifier un flag settings.
- `useControllerModal` : `onDidDismiss().then` sans `.catch` ; exposer optionnellement `onDidDismiss` pour permettre l'`await` côté appelant (l.20-26).
- 2 zones de swipe copiées à l'identique entre face front (58-75) et back (~466-481) de `LifeTracker` → `SwipeZones.vue`.
- `openCounterStepper` sans filtrage des types valides (un `commander-N` ouvrirait un stepper vide) — fragile, pas de bug actif (`LifeTracker.vue:1090-1093`).
- `@media (prefers-reduced-motion)` global présent et correct (main.css 806-812) ; durcissement optionnel : `animation-delay:-1ms` + `animation:none` ciblé sur les effets décoratifs en boucle.
- État vide « pas de partie » sous-hiérarchisé (pas de titre Beleren, illustration non `aria-hidden`, bloc non annoncé) (`GameView.vue:4-12`).
- Couleurs Tailwind brutes (emerald/amber/green) pour City's Blessing/Ring/Rad au lieu des tokens `@theme` ; `amber-500` ≈ `arena-gold` ≈ `commander-damage` → ambiguïté chromatique (`LifeTracker.vue:162-199`).
- Wrappers d'emit triviaux dans GameView (`onPlayerStateChanged`/`onTurnAdvanced`) + double sync potentielle `syncTurnAdvance` (l.620 et 752).
- `watch currentPlayerCount` arbitrant la validité des layouts = logique de configuration dans la vue → déplacer vers `usePlayerGridLayout`/settings (`GameView.vue:549-557`).