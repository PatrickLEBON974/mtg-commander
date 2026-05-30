import { ref, computed, watch, type ComputedRef } from 'vue'
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

// Module-level derived state + immersive-mode driver (shared singleton).
// gameStore access is deferred until first use so Pinia is active.
let isFullscreenSingleton: ComputedRef<boolean> | null = null
let shouldShowTabBarSingleton: ComputedRef<boolean> | null = null
let shouldDisableSwipeSingleton: ComputedRef<boolean> | null = null

function ensureFullscreenState() {
  if (isFullscreenSingleton) return
  const gameStore = useGameStore()
  isFullscreenSingleton = computed(() => isGameTabActive.value && gameStore.isGameActive)
  shouldShowTabBarSingleton = computed(() => !isFullscreenSingleton!.value || isGameMenuOpen.value)
  shouldDisableSwipeSingleton = computed(() => isFullscreenSingleton!.value)

  // Single watch for the whole app, not one per calling component.
  watch(isFullscreenSingleton, (fullscreen) => {
    if (!isNative) return
    if (fullscreen) {
      Fullscreen.activateImmersiveMode()
    } else {
      Fullscreen.deactivateImmersiveMode()
    }
  }, { immediate: true })
}

export function useGameFullscreen() {
  ensureFullscreenState()
  return {
    isGameTabActive,
    isGameMenuOpen,
    isFullscreen: isFullscreenSingleton!,
    shouldShowTabBar: shouldShowTabBarSingleton!,
    shouldDisableSwipe: shouldDisableSwipeSingleton!,
  }
}
