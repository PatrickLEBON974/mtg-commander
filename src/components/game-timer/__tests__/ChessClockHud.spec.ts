import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ChessClockHud from '../ChessClockHud.vue'
import fr from '@/i18n/locales/fr'

function mountHud(clockUsedMs: number) {
  const i18n = createI18n({
    legacy: false,
    locale: 'fr',
    messages: { fr },
  })

  return mount(ChessClockHud, {
    props: {
      turnPlayerName: 'Nissa',
      clockOwnerName: 'Nissa',
      turnElapsedMs: 90_000,
      clockUsedMs,
      playerBudgetMs: 1_800_000,
      theoreticalTurnMs: 180_000,
      isRunning: true,
    },
    global: { plugins: [i18n] },
  })
}

describe('ChessClockHud', () => {
  it('shows the current turn alongside the remaining global budget', () => {
    const wrapper = mountHud(600_000)

    expect(wrapper.text()).toContain('Tour en cours')
    expect(wrapper.text()).toContain('01:30')
    expect(wrapper.text()).toContain('Budget global')
    expect(wrapper.text()).toContain('20:00')
    expect(wrapper.text()).toContain('cible 03:00')
  })

  it('keeps rendering beyond the budget with a signed overtime value', () => {
    const wrapper = mountHud(1_950_000)

    expect(wrapper.classes()).toContain('chess-clock-hud--overtime')
    expect(wrapper.text()).toContain('-02:30')
    expect(wrapper.text()).toContain('temps dépassé')
  })
})
