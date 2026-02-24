<template>
  <AppModal :is-open="isOpen" :title="profile?.name ?? ''" @close="$emit('close')">
    <template v-if="profile">
      <!-- Player info -->
      <ion-list :inset="true">
        <ion-item>
          <span
            slot="start"
            class="mana-dot"
            :style="{ background: `var(--color-mana-${profile.preferredColor})` }"
          />
          <ion-label>
            <h2>{{ profile.name }}</h2>
          </ion-label>
          <ion-button slot="end" fill="clear" @click="$emit('edit', profile.id)">
            <ion-icon :icon="createOutline" slot="icon-only" />
          </ion-button>
        </ion-item>
      </ion-list>

      <!-- Stats -->
      <ion-list :inset="true">
        <ion-list-header>
          <ion-label>{{ t('players.profileStats') }}</ion-label>
        </ion-list-header>

        <ion-item lines="inset">
          <ion-icon :icon="trophyOutline" slot="start" color="primary" />
          <ion-label>{{ t('players.gamesPlayed') }}</ion-label>
          <ion-note slot="end">{{ profileGamesPlayed }}</ion-note>
        </ion-item>

        <ion-item lines="none">
          <ion-icon :icon="ribbonOutline" slot="start" color="warning" />
          <ion-label>{{ t('players.winRate') }}</ion-label>
          <ion-note slot="end">
            {{ profileGamesPlayed > 0 ? `${Math.round(profileWinRate * 100)}%` : t('players.noGames') }}
          </ion-note>
        </ion-item>
      </ion-list>

      <!-- Decks -->
      <ion-list :inset="true">
        <ion-list-header>
          <ion-label>{{ t('players.decks') }}</ion-label>
          <ion-button fill="clear" @click="showDeckEditor = true; editingDeckId = undefined">
            <ion-icon :icon="addOutline" />
          </ion-button>
        </ion-list-header>

        <template v-if="profile.decks.length > 0">
          <DeckListItem
            v-for="deck in profile.decks"
            :key="deck.id"
            :deck="deck"
            @tap="openDeckEditor(deck.id)"
            @delete="confirmDeleteDeck(deck.id)"
          />

          <!-- Per-deck stats -->
          <ion-item v-for="deck in profile.decks" :key="`stats-${deck.id}`" lines="none" class="deck-stats-item">
            <ion-label class="ion-text-wrap">
              <p class="text-xs">
                {{ deck.name }}:
                {{ deckGamesPlayed(deck.id) }} {{ t('players.gamesPlayed').toLowerCase() }}
                <template v-if="deckGamesPlayed(deck.id) > 0">
                   — {{ Math.round(deckWinRate(deck.id) * 100) }}% {{ t('players.winRate').toLowerCase() }}
                </template>
              </p>
            </ion-label>
          </ion-item>
        </template>

        <ion-item v-else lines="none">
          <ion-label color="medium">
            <p>{{ t('players.noGames') }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <!-- Delete player -->
      <div class="px-4 pb-4">
        <ion-button expand="block" fill="outline" color="danger" @click="$emit('delete', profile.id)">
          <ion-icon :icon="trashOutline" slot="start" />
          {{ t('players.deletePlayer') }}
        </ion-button>
      </div>
    </template>

    <template #after-content>
      <DeckEditorModal
        :is-open="showDeckEditor"
        :profile-id="profile?.id ?? ''"
        :deck-id="editingDeckId"
        @close="showDeckEditor = false; editingDeckId = undefined"
      />
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonNote,
  IonButton,
  IonIcon,
  alertController,
} from '@ionic/vue'
import { addOutline, createOutline, trashOutline, trophyOutline, ribbonOutline } from 'ionicons/icons'
import AppModal from '@/components/ui/AppModal.vue'
import DeckListItem from '@/components/player-registry/DeckListItem.vue'
import DeckEditorModal from '@/components/player-registry/DeckEditorModal.vue'
import { usePlayerRegistryStore } from '@/stores/playerRegistryStore'
import { useStatsStore } from '@/stores/statsStore'

const props = defineProps<{
  isOpen: boolean
  profileId?: string
}>()

defineEmits<{
  close: []
  edit: [profileId: string]
  delete: [profileId: string]
}>()

const { t } = useI18n()
const registryStore = usePlayerRegistryStore()
const statsStore = useStatsStore()

const showDeckEditor = ref(false)
const editingDeckId = ref<string | undefined>(undefined)

const profile = computed(() => {
  if (!props.profileId) return undefined
  return registryStore.getProfileById(props.profileId)
})

// --- Stats computation ---

const profileRecords = computed(() => {
  if (!props.profileId) return []
  return statsStore.gameRecords.filter((record) => record.playerProfileId === props.profileId)
})

const profileGamesPlayed = computed(() => profileRecords.value.length)

const profileWinRate = computed(() => {
  const records = profileRecords.value
  if (records.length === 0) return 0
  const wins = records.filter((record) => record.result === 'win').length
  return wins / records.length
})

function deckRecords(deckId: string) {
  return profileRecords.value.filter((record) => record.deckId === deckId)
}

function deckGamesPlayed(deckId: string): number {
  return deckRecords(deckId).length
}

function deckWinRate(deckId: string): number {
  const records = deckRecords(deckId)
  if (records.length === 0) return 0
  const wins = records.filter((record) => record.result === 'win').length
  return wins / records.length
}

// --- Deck actions ---

function openDeckEditor(deckId: string) {
  editingDeckId.value = deckId
  showDeckEditor.value = true
}

async function confirmDeleteDeck(deckId: string) {
  if (!profile.value) return
  const deck = registryStore.getDeckById(profile.value.id, deckId)
  if (!deck) return

  const alert = await alertController.create({
    header: t('players.deleteDeck'),
    message: t('players.deleteDeckConfirm', { name: deck.name }),
    buttons: [
      { text: t('common.cancel'), role: 'cancel' },
      {
        text: t('common.delete'),
        role: 'destructive',
        handler: () => {
          registryStore.removeDeck(profile.value!.id, deckId)
        },
      },
    ],
  })
  await alert.present()
}
</script>

<style scoped>
.mana-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
}

.deck-stats-item {
  --min-height: 28px;
}
</style>
