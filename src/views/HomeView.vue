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
          style="filter: drop-shadow(0 0 16px rgba(212, 168, 67, 0.3))"
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
        <ion-button
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

        <ion-button
          v-if="gameStore.isGameActive"
          expand="block"
          size="large"
          fill="outline"
          color="primary"
          @click="resumeGame"
        >
          <ion-icon :icon="returnUpForwardOutline" slot="start" />
          {{ t('home.resumeGame') }}
        </ion-button>

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
      <AppModal :is-open="showNewGameModal" :title="t('home.newGame')" @close="showNewGameModal = false">
        <ion-list :inset="true">
          <ion-item lines="inset">
            <ion-icon :icon="peopleOutline" slot="start" color="tertiary" />
            <ion-label>{{ t('home.players') }}</ion-label>
            <SettingStepper
              slot="end"
              v-model="settingsStore.gameSettings.playerCount"
              :options="PLAYER_COUNT_OPTIONS"
              :label="t('common.players')"
            />
          </ion-item>

          <ion-item lines="inset">
            <ion-icon :icon="heartOutline" slot="start" color="danger" />
            <ion-label>{{ t('home.life') }}</ion-label>
            <SettingStepper
              slot="end"
              v-model="settingsStore.gameSettings.startingLife"
              :options="STARTING_LIFE_OPTIONS"
              :label="t('common.life')"
            />
          </ion-item>

          <ion-item lines="none">
            <ion-icon :icon="timerOutline" slot="start" color="medium" />
            <ion-label>{{ t('home.gameTimer') }}</ion-label>
            <ion-toggle slot="end" v-model="settingsStore.gameSettings.enableTimer" />
          </ion-item>
        </ion-list>

        <ion-list :inset="true">
          <ion-list-header>
            <ion-label>{{ t('home.rules') }}</ion-label>
          </ion-list-header>

          <ion-item lines="inset">
            <ion-icon :icon="shieldOutline" slot="start" color="warning" />
            <ion-label>{{ t('home.commanderDamage') }}</ion-label>
            <SettingStepper
              slot="end"
              v-model="settingsStore.gameSettings.commanderDamageThreshold"
              :options="commanderDamageOptions"
              :label="t('settings.commanderDamageLabel')"
            />
          </ion-item>

          <ion-item lines="none">
            <ion-icon :icon="skullOutline" slot="start" color="primary" />
            <ion-label>{{ t('home.poisonThreshold') }}</ion-label>
            <SettingStepper
              slot="end"
              v-model="settingsStore.gameSettings.poisonThreshold"
              :options="poisonOptions"
              :label="t('settings.poisonLabel')"
            />
          </ion-item>
        </ion-list>

        <ion-list-header>
          <ion-label>{{ t('home.playerList') }}</ion-label>
        </ion-list-header>

        <ion-reorder-group :disabled="false" @ionItemReorder="handleReorder($event)">
          <PlayerSelectItem
            v-for="(player, index) in playerConfigs"
            :key="player.id"
            :model-value="player"
            :player-index="index"
            :used-profile-ids="usedProfileIds"
            @update:model-value="playerConfigs[index] = $event"
          />
        </ion-reorder-group>

        <div class="p-4">
          <ion-button expand="block" color="primary" @click="confirmNewGame">
            <ion-icon :icon="playOutline" slot="start" />
            {{ t('home.newGame') }}
          </ion-button>
        </div>
      </AppModal>

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
import { ref, computed, watch } from 'vue'
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
  IonToggle,
  IonListHeader,
  IonReorderGroup,
} from '@ionic/vue'
import {
  playOutline,
  returnUpForwardOutline,
  peopleOutline,
  peopleCircleOutline,
  addOutline,
  heartOutline,
  timerOutline,
  shieldOutline,
  skullOutline,
} from 'ionicons/icons'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { usePageEnterAnimation } from '@/composables/usePageEnterAnimation'
import AppModal from '@/components/ui/AppModal.vue'
import SettingStepper from '@/components/ui/SettingStepper.vue'
import DividerOrnament from '@/components/icons/decorative/DividerOrnament.vue'
import IllustrationEmptyGame from '@/components/icons/illustrations/IllustrationEmptyGame.vue'
import IllustrationNoPlayers from '@/components/icons/illustrations/IllustrationNoPlayers.vue'
import PlayerSelectItem from '@/components/player-registry/PlayerSelectItem.vue'
import PlayerProfileModal from '@/components/player-registry/PlayerProfileModal.vue'
import PlayerProfileDetail from '@/components/player-registry/PlayerProfileDetail.vue'
import { usePlayerRegistryStore } from '@/stores/playerRegistryStore'
import type { PlayerConfigExtended } from '@/components/player-registry/PlayerSelectItem.vue'
import { PLAYER_COUNT_OPTIONS, STARTING_LIFE_OPTIONS, PLAYER_COLORS } from '@/config/gameConstants'

const { t } = useI18n()
const router = useRouter()
const gameStore = useGameStore()
const settingsStore = useSettingsStore()
const registryStore = usePlayerRegistryStore()

const commanderDamageOptions = computed(() => [
  { value: 0, label: t('common.off') },
  { value: 21, label: '21' },
])
const poisonOptions = computed(() => [
  { value: 0, label: t('common.off') },
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 15, label: '15' },
  { value: 20, label: '20' },
])

const showNewGameModal = ref(false)
const showPlayersModal = ref(false)
const showPlayerProfileModal = ref(false)
const editingProfileId = ref<string | undefined>(undefined)
const showDetailModal = ref(false)
const detailProfileId = ref<string | undefined>(undefined)

let nextConfigId = 0
const playerConfigs = ref<PlayerConfigExtended[]>([])

const usedProfileIds = computed(() =>
  playerConfigs.value
    .map((config) => config.playerProfileId)
    .filter((id): id is string => id !== undefined),
)

watch(() => settingsStore.gameSettings.playerCount, (count) => {
  const existing = playerConfigs.value
  if (count > existing.length) {
    for (let i = existing.length; i < count; i++) {
      existing.push({
        id: nextConfigId++,
        name: t('game.defaultPlayerName', { index: i + 1 }),
        color: PLAYER_COLORS[i % PLAYER_COLORS.length]!,
      })
    }
  } else if (count < existing.length) {
    existing.splice(count)
  }
}, { immediate: true })

function handleReorder(event: CustomEvent) {
  const movedItem = playerConfigs.value.splice(event.detail.from, 1)[0]!
  playerConfigs.value.splice(event.detail.to, 0, movedItem)
  event.detail.complete(false)
}

usePageEnterAnimation()

function confirmNewGame() {
  showNewGameModal.value = false
  gameStore.settings = { ...settingsStore.gameSettings }
  gameStore.startNewGame()
  // Apply player names, colors, and commanders from modal config
  const mapping: Record<string, { playerProfileId: string; deckId?: string }> = {}
  playerConfigs.value.forEach((config, index) => {
    const player = gameStore.currentGame!.players[index]
    if (player) {
      player.name = config.name
      player.color = config.color
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
  gameStore.setPlayerProfileMapping(mapping)
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
}
</style>

