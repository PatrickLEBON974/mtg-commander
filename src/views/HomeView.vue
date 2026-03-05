<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>MTG Commander</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Hero -->
      <div class="arena-hero-bg flex flex-col items-center gap-3 pb-6 pt-8">
        <img
          data-animate
          src="@/assets/icons/ui/logo.svg"
          alt="MTG Commander"
          class="h-24 w-24"
          style="filter: drop-shadow(0 0 24px rgba(212, 168, 67, 0.35))"
        />
        <h1 data-animate class="arena-heading" style="font-family: var(--font-beleren); font-size: 28px; letter-spacing: 3px;">
          {{ t('home.title') }}
        </h1>
        <div data-animate class="flex items-center gap-2">
          <i class="ms ms-w ms-cost" />
          <i class="ms ms-u ms-cost" />
          <i class="ms ms-b ms-cost" />
          <i class="ms ms-r ms-cost" />
          <i class="ms ms-g ms-cost" />
        </div>
        <p data-animate class="text-xs" style="color: var(--ion-color-medium)">{{ t('home.subtitle') }}</p>
      </div>

      <DividerOrnament data-animate />

      <!-- Actions -->
      <div data-animate class="flex flex-col gap-3 px-4">
        <!-- No active game: New Game as primary -->
        <ion-button
          v-if="!gameStore.isGameActive"
          expand="block"
          size="large"
          color="primary"
          class="glow-breathe"
          style="--glow-color: rgba(232, 96, 10, 0.4)"
          @click="showNewGameModal = true"
        >
          <ion-icon :icon="playOutline" slot="start" />
          {{ t('home.newGame') }}
        </ion-button>

        <!-- Active game: split button Resume + expand arrow -->
        <div v-else class="split-btn-group">
          <ion-button
            expand="block"
            size="large"
            color="primary"
            class="split-btn-main glow-breathe"
            style="--glow-color: rgba(232, 96, 10, 0.4)"
            @click="resumeGame"
          >
            <ion-icon :icon="returnUpForwardOutline" slot="start" />
            {{ t('home.resumeGame') }}
          </ion-button>
          <button class="split-btn-arrow" :class="{ 'split-btn-arrow--open': showNewGameOption }" @click="showNewGameOption = !showNewGameOption">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
        <div class="new-game-reveal" :class="{ 'new-game-reveal--open': showNewGameOption }">
          <ion-button
            expand="block"
            size="large"
            fill="outline"
            color="primary"
            @click="showNewGameModal = true"
          >
            <ion-icon :icon="playOutline" slot="start" />
            {{ t('home.newGame') }}
          </ion-button>
        </div>

        <ion-button
          expand="block"
          size="large"
          fill="outline"
          color="secondary"
          @click="router.push('/multiplayer')"
        >
          <ion-icon :icon="peopleOutline" slot="start" />
          {{ t('home.multiplayer') }}
        </ion-button>

        <ion-button
          expand="block"
          size="large"
          fill="outline"
          color="tertiary"
          @click="showPlayersModal = true"
        >
          <ion-icon :icon="peopleCircleOutline" slot="start" />
          {{ t('home.managePlayers') }}
        </ion-button>
      </div>

      <!-- Empty state illustration when no active game -->
      <div v-if="!gameStore.isGameActive" data-animate class="flex justify-center py-4">
        <IllustrationEmptyGame :size="100" />
      </div>

      <!-- New Game Modal -->
      <NewGameModal
        :is-open="showNewGameModal"
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
  IonHeader,
  IonToolbar,
  IonTitle,
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
import { usePageEnterAnimation } from '@/composables/usePageEnterAnimation'
import { playGameStart } from '@/services/sounds'
import AppModal from '@/components/ui/AppModal.vue'
import DividerOrnament from '@/components/icons/decorative/DividerOrnament.vue'
import IllustrationEmptyGame from '@/components/icons/illustrations/IllustrationEmptyGame.vue'
import IllustrationNoPlayers from '@/components/icons/illustrations/IllustrationNoPlayers.vue'
import PlayerProfileModal from '@/components/player-registry/PlayerProfileModal.vue'
import PlayerProfileDetail from '@/components/player-registry/PlayerProfileDetail.vue'
import NewGameModal from '@/components/home/NewGameModal.vue'
import { usePlayerRegistryStore } from '@/stores/playerRegistryStore'
import type { PlayerConfigExtended } from '@/components/player-registry/PlayerSelectItem.vue'

const { t } = useI18n()
const router = useRouter()
const gameStore = useGameStore()
const registryStore = usePlayerRegistryStore()

const showNewGameOption = ref(false)
const showNewGameModal = ref(false)
const showPlayersModal = ref(false)
const showPlayerProfileModal = ref(false)
const editingProfileId = ref<string | undefined>(undefined)
const showDetailModal = ref(false)
const detailProfileId = ref<string | undefined>(undefined)

usePageEnterAnimation()

function confirmNewGame(confirmedPlayerConfigs: PlayerConfigExtended[]) {
  showNewGameModal.value = false
  showNewGameOption.value = false
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
  router.push('/game')
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
.mana-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 8px;
  box-shadow: 0 0 6px currentColor;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Split button: Resume + chevron arrow */
.split-btn-group {
  display: flex;
  gap: 0;
  align-items: stretch;
}

.split-btn-main {
  flex: 1;
  --border-radius: 10px 0 0 10px;
}

.split-btn-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--ion-color-primary) 100%, white 12%) 0%, var(--ion-color-primary) 100%);
  border-left: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0 10px 10px 0;
  color: white;
  transition: background 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.split-btn-arrow:active:not(.split-btn-arrow--open) {
  background: var(--ion-color-primary-shade);
  transform: translateY(2px);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.2);
}

.split-btn-arrow--open {
  background: var(--ion-color-primary-shade);
  transform: translateY(2px);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.2);
}

.split-btn-arrow svg {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.split-btn-arrow--open svg {
  transform: rotate(180deg);
}

/* Reveal animation for New Game button */
.new-game-reveal {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-height 0.3s ease, opacity 0.25s ease, margin-top 0.3s ease;
  margin-top: 0;
}

.new-game-reveal--open {
  max-height: 80px;
  opacity: 1;
  margin-top: 12px;
}
</style>

