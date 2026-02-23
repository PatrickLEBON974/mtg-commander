<template>
  <ion-page>
    <div class="swipe-viewport" ref="viewportRef">
      <div
        ref="trackRef"
        class="swipe-track"
        :style="trackStyle"
      >
        <div v-for="tab in TABS" :key="tab.path" class="swipe-slide">
          <component :is="tab.component" />
        </div>
      </div>
    </div>

    <ion-tab-bar>
      <ion-tab-button
        v-for="(tab, index) in TABS"
        :key="tab.path"
        :tab="tab.name"
        :selected="currentIndex === index"
        @click="goToTab(index)"
      >
        <ion-icon :icon="tab.icon" />
        <ion-label>{{ t(tab.labelKey) }}</ion-label>
      </ion-tab-button>
    </ion-tab-bar>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  IonPage,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  createGesture,
} from '@ionic/vue'
import type { GestureDetail } from '@ionic/vue'
import {
  homeOutline,
  heartOutline,
  searchOutline,
  statsChartOutline,
  settingsOutline,
} from 'ionicons/icons'

import { isDragLocked } from '@/composables/useDragLock'
import HomeView from '@/views/HomeView.vue'
import GameView from '@/views/GameView.vue'
import CardSearchView from '@/views/CardSearchView.vue'
import StatsView from '@/views/StatsView.vue'
import SettingsView from '@/views/SettingsView.vue'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const TABS = [
  { name: 'home', path: '/home', icon: homeOutline, labelKey: 'tabs.home', component: HomeView },
  { name: 'game', path: '/game', icon: heartOutline, labelKey: 'tabs.game', component: GameView },
  { name: 'search', path: '/search', icon: searchOutline, labelKey: 'tabs.cards', component: CardSearchView },
  { name: 'stats', path: '/stats', icon: statsChartOutline, labelKey: 'tabs.stats', component: StatsView },
  { name: 'settings', path: '/settings', icon: settingsOutline, labelKey: 'tabs.settings', component: SettingsView },
]

// Build path → index lookup
const pathToIndex: Record<string, number> = {}
TABS.forEach((tab, index) => { pathToIndex[tab.path] = index })

const viewportRef = ref<HTMLElement>()
const trackRef = ref<HTMLElement>()
const currentIndex = ref(pathToIndex[route.path] ?? 0)
const dragOffset = ref(0)
const isAnimating = ref(false)
const viewportWidth = ref(0)

const EDGE_RESISTANCE = 0.3
const SWIPE_THRESHOLD = 0.12
const VELOCITY_THRESHOLD = 0.15

const trackStyle = computed(() => {
  // Before viewport measurement, use percentage-based positioning
  if (viewportWidth.value === 0) {
    return {
      transform: `translateX(${-currentIndex.value * 100}%)`,
      transition: 'none',
    }
  }

  const baseOffset = -currentIndex.value * viewportWidth.value
  const totalOffset = baseOffset + dragOffset.value
  return {
    transform: `translate3d(${totalOffset}px, 0, 0)`,
    transition: isAnimating.value ? 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
  }
})

// --- Navigation ---

let isSyncingFromRoute = false

function goToTab(index: number) {
  if (index === currentIndex.value) return
  isAnimating.value = true
  currentIndex.value = index
  dragOffset.value = 0
  syncRoute(index)
}

function syncRoute(index: number) {
  const path = TABS[index]?.path
  if (path && route.path !== path) {
    isSyncingFromRoute = true
    router.replace(path).finally(() => {
      isSyncingFromRoute = false
    })
  }
}

// Sync from external route changes (browser back/forward)
watch(() => route.path, (path) => {
  if (isSyncingFromRoute) return
  const index = pathToIndex[path]
  if (index !== undefined && index !== currentIndex.value) {
    isAnimating.value = true
    currentIndex.value = index
    dragOffset.value = 0
  }
})

// --- Gesture & resize ---

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  const viewport = viewportRef.value
  if (!viewport) return

  viewportWidth.value = viewport.offsetWidth

  resizeObserver = new ResizeObserver((entries) => {
    viewportWidth.value = entries[0]?.contentRect.width ?? viewport.offsetWidth
  })
  resizeObserver.observe(viewport)

  const gesture = createGesture({
    el: viewport,
    gestureName: 'tab-swipe',
    direction: 'x',
    threshold: 12,
    onMove: (detail: GestureDetail) => {
      if (isDragLocked.value) return

      isAnimating.value = false

      let delta = detail.deltaX

      // Rubber-band effect at edges
      const atStart = currentIndex.value === 0 && delta > 0
      const atEnd = currentIndex.value === TABS.length - 1 && delta < 0
      if (atStart || atEnd) {
        delta *= EDGE_RESISTANCE
      }

      dragOffset.value = delta
    },
    onEnd: (detail: GestureDetail) => {
      if (isDragLocked.value) {
        dragOffset.value = 0
        return
      }

      const width = viewportWidth.value
      if (width === 0) {
        dragOffset.value = 0
        return
      }

      // Ignore mostly vertical gestures (diagonal scroll)
      if (Math.abs(detail.deltaX) < Math.abs(detail.deltaY) * 1.5) {
        isAnimating.value = true
        dragOffset.value = 0
        return
      }

      const swipeRatio = Math.abs(dragOffset.value) / width
      const hasVelocity = Math.abs(detail.velocityX) >= VELOCITY_THRESHOLD
      const hasDistance = swipeRatio >= SWIPE_THRESHOLD

      let targetIndex = currentIndex.value

      if ((hasDistance || hasVelocity) && detail.deltaX < 0 && currentIndex.value < TABS.length - 1) {
        targetIndex = currentIndex.value + 1
      } else if ((hasDistance || hasVelocity) && detail.deltaX > 0 && currentIndex.value > 0) {
        targetIndex = currentIndex.value - 1
      }

      isAnimating.value = true
      currentIndex.value = targetIndex
      dragOffset.value = 0
      syncRoute(targetIndex)
    },
  })

  gesture.enable()

  // Reset animation flag when snap transition finishes
  trackRef.value?.addEventListener('transitionend', () => {
    isAnimating.value = false
  })
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<style scoped>
.swipe-viewport {
  flex: 1;
  overflow: hidden;
  position: relative;
  touch-action: pan-y;
}

.swipe-track {
  display: flex;
  height: 100%;
  will-change: transform;
  backface-visibility: hidden;
}

.swipe-slide {
  flex: 0 0 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}
</style>
