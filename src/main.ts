import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import { IonicVue } from '@ionic/vue'
import { SplashScreen } from '@capacitor/splash-screen'
import { ScreenOrientation } from '@capacitor/screen-orientation'

import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { useOfflineStore } from './stores/offlineStore'
import { useSettingsStore } from './stores/settingsStore'

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

// Initialize app: mount → hide native splash → init services
router.isReady().then(async () => {
  app.mount('#app')

  // Hide native splash — web SplashOverlay takes over
  await SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {})

  // Lock screen to portrait
  await ScreenOrientation.lock({ orientation: 'portrait' }).catch(() => {})

  // Sync i18n locale with user settings
  const settingsStore = useSettingsStore()
  ;(i18n.global.locale as unknown as { value: string }).value = settingsStore.language

  // Sync html lang attribute with locale
  document.documentElement.lang = settingsStore.language
  watch(
    () => settingsStore.language,
    (newLang) => {
      document.documentElement.lang = newLang
      ;(i18n.global.locale as unknown as { value: string }).value = newLang
    },
  )

  // Init offline database (non-blocking)
  const offlineStore = useOfflineStore()
  offlineStore.initialize().catch((error) => {
    console.warn('Offline database init skipped:', error)
  })
})
