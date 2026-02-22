import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { IonicVue } from '@ionic/vue'

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

// Initialize database in background after mount
router.isReady().then(() => {
  app.mount('#app')

  // Init offline database (non-blocking)
  const offlineStore = useOfflineStore()
  offlineStore.initialize().catch((error) => {
    console.warn('Offline database init skipped:', error)
  })
})
