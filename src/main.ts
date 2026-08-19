import { createApp, watch } from 'vue'
import type { Composer } from 'vue-i18n'
import { createPinia } from 'pinia'
import { IonicVue } from '@ionic/vue'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { ScreenOrientation } from '@capacitor/screen-orientation'

import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { useOfflineStore } from './stores/offlineStore'
import { useMultiplayerStore } from './stores/multiplayerStore'
import { useSettingsStore } from './stores/settingsStore'
import { preloadSounds } from './services/sounds'
import { parseRoomJoinPayload } from './services/roomJoinLink'

import './assets/main.css'

const app = createApp(App)

app.config.errorHandler = (error, _instance, info) => {
  console.error('[Vue Error]', error, info)
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise]', event.reason)
})

app.use(IonicVue, {
  mode: 'md',
})

const pinia = createPinia()
app.use(pinia)
app.use(i18n)
app.use(router)

async function openRoomJoinLink(url: string): Promise<void> {
  try {
    const code = parseRoomJoinPayload(url)
    await router.replace({ name: 'multiplayer', query: { code } })
  } catch {
    // Ignore links that do not belong to the multiplayer admission flow.
  }
}

// Initialize app: mount → hide native splash → init services
router.isReady().then(async () => {
  app.mount('#app')

  if (Capacitor.isNativePlatform()) {
    await CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      void openRoomJoinLink(url)
    })
    const launchUrl = await CapacitorApp.getLaunchUrl().catch(() => undefined)
    if (launchUrl?.url) await openRoomJoinLink(launchUrl.url)
  }

  // Hide native splash — web SplashOverlay takes over
  await SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {})

  // Follow the device orientation on phones and tablets. Every screen is
  // responsive, including split-screen and landscape windows.
  await ScreenOrientation.unlock().catch(() => {})

  // Sync i18n locale with user settings
  const settingsStore = useSettingsStore()
  const i18nGlobal = i18n.global as unknown as Composer
  i18nGlobal.locale.value = settingsStore.language

  // Sync html lang attribute with locale
  document.documentElement.lang = settingsStore.language
  watch(
    () => settingsStore.language,
    (newLang) => {
      document.documentElement.lang = newLang
      i18nGlobal.locale.value = newLang
    },
  )

  // Preload sound effects (non-blocking, needs user gesture on mobile)
  preloadSounds()

  // Init offline database (non-blocking)
  const offlineStore = useOfflineStore()
  offlineStore.initialize().catch((error) => {
    console.warn('Offline database init skipped:', error)
  })

  // Restore a Firebase room only when a persisted multiplayer session exists.
  // The store also rearms presence when the native app returns to foreground.
  const multiplayerStore = useMultiplayerStore()
  watch(
    () => multiplayerStore.gameStarted,
    (gameStarted) => {
      if (gameStarted && router.currentRoute.value.name !== 'game') {
        void router.replace('/game')
      }
    },
    { immediate: true },
  )
  watch(
    () => multiplayerStore.errorState?.code,
    (errorCode) => {
      const terminalRoomErrors = [
        'room-closed',
        'room-expired',
        'room-not-found',
        'session-expired',
      ]
      if (
        errorCode
        && !multiplayerStore.isMultiplayer
        && terminalRoomErrors.includes(errorCode)
        && router.currentRoute.value.name === 'game'
      ) {
        void router.replace('/multiplayer')
      }
    },
  )
  multiplayerStore.initialize().catch((error) => {
    console.warn('Multiplayer session restore skipped:', error)
  })
})
