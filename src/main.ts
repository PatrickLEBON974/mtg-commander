import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { IonicVue } from '@ionic/vue'
import { SplashScreen } from '@capacitor/splash-screen'

import App from './App.vue'
import router from './router'
import { useOfflineStore } from './stores/offlineStore'

import './assets/main.css'

const app = createApp(App)

app.use(IonicVue, {
  mode: 'md',
})

const pinia = createPinia()
app.use(pinia)
app.use(router)

// Initialize app: mount → hide native splash → init services
router.isReady().then(async () => {
  app.mount('#app')

  // Hide native splash — web SplashOverlay takes over
  await SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {})

  // Init offline database (non-blocking)
  const offlineStore = useOfflineStore()
  offlineStore.initialize().catch((error) => {
    console.warn('Offline database init skipped:', error)
  })
})
