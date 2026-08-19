<template>
  <ion-page class="app-screen">
    <SanctumHeader
      :title="t('home.title')"
      :eyebrow="t('home.headerEyebrow')"
    />

    <ion-content class="sanctum-content home-sanctum-content">
      <main class="home-shell">
        <section class="home-hero" aria-labelledby="home-title">
          <div class="home-hero__crest" data-animate>
            <span class="home-hero__orbit home-hero__orbit--outer" />
            <span class="home-hero__orbit home-hero__orbit--inner" />
            <img src="@/assets/icons/ui/logo.svg" alt="" />
          </div>

          <p class="home-hero__kicker" data-animate>{{ t('home.kicker') }}</p>
          <h2 id="home-title" data-animate>{{ t('home.title') }}</h2>
          <p class="home-hero__copy" data-animate>{{ t('home.heroDescription') }}</p>

          <div class="mana-constellation" data-animate aria-hidden="true">
            <span class="mana-constellation__line" />
            <i class="ms ms-w ms-cost" />
            <i class="ms ms-u ms-cost" />
            <i class="ms ms-b ms-cost" />
            <i class="ms ms-r ms-cost" />
            <i class="ms ms-g ms-cost" />
            <span class="mana-constellation__line mana-constellation__line--right" />
          </div>
        </section>

        <section class="session-panel" data-animate>
          <div class="session-panel__edge" aria-hidden="true" />
          <div class="session-panel__status">
            <span class="status-beacon" />
            {{ gameStore.isGameActive ? t('home.activeSession') : t('home.sanctumReady') }}
            <span class="session-panel__rule" />
            <span class="session-panel__format">EDH</span>
          </div>

          <h3>{{ multiplayerStore.isMultiplayer || gameStore.isGameActive ? t('home.resumeTitle') : t('home.newSessionTitle') }}</h3>
          <p>{{ multiplayerStore.isMultiplayer ? t('home.multiplayerHint') : gameStore.isGameActive ? t('home.resumeHint') : t('home.newSessionHint') }}</p>

          <button
            type="button"
            class="sanctum-primary-button"
            @click="multiplayerStore.isMultiplayer || gameStore.isGameActive ? resumeGame() : (showNewGameModal = true)"
          >
            <span class="sanctum-primary-button__glint" aria-hidden="true" />
            <ion-icon :icon="multiplayerStore.isMultiplayer || gameStore.isGameActive ? returnUpForwardOutline : playOutline" />
            <span>{{ multiplayerStore.isMultiplayer && !multiplayerStore.gameStarted ? t('home.multiplayer') : multiplayerStore.isMultiplayer || gameStore.isGameActive ? t('home.resumeGame') : t('home.newGame') }}</span>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>

          <button
            v-if="gameStore.isGameActive && !multiplayerStore.isMultiplayer"
            type="button"
            class="session-panel__secondary"
            @click="showNewGameModal = true"
          >
            <ion-icon :icon="playOutline" />
            {{ t('home.newGame') }}
          </button>

          <div class="session-panel__specs" :aria-label="t('home.gameFeatures')">
            <span><strong>2–10</strong> {{ t('common.players') }}</span>
            <span class="session-panel__spec-dot" />
            <span><strong>40</strong> {{ t('common.life') }}</span>
            <span class="session-panel__spec-dot" />
            <span>{{ t('home.commanderDamage') }}</span>
          </div>
        </section>

        <section class="home-action-grid" data-animate>
          <button type="button" class="home-action-tile home-action-tile--teal" @click="router.push('/multiplayer')">
            <span class="home-action-tile__icon"><ion-icon :icon="peopleOutline" /></span>
            <span class="home-action-tile__copy">
              <strong>{{ t('home.multiplayer') }}</strong>
              <small>{{ t('home.multiplayerHint') }}</small>
            </span>
            <span class="home-action-tile__arrow" aria-hidden="true">›</span>
          </button>

          <button type="button" class="home-action-tile" @click="showPlayersModal = true">
            <span class="home-action-tile__icon"><ion-icon :icon="peopleCircleOutline" /></span>
            <span class="home-action-tile__copy">
              <strong>{{ t('home.managePlayers') }}</strong>
              <small>{{ t('home.playersHint', { count: registryStore.playerProfiles.length }) }}</small>
            </span>
            <span class="home-action-tile__arrow" aria-hidden="true">›</span>
          </button>
        </section>

        <div class="home-feature-ribbon" data-animate>
          <span />
          {{ t('home.featureRibbon') }}
          <span />
        </div>
      </main>

      <!-- New Game Modal -->
      <NewGameModal
        :is-open="showNewGameModal && !multiplayerStore.isMultiplayer"
        @close="showNewGameModal = false"
        @confirm="confirmNewGame"
      />

      <!-- Players Registry Modal -->
      <AppModal :is-open="showPlayersModal" :title="t('players.title')" @close="showPlayersModal = false">
        <div v-if="registryStore.playerProfiles.length === 0" class="flex flex-col items-center justify-center gap-3 py-12">
          <IllustrationNoPlayers :size="100" />
          <div class="text-center text-text-secondary">
            <p>{{ t('players.emptyState') }}</p>
            <p class="text-xs">{{ t('players.emptyStateHint') }}</p>
          </div>
          <ion-button class="mt-2" color="primary" @click="showPlayerProfileModal = true">
            <ion-icon :icon="addOutline" slot="start" />
            {{ t('players.addPlayer') }}
          </ion-button>
        </div>

        <template v-else>
          <ion-list :inset="true">
            <ion-item
              v-for="profile in registryStore.sortedProfiles"
              :key="profile.id"
              button
              :detail="true"
              @click="openProfileDetail(profile.id)"
            >
              <span
                slot="start"
                class="mana-dot"
                :style="{ background: `var(--color-mana-${profile.preferredColor})` }"
              />
              <ion-label>
                <h2>{{ profile.name }}</h2>
                <p>{{ t('players.deckCount', { count: profile.decks.length }, profile.decks.length) }}</p>
              </ion-label>
            </ion-item>
          </ion-list>

          <div class="flex justify-center pb-4">
            <ion-button fill="clear" color="primary" @click="showPlayerProfileModal = true">
              <ion-icon :icon="addOutline" slot="start" />
              {{ t('players.addPlayer') }}
            </ion-button>
          </div>
        </template>

        <template #after-content>
          <PlayerProfileModal
            :is-open="showPlayerProfileModal"
            :profile-id="editingProfileId"
            @close="closePlayerProfileModal"
          />

          <PlayerProfileDetail
            :is-open="showDetailModal"
            :profile-id="detailProfileId"
            @close="showDetailModal = false"
            @edit="editProfile"
            @delete="deleteProfile"
          />
        </template>
      </AppModal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  IonPage,
  IonContent,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
} from '@ionic/vue'
import {
  playOutline,
  returnUpForwardOutline,
  peopleOutline,
  peopleCircleOutline,
  addOutline,
} from 'ionicons/icons'
import { useGameStore } from '@/stores/gameStore'
import { useMultiplayerStore } from '@/stores/multiplayerStore'
import { usePageEnterAnimation } from '@/composables/usePageEnterAnimation'
import { playGameStart } from '@/services/sounds'
import AppModal from '@/components/ui/AppModal.vue'
import SanctumHeader from '@/components/ui/SanctumHeader.vue'
import IllustrationNoPlayers from '@/components/icons/illustrations/IllustrationNoPlayers.vue'
import PlayerProfileModal from '@/components/player-registry/PlayerProfileModal.vue'
import PlayerProfileDetail from '@/components/player-registry/PlayerProfileDetail.vue'
import NewGameModal from '@/components/home/NewGameModal.vue'
import { usePlayerRegistryStore } from '@/stores/playerRegistryStore'
import type { PlayerConfigExtended } from '@/components/player-registry/PlayerSelectItem.vue'

