# MTG Commander Companion App - Document de Cadrage

## Vision Produit

Application mobile Android standalone pour les joueurs de Magic: The Gathering format Commander (EDH). L'app vise a resoudre le probleme de **fragmentation** : aujourd'hui les joueurs utilisent 3-4 apps differentes (Moxfield, Moxtopper, Playgroup.gg, Commander Spellbook) pour une seule partie.

**Stack technique** : Vue 3 + Capacitor + Ionic Vue + TypeScript

---

## 1. Recherche Communautaire - Besoins Identifies

### Probleme Principal : La Fragmentation

Les joueurs Commander utilisent actuellement :
- **Moxfield/Archidekt** pour le deckbuilding
- **Moxtopper/Lotus/Lifetap** pour le suivi de vie
- **Playgroup.gg** pour les statistiques
- **Commander Spellbook** pour les combos

**Aucune app ne fait tout ca bien.** C'est l'opportunite.

### Pain Points de la Communaute (Reddit r/EDH, r/magicTCG)

| Probleme | Impact | Frequence |
|----------|--------|-----------|
| "J'utilise 3+ apps pour une partie" | Friction UX majeure | Tres frequent |
| Suivi des degats de commandant buggue | Erreurs de regle | Frequent |
| Partner commanders mal geres | Tax et degats incorrects | Frequent |
| Batterie qui se vide en 1 partie | Abandon vers papier | Modere |
| Pas de synchro multi-device | Un seul telephone pour 4 joueurs | Frequent |
| Taps accidentels en mode 4+ joueurs | Frustration mid-game | Frequent |
| Pas d'historique de parties | Perte de stats | Tres frequent |

### Apps Existantes - Analyse Concurrentielle

| App | Forces | Faiblesses |
|-----|--------|------------|
| **Moxtopper** | Meilleure UI degats commandant | Pas de deckbuilding |
| **Lotus** | Gratuit, sans pub, partner support | Pas de stats |
| **Lifetap** | Plus reactif | Max 6 joueurs |
| **Playgroup.gg** | Stats ELO, historique | Pas de life tracking |
| **TopDecked** | Le plus complet | Limitations et payant |
| **Moxfield** | Reference deckbuilding | Pas de life tracker |

---

## 2. Perspective Arbitre MTG - Regles Commander Critiques

### Ce que l'app DOIT tracker correctement

#### Points de vie (Depart : 40)
- Historique des changements (resolution de litiges)
- Undo/redo obligatoire
- Support 2-10 joueurs

#### Degats de Commandant (21 letaux par commandant)
- **REGLE CRITIQUE** : Les degats de commandant ne se reintialisent JAMAIS
- Seuls les **degats de combat** comptent (pas les degats non-combat)
- Tracking separe par commandant ET par joueur (matrice)
- Les degats persistent meme si le commandant meurt/est exile/change de zone
- Notification automatique a 21 degats

#### Taxe de Commandant (+2 generique par relance)
- 1er cast : pas de taxe
- 2e cast : +2, 3e cast : +4 (cumulatif)
- S'applique UNIQUEMENT depuis la zone de commandement
- Tracking separe pour les partner commanders

#### Compteurs de Poison (10 letaux)
- Permanents - ne peuvent pas etre gueris
- Option pour threshold personnalise (houserules 15-20)
- Tracking par joueur

#### Mecaniques Speciales
- **Partner commanders** : 2 commandants avec taxes et degats independants
- **Backgrounds** : Enchantement commandant secondaire
- **Companion** : Utilisation unique par partie, cout 3 mana generique
- **Compteurs** : Experience, Energie, Storm count

### Erreurs Courantes que l'App doit Prevenir

| Erreur | Consequence | Prevention |
|--------|------------|------------|
| Reset des degats commandant a la mort du commandant | Violation de regle majeure | Verrouiller - jamais de reset |
| Compter les degats non-combat comme degats commandant | Violation de regle | Interface "combat damage only" |
| Oublier la taxe de commandant | Avantage injuste | Auto-calcul et affichage |
| Taxe partner non separee | Erreur de calcul | Affichage visuel separe |
| Confusion seuil poison (10 vs houserule) | Alteration du jeu | Seuil configurable |

---

## 3. API Scryfall - Recherche de Cartes

### Endpoint Principal
- **Base URL** : `https://api.scryfall.com`
- **Rate limit** : 10 requetes/seconde (delai 50-100ms)
- **Auth** : Pas requise pour les endpoints publics

### Endpoints Cles

