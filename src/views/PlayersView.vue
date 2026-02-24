<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('players.title') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="showPlayerModal = true">
            <ion-icon :icon="addOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Empty state -->
      <div v-if="registryStore.playerProfiles.length === 0" class="flex h-full flex-col items-center justify-center gap-3">
        <IllustrationNoPlayers :size="120" data-animate />
        <div class="text-center text-text-secondary" data-animate>
          <p class="mt-2">{{ t('players.emptyState') }}</p>
          <p class="text-xs">{{ t('players.emptyStateHint') }}</p>
        </div>
        <ion-button data-animate class="mt-4" color="primary" @click="showPlayerModal = true">
          <ion-icon :icon="addOutline" slot="start" />
          {{ t('players.addPlayer') }}
        </ion-button>
      </div>

      <!-- Player list -->
      <template v-else>
        <ion-list :inset="true" data-animate>
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
      </template>
    </ion-content>

    <!-- Add/Edit Player Modal -->
    <PlayerProfileModal
      :is-open="showPlayerModal"
      :profile-id="editingProfileId"
      @close="closePlayerModal"
    />

    <!-- Player Detail Modal -->
    <PlayerProfileDetail
      :is-open="showDetailModal"
      :profile-id="detailProfileId"
      @close="showDetailModal = false"
      @edit="editProfile"
      @delete="deleteProfile"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  alertController,
} from '@ionic/vue'
import { addOutline } from 'ionicons/icons'
import { usePlayerRegistryStore } from '@/stores/playerRegistryStore'
import { usePageEnterAnimation } from '@/composables/usePageEnterAnimation'
import PlayerProfileModal from '@/components/player-registry/PlayerProfileModal.vue'
import PlayerProfileDetail from '@/components/player-registry/PlayerProfileDetail.vue'
import IllustrationNoPlayers from '@/components/icons/illustrations/IllustrationNoPlayers.vue'

const { t } = useI18n()
const registryStore = usePlayerRegistryStore()

usePageEnterAnimation()

const showPlayerModal = ref(false)
const editingProfileId = ref<string | undefined>(undefined)
const showDetailModal = ref(false)
const detailProfileId = ref<string | undefined>(undefined)

function openProfileDetail(profileId: string) {
  detailProfileId.value = profileId
  showDetailModal.value = true
}

function editProfile(profileId: string) {
  showDetailModal.value = false
  editingProfileId.value = profileId
  showPlayerModal.value = true
}

function closePlayerModal() {
  showPlayerModal.value = false
  editingProfileId.value = undefined
}

async function deleteProfile(profileId: string) {
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
