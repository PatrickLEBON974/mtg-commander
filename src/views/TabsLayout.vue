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

    <!-- When fullscreen, teleport tab bar to body so it escapes all stacking contexts -->
    <Teleport to="body" :disabled="!isFullscreen">
      <nav
        class="custom-tab-bar"
        ref="tabBarRef"
        :aria-label="t('tabs.navigation')"
        :class="{
          'tab-bar-overlay': isFullscreen,
          'tab-bar-hidden': isFullscreen && !shouldShowTabBar,
        }"
      >
        <button
          v-for="(tab, index) in TABS"
          :key="tab.path"
          type="button"
          :ref="(el) => tabButtonRefs[index] = el as HTMLElement"
          class="custom-tab-button"
          :class="{ 'tab-selected': currentIndex === index }"
          :aria-current="currentIndex === index ? 'page' : undefined"
          @click="goToTab(index)"
        >
          <component :is="tab.iconComponent" :size="22" />
          <ion-label>{{ t(tab.labelKey) }}</ion-label>
        </button>
        <!-- Sliding gold indicator -->
        <div class="tab-indicator" :style="indicatorStyle" />
      </nav>
    </Teleport>
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
  modalController,
} from '@ionic/vue'
import type { GestureDetail } from '@ionic/vue'
import gsap from 'gsap'

import { isDragLocked } from '@/composables/useDragLock'
import { isGameTabActive, isGameMenuOpen, useGameFullscreen } from '@/composables/useGameFullscreen'
import { prefersReducedMotion } from '@/utils/motion'
import HomeView from '@/views/HomeView.vue'
import GameView from '@/views/GameView.vue'
import CardSearchView from '@/views/CardSearchView.vue'
import StatsView from '@/views/StatsView.vue'
import SettingsView from '@/views/SettingsView.vue'

import IconHome from '@/components/icons/nav/IconHome.vue'
import IconSwords from '@/components/icons/nav/IconSwords.vue'
import IconSearch from '@/components/icons/nav/IconSearch.vue'
import IconScroll from '@/components/icons/nav/IconScroll.vue'
import IconGear from '@/components/icons/nav/IconGear.vue'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const { isFullscreen, shouldShowTabBar, shouldDisableSwipe } = useGameFullscreen()

const GAME_TAB_INDEX = 1

interface TabDef {
  name: string
  path: string
  iconComponent: Component
  labelKey: string
  component: Component
}