const { t } = useI18n()
const router = useRouter()
const gameStore = useGameStore()
const multiplayerStore = useMultiplayerStore()
const registryStore = usePlayerRegistryStore()

const showNewGameModal = ref(false)
const showPlayersModal = ref(false)
const showPlayerProfileModal = ref(false)
const editingProfileId = ref<string | undefined>(undefined)
const showDetailModal = ref(false)
const detailProfileId = ref<string | undefined>(undefined)

usePageEnterAnimation()

function confirmNewGame(confirmedPlayerConfigs: PlayerConfigExtended[]) {
  showNewGameModal.value = false
  if (multiplayerStore.isMultiplayer) {
    resumeGame()
    return
  }
  gameStore.startNewGame()
  playGameStart()
  // Apply player names, colors, and commanders from modal config
  const mapping: Record<string, { playerProfileId: string; deckId?: string }> = {}
  confirmedPlayerConfigs.forEach((config, index) => {
    const player = gameStore.currentGame?.players[index]
    if (player) {
      gameStore.setPlayerDetails(player.id, { name: config.name, color: config.color })
      if (config.playerProfileId) {
        mapping[player.id] = {
          playerProfileId: config.playerProfileId,
          deckId: config.deckId,
        }
        // Load commanders from selected deck
        if (config.deckId) {
          const deck = registryStore.getDeckById(config.playerProfileId, config.deckId)
          if (deck) {
            for (const commander of deck.commanders) {
              gameStore.addPlayerCommander(player.id, commander.name, commander.imageUri)
            }
          }
        }
      }
    }
  })
  gameStore.playerProfileMapping = mapping
  router.push('/game')
}

