import { ref, computed, watch } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Fullscreen } from '@boengli/capacitor-fullscreen'
import { useGameStore } from '@/stores/gameStore'

const isNative = Capacitor.isNativePlatform()

/**
 * Shared reactive state for fullscreen game mode.
 * TabsLayout writes isGameTabActive, GameView writes isGameMenuOpen.
 * Both consume computed values to coordinate tab bar visibility and swipe lock.
 *
 * On native devices, activates system immersive mode (hides status bar
 * and navigation bar) when the game tab is active with a running game.
 */
export const isGameTabActive = ref(false)
export const isGameMenuOpen = ref(false)

export function useGameFullscreen() {
  const gameStore = useGameStore()

  const isFullscreen = computed(() => isGameTabActive.value && gameStore.isGameActive)
  const shouldShowTabBar = computed(() => !isFullscreen.value)
  const shouldDisableSwipe = computed(() => isFullscreen.value)

  watch(isFullscreen, (fullscreen) => {
    if (!isNative) return
    if (fullscreen) {
      Fullscreen.activateImmersiveMode()
    } else {
      Fullscreen.deactivateImmersiveMode()
    }
  }, { immediate: true })

  return { isGameTabActive, isGameMenuOpen, isFullscreen, shouldShowTabBar, shouldDisableSwipe }
}
