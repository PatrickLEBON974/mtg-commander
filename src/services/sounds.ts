import { useSettingsStore } from '@/stores/settingsStore'

// ---------------------------------------------------------------------------
// Sound file registry — all CC0 / royalty-free (Kenney.nl + sox-generated)
// SoundName is derived from the keys below so adding a new entry is all that's
// needed — the type stays in sync automatically.
// ---------------------------------------------------------------------------

const SOUND_FILES = {
  lifeGain:        '/sounds/life-gain.mp3',
  lifeLoss:        '/sounds/life-loss.mp3',
  largeLifeGain:   '/sounds/large-life-gain.mp3',
  largeLifeLoss:   '/sounds/large-life-loss.mp3',
  poison:          '/sounds/poison.mp3',
  experience:      '/sounds/experience.mp3',
  energy:          '/sounds/energy.mp3',
  playerDeath:     '/sounds/player-death.mp3',
  monarchCrown:    '/sounds/monarch-crown.mp3',
  initiative:      '/sounds/initiative.mp3',
  commanderCast:   '/sounds/commander-cast.mp3',
  commanderDamage: '/sounds/commander-damage.mp3',
  timerWarning:    '/sounds/timer-warning.mp3',
  timerUrgent:     '/sounds/timer-urgent.mp3',
  diceRoll:        '/sounds/dice-roll.mp3',
  gameStart:       '/sounds/game-start.mp3',
  endGame:         '/sounds/end-game.mp3',
  victory:         '/sounds/victory.mp3',
  turnAdvance:     '/sounds/turn-advance.mp3',
  undo:            '/sounds/undo.mp3',
  uiClick:         '/sounds/ui-click.mp3',
} as const

/** Union of all registered sound names, derived from SOUND_FILES keys */
export type SoundName = keyof typeof SOUND_FILES

// Pool size per sound — allows rapid re-triggers without clipping
const POOL_SIZE = 3

// ---------------------------------------------------------------------------
// Audio pool: pre-creates multiple Audio elements per sound for overlap
// ---------------------------------------------------------------------------

const audioPools = new Map<SoundName, HTMLAudioElement[]>()
const poolIndexes = new Map<SoundName, number>()
let preloaded = false

/** Preload all sound files into audio element pools */
export function preloadSounds(): void {
  if (preloaded) return
  preloaded = true

  for (const [name, path] of Object.entries(SOUND_FILES) as [SoundName, string][]) {
    const pool: HTMLAudioElement[] = []
    for (let i = 0; i < POOL_SIZE; i++) {
      const audio = new Audio(path)
      audio.preload = 'auto'
      pool.push(audio)
    }
    audioPools.set(name, pool)
    poolIndexes.set(name, 0)
  }
}

// ---------------------------------------------------------------------------
// Settings helpers
// ---------------------------------------------------------------------------

function isSoundEnabled(): boolean {
  try {
    const settingsStore = useSettingsStore()
    return settingsStore.soundEnabled
  } catch {
    return false
  }
}

function getVolume(): number {
  try {
    const settingsStore = useSettingsStore()
    return settingsStore.soundVolume
  } catch {
    return 0.5
  }
}

// ---------------------------------------------------------------------------
// Core playback
// ---------------------------------------------------------------------------

function playSound(name: SoundName): void {
  if (!isSoundEnabled()) return

  const pool = audioPools.get(name)
  if (!pool || pool.length === 0) return

  const currentIndex = poolIndexes.get(name) ?? 0
  const audio = pool[currentIndex]

  // Round-robin to next element in pool
  poolIndexes.set(name, (currentIndex + 1) % pool.length)

  audio.volume = getVolume()
  audio.currentTime = 0
  audio.play().catch(() => {
    // Autoplay blocked — silently ignore (common on mobile before user gesture)
  })
}

// ---------------------------------------------------------------------------
// Oscillator fallback (used if files haven't been preloaded yet)
// ---------------------------------------------------------------------------

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
  if (!isSoundEnabled()) return

  const context = getAudioContext()
  const oscillator = context.createOscillator()
  const gainNode = context.createGain()

  oscillator.type = type
  oscillator.frequency.value = frequency
  gainNode.gain.value = getVolume() * 0.3

  gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration)

  oscillator.connect(gainNode)
  gainNode.connect(context.destination)

  oscillator.start(context.currentTime)
  oscillator.stop(context.currentTime + duration)
}