function resumeGame() {
  router.push(
    multiplayerStore.isMultiplayer && !multiplayerStore.gameStarted
      ? '/multiplayer'
      : '/game',
  )
}

// --- Player registry modal ---

function openProfileDetail(profileId: string) {
  detailProfileId.value = profileId
  showDetailModal.value = true
}

function editProfile(profileId: string) {
  showDetailModal.value = false
  editingProfileId.value = profileId
  showPlayerProfileModal.value = true
}

function closePlayerProfileModal() {
  showPlayerProfileModal.value = false
  editingProfileId.value = undefined
}

async function deleteProfile(profileId: string) {
  const { alertController } = await import('@ionic/vue')
  const profile = registryStore.getProfileById(profileId)
  if (!profile) return

  const alert = await alertController.create({
    header: t('players.deletePlayer'),
    message: t('players.deletePlayerConfirm', { name: profile.name }),
    buttons: [
      { text: t('common.cancel'), role: 'cancel' },
      {
        text: t('common.delete'),
        role: 'destructive',
        handler: () => {
          showDetailModal.value = false
          registryStore.deletePlayerProfile(profileId)
        },
      },
    ],
  })
  await alert.present()
}
</script>

<style scoped>
.home-shell {
  position: relative;
  z-index: 1;
  display: flex;
  width: min(100%, 540px);
  min-height: 100%;
  margin: 0 auto;
  padding: 18px max(16px, var(--ion-safe-area-right, 0px)) 32px max(16px, var(--ion-safe-area-left, 0px));
  flex-direction: column;
  gap: 14px;
}

.home-hero {
  grid-area: hero;
  position: relative;
  display: flex;
  align-items: center;
  padding: 5px 12px 2px;
  flex-direction: column;
  text-align: center;
}

.home-hero::before {
  content: '';
  position: absolute;
  top: -60px;
  width: min(340px, 92vw);
  height: 250px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(206, 116, 31, 0.16), rgba(13, 26, 26, 0.08) 44%, transparent 70%);
  filter: blur(8px);
  pointer-events: none;
}

.home-hero__crest {
  position: relative;
  display: grid;
  width: 94px;
  height: 94px;
  margin-bottom: 8px;
  place-items: center;
}

.home-hero__crest img {
  position: relative;
  z-index: 2;
  width: 70px;
  height: 70px;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.65)) drop-shadow(0 0 16px rgba(221, 162, 62, 0.25));
}