| Endpoint | Usage |
|----------|-------|
| `/cards/autocomplete?q=` | Typeahead (max 20 resultats) |
| `/cards/search?q=` | Recherche avancee avec filtres |
| `/cards/named?exact=` | Lookup par nom exact |
| `/cards/collection` | Batch lookup (POST) |
| `/bulk-data` | Download offline (Oracle Cards ~162MB) |

### Filtres Commander Specifiques
```
legal:commander       # Cartes legales en Commander
f:edh                # Raccourci format EDH
is:commander         # Peut servir de commandant
banned:commander     # Bannis en Commander
```

### Strategie Mobile Recommandee
1. **Offline-first** : Telecharger bulk data Oracle Cards hebdomadairement
2. **SQLite local** : Indexer dans une base locale pour recherche instantanee
3. **API en temps reel** : Uniquement pour prix, nouvelles cartes, spoilers
4. **Cache minimum** : 24h pour toutes les donnees API

### Images Disponibles

| Format | Taille | Usage |
|--------|--------|-------|
| small | 146x204 | Thumbnails, listes |
| normal | 488x680 | Affichage general |
| large | 672x936 | Vue detaillee |
| art_crop | Variable | Artwork seul |

### Librairie JS Recommandee
- **scryfall-sdk** (TypeScript) : Support complet, pagination auto, types inclus
- **@scryfall/api-types** : Types TypeScript officiels

---

## 4. Stack Technique - Vue 3 + Capacitor

### Architecture

```
Vue 3 (Composition API) + TypeScript
        |
    Ionic Vue (UI mobile-first)
        |
    Pinia (State management)
        |
    Capacitor 5.x (Runtime natif)
        |
   +----+----+
   |         |
Android    (Web PWA)
```

### Dependencies Principales

```json
{
  "vue": "^3.4.x",
  "pinia": "^2.1.x",
  "vue-router": "^4.3.x",
  "@ionic/vue": "^7.x",
  "@capacitor/core": "^5.x",
  "@capacitor/android": "^5.x",
  "@capacitor/haptics": "^5.x",
  "@capacitor/preferences": "^5.x",
  "@capacitor/network": "^5.x",
  "@capacitor/splash-screen": "^5.x",
  "@capacitor/status-bar": "^5.x",
  "@capacitor-community/sqlite": "^5.x",
  "scryfall-sdk": "latest"
}
```

### Plugins Capacitor Requis

| Plugin | Usage |
|--------|-------|
| @capacitor/haptics | Feedback tactile (life +/-) |
| @capacitor/preferences | Settings utilisateur |
| @capacitor/network | Detection online/offline |
| @capacitor/splash-screen | Ecran de lancement |
| @capacitor/status-bar | Theme dark/light |
| @capacitor-community/sqlite | Base de donnees locale |
| pinia-plugin-capacitor-persist | Persistence state |

### Structure Projet

```
mtg-commander-app/
  src/
    components/
      life-tracker/        # Composants suivi de vie
      card-search/         # Barre de recherche Scryfall
      game-timer/          # Timer et suivi de tours
      commander-zone/      # Gestion zone de commandement
    views/
      HomeView.vue
      GameView.vue
      DeckBuilderView.vue
      StatsView.vue
      SettingsView.vue
    stores/
      gameStore.ts         # Etat de la partie en cours
      playerStore.ts       # Joueurs et profils
      deckStore.ts         # Decks et cartes
      settingsStore.ts     # Preferences
    services/
      scryfall.ts          # API Scryfall
      database.ts          # SQLite operations
      sync.ts              # Sync offline
    types/
      game.ts              # Types partie
      card.ts              # Types carte MTG
      player.ts            # Types joueur
  android/
  capacitor.config.ts
  vite.config.ts
```

### Performance Android
- Lazy loading des composants lourds (defineAsyncComponent)
- Route-level code splitting
- v-memo pour les listes de cartes
- Cache images Scryfall 30 jours
- Batch les appels natifs Capacitor

---

## 5. Proposition de Perimetre Produit

### Phase 1 - MVP (Life Tracker + Recherche)
- [ ] Suivi de points de vie (2-6 joueurs, depart 40)
- [ ] Degats de commandant par joueur (matrice)
- [ ] Taxe de commandant auto-calculee
- [ ] Compteurs : poison, experience, energie
- [ ] Timer de partie + timer par tour
- [ ] Barre de recherche de cartes (Scryfall)
- [ ] Affichage carte avec image et texte Oracle
- [ ] Mode offline basique
- [ ] Undo/redo pour toutes les actions
- [ ] Historique des changements de vie

### Phase 2 - Beta (Stats + Deck)
- [ ] Historique des parties (victoires/defaites par deck)
- [ ] Statistiques par joueur et par deck
- [ ] Import de decks (Moxfield, Archidekt)
- [ ] Verification de legalite Commander
- [ ] Liste de bannis a jour
- [ ] Mode offline complet (bulk data Scryfall)
- [ ] Synchro multi-device (LAN local)
- [ ] Notifications push

