# MTG Commander -- Audit Complet

**Date :** 2026-02-23
**Version auditee :** `720ad17` (branche `master`)
**Stack :** Vue 3.5 + Ionic 8 + Pinia 3 + TailwindCSS 4 + Vite 7 + TypeScript 5.9 + Firebase RTDB + SQLite + Capacitor 8
**Lignes de code :** ~4 232 (TypeScript + Vue SFC)

---

## Table des matieres

1. [Resume executif](#1-resume-executif)
2. [Architecture & Tech Lead](#2-architecture--tech-lead)
3. [Securite](#3-securite)
4. [Frontend (Vue / Ionic / Tailwind)](#4-frontend-vue--ionic--tailwind)
5. [Design Patterns & SOLID](#5-design-patterns--solid)
6. [Logique de jeu MTG Commander](#6-logique-de-jeu-mtg-commander)
7. [UX/UI Game Design](#7-uxui-game-design)
8. [Webmaster (PWA / SEO / Performance)](#8-webmaster-pwa--seo--performance)
9. [Roadmap de remediation](#9-roadmap-de-remediation)

---

## 1. Resume executif

| Domaine | Note | Critiques | Hauts | Moyens | Bas/Info |
|---------|------|-----------|-------|--------|----------|
| Architecture & Tech Lead | **6/10** | 3 | 0 | 0 | 16 warnings |
| Securite | **6/10** | 0 | 3 | 5 | 9 |
| Frontend (Vue/Ionic/Tailwind) | **6.5/10** | 1 (i18n) | 0 | 4 | 5 |
| Design Patterns & SOLID | **4.5/10** | 0 | 0 | 6 | 4 |
| Logique de jeu MTG | **5/10** | 2 | 5 | 4 | 7 |
| UX/UI Game Design | **6.6/10** | 0 | 3 | 4 | 4 |
| Webmaster (PWA/SEO/Perf) | **4/10** | 2 | 0 | 3 | 2 |

**Verdict global : 5.5/10** -- L'application est fonctionnelle avec un design system de qualite (8.5/10 sur le visuel), mais presente des lacunes critiques en multiplayer (degats commandant cross-device non synchronises), PWA (totalement absente), et i18n (50+ chaines codees en dur). Le `gameStore` centralise trop de responsabilites et l'undo/redo comporte des bugs dans les cas limites.

**Top 5 des problemes les plus urgents :**
1. Degats commandant cross-device non synchronises en multiplayer
2. `.env` absent du `.gitignore` + regles Firebase non deployees
3. `signInAnonymously()` fire-and-forget (aucun await, aucun catch)
4. Undo monarque/initiative laisse un etat invalide (personne n'a le statut)
5. Aucune PWA (pas de manifest, pas de service worker, pas installable)

---

## 2. Architecture & Tech Lead

### 2.1 Organisation du code -- OK

```
src/
  components/        # Composants UI groupes par domaine (5 sous-dossiers)
  composables/       # Logique reactive reutilisable (2 fichiers)
  i18n/              # Internationalisation (fr + en)
  router/            # Configuration des routes (lazy-loaded)
  services/          # Services externes et utilitaires (7 fichiers)
  stores/            # Etat global Pinia (5 stores)
  types/             # Definitions TypeScript (3 fichiers)
  views/             # Pages/vues (8 fichiers)
```

**Points forts :**
- Separation claire views / components / services / stores
- Lazy-loading de toutes les routes via `() => import()`
- Composition API (`<script setup lang="ts">`) utilisee partout
- Zero `any` dans tout le codebase
- Code splitting Ionic + Firebase dans `vite.config.ts`

**Points faibles :**
- `services/` melange adaptateurs API (`firebase.ts`, `scryfall.ts`) et utilitaires (`haptics.ts`, `sounds.ts`)
- `sounds.ts` et `scryfall.ts` importent des stores Pinia, creant un couplage ascendant (service -> store)

### 2.2 Dependances -- WARNING

| Probleme | Severite | Fichier |
|----------|----------|---------|
| `@capacitor/cli` en `^7.5.0` alors que les runtimes sont en `^8.x` | **CRITIQUE** | `package.json:40` |
| `.env` absent du `.gitignore` (seul `*.local` est ignore) | **CRITIQUE** | `.gitignore` |
| `gsap` (~30KB gz) et `vue-i18n` (~50KB) non isoles en chunks separates | WARNING | `vite.config.ts` |
| `canvas-confetti` : la fonction `gameVictory()` n'est jamais appelee | INFO | `useCelebration.ts` |

### 2.3 TypeScript -- OK

- **Zero usage de `any`** dans tout le code source
- Strict mode active via `@vue/tsconfig`
- Types bien structures dans `src/types/` (3 fichiers, 153 lignes)

**Point faible :** Plusieurs interfaces importantes definies dans les services plutot que dans `src/types/` :
- `RoomData`, `RoomPlayer`, `SyncedGameState`, `SyncedPlayerState` dans `firebase.ts`
- `LocalCard`, `RawScryfallBulkCard`, `BulkInsertProgress` dans `database.ts`
- `AppPreferences` dans `persistence.ts`
- `DownloadProgress` dans `bulkDownload.ts`

### 2.4 Gestion d'etat (Pinia) -- WARNING

| Store | Lignes | Probleme |
|-------|--------|----------|
| `gameStore.ts` | 490 | **God Object** : game lifecycle + mutations joueurs + undo/redo + detection mort + persistence + stats |
| `multiplayerStore.ts` | 293 | Race condition : `doPushLocalPlayerState()` async sans `await` ni `.catch()` dans le debounce |
| `settingsStore.ts` | 75 | `soundEnabled` et `soundVolume` ne sont **pas persistes** (reset a chaque rechargement) |
| `settingsStore.ts` | 75 | `isDarkMode` declare, exporte, **jamais lu** par aucun composant |
| `settingsStore.ts` | 75 | `keepScreenOn` persiste mais **aucun plugin** ne l'implemente (pas de `@capacitor-community/keep-awake`) |

**Bug :** `syncFromRemote` dans `multiplayerStore.ts` mute directement `gameStore.currentGame.players[*]`, contournant le systeme d'historique et d'undo. Ces changements distants sont invisibles pour le game logic layer.

### 2.5 Gestion d'erreurs -- WARNING

| Probleme | Severite | Fichier |
|----------|----------|---------|
| `signInAnonymously(auth)` fire-and-forget (Promise ni await ni catch) | **CRITIQUE** | `firebase.ts:57` |
| Scryfall : les 4 fonctions publiques avalent les erreurs et retournent des resultats vides | WARNING | `scryfall.ts` |
| 23 blocs `catch` vides dans le codebase | WARNING | Multiples fichiers |
| Erreurs globales uniquement loguees en console, aucune notification utilisateur | WARNING | `main.ts:16-22` |
| `.catch(() => {})` fire-and-forget sur `SplashScreen.hide()`, `cleanupExpiredRooms()`, `deleteRoom()`, `leaveRoom()` | WARNING | Multiples fichiers |

### 2.6 Tests & CI

- **Zero test unitaire** malgre `vitest` et `@vue/test-utils` installes
- CI basique : lint + build (`ci.yml`), pas de tests, pas de deploiement
- Pas de pre-commit hooks

---

## 3. Securite

### 3.1 Findings haute severite

| ID | Severite | Probleme | Fichier |
|----|----------|----------|---------|
| F-01 | **HIGH** | Regles Firebase non deployees -- seulement en commentaire dans le code. Les regles recommandees ne verifient que `auth != null`, pas l'appartenance a la room. | `firebase.ts:23-33` |
| F-04 | **HIGH** | Aucune verification d'autorisation sur les ecritures room. N'importe quel utilisateur anonyme authentifie peut modifier/supprimer n'importe quelle room. | `firebase.ts:265-285` |
| E-01 | **HIGH** | `.env` non present dans `.gitignore`. Si un `.env` est cree avec des credentials Firebase, il sera committe. | `.gitignore` |

### 3.2 Findings moyens

| ID | Severite | Probleme | Fichier |
|----|----------|----------|---------|
| F-02 | MEDIUM | `signInAnonymously()` non awaite -- si l'auth echoue, toutes les operations DB echouent silencieusement | `firebase.ts:57` |
| F-03 | MEDIUM | Codes room generes avec `Math.random()` au lieu de `crypto.getRandomValues()` | `firebase.ts:69-76` |
| I-01 | MEDIUM | Noms joueurs non sanitises (caracteres de controle Unicode) avant push Firebase | `PlayerDetailModal.vue` |
| I-03 | MEDIUM | Aucune validation serveur des settings de jeu (`playerCount: 1000`, `startingLife: -999` possibles) | `firebase.ts:135-189` |
| I-04 | MEDIUM | Pas de rate-limiting sur la creation de rooms | `firebase.ts:135-192` |
| C-01 | MEDIUM | Aucun header Content-Security-Policy (CSP) | `index.html` |
| D-01 | MEDIUM | 17 vulnerabilites haute severite dans les devDependencies (minimatch ReDoS, via eslint) | `package-lock.json` |

### 3.3 Points positifs securite

- **Zero `v-html`** dans tout le codebase (pas de risque XSS)
- **Zero `eval()`**, `innerHTML`, `document.write`
- Toutes les requetes SQL parametrees (`?` placeholders) -- pas d'injection SQL
- Input recherche FTS5 sanitise : `query.replace(/[^\w\s]/g, '')`
- Scryfall API : `encodeURIComponent()` sur toutes les entrees utilisateur
- Aucun tracking, analytics, ou script tiers charge
- Surface externe minimale : uniquement Scryfall API + Firebase RTDB

### 3.4 CSP recommande

```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self';
    script-src 'self';
    style-src 'self' 'unsafe-inline';
    img-src 'self' https://cards.scryfall.io https://*.scryfall.com data:;
    connect-src 'self' https://api.scryfall.com https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com;
    font-src 'self';">
```

---

## 4. Frontend (Vue / Ionic / Tailwind)

### 4.1 Vue 3 -- OK

- Composition API (`<script setup>`) partout, zero Options API
- `defineProps` et `defineEmits` types avec generiques TypeScript
- Tous les `v-for` avec `:key` stables
- Nettoyage correct des `setInterval` et timers dans `onUnmounted`
- `computed` utilise pour les etats derives (`playerGridClass`, `cardImageUrl`, `totalCommanderDamage`)

**Bug :** `PlayerDetailModal.vue` mute directement les objets joueur depuis `gameStore.currentGame.players` pour `toggleMonarch`, `toggleInitiative`, `addCommander`, `removeCommander`, `updateName`. Cela contourne le systeme d'historique -- ces actions ne sont pas undo-ables.

### 4.2 Ionic -- WARNING

| Probleme | Severite |
|----------|----------|
| **Aucun hook Ionic** (`ionViewDidEnter`, `ionViewWillLeave`) dans aucune vue | WARNING |
| Mode force en `'md'` (Material Design) meme sur iOS | INFO |

L'absence de hooks Ionic est problematique : dans un layout a onglets, `onMounted`/`onUnmounted` ne se declenchent qu'une seule fois. Le timer pourrait mal se comporter en naviguant entre onglets.

### 4.3 i18n -- CRITIQUE

**50+ chaines en francais codees en dur**, rendant le mode anglais fondamentalement casse :

| Fichier | Exemples |
|---------|----------|
| `gameStore.ts` | `` `Joueur ${n}` ``, `PV`, `recoit ... degats de commandant`, `monarque`, `l'initiative`, `` `Tour ${n}` `` |
| `CommanderPicker.vue` | **Entierement en francais** -- aucun import de `useI18n()` |
| `LifeTracker.vue` | Tous les `aria-label` en francais (`` `Details de ${player.name}` ``, `` `Diminuer la vie de...` ``) |
| `SettingStepper.vue` | `` `Diminuer ${label}` ``, `` `Augmenter ${label}` `` |
| `HomeView.vue`, `SettingsView.vue` | `label="joueurs"`, `label="vie"`, `label="degats commandant"` |
| `offlineStore.ts` | `'Jamais'`, `'Base de donnees non disponible...'`, `'Erreur inconnue'` |
| `multiplayerStore.ts` | `'Erreur de connexion'`, `'Room fermee'` |
| `firebase.ts` | `'Room introuvable'`, `'Room expiree'`, `'Pas assez de places'` |
| `StatsView.vue`, `SettingsView.vue` | `toLocaleDateString('fr-FR')` code en dur |

### 4.4 Performance -- WARNING

| Probleme | Severite | Fichier |
|----------|----------|---------|
| Deep watcher sur `currentGame` avec le tableau `history` croissant (comparaison profonde couteuse) | WARNING | `gameStore.ts:50-62` |
| Aucune annulation de requete (`AbortController`) sur la recherche de cartes | WARNING | `CardSearchView.vue`, `CommanderPicker.vue` |
| `reversedHistory` recree une copie inversee a chaque trigger reactif | WARNING | `GameHistoryModal.vue:69-71` |
| Splash screen avec 1000ms de delai artificiel | INFO | `SplashOverlay.vue` |
| Listener Firebase `syncFromRemote` sans throttling sur les mises a jour entrantes | WARNING | `multiplayerStore.ts` |

### 4.5 Accessibilite -- WARNING

**Points forts :**
- Touch targets >= 44x44px sur les boutons principaux
- `role="status"` et `role="alert"` correctement places
- `:focus-visible` avec outline orange
- `prefers-reduced-motion` respecte (CSS + composable `useAnimatedNumber`)
- Quick increment buttons a `min-h-[36px]` (legerement sous les 44px recommandes)

**Points faibles :**
- **Tous les `aria-label` en francais** -- non traduits par i18n
- **Aucune consideration daltonisme** : couleurs mana = seul differenciateur entre joueurs (rouge/vert indistinguables pour 8% des hommes)
- Abbreviations compteurs (P, C, E, N, M, I, T) non lisibles par lecteurs d'ecran
- Opacites de fond mana desequilibrees : blanc a 10% vs noir a 50%

---

## 5. Design Patterns & SOLID

### 5.1 Principes SOLID

| Principe | Note | Probleme principal |
|----------|------|--------------------|
| Single Responsibility | 5/10 | `gameStore.ts` (491 lignes, 20+ exports) = God Object |
| Open/Closed | 4/10 | Ajout d'un type d'action = modifier `applyActionReverse` + `applyActionForward` + `GameHistoryModal` |
| Liskov Substitution | 7/10 | `SyncedPlayerState` vs `PlayerState` sans contrat partage |
| Interface Segregation | 6/10 | `PlayerState` (11 champs) fourni en entier meme quand 2 suffisent |
| Dependency Inversion | 3/10 | Services importent directement des stores concrets |

### 5.2 Anti-patterns detectes

**Shotgun Surgery : 13 fichiers pour ajouter un type de compteur**

1. `PlayerState` dans `game.ts`
2. `GameActionType` dans `game.ts`
3. `createPlayer` dans `gameStore.ts`
4. Nouvelle fonction `changeXxx` dans `gameStore.ts`
5. `applyActionReverse` (switch) dans `gameStore.ts`
6. `applyActionForward` (switch) dans `gameStore.ts`
7. `SyncedPlayerState` dans `firebase.ts`
8. `toSyncedPlayerState` dans `multiplayerStore.ts`
9. `syncFromRemote` dans `multiplayerStore.ts`
10. `createMultiplayerGame` dans `multiplayerStore.ts`
11. Template `LifeTracker.vue`
12. Template `PlayerDetailModal.vue`
13. Maps icones/couleurs dans `GameHistoryModal.vue`

**Duplication de code :**
- `applyActionReverse` (58 lignes) et `applyActionForward` (65 lignes) : deux switch miroirs avec 9 cases chacun
- `toggleMonarch`/`toggleInitiative` reimplementes dans `PlayerDetailModal.vue` sans historique (en plus des versions dans gameStore)
- Pattern lookup joueur `players.find(p => p.id === id)` repete 12+ fois
- Pattern fallback donnees (local -> cache -> API) repete 3 fois dans `scryfall.ts`
- Formatage de duree implemente differemment dans `GameTimer.vue`, `GameHistoryModal.vue`, `StatsView.vue`
- `playerCountOptions` et `startingLifeOptions` dupliques entre `HomeView.vue` et `SettingsView.vue`

### 5.3 Refactorings recommandes

1. **Registre de handlers d'actions** (Strategy Pattern) pour eliminer les switch undo/redo :
   ```typescript
   const handlers: Record<GameActionType, {
     apply(game: GameState, action: GameAction): void
     reverse(game: GameState, action: GameAction): void
   }> = { ... }
   ```
2. **Decouvrir `gameStore`** en composables : `useUndoRedo`, `usePlayerActions`, `useTurnManagement`
3. **Interface `CardRepository`** implementee par local + API pour eliminer la duplication fallback
4. **Registre de compteurs** data-driven pour reduire le shotgun surgery
5. **Helper `getPlayerById(id)`** pour eliminer les 12 lookups dupliques
6. **Utility `formatDuration()`** partagee entre les 3 fichiers

---

## 6. Logique de jeu MTG Commander

### 6.1 Conformite aux regles -- Correcte

| Regle | Valeur | Status |
|-------|--------|--------|
| Vie de depart Commander | 40 (configurable) | OK |
| Seuil degats commandant | 21 (configurable) | OK (`>=` correct) |
| Seuil compteurs poison | 10 (configurable) | OK (`>=` correct) |
| Mort si vie <= 0 | Oui | OK |
| Mort si poison >= 10 | Oui | OK |
| Mort si degats commandant >= 21 (par source unique) | Oui | OK |
| Taxe commandant (+2 par lancer) | Oui | OK (formule `(castCount-1)*2`) |
| Support partner (2 commandants max) | Oui | OK |
| Compteurs clampes a 0 minimum | Oui | OK (`Math.max(0, ...)`) |

### 6.2 Bugs critiques -- Multiplayer

| ID | Severite | Bug |
|----|----------|-----|
| C1 | **CRITIQUE** | **Les degats de commandant cross-device ne sont jamais synchronises vers l'appareil cible.** `dealCommanderDamage` modifie le joueur cible localement, mais `pushLocalPlayerState` ne pousse que les joueurs locaux. Le device cible ne recoit jamais la mise a jour. |
| C2 | **CRITIQUE** | **Les changements de `lifeTotal` via degats commandant sont ecrases** par le sync distant pour les joueurs non-locaux (meme cause racine que C1). |

**Explication :** Le modele multiplayer est "autorite locale" -- chaque device est maitre de ses joueurs. Mais les degats commandant modifient un joueur distant, creant un conflit d'autorite non resolu.

### 6.3 Bugs hauts -- Undo/Redo

| ID | Severite | Bug | Fichier |
|----|----------|-----|---------|
| H1 | HIGH | Les IDs de commandant bases sur l'index du tableau (`playerId_cmd0`, `_cmd1`) se decalent quand un commandant est supprime via `splice`, **remettant a zero les degats accumules** | `CommanderDamageModal.vue:164` |
| H2 | HIGH | `PlayerDetailModal` toggle monarque/initiative en mutant directement l'etat, **sans historique et sans undo possible** | `PlayerDetailModal.vue:183-197` |
| H3 | HIGH | Undo de monarque/initiative resulte en **personne n'ayant le statut** au lieu de restaurer le detenteur precedent (le `previousHolderId` n'est pas stocke dans l'action) | `gameStore.ts:333-349` |
| H4 | HIGH | Undo de `turn_advance` ne tient pas compte des joueurs morts sautes -- recule toujours d'1 index au lieu de revenir au `previousTurnIndex` | `gameStore.ts:323-331` |
| H5 | HIGH | L'historique est **local uniquement** en multiplayer (non inclus dans `SyncedGameState`). Undo n'affecte que le device local. | `firebase.ts:103-110` |

### 6.4 Bugs moyens

| ID | Bug | Fichier |
|----|-----|---------|
| M1 | Ajout/suppression de commandant non enregistre dans l'historique, pas d'undo. Supprimer un commandant perd definitivement ses degats accumules. | `PlayerDetailModal.vue:167-177` |
| M2 | Aucune validation de schema sur le `GameState` charge depuis localStorage -- crash possible apres mise a jour de l'app changeant la structure. | `persistence.ts:16-24` |
| M3 | Pas de reconciliation d'etat a la reconnexion multiplayer -- les changements locaux pendant la deconnexion sont perdus. | `multiplayerStore.ts:137-163` |
| M4 | Stack redo non videe par les mutations directes du modal, causant des conflits potentiels lors du redo. | `PlayerDetailModal.vue` |

### 6.5 Bugs bas et manques

- Pas d'indicateur visuel que 40 est la vie officielle Commander (20/25/30 = house rules)
- Taxe commandant affichee retrospectivement (taxe payee), pas predictive (taxe du prochain lancer)
- Monarque/Initiative non transferes automatiquement a la mort d'un joueur (regle officielle)
- Detection victoire/defaite binaire : tous les vivants = "gagnants" au lieu d'un seul
- Stack redo non persistee (perdue au redemarrage de l'app)
- Timer de tour sans retour apres expiration (affiche 00:00 silencieusement)
- `endGame()` jamais appelee depuis l'UI -- les statistiques ne sont jamais enregistrees

### 6.6 Multiplayer -- problemes supplementaires

- **Aucune resolution de conflits** : `set()` Firebase ecrase tout, la derniere ecriture gagne
- **Pas de verrouillage optimiste** : pas de version/timestamp sur les etats synchronises
- **Cleanup des rooms** : `cleanupExpiredRooms()` telechcharge TOUTES les rooms cote client
- **Pas de reconnexion automatique** : un joueur deconnecte doit manuellement rejoindre

---

## 7. UX/UI Game Design

### 7.1 Notes par domaine

| Domaine | Note | Priorite |
|---------|------|----------|
| Layout ecran de jeu | 6.5/10 | HAUTE |
| Hierarchie d'information | 7/10 | MOYENNE |
| Design d'interaction | 6/10 | HAUTE |
| **Design visuel et theme** | **8.5/10** | BASSE |
| Animations et feedback | 7.5/10 | MOYENNE |
| Flow de jeu | 6/10 | HAUTE |
| Recherche de cartes | 7/10 | BASSE |
| Multiplayer UX | 7/10 | MOYENNE |
| Accessibilite en jeu | 6.5/10 | MOYENNE |
| Features manquantes | 5/10 | HAUTE |
| Onboarding | 6.5/10 | MOYENNE |

### 7.2 Problemes critiques UX

**1. Pas de mode table (rotation 180 degres)**

Le cas d'usage dominant en Commander : telephone pose a plat au centre de la table. Les joueurs en face doivent lire a l'envers. **Tous les concurrents majeurs** (Manabox, Carbon, AetherHub) supportent la rotation des panneaux joueurs. C'est la feature manquante la plus critique et un bloqueur pour l'adoption.

**2. Pas de flow "Fin de partie"**

La fonction `endGame()` existe dans `gameStore` (lignes 433-457) mais **n'est jamais appelee** depuis aucun composant ou vue. Consequences :
- Les statistiques ne sont **jamais enregistrees**
- Pas d'ecran de resume post-partie (totaux finaux, duree, survivants)
- Pas d'option "Rejouer" / "Revanche"
- L'onglet Stats restera **toujours vide**

**3. Taille du total de vie trop petite**

A `text-4xl` (~36px), le total de vie est insuffisant pour la lecture a travers une table. Les apps concurrentes utilisent 60-80px minimum. Les boutons +5/+10/-5/-10 a `text-[11px]` sont presque illisibles.

### 7.3 Design visuel -- Point fort du projet

Le design system dans `main.css` est de haute qualite :
- Palette MTG Arena coherente avec `@theme` tokens (TailwindCSS v4)
- Surcharge complete du systeme de couleurs Ionic (27 variables)
- Bordures dorees subtiles (`rgba(212, 168, 67, 0.15)`) sur toolbar, listes, cartes, modals, tabs
- Police Beleren Bold authentique pour les titres (immersion MTG)
- Icones mana via `mana-font` sur l'ecran d'accueil et splash
- Effets glass (`backdrop-filter: blur()`), glow, et ombres bien calibres
- Support complet de `prefers-reduced-motion`
- Hierarchie de surfaces sombre propre (`#0a0e17` -> `#222842`)
- Scrollbar stylisee en or subtil
- Focus visible orange pour l'accessibilite clavier

### 7.4 Interaction design -- Analyse des taps

| Action | Taps requis | Ideal |
|--------|-------------|-------|
| Vie +1 / -1 | 1 tap | 1 tap (OK) |
| Vie +5 / +10 | 1 tap | 1 tap (OK) |
| Ajouter poison | 1 tap | 1 tap (OK) |
| Retirer poison | Long-press (non-decouvrablej) | 1 tap |
| Degats commandant | 3-4 taps (modal) | 1-2 taps |
| Voir taxe commandant | 2 taps (ouvrir modal detail) | Visible inline (0 taps) |
| Toggle monarque | 3 taps (modal detail, trouver toggle) | 1 tap |
| Ajouter experience/energie (1ere fois) | 2 taps (modal detail) | 1 tap |

### 7.5 Features manquantes vs concurrence

| Feature | Status | Impact |
|---------|--------|--------|
| Mode table (rotation panneaux) | **Absent** | **CRITIQUE** |
| Flow fin de partie + resume | **Absent** | **HAUT** |
| Selecteur premier joueur aleatoire | Absent | HAUT |
| Lanceur de des (D6, D20) | Absent | MOYEN |
| Compteurs personnalises | Absent | MOYEN |
| Choix couleur identite joueur au setup | Absent | MOYEN |
| Mode plein ecran immersif | Absent | MOYEN |
| Personnalisation noms au setup | Absent | MOYEN |
| Pinch-to-zoom sur les cartes | Absent | BAS |
| Tracker jour/nuit | Absent | BAS |
| Compteur de storm | Absent | BAS |
| Mode Planechase | Absent | BAS |

### 7.6 Top 10 actions UX prioritaires

1. Ajouter un **mode table** avec rotation 180 degres des panneaux joueurs
2. Implementer un flow **"Fin de partie"** avec ecran resume et enregistrement stats
3. **Augmenter la taille du total de vie** a 60-80px
4. Ajouter un **selecteur de premier joueur** aleatoire
5. **Reduire les degats commandant a 1-2 taps** (inline ou modal simplifie)
6. Ajouter un **choix d'identite couleur** et personnalisation des noms au setup
7. **Remplacer les abbreviations** (P, C, E, N, M, I, T) par des icones `mana-font`
8. **Mode plein ecran** masquant la tab bar et toolbar pendant le jeu
9. Traduire toutes les chaines codees en dur
10. Ajouter des **tooltips d'onboarding** pour les interactions cles (long-press, tap nom)

---

## 8. Webmaster (PWA / SEO / Performance)

### 8.1 PWA -- 2/10

| Element | Status |
|---------|--------|
| Web App Manifest | **ABSENT** |
| Service Worker | **ABSENT** |
| Icones PWA (192, 512, maskable) | **ABSENT** |
| Apple Touch Icon | **ABSENT** |
| Installable | **NON** |
| Cache offline (shell app) | **NON** (seulement via Capacitor natif) |

L'app a un mode offline pour les cartes (SQLite), mais le shell de l'app lui-meme ne peut pas se charger sans reseau sur le web.

### 8.2 SEO -- 3/10

| Element | Status |
|---------|--------|
| `<meta description>` | Present, mais en francais uniquement (97 chars) |
| Open Graph | Minimal (titre + description + type). **Pas d'image OG** -- previews de liens vides. |
| Twitter Card | **ABSENT** |
| Canonical URL | **ABSENT** |
| robots.txt | **ABSENT** |
| sitemap.xml | **ABSENT** |
| Titres dynamiques par page | **ABSENT** (titre statique "MTG Commander") |
| Structured Data (JSON-LD) | **ABSENT** |
| `<html lang>` dynamique | **NON** (fixe a `fr` meme en mode anglais) |

### 8.3 Performance -- 5.5/10

| Probleme | Impact |
|----------|--------|
| Splash screen avec 1000ms de delai artificiel (3 setTimeout enchaines) | LCP degrade d'1 seconde |
| Font Beleren en WOFF seul (pas de WOFF2 = ~30% plus lourd) | LCP degrade |
| Pas de `<link rel="preload">` sur la police Beleren | Font discovery tardive |
| `mana-font` complet importe (500+ icones) pour ~10 utilisees | CSS plus lourd |
| `sql-wasm.wasm` (640KB) sans headers de cache agressifs | Rechargement inutile |
| Preconnect Scryfall OK (`index.html:13`), mais manque Firebase | Connexion plus lente |
| Pas de Roboto font file (reference CSS mais non importe) | Fallback a la police systeme |

**Estimation Core Web Vitals :**
- **LCP : MAUVAIS** (splash artificiel 1s + font non preloaded)
- **INP : BON** (handlers simples, deep watcher debounce)
- **CLS : BON** (layouts fixes, `tabular-nums` pour les chiffres)

### 8.4 Deploiement -- 3/10

| Element | Status |
|---------|--------|
| CI (lint + build) | Present (`ci.yml`) |
| Tests dans CI | **ABSENT** (TODO en commentaire) |
| Deploiement web automatique | **ABSENT** |
| Config hosting (SPA fallback, headers, CSP) | **ABSENT** |
| Versioning | `0.0.0` (pas de strategie) |
| Script Android | Present (WSL-specific `android-deploy.sh`) |

**Probleme :** Vue Router utilise `createWebHistory()` (HTML5 History mode). Sans SPA fallback cote serveur, naviguer directement vers `/game` ou `/search` retourne un 404.

### 8.5 HTML -- 5/10

- DOCTYPE correct
- `viewport-fit=cover` pour iPhone notch (correct)
- `<meta name="color-scheme" content="dark light">` present
- `<html lang="fr">` fixe, non-dynamique selon la locale
- Pas de `<noscript>` fallback
- Favicon uniquement en `.ico` 32x32 (pas de PNG, SVG, ou Apple Touch Icon)

---

## 9. Roadmap de remediation

### Phase 1 -- Corrections critiques (immediat)

| # | Action | Fichier(s) | Effort |
|---|--------|------------|--------|
| 1 | Ajouter `.env` et `.env.local` au `.gitignore` | `.gitignore` | 5 min |
| 2 | `await signInAnonymously(auth)` + try/catch avec message d'erreur explicite | `firebase.ts:57` | 15 min |
| 3 | Upgrader `@capacitor/cli` de `^7.5.0` a `^8.x` | `package.json` | 15 min |
| 4 | Creer et deployer `database.rules.json` Firebase avec autorisation par `auth.uid` et validation `.validate` | Nouveau fichier + deploy | 2h |
| 5 | `PlayerDetailModal` : appeler `gameStore.toggleMonarch()` / `toggleInitiative()` au lieu de muter directement | `PlayerDetailModal.vue:183-197` | 30 min |
| 6 | Corriger le modele multiplayer pour les degats commandant cross-device (push de l'etat du joueur cible ou queue d'actions partagee) | `multiplayerStore.ts`, `firebase.ts`, `gameStore.ts` | 1 jour |

### Phase 2 -- Bugs game logic (sprint 1)

| # | Action | Fichier(s) | Effort |
|---|--------|------------|--------|
| 7 | Utiliser des UUIDs stables pour les commanderIds au lieu d'indices de tableau | `CommanderDamageModal.vue`, `gameStore.ts`, `game.ts` | 2h |
| 8 | Stocker le `previousMonarchId`/`previousInitiativeId` dans l'action pour un undo correct | `gameStore.ts:209-251, 333-349` | 1h |
| 9 | Stocker le `previousTurnIndex` dans l'action `turn_advance` pour un undo correct | `gameStore.ts:253-331` | 1h |
| 10 | Remplacer `Math.random()` par `crypto.getRandomValues()` pour les codes room | `firebase.ts:69-76` | 15 min |
| 11 | Ajouter `.catch()` sur le debounced `doPushLocalPlayerState()` | `multiplayerStore.ts:165-172` | 15 min |
| 12 | Ajouter un bouton "Fin de partie" qui appelle `endGame()` | `GameView.vue`, nouveau composant resume | 1 jour |

### Phase 3 -- i18n & Accessibilite (sprint 2)

| # | Action | Effort |
|---|--------|--------|
| 13 | Migrer les ~50 chaines codees en dur vers les fichiers i18n (locales `fr.ts` et `en.ts`) | 4h |
| 14 | Migrer `CommanderPicker.vue` entierement vers i18n | 1h |
| 15 | Migrer tous les `aria-label` vers `t()` | 2h |
| 16 | Rendre `<html lang>` et `toLocaleDateString()` dynamiques selon la locale | 1h |
| 17 | Persister `soundEnabled` et `soundVolume` dans les preferences | 30 min |
| 18 | Supprimer code mort : `isDarkMode`, `keepScreenOn` (sans plugin), `gameVictory()` (non appele) | 30 min |

### Phase 4 -- UX Game Design (sprint 3)

| # | Action | Effort |
|---|--------|--------|
| 19 | Implementer le **mode table** avec rotation 180 degres des panneaux | 1-2 jours |
| 20 | **Augmenter la taille du total de vie** (60-80px) + revoir taille compteurs | 2h |
| 21 | **Selecteur de premier joueur** aleatoire | 4h |
| 22 | **Simplifier le flow degats commandant** (moins de taps) | 1 jour |
| 23 | Ajouter personnalisation noms + choix couleur au setup | 1 jour |
| 24 | Remplacer abbreviations compteurs par icones `mana-font` | 2h |

### Phase 5 -- PWA & Performance (sprint 4)

| # | Action | Effort |
|---|--------|--------|
| 25 | Installer `vite-plugin-pwa` (manifest + service worker + cache offline) | 1 jour |
| 26 | Creer les icones PWA (192, 512, maskable, apple-touch-icon) depuis `logo.svg` | 2h |
| 27 | Config hosting (SPA fallback, cache headers, CSP) -- `vercel.json` ou `netlify.toml` | 4h |
| 28 | Convertir Beleren WOFF -> WOFF2 + `<link rel="preload">` | 1h |
| 29 | Balises OG completes (image, url, locale) + Twitter Card | 1h |
| 30 | `robots.txt` + `sitemap.xml` + titres dynamiques par route | 2h |

### Phase 6 -- Qualite & Architecture (sprint 5+)

| # | Action | Effort |
|---|--------|--------|
| 31 | **Decouvrir `gameStore`** en composables (`useUndoRedo`, `usePlayerActions`, `useTurnManagement`) | 1 jour |
| 32 | **Registre de handlers d'actions** (Strategy Pattern) pour undo/redo -- eliminer les switch miroirs | 4h |
| 33 | **Tests unitaires** pour le game logic (undo/redo, detection mort, avancement tour, degats commandant) | 2 jours |
| 34 | Pipeline de deploiement web dans CI (GitHub Actions -> Vercel/Netlify) | 4h |
| 35 | Ajouter `AbortController` sur les recherches de cartes | 1h |
| 36 | Ajouter les hooks Ionic (`ionViewDidEnter`/`ionViewWillLeave`) sur `GameView` | 2h |

---

*Rapport genere par 7 agents specialises : Tech Lead, Ingenieur Securite, Dev Frontend Vue/Ionic, Architecte Design Patterns, Game Dev MTG Commander, UX/UI Game Designer cartes, Webmaster/DevOps.*
