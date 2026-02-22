import { createRouter, createWebHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'
import TabsLayout from '@/views/TabsLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: TabsLayout,
    children: [
      {
        path: '',
        redirect: '/home',
      },
      {
        path: 'home',
        name: 'home',
        component: () => import('@/views/HomeView.vue'),
      },
      {
        path: 'game',
        name: 'game',
        component: () => import('@/views/GameView.vue'),
      },
      {
        path: 'search',
        name: 'search',
        component: () => import('@/views/CardSearchView.vue'),
      },
      {
        path: 'stats',
        name: 'stats',
        component: () => import('@/views/StatsView.vue'),
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/SettingsView.vue'),
      },
      {
        path: 'multiplayer',
        name: 'multiplayer',
        component: () => import('@/views/MultiplayerView.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
