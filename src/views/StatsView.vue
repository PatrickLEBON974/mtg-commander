<template>
  <ion-page class="app-screen">
    <SanctumHeader
      :title="t('stats.title')"
      :eyebrow="t('stats.headerEyebrow')"
      badge="IV"
    />

    <ion-content class="sanctum-content stats-sanctum-content">
      <!-- Empty state -->
      <div v-if="statsStore.totalGamesPlayed === 0" class="stats-empty-wrap">
        <section class="stats-empty-panel" data-animate>
          <p class="stats-empty-panel__eyebrow">{{ t('stats.emptyEyebrow') }}</p>
          <div class="stats-empty-panel__emblem">
            <span class="stats-empty-panel__orbit" aria-hidden="true" />
            <IllustrationNoStats :size="112" />
          </div>
          <h2>{{ t('stats.emptyState') }}</h2>
          <p>{{ t('stats.emptyStateHint') }}</p>
          <ion-button class="stats-empty-panel__cta" @click="router.push('/home')">
            {{ t('stats.emptyAction') }}
          </ion-button>
        </section>
      </div>

      <!-- Stats content -->
      <template v-else>
        <div class="stats-grid">
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
        </div>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  IonPage,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonNote,
  IonIcon,
  IonButton,
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
import SanctumHeader from '@/components/ui/SanctumHeader.vue'

const { t, locale } = useI18n()
const router = useRouter()
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

<style scoped>
.stats-sanctum-content {
  --padding-start: max(16px, var(--ion-safe-area-left, 0px));
  --padding-end: max(16px, var(--ion-safe-area-right, 0px));
  --padding-top: 16px;
  --padding-bottom: 28px;
}

.stats-empty-wrap {
  display: grid;
  min-height: 100%;
  place-items: center;
}

.stats-empty-panel {
  position: relative;
  display: flex;
  overflow: hidden;
  width: min(100%, 430px);
  padding: 28px 22px 24px;
  align-items: center;
  flex-direction: column;
  border: 1px solid rgba(205, 172, 99, 0.22);
  border-radius: 18px;
  background:
    radial-gradient(circle at 50% 24%, rgba(210, 135, 39, 0.13), transparent 32%),
    linear-gradient(145deg, rgba(19, 28, 31, 0.96), rgba(7, 12, 14, 0.97));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.045),
    0 18px 42px rgba(0, 0, 0, 0.42);
  text-align: center;
}

.stats-empty-panel::before,
.stats-empty-panel::after {
  content: '';
  position: absolute;
  top: 0;
  width: 34%;
  height: 1px;
}

.stats-empty-panel::before {
  left: 0;
  background: linear-gradient(90deg, transparent, rgba(223, 182, 93, 0.54));
}

.stats-empty-panel::after {
  right: 0;
  background: linear-gradient(90deg, rgba(223, 182, 93, 0.54), transparent);
}

.stats-empty-panel__eyebrow {
  margin: 0;
  color: rgba(232, 204, 143, 0.82);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.stats-empty-panel__emblem {
  position: relative;
  display: grid;
  width: 148px;
  height: 148px;
  margin: 12px 0 5px;
  place-items: center;
}

.stats-empty-panel__emblem :deep(svg) {
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 0 18px rgba(207, 143, 43, 0.18));
}

.stats-empty-panel__orbit {
  position: absolute;
  inset: 4px;
  border: 1px solid rgba(211, 175, 96, 0.15);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(209, 138, 40, 0.07), transparent 64%);
  box-shadow: inset 0 0 22px rgba(0, 0, 0, 0.34);
}

.stats-empty-panel__orbit::before,
.stats-empty-panel__orbit::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 6px;
  height: 6px;
  border: 1px solid rgba(218, 181, 100, 0.44);
  background: #11181a;
  transform: translateY(-50%) rotate(45deg);
}

.stats-empty-panel__orbit::before { left: -4px; }
.stats-empty-panel__orbit::after { right: -4px; }

.stats-empty-panel h2 {
  margin: 0;
  color: rgba(241, 229, 199, 0.88);
  font-family: var(--font-beleren);
  font-size: 19px;
  letter-spacing: 0.3px;
}

.stats-empty-panel > p:not(.stats-empty-panel__eyebrow) {
  margin: 6px 0 15px;
  color: rgba(214, 224, 218, 0.72);
  font-size: 14px;
  line-height: 1.5;
}

.stats-empty-panel__cta {
  --border-radius: 10px;
  width: 100%;
  max-width: 280px;
  margin: 0;
}

.stats-grid {
  width: min(100%, 900px);
  margin: 0 auto;
}

@media (min-width: 700px) {
  .stats-sanctum-content {
    --padding-top: 24px;
  }

  .stats-empty-panel {
    width: min(100%, 520px);
    padding: 36px 34px 30px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    align-items: start;
    gap: 16px;
  }

  .stats-grid > ion-list {
    margin: 0;
  }
}
</style>
