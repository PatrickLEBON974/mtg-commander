<template>
  <ion-page class="app-screen">
    <SanctumHeader
      :title="t('settings.title')"
      :eyebrow="t('settings.headerEyebrow')"
      badge="CFG"
    />

    <ion-content class="sanctum-content settings-sanctum-content">
      <div class="settings-layout">
      <!-- App Section -->
      <ion-list :inset="true" data-animate>
        <ion-list-header>
          <ion-label>{{ t('settings.application') }}</ion-label>
        </ion-list-header>

        <ion-item lines="inset">
          <ion-icon :icon="languageOutline" slot="start" color="tertiary" />
          <ion-label>
            <h2>{{ t('settings.language') }}</h2>
          </ion-label>
          <ion-select v-model="settingsStore.language" interface="action-sheet" @ionChange="onLanguageChange">
            <ion-select-option value="fr">Francais</ion-select-option>
            <ion-select-option value="en">English</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item lines="inset">
          <ion-icon :icon="phonePortraitOutline" slot="start" color="medium" />
          <ion-label>{{ t('settings.hapticFeedback') }}</ion-label>
          <ion-toggle slot="end" v-model="settingsStore.hapticFeedback" />
        </ion-item>

        <ion-item lines="inset">
          <ion-icon :icon="volumeHighOutline" slot="start" color="medium" />
          <ion-label>
            <h2>{{ t('settings.sounds') }}</h2>
            <p>{{ t('settings.soundsDescription') }}</p>
          </ion-label>
          <ion-toggle slot="end" v-model="settingsStore.soundEnabled" />
        </ion-item>

        <ion-item lines="inset">
          <ion-icon :icon="sunnyOutline" slot="start" color="medium" />
          <ion-label>{{ t('settings.keepScreenOn') }}</ion-label>
          <ion-toggle slot="end" v-model="settingsStore.keepScreenOn" />
        </ion-item>

        <ion-item button lines="none" @click="resetSettings" detail>
          <ion-icon :icon="refreshOutline" slot="start" color="danger" />
          <ion-label color="danger">{{ t('settings.reset') }}</ion-label>
        </ion-item>
      </ion-list>

      <!-- Offline Data Section -->
      <ion-list :inset="true" data-animate>
        <ion-list-header>
          <ion-label>{{ t('settings.offlineData') }}</ion-label>
        </ion-list-header>

        <ion-item lines="inset">
          <ion-icon :icon="serverOutline" slot="start" color="secondary" />
          <ion-label>
            <h2>{{ t('settings.localCardDb') }}</h2>
            <p v-if="offlineStore.hasLocalData">
              {{ t('settings.cardCount', { count: offlineStore.cardCount.toLocaleString(currentLocaleCode) }) }}
              (~{{ offlineStore.estimatedSizeMb }} MB)
            </p>
            <p v-else>{{ t('settings.notDownloaded') }}</p>
          </ion-label>
          <ion-note slot="end" :color="offlineStore.hasLocalData ? 'success' : 'medium'">
            {{ offlineStore.hasLocalData ? t('settings.ready') : t('settings.empty') }}
          </ion-note>
        </ion-item>

        <ion-item lines="inset">
          <ion-icon :icon="timeOutline" slot="start" color="medium" />
          <ion-label>
            <h2>{{ t('settings.lastUpdate') }}</h2>
            <p>{{ offlineStore.formattedLastUpdate }}</p>
          </ion-label>
        </ion-item>

        <ion-item lines="inset">
          <ion-icon :icon="languageOutline" slot="start" color="tertiary" />
          <ion-label>
            <h2>{{ t('settings.secondLanguage') }}</h2>
            <p>{{ t('settings.englishIncluded') }}{{ settingsStore.cardSecondLanguage ? ' + ' + languageLabel(settingsStore.cardSecondLanguage) : '' }}</p>
          </ion-label>
          <ion-select
            v-model="settingsStore.cardSecondLanguage"
            interface="action-sheet"
            :interface-options="{ header: t('settings.cardLanguage') }"
            :placeholder="t('settings.englishOnly')"
          >
            <ion-select-option :value="null">{{ t('settings.englishOnly') }}</ion-select-option>
            <ion-select-option value="fr">Francais (~1.5 GB)</ion-select-option>
            <ion-select-option value="de">Deutsch (~1.5 GB)</ion-select-option>
            <ion-select-option value="es">Espanol (~1.5 GB)</ion-select-option>
            <ion-select-option value="it">Italiano (~1.5 GB)</ion-select-option>
            <ion-select-option value="pt">Portugues (~1.5 GB)</ion-select-option>
            <ion-select-option value="ja">日本語 (~1.5 GB)</ion-select-option>
            <ion-select-option value="ko">한국어 (~1.5 GB)</ion-select-option>
            <ion-select-option value="zhs">中文简体 (~1.5 GB)</ion-select-option>
            <ion-select-option value="zht">中文繁體 (~1.5 GB)</ion-select-option>
            <ion-select-option value="ru">Русский (~1.5 GB)</ion-select-option>
          </ion-select>
        </ion-item>

        <!-- Download progress -->
        <ion-item v-if="offlineStore.isDownloading && offlineStore.downloadProgress" lines="inset">
          <ion-spinner name="crescent" slot="start" />
          <ion-label>
            <h2>{{ offlineStore.downloadProgress.message }}</h2>
            <ion-progress-bar
              v-if="offlineStore.downloadProgress.phase === 'downloading' && offlineStore.downloadProgress.totalMb"
              :value="(offlineStore.downloadProgress.downloadedMb ?? 0) / offlineStore.downloadProgress.totalMb"
              class="ion-margin-top"
            />
            <ion-progress-bar
              v-else-if="offlineStore.downloadProgress.phase === 'importing' && offlineStore.downloadProgress.importProgress"
              :value="offlineStore.downloadProgress.importProgress.inserted / offlineStore.downloadProgress.importProgress.total"
              class="ion-margin-top"
            />
            <ion-progress-bar v-else type="indeterminate" class="ion-margin-top" />
          </ion-label>
        </ion-item>

        <!-- Error message -->
        <ion-item v-if="offlineStore.downloadError" lines="inset">
          <ion-icon :icon="alertCircleOutline" slot="start" color="danger" />
          <ion-label color="danger">
            <h2>{{ t('settings.error') }}</h2>
            <p>{{ offlineStore.downloadError }}</p>
          </ion-label>
        </ion-item>

        <ion-item lines="inset">
          <ion-button
            expand="block"
            :disabled="offlineStore.isDownloading"
            @click="offlineStore.startDownload()"
            class="ion-margin-vertical"
          >
            <ion-spinner v-if="offlineStore.isDownloading" name="crescent" slot="start" />
            <ion-icon v-else :icon="cloudDownloadOutline" slot="start" />
            {{ offlineStore.hasLocalData ? t('settings.update') : t('settings.download') }} ({{ downloadSizeLabel }})
          </ion-button>
        </ion-item>

        <ion-item v-if="offlineStore.hasLocalData" lines="none">
          <ion-button
            expand="block"
            fill="outline"
            color="danger"
            :disabled="offlineStore.isDownloading"
            @click="confirmClearCache"
            class="ion-margin-vertical"
          >
            <ion-icon :icon="trashOutline" slot="start" />
            {{ t('settings.clearCache') }}
          </ion-button>
        </ion-item>
      </ion-list>

      <!-- Wizards of the Coast fan content disclaimer -->
      <div class="settings-disclaimer ion-padding ion-text-center">
        <p>{{ t('settings.disclaimer') }}</p>
      </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  IonPage,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonButton,
  IonIcon,
  alertController,
  IonSpinner,
  IonProgressBar,
} from '@ionic/vue'
import {
  cloudDownloadOutline,
  serverOutline,
  timeOutline,
  alertCircleOutline,
  phonePortraitOutline,
  volumeHighOutline,
  sunnyOutline,
  refreshOutline,
  trashOutline,
  languageOutline,
} from 'ionicons/icons'
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useOfflineStore } from '@/stores/offlineStore'
import { usePageEnterAnimation } from '@/composables/usePageEnterAnimation'
import { toLocaleCode } from '@/utils/i18nHelpers'
import SanctumHeader from '@/components/ui/SanctumHeader.vue'
const { t, locale } = useI18n()
const settingsStore = useSettingsStore()
const offlineStore = useOfflineStore()

