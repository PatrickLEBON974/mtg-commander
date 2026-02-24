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

    <div class="custom-tab-bar" ref="tabBarRef">
      <button
        v-for="(tab, index) in TABS"
        :key="tab.path"
        :ref="(el) => tabButtonRefs[index] = el as HTMLElement"
        class="custom-tab-button"
        :class="{ 'tab-selected': currentIndex === index }"
        @click="goToTab(index)"
      >
        <component :is="tab.iconComponent" :size="22" />
        <ion-label>{{ t(tab.labelKey) }}</ion-label>
      </button>
      <!-- Sliding gold indicator -->
      <div class="tab-indicator" :style="indicatorStyle" />
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, type Component } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  IonPage,
  IonLabel,
  createGesture,
} from '@ionic/vue'
import type { GestureDetail } from '@ionic/vue'
import gsap from 'gsap'

import { isDragLocked } from '@/composables/useDragLock'
import { prefersReducedMotion } from '@/utils/motion'
import HomeView from '@/views/HomeView.vue'
import PlayersView from '@/views/PlayersView.vue'
import GameView from '@/views/GameView.vue'
import CardSearchView from '@/views/CardSearchView.vue'
import StatsView from '@/views/StatsView.vue'
import SettingsView from '@/views/SettingsView.vue'

import IconHome from '@/components/icons/nav/IconHome.vue'
import IconPeople from '@/components/icons/nav/IconPeople.vue'
import IconSwords from '@/components/icons/nav/IconSwords.vue'
import IconSearch from '@/components/icons/nav/IconSearch.vue'
import IconScroll from '@/components/icons/nav/IconScroll.vue'
import IconGear from '@/components/icons/nav/IconGear.vue'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

interface TabDef {
  name: string
  path: string
  iconComponent: Component
  labelKey: string
  component: Component
}

const TABS: TabDef[] = [
  { name: 'home', path: '/home', iconComponent: IconHome, labelKey: 'tabs.home', component: HomeView },
  { name: 'players', path: '/players', iconComponent: IconPeople, labelKey: 'tabs.players', component: PlayersView },
  { name: 'game', path: '/game', iconComponent: IconSwords, labelKey: 'tabs.game', component: GameView },
  { name: 'search', path: '/search', iconComponent: IconSearch, labelKey: 'tabs.cards', component: CardSearchView },
  { name: 'stats', path: '/stats', iconComponent: IconScroll, labelKey: 'tabs.stats', component: StatsView },
  { name: 'settings', path: '/settings', iconComponent: IconGear, labelKey: 'tabs.settings', component: SettingsView },
]

// Build path → index lookup
const pathToIndex: Record<string, number> = {}
TABS.forEach((tab, index) => { pathToIndex[tab.path] = index })

const viewportRef = ref<HTMLElement>()
const trackRef = ref<HTMLElement>()
const tabBarRef = ref<HTMLElement>()
const tabButtonRefs = ref<(HTMLElement | null)[]>(new Array(TABS.length).fill(null))
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

// --- Sliding indicator ---

const indicatorStyle = computed(() => {
  const buttonEl = tabButtonRefs.value[currentIndex.value]
  if (!buttonEl || !tabBarRef.value) {
    const tabWidth = 100 / TABS.length
    return {
      left: `${currentIndex.value * tabWidth}%`,
      width: `${tabWidth}%`,
    }
  }
  return {
    left: `${buttonEl.offsetLeft}px`,
    width: `${buttonEl.offsetWidth}px`,
  }
})

// --- Tab icon animation ---

watch(currentIndex, (newIndex, oldIndex) => {
  if (prefersReducedMotion.value) return

  // Shrink old tab icon
  const oldButton = tabButtonRefs.value[oldIndex]
  if (oldButton) {
    gsap.to(oldButton.querySelector('svg'), {
      scale: 0.85,
      opacity: 0.5,
      duration: 0.15,
      ease: 'power2.out',
    })
    gsap.to(oldButton.querySelector('svg'), {
      scale: 1,
      opacity: 1,
      duration: 0.15,
      delay: 0.15,
      ease: 'power2.out',
    })
  }

  // Grow new tab icon
  const newButton = tabButtonRefs.value[newIndex]
  if (newButton) {
    gsap.fromTo(
      newButton.querySelector('svg'),
      { scale: 0.85, opacity: 0.5 },
      { scale: 1, opacity: 1, duration: 0.25, delay: 0.1, ease: 'elastic.out(1, 0.6)' },
    )
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

.custom-tab-bar {
  display: flex;
  position: relative;
  background: var(--ion-tab-bar-background, #0d1220);
  height: calc(48px + var(--ion-safe-area-bottom, 0px));
  padding-bottom: var(--ion-safe-area-bottom, 0px);
  border-top: 1px solid rgba(212, 168, 67, 0.12);
  flex-shrink: 0;
}

.custom-tab-button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  background: none;
  border: none;
  color: var(--ion-tab-bar-color, #5a6280);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: var(--spacing-xs) 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color 150ms ease;
}

.custom-tab-button :deep(svg) {
  transition: filter 200ms ease;
}

.custom-tab-button.tab-selected {
  color: var(--ion-tab-bar-color-selected, #e8600a);
}

.custom-tab-button.tab-selected :deep(svg) {
  filter: drop-shadow(0 0 8px rgba(232, 96, 10, 0.5));
}
</style>
