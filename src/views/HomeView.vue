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
          @click="startNewGame"
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
      </div>

      <!-- Empty state illustration when no active game -->
      <div v-if="!gameStore.isGameActive" data-animate class="flex justify-center py-4">
        <IllustrationEmptyGame :size="100" />
      </div>

      <!-- Quick settings -->
      <ion-list data-animate :inset="true" class="ion-margin-top">
        <ion-list-header>
          <ion-label>{{ t('home.quickSettings') }}</ion-label>
        </ion-list-header>

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
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
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
  IonListHeader,
  IonItem,
  IonLabel,
  IonToggle,
} from '@ionic/vue'
import {
  playOutline,
  returnUpForwardOutline,
  peopleOutline,
  heartOutline,
  timerOutline,
} from 'ionicons/icons'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { usePageEnterAnimation } from '@/composables/usePageEnterAnimation'
import SettingStepper from '@/components/ui/SettingStepper.vue'
import DividerOrnament from '@/components/icons/decorative/DividerOrnament.vue'
import IllustrationEmptyGame from '@/components/icons/illustrations/IllustrationEmptyGame.vue'
import { PLAYER_COUNT_OPTIONS, STARTING_LIFE_OPTIONS } from '@/config/gameConstants'

const { t } = useI18n()
const router = useRouter()
const gameStore = useGameStore()
const settingsStore = useSettingsStore()

usePageEnterAnimation()

function startNewGame() {
  gameStore.settings = { ...settingsStore.gameSettings }
  gameStore.startNewGame()
  router.push('/game')
}

function resumeGame() {
  router.push('/game')
}
</script>