usePageEnterAnimation()

const currentLocaleCode = computed(() => toLocaleCode(locale.value as 'en' | 'fr'))

const LANGUAGE_LABELS: Record<string, string> = {
  fr: 'Francais', de: 'Deutsch', es: 'Espanol', it: 'Italiano',
  pt: 'Portugues', ja: '日本語', ko: '한국어',
  zhs: '中文简体', zht: '中文繁體', ru: 'Русский',
}

function languageLabel(code: string): string {
  return LANGUAGE_LABELS[code] ?? code
}

const downloadSizeLabel = computed(() =>
  settingsStore.cardSecondLanguage ? '~1.5 GB' : '~162 MB',
)

function resetSettings() {
  settingsStore.resetToDefaults()
}

function onLanguageChange() {
  locale.value = settingsStore.language
}

async function confirmClearCache() {
  const alert = await alertController.create({
    header: t('settings.clearCacheConfirmTitle'),
    message: t('settings.clearCacheConfirmMessage', { count: offlineStore.cardCount.toLocaleString(currentLocaleCode.value) }),
    buttons: [
      { text: t('common.cancel'), role: 'cancel' },
      {
        text: t('common.delete'),
        role: 'destructive',
        handler: () => offlineStore.clearCache(),
      },
    ],
  })
  await alert.present()
}
</script>

