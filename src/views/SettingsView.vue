<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('settings.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Offline Data Section -->
      <ion-list :inset="true">
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

      <!-- Game Section -->
      <ion-list :inset="true">
        <ion-list-header>
          <ion-label>{{ t('settings.gameSection') }}</ion-label>
        </ion-list-header>

        <ion-item lines="inset">
          <ion-icon :icon="peopleOutline" slot="start" color="tertiary" />
          <ion-label>
            <h2>{{ t('settings.playerCount') }}</h2>
          </ion-label>
          <SettingStepper
            slot="end"
            v-model="settingsStore.gameSettings.playerCount"
            :options="playerCountOptions"
            :label="t('common.players')"
          />
        </ion-item>

        <ion-item lines="none">
          <ion-icon :icon="heartOutline" slot="start" color="danger" />
          <ion-label>
            <h2>{{ t('settings.lifePoints') }}</h2>
          </ion-label>
          <SettingStepper
            slot="end"
            v-model="settingsStore.gameSettings.startingLife"
            :options="startingLifeOptions"
            :label="t('common.life')"
          />
        </ion-item>
      </ion-list>

      <!-- Rules Section -->
      <ion-list :inset="true">
        <ion-list-header>
          <ion-label>{{ t('settings.rules') }}</ion-label>
        </ion-list-header>

        <ion-item lines="inset">
          <ion-icon :icon="shieldOutline" slot="start" color="warning" />
          <ion-label>
            <h2>{{ t('settings.commanderDamage') }}</h2>
          </ion-label>
          <SettingStepper
            slot="end"
            v-model="settingsStore.gameSettings.commanderDamageThreshold"
            :options="commanderDamageOptions"
            :label="t('settings.commanderDamageLabel')"
          />
        </ion-item>

        <ion-item lines="none">
          <ion-icon :icon="skullOutline" slot="start" color="primary" />
          <ion-label>
            <h2>{{ t('settings.poisonThreshold') }}</h2>
          </ion-label>
          <SettingStepper
            slot="end"
            v-model="settingsStore.gameSettings.poisonThreshold"
            :options="poisonOptions"
            :label="t('settings.poisonLabel')"
          />
        </ion-item>
      </ion-list>

      <!-- App Section -->
      <ion-list :inset="true">
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

        <ion-item lines="inset">
          <ion-icon :icon="timerOutline" slot="start" color="medium" />
          <ion-label>{{ t('settings.gameTimer') }}</ion-label>
          <ion-toggle slot="end" v-model="settingsStore.gameSettings.enableTimer" />
        </ion-item>

        <ion-item button lines="none" @click="resetSettings" detail>
          <ion-icon :icon="refreshOutline" slot="start" color="danger" />
          <ion-label color="danger">{{ t('settings.reset') }}</ion-label>
        </ion-item>
      </ion-list>

      <!-- Wizards of the Coast fan content disclaimer -->
      <div class="ion-padding ion-text-center" style="opacity: 0.55; font-size: 12px; line-height: 1.5; color: var(--ion-color-medium)">
        <p>{{ t('settings.disclaimer') }}</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
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
  peopleOutline,
  heartOutline,
  shieldOutline,
  skullOutline,
  phonePortraitOutline,
  volumeHighOutline,
  sunnyOutline,
  timerOutline,
  refreshOutline,
  trashOutline,
  languageOutline,
} from 'ionicons/icons'
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useOfflineStore } from '@/stores/offlineStore'
import SettingStepper from '@/components/ui/SettingStepper.vue'

const { t, locale } = useI18n()
const settingsStore = useSettingsStore()
const offlineStore = useOfflineStore()

const currentLocaleCode = computed(() => locale.value === 'en' ? 'en-US' : 'fr-FR')

const playerCountOptions = [2, 3, 4, 5, 6].map((v) => ({ value: v, label: String(v) }))
const startingLifeOptions = [
  { value: 20, label: '20' },
  { value: 25, label: '25' },
  { value: 30, label: '30' },
  { value: 40, label: '40' },
]
const commanderDamageOptions = [
  { value: 0, label: 'Off' },
  { value: 21, label: '21' },
]
const poisonOptions = [
  { value: 0, label: 'Off' },
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 15, label: '15' },
  { value: 20, label: '20' },
]

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
