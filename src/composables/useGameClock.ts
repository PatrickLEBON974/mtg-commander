/**
 * useGameClock — Single shared game clock (singleton).
 *
 * Drives ALL game timers from one requestAnimationFrame loop:
 *   - Game elapsed time
 *   - Per-player total play time (Timer A)
 *   - Per-player round time (Timer B)
 *
 * Rule evaluation is handled entirely by the behavior rule engine
 * (behaviorRuleEngine.ts). This composable is a pure timing service.
 *
 * Any component can call useGameClock() to start/stop the clock or read state.
 * The RAF loop runs exactly once regardless of how many components import this.
 */
import { ref, computed, watch, type WatchStopHandle } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'

// --- Singleton state (shared across all consumers) ---
const TICK_THROTTLE_MS = 250

const lastResumedAt = ref(0)
const accumulatedBeforePause = ref(0)
let lastTickTimestamp = performance.now()
let lastRafTickAt = 0
let initialized = false
let rafRunning = false
let rafId: number | null = null
let appPauseCleanup: (() => void) | null = null
let watchStopHandles: WatchStopHandle[] = []

function handleVisibilityChange() {
  const gameStore = useGameStore()
  if (!document.hidden && gameStore.currentGame?.isRunning) {
    lastTickTimestamp = performance.now()
    tick()
  }
}

function teardownGameClock() {
  stopRafLoop()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  appPauseCleanup?.()
  appPauseCleanup = null
  for (const stopWatch of watchStopHandles) {
    stopWatch()
  }
  watchStopHandles = []
  initialized = false
}

// --- Singleton RAF loop (plain rAF, not tied to component lifecycle) ---

function rafLoop() {
  if (!rafRunning) return
  const now = performance.now()
  if (now - lastRafTickAt >= TICK_THROTTLE_MS) {
    lastRafTickAt = now
    tick()
  }
  rafId = requestAnimationFrame(rafLoop)
}

function startRafLoop() {
  if (rafRunning) return
  rafRunning = true
  rafId = requestAnimationFrame(rafLoop)
}