<style scoped>
.settings-sanctum-content {
  --padding-start: var(--ion-safe-area-left, 0px);
  --padding-end: var(--ion-safe-area-right, 0px);
  --padding-top: 8px;
  --padding-bottom: 24px;
}

.settings-layout {
  width: min(100%, 920px);
  margin: 0 auto;
}

.settings-sanctum-content ion-list {
  margin-top: 12px;
}

.settings-sanctum-content ion-list-header {
  min-height: 48px;
  padding-top: 8px;
  background:
    linear-gradient(90deg, rgba(206, 145, 53, 0.075), transparent 72%);
  border-bottom: 1px solid rgba(205, 171, 98, 0.08);
}

.settings-sanctum-content ion-list-header ion-label::before {
  content: '◆';
  margin-right: 9px;
  color: rgba(217, 172, 80, 0.58);
  font-size: 7px;
  vertical-align: 1px;
}

.settings-sanctum-content ion-item ion-icon[slot='start'] {
  padding: 8px;
  border: 1px solid rgba(204, 171, 99, 0.11);
  border-radius: 9px;
  background: rgba(0, 0, 0, 0.16);
}

.settings-sanctum-content ion-select {
  max-width: 52%;
  min-height: 48px;
  font-size: 16px;
}

.settings-sanctum-content ion-select::part(text) {
  overflow: visible;
  line-height: 1.25;
  text-align: right;
  text-overflow: clip;
  white-space: normal;
}

.settings-disclaimer {
  color: rgba(207, 217, 212, 0.7);
  font-size: 13px;
  line-height: 1.55;
}

@media (min-width: 700px) {
  .settings-layout {
    display: grid;
    padding: 12px 20px 32px;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    align-items: start;
    gap: 16px;
  }

  .settings-layout > ion-list {
    height: fit-content;
    margin: 0;
  }

  .settings-layout > div:last-child {
    grid-column: 1 / -1;
  }
}
</style>