.home-hero__orbit {
  position: absolute;
  inset: 1px;
  border: 1px solid rgba(215, 178, 97, 0.2);
  border-radius: 50%;
  box-shadow: inset 0 0 18px rgba(197, 129, 37, 0.08);
  animation: slow-orbit 24s linear infinite;
}

.home-hero__orbit::before,
.home-hero__orbit::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 5px;
  height: 5px;
  border: 1px solid rgba(237, 205, 130, 0.56);
  background: #101518;
  transform: translateY(-50%) rotate(45deg);
}

.home-hero__orbit::before { left: -3px; }
.home-hero__orbit::after { right: -3px; }

.home-hero__orbit--inner {
  inset: 9px;
  border-style: dashed;
  opacity: 0.42;
  animation-direction: reverse;
  animation-duration: 34s;
}

@keyframes slow-orbit {
  to { transform: rotate(360deg); }
}

.home-hero__kicker {
  position: relative;
  margin: 0;
  color: rgba(235, 209, 149, 0.82);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 3px;
  text-transform: uppercase;
}

.home-hero h2 {
  position: relative;
  margin: 4px 0 3px;
  color: #f2dda7;
  font-family: var(--font-beleren);
  font-size: clamp(28px, 8vw, 38px);
  letter-spacing: 3.5px;
  line-height: 1;
  text-shadow: 0 3px 18px rgba(214, 129, 31, 0.22);
}

.home-hero__copy {
  position: relative;
  max-width: 315px;
  margin: 2px 0 8px;
  color: rgba(225, 231, 227, 0.76);
  font-size: 14px;
  line-height: 1.5;
}

.mana-constellation {
  position: relative;
  display: flex;
  align-items: center;
  gap: 7px;
  color: rgba(255, 255, 255, 0.84);
}

.mana-constellation i {
  font-size: 14px;
  box-shadow: 0 2px 7px rgba(0, 0, 0, 0.6);
}

.mana-constellation__line {
  width: 27px;
  height: 1px;
  margin-right: 3px;
  background: linear-gradient(90deg, transparent, rgba(213, 179, 105, 0.55));
}

.mana-constellation__line--right {
  margin-right: 0;
  margin-left: 3px;
  transform: scaleX(-1);
}

.session-panel {
  grid-area: session;
  position: relative;
  overflow: hidden;
  padding: 16px;
  border: 1px solid rgba(210, 178, 106, 0.27);
  border-radius: 18px;
  background:
    linear-gradient(135deg, rgba(28, 34, 36, 0.96), rgba(9, 14, 16, 0.97)),
    radial-gradient(circle at 80% 0%, rgba(214, 112, 30, 0.15), transparent 42%);
  box-shadow:
    inset 0 1px 0 rgba(255, 245, 215, 0.07),
    inset 0 -18px 34px rgba(0, 0, 0, 0.18),
    0 14px 34px rgba(0, 0, 0, 0.44),
    0 0 28px rgba(199, 116, 31, 0.05);
}

.session-panel::before,
.session-panel::after {
  content: '';
  position: absolute;
  width: 38px;
  height: 38px;
  border-color: rgba(225, 189, 111, 0.38);
  pointer-events: none;
}

.session-panel::before {
  top: 6px;
  left: 6px;
  border-top: 1px solid;
  border-left: 1px solid;
  border-radius: 10px 0 0;
}

.session-panel::after {
  right: 6px;
  bottom: 6px;
  border-right: 1px solid;
  border-bottom: 1px solid;
  border-radius: 0 0 10px;
}