const TABS: TabDef[] = [
  { name: 'home', path: '/home', iconComponent: IconHome, labelKey: 'tabs.home', component: HomeView },
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

watch(currentIndex, (index) => {
  isGameTabActive.value = index === GAME_TAB_INDEX
  if (index !== GAME_TAB_INDEX) {
    isGameMenuOpen.value = false
  }
}, { immediate: true })

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

async function goToTab(index: number) {
  if (index === currentIndex.value) return
  // Close game menu modal before switching tabs
  if (isGameMenuOpen.value) {
    await modalController.dismiss(undefined, 'tab-switch')
  }
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
      if (isDragLocked.value || shouldDisableSwipe.value) return

      trackRef.value?.style.setProperty('will-change', 'transform')
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
      if (isDragLocked.value || shouldDisableSwipe.value) {
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

  // Reset animation flag and remove will-change when snap transition finishes
  trackRef.value?.addEventListener('transitionend', () => {
    isAnimating.value = false
    trackRef.value?.style.removeProperty('will-change')
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
  z-index: 3;
  overflow: visible;
  background:
    linear-gradient(180deg, rgba(19, 27, 30, 0.98), rgba(6, 10, 12, 0.99)),
    var(--ion-tab-bar-background, #080d0f);
  height: calc(70px + var(--ion-safe-area-bottom, 0px));
  padding-right: max(4px, var(--ion-safe-area-right, 0px));
  padding-bottom: var(--ion-safe-area-bottom, 0px);
  padding-left: max(4px, var(--ion-safe-area-left, 0px));
  border-top: 1px solid rgba(207, 174, 101, 0.24);
  box-shadow:
    0 -12px 30px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 245, 215, 0.045),
    inset 0 10px 22px rgba(205, 151, 66, 0.025);
  flex-shrink: 0;
}

.custom-tab-bar::before {
  content: '';
  position: absolute;
  top: -1px;
  right: 10%;
  left: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(228, 190, 108, 0.55), transparent);
  box-shadow: 0 0 12px rgba(210, 126, 37, 0.32);
  pointer-events: none;
}

.custom-tab-button {
  flex: 1;
  min-width: 0;
  min-height: 64px;
  display: flex;
  position: relative;
  z-index: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: none;
  border: none;
  color: var(--ion-tab-bar-color, #697572);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.35px;
  padding: 7px 2px 6px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color 180ms ease, transform 180ms ease;
}

.custom-tab-button::before {
  content: '';
  position: absolute;
  top: 4px;
  width: 44px;
  height: 42px;
  border: 1px solid transparent;
  border-radius: 11px 11px 14px 14px;
  background: transparent;
  opacity: 0;
  transform: scale(0.78) translateY(4px);
  transition: opacity 180ms ease, transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1), border-color 180ms ease;
}

.custom-tab-button :deep(svg) {
  position: relative;
  z-index: 1;
  width: 23px;
  height: 23px;
  transition: filter 200ms ease, transform 200ms ease;
}

.custom-tab-button ion-label {
  position: relative;
  z-index: 1;
  overflow: hidden;
  max-width: 100%;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.custom-tab-button:focus-visible {
  z-index: 2;
  border-radius: 12px;
  outline-offset: -4px;
}

.custom-tab-button.tab-selected {
  color: var(--ion-tab-bar-color-selected, #e7b85f);
  transform: translateY(-1px);
}

.custom-tab-button.tab-selected::before {
  border-color: rgba(222, 181, 91, 0.24);
  background:
    radial-gradient(circle at 50% 25%, rgba(220, 142, 47, 0.22), transparent 68%),
    linear-gradient(180deg, rgba(39, 35, 27, 0.72), rgba(13, 18, 19, 0.5));
  box-shadow: inset 0 1px 0 rgba(255, 242, 204, 0.08), 0 4px 12px rgba(0, 0, 0, 0.28);
  opacity: 1;
  transform: scale(1) translateY(0);
}

.custom-tab-button.tab-selected :deep(svg) {
  filter: drop-shadow(0 0 9px rgba(226, 166, 72, 0.58)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.65));
  transform: translateY(-1px);
}

.tab-indicator {
  top: -1px;
  bottom: auto;
  height: 2px;
  background: linear-gradient(90deg, transparent 18%, #d66e26 48%, #f0c468 62%, transparent 82%);
  border-radius: 0;
  box-shadow: 0 0 11px rgba(224, 133, 42, 0.54);
  pointer-events: none;
  transition: left 250ms cubic-bezier(0.4, 0, 0.2, 1), width 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-bar-overlay {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: var(--z-tab-bar);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-bar-hidden {
  transform: translateY(100%);
  pointer-events: none;
}

@media (min-width: 700px) {
  .custom-tab-bar {
    height: calc(74px + var(--ion-safe-area-bottom, 0px));
    padding-right: max(24px, var(--ion-safe-area-right, 0px), calc((100vw - 800px) / 2));
    padding-left: max(24px, var(--ion-safe-area-left, 0px), calc((100vw - 800px) / 2));
  }

  .custom-tab-button {
    max-width: 160px;
    min-height: 68px;
    font-size: 12px;
  }

  .custom-tab-button::before {
    top: 5px;
    width: 48px;
    height: 44px;
  }

  .custom-tab-button :deep(svg) {
    width: 25px;
    height: 25px;
  }
}

@media (max-width: 359px) {
  .custom-tab-button {
    font-size: 11px;
    letter-spacing: 0.1px;
  }
}
</style>