// ---------------------------------------------------------------------------
// Smart play: use file-based audio if loaded, fallback to oscillator
// ---------------------------------------------------------------------------

function playSoundWithFallback(name: SoundName, fallback: () => void): void {
  if (!isSoundEnabled()) return

  if (preloaded && audioPools.has(name)) {
    playSound(name)
  } else {
    fallback()
  }
}

// ---------------------------------------------------------------------------
// Public API — Life & Counters
// ---------------------------------------------------------------------------

/** Short click sound for life +1/-1 */
export function playLifeChange(isPositive: boolean) {
  playSoundWithFallback(
    isPositive ? 'lifeGain' : 'lifeLoss',
    () => playTone(isPositive ? 880 : 440, 0.08, 'sine'),
  )
}

/** Deeper sound for large life changes (+5/+10/-5/-10) */
export function playLargeLifeChange(isPositive: boolean) {
  playSoundWithFallback(
    isPositive ? 'largeLifeGain' : 'largeLifeLoss',
    () => playTone(isPositive ? 660 : 330, 0.12, 'triangle'),
  )
}

/** Ominous descending tone for poison counters */
export function playPoisonChange() {
  playSoundWithFallback('poison', () => playTone(220, 0.15, 'sawtooth'))
}

/** Mystical shimmer for experience counters */
export function playExperienceChange() {
  playSoundWithFallback('experience', () => playTone(523, 0.15, 'sine'))
}

/** Electric zap for energy counters */
export function playEnergyChange() {
  playSoundWithFallback('energy', () => playTone(1000, 0.1, 'square'))
}

// ---------------------------------------------------------------------------
// Public API — Player State
// ---------------------------------------------------------------------------

/** Dramatic death knell for player elimination */
export function playPlayerDeath() {
  playSoundWithFallback('playerDeath', () => {
    playTone(150, 0.4, 'sawtooth')
    setTimeout(() => playTone(110, 0.5, 'square'), 100)
  })
}

/** Royal fanfare for becoming monarch */
export function playMonarchCrown() {
  playSoundWithFallback('monarchCrown', () => {
    playTone(523, 0.1, 'triangle')
    setTimeout(() => playTone(659, 0.1, 'triangle'), 100)
    setTimeout(() => playTone(784, 0.15, 'triangle'), 200)
  })
}

/** Dungeon-themed ascending triad for initiative */
export function playInitiative() {
  playSoundWithFallback('initiative', () => {
    playTone(349, 0.1, 'triangle')
    setTimeout(() => playTone(440, 0.1, 'triangle'), 100)
    setTimeout(() => playTone(523, 0.15, 'triangle'), 200)
  })
}

// ---------------------------------------------------------------------------
// Public API — Commander
// ---------------------------------------------------------------------------

/** Spell-cast whoosh + chime for summoning a commander */
export function playCommanderCast() {
  playSound('commanderCast')
}

/** Metal clash for commander damage */
export function playCommanderDamage() {
  playSound('commanderDamage')
}

// ---------------------------------------------------------------------------
// Public API — Timer
// ---------------------------------------------------------------------------

/** Medium-urgency timer warning beep */
export function playTimerWarning() {
  playSoundWithFallback('timerWarning', () => playTone(440, 0.2, 'square'))
}

/** High-urgency timer alert — escalating beeps */
export function playTimerUrgent() {
  playSoundWithFallback('timerUrgent', () => {
    playTone(660, 0.3, 'square')
    setTimeout(() => playTone(880, 0.3, 'square'), 50)
  })
}

// ---------------------------------------------------------------------------
// Public API — Game Flow
// ---------------------------------------------------------------------------

/** Dice tumbling on table */
export function playDiceRoll() {
  playSound('diceRoll')
}

/** Card shuffle + whoosh for new game */
export function playGameStart() {
  playSound('gameStart')
}

/** Deep closing gong for game over */
export function playEndGame() {
  playSound('endGame')
}

/** Triumphant victory fanfare */
export function playVictory() {
  playSound('victory')
}

/** Soft page-turn whoosh for turn transition */
export function playTurnAdvance() {
  playSound('turnAdvance')
}

/** Short reverse swoosh for undo action */
export function playUndo() {
  playSound('undo')
}

/** Subtle UI click for buttons */
export function playUiClick() {
  playSound('uiClick')
}