.session-panel__edge {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
  background: linear-gradient(180deg, transparent, #d98328 34%, #e1bd70 70%, transparent);
  box-shadow: 0 0 14px rgba(216, 126, 36, 0.42);
}

.session-panel__status {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 7px;
  color: rgba(224, 232, 227, 0.78);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.6px;
  text-transform: uppercase;
}

.status-beacon {
  width: 7px;
  height: 7px;
  border: 1px solid rgba(124, 229, 191, 0.68);
  border-radius: 50%;
  background: #3b9e80;
  box-shadow: 0 0 10px rgba(63, 190, 151, 0.75);
}

.session-panel__rule {
  height: 1px;
  flex: 1;
  background: linear-gradient(90deg, rgba(205, 173, 101, 0.25), transparent);
}

.session-panel__format {
  color: rgba(231, 199, 130, 0.6);
}

.session-panel h3 {
  position: relative;
  z-index: 1;
  margin: 10px 0 3px;
  color: #f1e4bf;
  font-family: var(--font-beleren);
  font-size: 20px;
  letter-spacing: 0.4px;
}

.session-panel > p {
  position: relative;
  z-index: 1;
  max-width: 320px;
  margin: 0 0 13px;
  color: rgba(220, 226, 222, 0.74);
  font-size: 14px;
  line-height: 1.5;
}

.sanctum-primary-button {
  position: relative;
  z-index: 1;
  display: grid;
  overflow: hidden;
  width: 100%;
  min-height: 52px;
  padding: 0 16px;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  border: 1px solid #f0a44c;
  border-radius: 11px;
  background:
    linear-gradient(180deg, rgba(244, 134, 42, 0.98), rgba(190, 69, 12, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 233, 184, 0.55),
    inset 0 -3px 0 rgba(93, 24, 3, 0.42),
    0 7px 16px rgba(0, 0, 0, 0.42),
    0 0 22px rgba(218, 91, 18, 0.22);
  color: #fff6e8;
  cursor: pointer;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 1px;
  text-transform: uppercase;
  text-shadow: 0 1px 2px rgba(74, 18, 0, 0.55);
  transition: transform 120ms ease, filter 120ms ease, box-shadow 120ms ease;
}

.sanctum-primary-button__glint {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -60%;
  width: 38%;
  background: linear-gradient(90deg, transparent, rgba(255, 244, 215, 0.32), transparent);
  transform: skewX(-20deg);
  animation: button-glint 4.8s ease-in-out infinite;
}

@keyframes button-glint {
  0%, 70% { left: -60%; }
  92%, 100% { left: 130%; }
}

.sanctum-primary-button ion-icon {
  font-size: 19px;
}

.sanctum-primary-button:active {
  transform: translateY(2px) scale(0.992);
  filter: brightness(0.94);
  box-shadow: inset 0 2px 6px rgba(72, 18, 0, 0.4), 0 3px 8px rgba(0, 0, 0, 0.4);
}

.session-panel__secondary {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  min-height: 44px;
  padding: 8px 12px 0;
  border: 0;
  background: transparent;
  color: rgba(240, 207, 137, 0.86);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.session-panel__specs {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding-top: 11px;
  flex-wrap: wrap;
  color: rgba(212, 222, 216, 0.68);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.35px;
  text-transform: uppercase;
}

.session-panel__specs strong {
  color: rgba(232, 204, 144, 0.78);
}

.session-panel__spec-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(217, 179, 96, 0.42);
}

.home-action-grid {
  display: grid;
  grid-area: actions;
  grid-template-columns: 1fr;
  gap: 10px;
}

.home-action-tile {
  position: relative;
  display: grid;
  min-height: 76px;
  padding: 12px;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(206, 173, 99, 0.17);
  border-radius: 13px;
  background: linear-gradient(145deg, rgba(21, 28, 30, 0.94), rgba(8, 13, 15, 0.95));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035), 0 8px 18px rgba(0, 0, 0, 0.3);
  color: rgba(231, 218, 185, 0.84);
  text-align: left;
  transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
}

.home-action-tile--teal {
  border-color: rgba(78, 153, 146, 0.24);
}

.home-action-tile:active {
  border-color: rgba(221, 180, 91, 0.4);
  transform: translateY(1px) scale(0.98);
}

.home-action-tile__icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid rgba(207, 174, 99, 0.16);
  border-radius: 10px 10px 13px 13px;
  background: radial-gradient(circle at 50% 30%, rgba(211, 157, 62, 0.16), rgba(255, 255, 255, 0.025));
  color: #d8af60;
  font-size: 21px;
}