### Phase 3 - Production (Social + Avance)
- [ ] Gestion de playgroup
- [ ] ELO rating interne
- [ ] Power level estimation
- [ ] Combo finder (Commander Spellbook)
- [ ] Deckbuilding in-app
- [ ] Analyse de courbe de mana
- [ ] Mode tournoi
- [ ] Export/partage de stats

---

## 6. Reunion de Cadrage - Organisation

### Objectif
Determiner le perimetre final du produit, valider les priorites, et aligner toutes les parties prenantes.

### Participants

| Role | Responsabilite dans la reunion |
|------|-------------------------------|
| **Product Owner** | Vision produit, priorisation backlog, arbitrage scope |
| **Tech Lead** | Faisabilite technique, estimation complexite, architecture |
| **UI Designer** | Direction artistique, composants visuels, theming MTG |
| **UX Designer** | Parcours utilisateur, ergonomie mobile, tests utilisabilite |
| **Dev Mobile** | Contraintes Capacitor/Android, performance native |
| **Dev Web** | Architecture Vue 3, integration API, state management |
| **Joueurs Commander (3-4)** | Validation besoins reels, feedback features, tests beta |

### Agenda Propose (2h30)

```
00:00 - 00:15  Introduction et contexte
               - Presentation de la vision produit
               - Partage de cette recherche (ce document)

00:15 - 00:45  Retour joueurs
               - Tour de table : quelles apps utilisez-vous aujourd'hui ?
               - Pain points principaux en partie
               - Features "must-have" vs "nice-to-have"
               - Demo des apps concurrentes

00:45 - 01:15  Validation technique
               - Presentation stack Vue 3 + Capacitor
               - Contraintes API Scryfall (rate limits, offline)
               - Faisabilite multi-device sync
               - Performance Android (batterie, memoire)

01:15 - 01:45  Design et UX
               - Comment afficher 4-6 joueurs sur un ecran ?
               - Gestion des taps accidentels
               - Accessibilite (taille de police, contraste)
               - Mode paysage vs portrait
               - Theming MTG (couleurs de mana)

01:45 - 02:15  Definition du perimetre MVP
               - Vote priorisation features (MoSCoW method)
               - Must Have / Should Have / Could Have / Won't Have
               - Definition du MVP minimum viable
               - Roadmap phases

02:15 - 02:30  Prochaines etapes
               - Assignment des roles
               - Planning sprint 0 (setup technique)
               - Date de la prochaine reunion
               - Canal de communication (Slack/Discord)
```

### Questions Cles a Resoudre en Reunion

1. **Scope MVP** : Life tracker seul ou avec recherche de cartes ?
2. **Multi-device** : Chaque joueur sur son tel ou un seul appareil partage ?
3. **Offline-first** : Bulk data Scryfall des le MVP ou API uniquement ?
4. **Monetisation** : Gratuit ? Freemium ? Pub ?
5. **iOS** : Android-only ou cross-platform des le depart ?
6. **Deckbuilding** : In-app ou integration externe (Moxfield API) ?
7. **Houserules** : Support des regles maison des le MVP ?
8. **Langues** : Francais seul ou multi-langue ?

### Preparation Demandee aux Participants

- **Joueurs** : Lister vos 3 frustrations principales avec les apps actuelles
- **Tech Lead** : Evaluer la faisabilite du stack propose
- **Designers** : Benchmarker 3 apps concurrentes (Moxtopper, Lotus, TopDecked)
- **Product Owner** : Preparer criteres de succes MVP
- **Devs** : Evaluer le temps de setup du boilerplate Vue3/Capacitor

---

## 7. Banned List Actuelle (Avril 2025)

Cartes bannies en Commander :
- Dockside Extortionist
- Jeweled Lotus
- Mana Crypt
- Nadu, Winged Wisdom
- (+ liste complete sur mtgcommander.net)

5 cartes debannies en avril 2025 (dont Biorhythm).

---

## 8. Liens et Ressources

- [Regles officielles Commander](https://mtgcommander.net/index.php/rules/)
- [API Scryfall](https://scryfall.com/docs/api)
- [Capacitor + Vue](https://capacitorjs.com/solution/vue)
- [Ionic Vue](https://ionicframework.com/docs/vue/overview)
- [Pinia](https://pinia.vuejs.org/)
- [scryfall-sdk (npm)](https://www.npmjs.com/package/scryfall-sdk)
- [Commander Spellbook](https://commanderspellbook.com/)
- [EDHREC](https://edhrec.com/)
