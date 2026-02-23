<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('stats.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Empty state -->
      <div v-if="statsStore.totalGamesPlayed === 0" class="flex h-full flex-col items-center justify-center gap-3">
        <IllustrationNoStats :size="120" data-animate />
        <div class="text-center text-text-secondary" data-animate>
          <p class="mt-2">{{ t('stats.emptyState') }}</p>
          <p class="text-xs">{{ t('stats.emptyStateHint') }}</p>
        </div>
      </div>

      <!-- Stats content -->
      <template v-else>
        <!-- Summary cards -->
        <ion-list :inset="true" data-animate>
          <ion-list-header>
            <ion-label>{{ t('stats.summary') }}</ion-label>
          </ion-list-header>

          <ion-item lines="inset">
            <ion-icon :icon="trophyOutline" slot="start" color="primary" />
            <ion-label>
              <h2>{{ t('stats.gamesPlayed') }}</h2>
            </ion-label>
            <ion-note slot="end">{{ uniqueGameCount }}</ion-note>
          </ion-item>

          <ion-item lines="inset">
            <ion-icon :icon="timeOutline" slot="start" color="secondary" />
            <ion-label>
              <h2>{{ t('stats.averageDuration') }}</h2>
            </ion-label>
            <ion-note slot="end">{{ formattedAverageDuration }}</ion-note>
          </ion-item>

          <ion-item lines="none">
            <ion-icon :icon="ribbonOutline" slot="start" color="warning" />
            <ion-label>
              <h2>{{ t('stats.mostPlayedCommander') }}</h2>
              <p v-if="statsStore.overallStats.mostPlayedCommander">
                {{ statsStore.overallStats.mostPlayedCommander }}
              </p>
              <p v-else>{{ t('common.none') }}</p>
            </ion-label>
          </ion-item>
        </ion-list>

        <!-- Recent games -->
        <ion-list :inset="true" data-animate>
          <ion-list-header>
            <ion-label>{{ t('stats.recentGames') }}</ion-label>
          </ion-list-header>

          <ion-item
            v-for="game in statsStore.recentGames"
            :key="game.gameId"
            lines="inset"
          >
            <ion-icon :icon="gameControllerOutline" slot="start" color="medium" />
            <ion-label>
              <h2>{{ formatDate(game.playedAt) }}</h2>
              <p>{{ t('stats.playerCount', { count: game.playerCount }) }} &middot; {{ formatMsToMinSec(game.durationMs) }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonNote,
  IonIcon,
} from '@ionic/vue'
import {
  trophyOutline,
  timeOutline,
  ribbonOutline,
  gameControllerOutline,
} from 'ionicons/icons'
import { useStatsStore } from '@/stores/statsStore'
import { usePageEnterAnimation } from '@/composables/usePageEnterAnimation'
import { formatMsToMinSec } from '@/utils/time'
import { toLocaleCode } from '@/utils/i18nHelpers'
import IllustrationNoStats from '@/components/icons/illustrations/IllustrationNoStats.vue'

const { t, locale } = useI18n()
const statsStore = useStatsStore()

usePageEnterAnimation()

const currentLocaleCode = computed(() => toLocaleCode(locale.value as 'en' | 'fr'))

const uniqueGameCount = computed(() => {
  const uniqueGameIds = new Set(statsStore.gameRecords.map((record) => record.gameId))
  return uniqueGameIds.size
})

const formattedAverageDuration = computed(() => {
  return formatMsToMinSec(statsStore.overallStats.averageDurationMs)
})

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(currentLocaleCode.value, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
</script>
