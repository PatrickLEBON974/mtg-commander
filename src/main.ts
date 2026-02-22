import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { IonicVue } from '@ionic/vue'

import App from './App.vue'
import router from './router'

import './assets/main.css'

const app = createApp(App)

app.use(IonicVue, {
  mode: 'md',
})
app.use(createPinia())
app.use(router)

router.isReady().then(() => {
  app.mount('#app')
})
