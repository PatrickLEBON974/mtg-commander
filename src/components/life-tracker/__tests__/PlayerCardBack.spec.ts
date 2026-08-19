import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import PlayerCardBack from '../PlayerCardBack.vue'
import { useGameStore } from '@/stores/gameStore'
import type { GameState, PlayerState } from '@/types/game'
import fr from '@/i18n/locales/fr'

vi.mock('@/services/haptics', () => ({ tapFeedback: vi.fn() }))
vi.mock('@/services/sounds', () => ({ playCommanderCast: vi.fn() }))

function playerFixture(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 'player-one',
    name: 'Nissa',
    color: 'green',
    lifeTotal: 32,
    commanders: [{ id: 'meren-id', cardName: 'Meren of Clan Nel Toth', castCount: 2 }],
    commanderDamageReceived: { 'atraxa-id': 7 },
    poisonCounters: 3,
    experienceCounters: 4,
    energyCounters: 0,
    isMonarch: true,
    hasInitiative: false,
    cityBlessing: false,
    ringLevel: 0,
    radCounters: 0,
    hourglassTokens: 0,
    ...overrides,
  }
}

function gameFixture(): GameState {
  return {
    id: 'game-one',
    players: [
      playerFixture(),
      playerFixture({
        id: 'player-two',
        name: 'Jace',
        color: 'blue',
        commanders: [{ id: 'atraxa-id', cardName: "Atraxa, Praetors' Voice", castCount: 0 }],
        commanderDamageReceived: {},
        poisonCounters: 0,
        experienceCounters: 0,
        isMonarch: false,
      }),
    ],
    currentTurnPlayerIndex: 0,
    turnNumber: 3,
    startedAt: 0,
    elapsedMs: 0,
    isRunning: true,
    history: [],
    playerPlayTimeMs: {},
    playerRoundTimeMs: {},
    priorityPlayerId: null,
    activeFlashPlayerIds: [],
    gamePhase: 'playing',
    customPositionMap: null,
    dayNightState: null,
    hourglassTimeBankRemainingMs: {},
    chessClock: null,
  }
}

function mountCardBack() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const gameStore = useGameStore()
  gameStore.currentGame = gameFixture()
  const player = gameStore.currentGame.players[0]!

  const i18n = createI18n({
    legacy: false,
    locale: 'fr',
    messages: { fr },
  })

  const wrapper = mount(PlayerCardBack, {
    props: { player },
    global: { plugins: [pinia, i18n] },
  })

  return { wrapper, gameStore, player }
}

describe('PlayerCardBack', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders information that is distinct from the life-total front face', () => {
    const { wrapper } = mountCardBack()

    expect(wrapper.text()).toContain('Zone de commandement')
    expect(wrapper.text()).toContain('Meren of Clan Nel Toth')
    expect(wrapper.text()).toContain('Taxe +4')
    expect(wrapper.text()).toContain("Atraxa, Praetors' Voice")
    expect(wrapper.text()).toContain('Poison')
    expect(wrapper.text()).toContain('Monarque')
  })

  it('records commander casts, refreshes the next tax, and emits a state change', async () => {
    const { wrapper, player } = mountCardBack()
    const castButton = wrapper.findAll('button').find(button =>
      button.attributes('aria-label') === 'Enregistrer un lancement de Meren of Clan Nel Toth',
    )

    expect(castButton).toBeDefined()
    await castButton!.trigger('click')

    expect(player.commanders[0]!.castCount).toBe(3)
    expect(wrapper.text()).toContain('Taxe +6')
    expect(wrapper.emitted('stateChanged')).toHaveLength(1)
  })

  it('exposes an explicit control to return to the front face', async () => {
    const { wrapper } = mountCardBack()
    const closeButton = wrapper.findAll('button').find(button =>
      button.attributes('aria-label') === 'Retourner aux points de vie de Nissa',
    )

    expect(closeButton).toBeDefined()
    await closeButton!.trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
