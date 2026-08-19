import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from '@/stores/settingsStore'

describe('settingsStore timer migration', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('migrates the legacy turn-timer toggle to the turn mode', () => {
    localStorage.setItem('mtg_commander_settings', JSON.stringify({
      enableTimer: true,
      enableTurnTimer: true,
      turnTimerSeconds: 180,
    }))

    const settingsStore = useSettingsStore()

    expect(settingsStore.gameSettings.timerMode).toBe('turn')
    expect(settingsStore.gameSettings.turnTimerSeconds).toBe(180)
    expect(settingsStore.gameSettings.chessGameDurationMinutes).toBe(120)
  })

  it('normalizes persisted chess setup values to supported controls', () => {
    localStorage.setItem('mtg_commander_settings', JSON.stringify({
      timerMode: 'chess',
      chessGameDurationMinutes: 101,
      chessExpectedRounds: 99,
    }))

    const settingsStore = useSettingsStore()

    expect(settingsStore.gameSettings.timerMode).toBe('chess')
    expect(settingsStore.gameSettings.chessGameDurationMinutes).toBe(105)
    expect(settingsStore.gameSettings.chessExpectedRounds).toBe(30)
  })
})