function stopRafLoop() {
  rafRunning = false
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

// --- Core tick ---
function tick() {
  const gameStore = useGameStore()
  const settingsStore = useSettingsStore()
  const game = gameStore.currentGame
  if (!game || !game.isRunning) return

  const now = performance.now()
  const actualDeltaMs = now - lastTickTimestamp
  lastTickTimestamp = now

  // Game elapsed time (wall-clock accurate via monotonic clock)
  game.elapsedMs = accumulatedBeforePause.value + (now - lastResumedAt.value)

  // Ensure maps exist
  if (!game.playerPlayTimeMs) game.playerPlayTimeMs = {}
  if (!game.playerRoundTimeMs) game.playerRoundTimeMs = {}

  // Both timers accrue to the clock owner (effective priority player)
  const clockOwner = gameStore.effectivePriorityPlayer
  if (clockOwner) {
    // Total play time: cumulative across the entire game (never resets)
    game.playerPlayTimeMs[clockOwner.id] =
      (game.playerPlayTimeMs[clockOwner.id] ?? 0) + actualDeltaMs

    // Round time: per-turn timer (resets on turn change, follows priority)
    game.playerRoundTimeMs[clockOwner.id] =
      (game.playerRoundTimeMs[clockOwner.id] ?? 0) + actualDeltaMs
  }

  // Hourglass token accumulation
  if (settingsStore.gameSettings.hourglassEnabled && clockOwner) {
    const roundTimeMs = game.playerRoundTimeMs[clockOwner.id] ?? 0

    let allowanceMs: number
    if (settingsStore.gameSettings.hourglassMode === 'time_bank') {
      allowanceMs = game.hourglassTimeBankRemainingMs[clockOwner.id]
        ?? (settingsStore.gameSettings.hourglassGracePeriodSeconds * 1000)
    } else {
      // Fixed mode: grace period per turn
      allowanceMs = settingsStore.gameSettings.hourglassGracePeriodSeconds * 1000
    }

    if (roundTimeMs > allowanceMs) {
      const overtimeMs = roundTimeMs - allowanceMs
      const expectedTokens = Math.floor(overtimeMs / 60000)
      const currentTokens = clockOwner.hourglassTokens
      if (expectedTokens > currentTokens) {
        gameStore.changeHourglassTokens(clockOwner.id, expectedTokens - currentTokens)
      }
    }
  }

}

// --- Public API ---
export function useGameClock() {
  const gameStore = useGameStore()

  // One-time initialization (idempotent)
  if (!initialized) {
    initialized = true

    // Restore accumulated time from saved game
    accumulatedBeforePause.value = gameStore.currentGame?.elapsedMs ?? 0

    // Initialize wall-clock anchor
    if (gameStore.currentGame?.isRunning) {
      lastResumedAt.value = performance.now()
      lastTickTimestamp = performance.now()
    }

    // Start the singleton RAF loop (not tied to any component lifecycle)
    startRafLoop()

    // Watch for external pause/resume (endGame, multiplayer sync)
    watchStopHandles.push(watch(
      () => gameStore.currentGame?.isRunning,
      (newIsRunning, oldIsRunning) => {
        if (newIsRunning === oldIsRunning) return
        if (newIsRunning === false && oldIsRunning === true) {
          accumulatedBeforePause.value += (performance.now() - lastResumedAt.value)
        } else if (newIsRunning === true && oldIsRunning === false) {
          lastResumedAt.value = performance.now()
          lastTickTimestamp = performance.now()
        }
      },
    ))

    // Watch turn changes: reset round time for new turn player.
    // Align sub-second phase with total play time so both timers'
    // displayed seconds flip at the exact same moment (< 1s offset,
    // invisible on multi-minute turns).
    watchStopHandles.push(watch(
      () => gameStore.currentGame?.currentTurnPlayerIndex,
      (newIndex) => {
        const game = gameStore.currentGame
        if (game && newIndex !== undefined) {
          if (!game.playerRoundTimeMs) game.playerRoundTimeMs = {}
          const newTurnPlayer = game.players[newIndex]
          if (newTurnPlayer) {
            const totalMs = game.playerPlayTimeMs?.[newTurnPlayer.id] ?? 0
            game.playerRoundTimeMs[newTurnPlayer.id] = totalMs % 1000
          }
        }
      },
    ))

    // Page visibility recovery
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Capacitor App pause/resume
    setupCapacitorLifecycle()
  }

  const isRunning = computed({
    get: () => gameStore.currentGame?.isRunning ?? false,
    set: (value: boolean) => {
      if (gameStore.currentGame) {
        gameStore.currentGame.isRunning = value
      }
    },
  })

  function toggleTimer() {
    const now = performance.now()
    if (isRunning.value) {
      accumulatedBeforePause.value += (now - lastResumedAt.value)
    } else {
      lastResumedAt.value = now
      lastTickTimestamp = now
    }
    isRunning.value = !isRunning.value
  }

  /** Call when starting a brand new game to reset all clock state */
  function resetClock() {
    accumulatedBeforePause.value = 0
    lastResumedAt.value = performance.now()
    lastTickTimestamp = performance.now()
  }

  return {
    isRunning,
    toggleTimer,
    resetClock,
  }
}

// --- HMR cleanup (dev only) ---
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    teardownGameClock()
  })
}

// --- Capacitor lifecycle (async, non-blocking) ---
async function setupCapacitorLifecycle() {
  try {
    const { App } = await import('@capacitor/app')
    const gameStore = useGameStore()

    const pauseHandle = await App.addListener('pause', () => {
      if (gameStore.currentGame?.isRunning) {
        lastTickTimestamp = performance.now()
      }
    })

    const resumeHandle = await App.addListener('resume', () => {
      if (gameStore.currentGame?.isRunning) {
        lastTickTimestamp = performance.now()
        tick()
      }
    })

    appPauseCleanup = () => {
      pauseHandle.remove()
      resumeHandle.remove()
    }
  } catch {
    // Not running on Capacitor (web only)
  }
}