.home-action-tile--teal .home-action-tile__icon {
  border-color: rgba(72, 161, 150, 0.22);
  background: radial-gradient(circle at 50% 30%, rgba(64, 158, 148, 0.17), rgba(255, 255, 255, 0.02));
  color: #66b5aa;
}

.home-action-tile__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.home-action-tile__copy strong {
  font-size: 13px;
  letter-spacing: 0.65px;
  text-transform: uppercase;
  line-height: 1.15;
}

.home-action-tile__copy small {
  color: rgba(211, 220, 215, 0.7);
  font-size: 12px;
  line-height: 1.35;
}

.home-action-tile__arrow {
  color: rgba(222, 190, 120, 0.43);
  font-family: Georgia, serif;
  font-size: 20px;
}

.home-feature-ribbon {
  display: flex;
  grid-area: ribbon;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 1px 4px 0;
  color: rgba(215, 224, 218, 0.62);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.2px;
  text-align: center;
  text-transform: uppercase;
}

.home-feature-ribbon span {
  width: 25px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(207, 173, 98, 0.35));
}

.home-feature-ribbon span:last-child {
  transform: scaleX(-1);
}

.mana-dot {
  width: 12px;
  height: 12px;
  margin-right: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  box-shadow: 0 0 6px currentColor;
  flex-shrink: 0;
}

@media (max-height: 720px) {
  .home-shell { gap: 10px; padding-top: 10px; }
  .home-hero__crest { width: 72px; height: 72px; margin-bottom: 2px; }
  .home-hero__crest img { width: 56px; height: 56px; }
  .home-hero h2 { font-size: 28px; }
  .home-hero__copy { margin-bottom: 4px; }
  .session-panel { padding: 13px 14px; }
  .session-panel > p { margin-bottom: 9px; }
  .sanctum-primary-button { min-height: 48px; }
}

@media (min-width: 700px) {
  .home-shell {
    display: grid;
    width: min(100%, 908px);
    padding: 28px max(24px, var(--app-safe-right)) 38px max(24px, var(--app-safe-left));
    grid-template-areas:
      'hero hero'
      'session actions'
      'ribbon ribbon';
    grid-template-columns: minmax(0, 1.35fr) minmax(250px, 0.65fr);
    grid-template-rows: auto auto auto;
    align-content: center;
    gap: 18px;
  }

  .home-hero {
    padding-bottom: 8px;
  }

  .home-hero__crest {
    width: 108px;
    height: 108px;
  }

  .home-hero__crest img {
    width: 80px;
    height: 80px;
  }

  .home-hero h2 {
    font-size: 42px;
  }

  .home-hero__copy {
    max-width: 430px;
    font-size: 15px;
  }

  .session-panel {
    display: flex;
    min-height: 252px;
    padding: 20px;
    flex-direction: column;
  }

  .session-panel h3 {
    margin-top: 18px;
    font-size: 24px;
  }

  .session-panel > p {
    max-width: 390px;
    font-size: 14px;
  }

  .sanctum-primary-button {
    min-height: 58px;
    margin-top: auto;
  }

  .home-action-grid {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }

  .home-action-tile {
    min-height: 116px;
    padding: 16px 14px;
    grid-template-columns: 42px minmax(0, 1fr) auto;
  }

  .home-action-tile__icon {
    width: 48px;
    height: 48px;
    font-size: 21px;
  }

  .home-action-tile__copy strong {
    font-size: 13px;
  }

  .home-action-tile__copy small {
    font-size: 12px;
  }
}

@media (min-width: 700px) and (max-height: 820px) {
  .home-shell {
    padding-top: 16px;
    padding-bottom: 20px;
    gap: 13px;
  }

  .home-hero__crest {
    width: 80px;
    height: 80px;
    margin-bottom: 2px;
  }

  .home-hero__crest img {
    width: 60px;
    height: 60px;
  }

  .home-hero h2 {
    font-size: 34px;
  }

  .session-panel,
  .home-action-grid {
    min-height: 218px;
  }
}
</style>
