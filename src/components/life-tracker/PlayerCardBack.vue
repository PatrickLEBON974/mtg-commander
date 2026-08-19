<template>
  <section
    class="player-card-back"
    :data-tone="player.color"
    role="region"
    :aria-label="t('cardBack.ariaLabel', { name: player.name })"
  >
    <div class="player-card-back__halo" aria-hidden="true" />

    <header class="card-back-header">
      <div class="card-back-seal" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="11" stroke="currentColor" stroke-width="1" opacity=".38" />
          <path d="m16 3 3.2 9.8L29 16l-9.8 3.2L16 29l-3.2-9.8L3 16l9.8-3.2L16 3Z" stroke="currentColor" stroke-width="1.25" />
          <circle cx="16" cy="16" r="3.5" fill="currentColor" opacity=".2" />
        </svg>
      </div>

      <div class="card-back-identity">
        <span>{{ t('cardBack.eyebrow') }}</span>
        <strong>{{ player.name }}</strong>
      </div>

      <div class="card-back-life" :aria-label="t('aria.lifePoints', { name: player.name, life: player.lifeTotal })">
        <span>{{ t('cardBack.life') }}</span>
        <strong>{{ player.lifeTotal }}</strong>
      </div>

      <button
        class="card-back-flip pointer-events-auto"
        type="button"
        :aria-label="t('cardBack.close', { name: player.name })"
        data-sound="none"
        @click="emit('close')"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7.2 7.4A7 7 0 0 1 19 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          <path d="m17 9 2 3 2-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M16.8 16.6A7 7 0 0 1 5 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          <path d="m7 15-2-3-2 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </header>

    <div class="card-back-body">
      <section class="card-back-section commander-section" :aria-label="t('cardBack.commandZone')">
        <div class="card-back-section__header">
          <div>
            <span class="card-back-section__kicker">{{ t('cardBack.commandZone') }}</span>
            <span class="card-back-section__copy">{{ t('cardBack.commandZoneHint') }}</span>
          </div>
          <span class="card-back-section__count">{{ t('cardBack.commanderCount', { count: player.commanders.length }) }}</span>
        </div>

        <div v-if="player.commanders.length > 0" class="commander-list">
          <article
            v-for="(commander, commanderIndex) in player.commanders"
            :key="commander.id"
            class="commander-card"
            :class="{ 'commander-card--without-art': !commander.imageUri }"
          >
            <img
              v-if="commander.imageUri"
              class="commander-card__art"
              :src="commander.imageUri"
              alt=""
              loading="lazy"
              decoding="async"
            />

            <div class="commander-card__copy">
              <strong :title="commander.cardName">{{ commander.cardName }}</strong>
              <div class="commander-card__meta">
                <span>{{ t('cardBack.castCount', { count: commander.castCount }) }}</span>
                <span class="commander-card__tax">{{ t('cardBack.tax', { tax: nextCommanderTax(commander.castCount) }) }}</span>
              </div>
            </div>

            <button
              class="commander-cast-button pointer-events-auto"
              type="button"
              data-sound="none"
              :aria-label="t('cardBack.recordCastAria', { name: commander.cardName })"
              @click="handleCastCommander(commanderIndex)"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
              </svg>
              <span>{{ t('cardBack.recordCast') }}</span>
            </button>
          </article>
        </div>

        <button
          v-else
          class="commander-empty pointer-events-auto"
          type="button"
          @click="emit('addCommander')"
        >
          <span class="commander-empty__seal" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 3 5 7v5c0 4.6 2.9 7.5 7 9 4.1-1.5 7-4.4 7-9V7l-7-4Z" stroke="currentColor" stroke-width="1.6" />
              <path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </span>
          <span>
            <strong>{{ t('cardBack.noCommander') }}</strong>
            <small>{{ t('cardBack.chooseCommander') }}</small>
          </span>
        </button>
      </section>

      <section class="card-back-section tactical-section" :aria-label="t('cardBack.tactical')">
        <div class="card-back-section__header tactical-section__header">
          <div>
            <span class="card-back-section__kicker">{{ t('cardBack.tactical') }}</span>
            <span class="card-back-section__copy">{{ t('cardBack.tacticalHint') }}</span>
          </div>
        </div>

        <div class="critical-metrics">
          <div
            class="critical-metric critical-metric--poison"
            :class="{ 'critical-metric--danger': poisonIsLethal }"
          >
            <div class="critical-metric__topline">
              <IconPoison :size="14" aria-hidden="true" />
              <span>{{ t('cardBack.poisonPressure') }}</span>
              <strong>{{ player.poisonCounters }}<small>/{{ poisonThreshold }}</small></strong>
            </div>
            <span class="critical-metric__track" aria-hidden="true">
              <span :style="{ width: `${percentage(player.poisonCounters, poisonThreshold)}%` }" />
            </span>
          </div>

          <div
            class="critical-metric critical-metric--commander"
            :class="{ 'critical-metric--danger': commanderDamageIsLethal }"
          >
            <div class="critical-metric__topline">
              <IconSwordSingle :size="14" aria-hidden="true" />
              <span>{{ t('cardBack.commanderPressure') }}</span>
              <strong>{{ highestCommanderDamage }}<small>/{{ commanderDamageThreshold }}</small></strong>
            </div>
            <span class="critical-metric__track" aria-hidden="true">
              <span :style="{ width: `${percentage(highestCommanderDamage, commanderDamageThreshold)}%` }" />
            </span>
          </div>
        </div>

        <div v-if="tacticalCounters.length > 0" class="tactical-counters">
          <div
            v-for="counter in tacticalCounters"
            :key="counter.key"
            class="tactical-counter"
            :data-counter-tone="counter.tone"
          >
            <span>{{ counter.label }}</span>
            <strong>{{ counter.value }}</strong>
          </div>
        </div>

        <div v-if="activeDesignations.length > 0" class="designation-list" :aria-label="t('tokens.designations')">
          <span
            v-for="designation in activeDesignations"
            :key="designation.key"
            class="designation-chip"
            :data-designation-tone="designation.tone"
          >
            <i aria-hidden="true" />
            {{ designation.label }}
          </span>
        </div>

        <div v-if="visibleDamageSources.length > 0" class="damage-sources">
          <div class="damage-sources__header">
            <span>{{ t('cardBack.damageSources') }}</span>
            <span>{{ t('cardBack.totalDamage', { total: totalCommanderDamage }) }}</span>
          </div>
          <div
            v-for="source in visibleDamageSources"
            :key="source.commanderId"
            class="damage-source"
          >
            <img v-if="source.imageUri" :src="source.imageUri" alt="" loading="lazy" decoding="async" />
            <span class="damage-source__copy">
              <strong>{{ source.cardName }}</strong>
              <small>{{ source.ownerName }}</small>
            </span>
            <strong class="damage-source__value">{{ source.damage }}</strong>
          </div>
          <span v-if="hiddenDamageSourceCount > 0" class="damage-sources__overflow">
            {{ t('cardBack.additionalSources', { count: hiddenDamageSourceCount }) }}
          </span>
        </div>
      </section>
    </div>

    <footer class="card-back-actions">
      <button class="card-back-action pointer-events-auto" type="button" @click="emit('openTokenPicker')">
        <span class="card-back-action__icon card-back-action__icon--gold" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="7" cy="7" r="2.6" stroke="currentColor" stroke-width="1.8" />
            <circle cx="17" cy="7" r="2.6" stroke="currentColor" stroke-width="1.8" />
            <circle cx="7" cy="17" r="2.6" stroke="currentColor" stroke-width="1.8" />
            <circle cx="17" cy="17" r="2.6" stroke="currentColor" stroke-width="1.8" />
          </svg>
        </span>
        <span>{{ t('cardBack.markers') }}</span>
      </button>

      <button
        v-if="player.commanders.length > 0 && player.commanders.length < 2"
        class="card-back-action pointer-events-auto"
        type="button"
        @click="emit('addCommander')"
      >
        <span class="card-back-action__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
          </svg>
        </span>
        <span>{{ t('cardBack.addCommander') }}</span>
      </button>

      <button class="card-back-action card-back-action--danger pointer-events-auto" type="button" @click="emit('showGameResult')">
        <span class="card-back-action__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M5 21V4m0 1s2-2 6 0 7 0 8-1v9s-2 2-7 0-7 0-7 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span>{{ t('cardBack.result') }}</span>
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PlayerState } from '@/types/game'
import { COMMANDER_TAX_PER_CAST } from '@/config/gameConstants'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { tapFeedback } from '@/services/haptics'
import { playCommanderCast } from '@/services/sounds'
import IconPoison from '@/components/icons/game/IconPoison.vue'
import IconSwordSingle from '@/components/icons/game/IconSwordSingle.vue'

interface DamageSource {
  commanderId: string
  cardName: string
  ownerName: string
  imageUri?: string
  damage: number
}

const props = defineProps<{
  player: PlayerState
}>()

const emit = defineEmits<{
  close: []
  addCommander: []
  stateChanged: []
  showGameResult: []
  openTokenPicker: []
}>()

const { t } = useI18n()
const gameStore = useGameStore()
const settingsStore = useSettingsStore()

const poisonThreshold = computed(() => settingsStore.gameSettings.poisonThreshold)
const commanderDamageThreshold = computed(() => settingsStore.gameSettings.commanderDamageThreshold)

const commanderDamageSources = computed<DamageSource[]>(() => {
  const commanderLookup = new Map<string, Omit<DamageSource, 'commanderId' | 'damage'>>()

  for (const owner of gameStore.currentGame?.players ?? []) {
    for (const commander of owner.commanders) {
      commanderLookup.set(commander.id, {
        cardName: commander.cardName,
        ownerName: owner.name,
        imageUri: commander.imageUri,
      })
    }
  }

  return Object.entries(props.player.commanderDamageReceived)
    .filter(([, damage]) => damage > 0)
    .map(([commanderId, damage]) => {
      const source = commanderLookup.get(commanderId)
      return {
        commanderId,
        cardName: source?.cardName ?? t('cardBack.unknownCommander'),
        ownerName: source?.ownerName ?? t('cardBack.unknownPlayer'),
        imageUri: source?.imageUri,
        damage,
      }
    })
    .sort((left, right) => right.damage - left.damage)
})

const visibleDamageSources = computed(() => commanderDamageSources.value.slice(0, 3))
const hiddenDamageSourceCount = computed(() => Math.max(0, commanderDamageSources.value.length - visibleDamageSources.value.length))
const totalCommanderDamage = computed(() => commanderDamageSources.value.reduce((total, source) => total + source.damage, 0))
const highestCommanderDamage = computed(() => commanderDamageSources.value[0]?.damage ?? 0)
const poisonIsLethal = computed(() => poisonThreshold.value > 0 && props.player.poisonCounters >= poisonThreshold.value)
const commanderDamageIsLethal = computed(() => commanderDamageThreshold.value > 0 && highestCommanderDamage.value >= commanderDamageThreshold.value)

const tacticalCounters = computed(() => [
  { key: 'experience', label: t('playerDetail.experience'), value: props.player.experienceCounters, tone: 'blue' },
  { key: 'energy', label: t('playerDetail.energy'), value: props.player.energyCounters, tone: 'gold' },
  { key: 'rad', label: t('tokens.rad'), value: props.player.radCounters, tone: 'green' },
  ...(settingsStore.gameSettings.hourglassEnabled
    ? [{ key: 'hourglass', label: t('settings.hourglassEnabled'), value: props.player.hourglassTokens, tone: 'amber' }]
    : []),
].filter(counter => counter.value > 0 || counter.key === 'hourglass'))

const activeDesignations = computed(() => [
  { key: 'monarch', label: t('playerDetail.monarch'), active: props.player.isMonarch, tone: 'gold' },
  { key: 'initiative', label: t('playerDetail.initiative'), active: props.player.hasInitiative, tone: 'blue' },
  { key: 'city', label: t('tokens.cityBlessing'), active: props.player.cityBlessing, tone: 'green' },
  { key: 'ring', label: t('tokens.ringLevel', { level: props.player.ringLevel }), active: props.player.ringLevel > 0, tone: 'amber' },
].filter(designation => designation.active))

function percentage(value: number, maximum: number): number {
  if (maximum <= 0) return 0
  return Math.min(100, Math.max(0, value / maximum * 100))
}

function nextCommanderTax(castCount: number): number {
  return Math.max(0, castCount * COMMANDER_TAX_PER_CAST)
}

function handleCastCommander(commanderIndex: number) {
  gameStore.castCommander(props.player.id, commanderIndex)
  if (settingsStore.hapticFeedback) tapFeedback()
  playCommanderCast()
  emit('stateChanged')
}
</script>

<style scoped>
.player-card-back {
  --player-rgb: 176, 145, 84;
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: 100%;
  height: 100%;
  gap: clamp(5px, 1.6cqmin, 10px);
  overflow: hidden;
  padding: clamp(6px, 2.2cqmin, 13px);
  border-radius: inherit;
  color: #f4efe5;
  pointer-events: none;
  background:
    radial-gradient(circle at 8% -10%, rgba(var(--player-rgb), 0.3), transparent 42%),
    radial-gradient(circle at 96% 108%, rgba(50, 136, 132, 0.16), transparent 44%),
    linear-gradient(145deg, rgba(17, 21, 29, 0.98), rgba(6, 9, 14, 0.99));
  box-shadow:
    inset 0 0 0 1px rgba(226, 193, 123, 0.16),
    inset 0 0 30px rgba(0, 0, 0, 0.56),
    0 8px 24px rgba(0, 0, 0, 0.34);
}

.player-card-back[data-tone='white'] { --player-rgb: 232, 220, 179; }
.player-card-back[data-tone='blue'] { --player-rgb: 77, 144, 184; }
.player-card-back[data-tone='black'] { --player-rgb: 133, 105, 158; }
.player-card-back[data-tone='red'] { --player-rgb: 191, 74, 54; }
.player-card-back[data-tone='green'] { --player-rgb: 73, 151, 102; }
.player-card-back[data-tone='gold'] { --player-rgb: 211, 167, 74; }

.player-card-back::before {
  content: '';
  position: absolute;
  inset: 5px;
  z-index: -1;
  border: 1px solid rgba(229, 197, 126, 0.1);
  border-radius: calc(1rem - 5px);
  pointer-events: none;
}

.player-card-back::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: -2;
  width: min(72cqw, 72cqh);
  aspect-ratio: 1;
  border-radius: 50%;
  opacity: 0.2;
  background:
    repeating-conic-gradient(from 8deg, rgba(231, 199, 128, 0.2) 0 1deg, transparent 1deg 30deg),
    radial-gradient(circle, transparent 43%, rgba(231, 199, 128, 0.2) 44% 45%, transparent 46% 62%, rgba(231, 199, 128, 0.12) 63% 64%, transparent 65%);
  transform: translate(-50%, -50%) rotate(8deg);
  pointer-events: none;
}

.player-card-back__halo {
  position: absolute;
  top: -25%;
  left: 12%;
  z-index: -1;
  width: 76%;
  height: 52%;
  border-radius: 50%;
  background: rgba(var(--player-rgb), 0.16);
  filter: blur(32px);
  pointer-events: none;
}

.card-back-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: clamp(5px, 1.6cqmin, 10px);
  min-height: clamp(34px, 10cqmin, 50px);
}

.card-back-seal {
  display: grid;
  width: clamp(26px, 8cqmin, 38px);
  aspect-ratio: 1;
  place-items: center;
  border: 1px solid rgba(var(--player-rgb), 0.25);
  border-radius: 50%;
  color: rgba(236, 205, 138, 0.76);
  background: radial-gradient(circle, rgba(var(--player-rgb), 0.16), rgba(3, 6, 10, 0.24) 68%);
  box-shadow: inset 0 0 12px rgba(var(--player-rgb), 0.12);
}

.card-back-seal svg,
.card-back-flip svg,
.commander-empty svg,
.commander-cast-button svg,
.card-back-action svg {
  width: 100%;
  height: 100%;
}

.card-back-identity {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.card-back-identity span,
.card-back-section__kicker {
  color: rgba(226, 193, 123, 0.64);
  font-size: clamp(8px, 2.15cqmin, 10px);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.card-back-identity strong {
  overflow: hidden;
  color: #fff7e6;
  font-family: var(--font-beleren);
  font-size: clamp(0.72rem, 4cqmin, 1.08rem);
  line-height: 1.15;
  letter-spacing: 0.04em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.55);
}

.card-back-life {
  display: flex;
  min-width: clamp(38px, 13cqmin, 58px);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3px 7px;
  border: 1px solid rgba(var(--player-rgb), 0.22);
  border-radius: 9px;
  background: rgba(3, 6, 10, 0.4);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.card-back-life span {
  color: rgba(255, 255, 255, 0.45);
  font-size: clamp(6px, 1.8cqmin, 9px);
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1;
  text-transform: uppercase;
}

.card-back-life strong {
  color: #fffaf0;
  font-family: var(--font-beleren);
  font-size: clamp(0.95rem, 5cqmin, 1.45rem);
  line-height: 1;
  text-shadow: 0 0 14px rgba(var(--player-rgb), 0.32);
}

.card-back-flip {
  position: relative;
  display: grid;
  width: clamp(28px, 8cqmin, 38px);
  aspect-ratio: 1;
  place-items: center;
  border: 1px solid rgba(224, 193, 126, 0.22);
  border-radius: 50%;
  color: rgba(241, 214, 157, 0.78);
  background: linear-gradient(145deg, rgba(221, 184, 105, 0.12), rgba(3, 6, 10, 0.5));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 3px 10px rgba(0, 0, 0, 0.28);
  -webkit-tap-highlight-color: transparent;
  transition: transform 150ms ease, border-color 150ms ease, color 150ms ease;
}

.card-back-flip::after {
  content: '';
  position: absolute;
  width: 44px;
  height: 44px;
}

.card-back-flip svg {
  width: 54%;
  height: 54%;
}

.card-back-flip:active {
  color: #ffe7ad;
  border-color: rgba(240, 202, 119, 0.52);
  transform: scale(0.9) rotate(-14deg);
}

.card-back-body {
  display: grid;
  min-height: 0;
  gap: clamp(5px, 1.7cqmin, 10px);
}

.card-back-section {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: clamp(5px, 1.7cqmin, 10px);
  border: 1px solid rgba(223, 192, 126, 0.1);
  border-radius: clamp(8px, 2.8cqmin, 13px);
  background: linear-gradient(145deg, rgba(14, 18, 25, 0.72), rgba(3, 6, 10, 0.54));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025), 0 4px 12px rgba(0, 0, 0, 0.16);
}

.card-back-section__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: clamp(4px, 1.4cqmin, 8px);
}

.card-back-section__header > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.card-back-section__copy {
  overflow: hidden;
  color: rgba(255, 255, 255, 0.34);
  font-size: clamp(7px, 1.8cqmin, 9px);
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-back-section__count {
  flex: 0 0 auto;
  padding: 2px 6px;
  border: 1px solid rgba(219, 183, 107, 0.14);
  border-radius: 999px;
  color: rgba(236, 205, 138, 0.68);
  background: rgba(212, 168, 67, 0.07);
  font-size: clamp(8px, 2cqmin, 10px);
  font-weight: 700;
}

.commander-list {
  display: grid;
  gap: clamp(3px, 1cqmin, 6px);
}

.commander-card {
  position: relative;
  display: grid;
  grid-template-columns: clamp(28px, 10cqmin, 48px) minmax(0, 1fr) auto;
  min-height: clamp(44px, 14cqmin, 64px);
  align-items: center;
  gap: clamp(5px, 1.5cqmin, 9px);
  overflow: hidden;
  padding: 4px;
  border: 1px solid rgba(var(--player-rgb), 0.16);
  border-radius: clamp(7px, 2.2cqmin, 11px);
  background:
    linear-gradient(90deg, rgba(var(--player-rgb), 0.12), transparent 56%),
    rgba(1, 4, 8, 0.48);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.commander-card--without-art {
  grid-template-columns: minmax(0, 1fr) auto;
  padding-left: clamp(8px, 2.4cqmin, 13px);
}

.commander-card__art {
  width: 100%;
  height: 100%;
  min-height: 36px;
  border-radius: 6px;
  object-fit: cover;
  object-position: top center;
  box-shadow: 0 3px 9px rgba(0, 0, 0, 0.5);
}

.commander-card__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.commander-card__copy > strong {
  overflow: hidden;
  color: rgba(255, 250, 238, 0.88);
  font-size: clamp(9px, 2.55cqmin, 12px);
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.commander-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 6px;
  color: rgba(255, 255, 255, 0.37);
  font-size: clamp(7px, 1.75cqmin, 9px);
  line-height: 1.15;
}

.commander-card__tax {
  color: rgba(239, 196, 106, 0.72);
}

.commander-cast-button {
  display: grid;
  min-width: clamp(32px, 10cqmin, 48px);
  min-height: clamp(34px, 10cqmin, 44px);
  place-items: center;
  align-content: center;
  gap: 1px;
  padding: 3px 6px;
  border: 1px solid rgba(218, 179, 97, 0.22);
  border-radius: 8px;
  color: #e8c77d;
  background: linear-gradient(155deg, rgba(210, 165, 68, 0.18), rgba(105, 70, 21, 0.12));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 2px 5px rgba(0, 0, 0, 0.24);
  -webkit-tap-highlight-color: transparent;
  transition: transform 100ms ease, background 100ms ease;
}

.commander-cast-button svg {
  width: clamp(12px, 3.7cqmin, 17px);
  height: clamp(12px, 3.7cqmin, 17px);
}

.commander-cast-button span {
  font-size: clamp(7px, 1.7cqmin, 9px);
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.commander-cast-button:active,
.card-back-action:active,
.commander-empty:active {
  transform: scale(0.96);
}

.commander-empty {
  display: flex;
  width: 100%;
  min-height: clamp(52px, 17cqmin, 76px);
  align-items: center;
  gap: clamp(7px, 2cqmin, 11px);
  padding: clamp(6px, 2cqmin, 11px);
  border: 1px dashed rgba(var(--player-rgb), 0.26);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.62);
  text-align: left;
  background: rgba(var(--player-rgb), 0.055);
  -webkit-tap-highlight-color: transparent;
  transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
}

.commander-empty__seal {
  display: grid;
  width: clamp(30px, 10cqmin, 44px);
  aspect-ratio: 1;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  color: rgba(232, 198, 128, 0.72);
  background: rgba(var(--player-rgb), 0.12);
}

.commander-empty__seal svg {
  width: 62%;
  height: 62%;
}

.commander-empty > span:last-child {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.commander-empty strong {
  font-size: clamp(9px, 2.5cqmin, 12px);
}

.commander-empty small {
  color: rgba(231, 196, 123, 0.6);
  font-size: clamp(8px, 1.9cqmin, 9px);
}

.critical-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(3px, 1cqmin, 6px);
}

.critical-metric {
  min-width: 0;
  padding: clamp(4px, 1.2cqmin, 7px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.24);
}

.critical-metric__topline {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 3px;
}

.critical-metric__topline > span {
  overflow: hidden;
  color: rgba(255, 255, 255, 0.45);
  font-size: clamp(7px, 1.75cqmin, 9px);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.critical-metric__topline > strong {
  color: rgba(255, 255, 255, 0.84);
  font-size: clamp(9px, 2.6cqmin, 13px);
  line-height: 1;
}

.critical-metric__topline small {
  color: rgba(255, 255, 255, 0.32);
  font-size: 0.68em;
}

.critical-metric--poison svg { color: #7ecb8b; }
.critical-metric--commander svg { color: #d9906b; }

.critical-metric__track {
  display: block;
  height: 2px;
  margin-top: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
}

.critical-metric__track > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #7ecb8b;
  box-shadow: 0 0 7px currentColor;
  transition: width 280ms ease;
}

.critical-metric--commander .critical-metric__track > span { background: #d9906b; }
.critical-metric--danger { border-color: rgba(236, 82, 70, 0.38); }
.critical-metric--danger .critical-metric__track > span { background: #ef6259; }

.tactical-counters,
.designation-list {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(3px, 1cqmin, 6px);
  margin-top: clamp(4px, 1.3cqmin, 7px);
}

.tactical-counter,
.designation-chip {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.52);
  background: rgba(255, 255, 255, 0.035);
  font-size: clamp(7px, 1.8cqmin, 9px);
  line-height: 1.1;
}

.tactical-counter strong { color: rgba(255, 255, 255, 0.9); }
.tactical-counter[data-counter-tone='blue'] strong { color: #7ec9e8; }
.tactical-counter[data-counter-tone='gold'] strong { color: #e8c77d; }
.tactical-counter[data-counter-tone='green'] strong { color: #83d59c; }
.tactical-counter[data-counter-tone='amber'] strong { color: #e5a95f; }

.designation-chip i {
  width: 5px;
  height: 5px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 6px currentColor;
}

.designation-chip[data-designation-tone='gold'] { color: #e7c56f; }
.designation-chip[data-designation-tone='blue'] { color: #7ec9e8; }
.designation-chip[data-designation-tone='green'] { color: #83d59c; }
.designation-chip[data-designation-tone='amber'] { color: #e5a95f; }

.damage-sources {
  display: grid;
  gap: 3px;
  margin-top: clamp(4px, 1.3cqmin, 7px);
}

.damage-sources__header {
  display: flex;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.32);
  font-size: clamp(7px, 1.7cqmin, 8px);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.damage-source {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 5px;
  min-height: clamp(24px, 7cqmin, 34px);
  padding: 2px 5px 2px 3px;
  border-radius: 7px;
  background: rgba(105, 42, 30, 0.16);
}

.damage-source img {
  width: clamp(18px, 6cqmin, 26px);
  height: clamp(20px, 7cqmin, 30px);
  border-radius: 4px;
  object-fit: cover;
  object-position: top center;
}

.damage-source__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.damage-source__copy strong,
.damage-source__copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.damage-source__copy strong {
  color: rgba(255, 255, 255, 0.72);
  font-size: clamp(8px, 2cqmin, 9px);
}

.damage-source__copy small {
  color: rgba(255, 255, 255, 0.3);
  font-size: clamp(7px, 1.6cqmin, 8px);
}

.damage-source__value {
  color: #e29269;
  font-size: clamp(9px, 2.8cqmin, 14px);
}

.damage-sources__overflow {
  color: rgba(255, 255, 255, 0.32);
  font-size: clamp(7px, 1.7cqmin, 8px);
  text-align: right;
}

.card-back-actions {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: clamp(4px, 1.2cqmin, 7px);
}

.card-back-action {
  display: flex;
  min-width: 0;
  min-height: clamp(34px, 10cqmin, 44px);
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  gap: clamp(3px, 1cqmin, 6px);
  padding: 4px clamp(5px, 1.6cqmin, 10px);
  border: 1px solid rgba(225, 193, 124, 0.12);
  border-radius: clamp(8px, 2.4cqmin, 11px);
  color: rgba(255, 255, 255, 0.58);
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.055), rgba(2, 5, 9, 0.18));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035), 0 2px 7px rgba(0, 0, 0, 0.18);
  font-size: clamp(8px, 2cqmin, 10px);
  font-weight: 700;
  -webkit-tap-highlight-color: transparent;
  transition: transform 100ms ease, border-color 100ms ease, background 100ms ease;
}

.card-back-action__icon {
  width: clamp(14px, 4cqmin, 19px);
  aspect-ratio: 1;
  flex: 0 0 auto;
}

.card-back-action__icon--gold { color: #dfbd72; }

.card-back-action--danger {
  border-color: rgba(206, 91, 69, 0.15);
  color: rgba(232, 153, 130, 0.68);
}

button:focus-visible {
  outline: 2px solid rgba(110, 202, 194, 0.92);
  outline-offset: 2px;
}

@container card (min-width: 320px) {
  .card-back-body {
    grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
  }
}

@container card (max-width: 260px) {
  .player-card-back {
    gap: 5px;
    padding: 6px;
  }

  .card-back-header {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .card-back-seal,
  .card-back-identity > span,
  .card-back-section__copy {
    display: none;
  }

  .card-back-life {
    grid-column: 1;
    grid-row: 1;
  }

  .card-back-flip {
    grid-column: 3;
  }

  .card-back-body {
    grid-template-rows: auto minmax(0, 1fr);
    gap: 4px;
  }

  .card-back-section {
    padding: 5px;
  }

  .commander-card {
    min-height: 42px;
  }

  .commander-card__meta span:first-child {
    display: none;
  }
}

@container card (max-width: 260px) and (max-height: 300px) {
  .damage-sources,
  .designation-list,
  .tactical-counters,
  .tactical-section__header {
    display: none;
  }

  .commander-card {
    min-height: 38px;
  }

  .commander-cast-button {
    min-height: 32px;
  }
}

@container card (max-height: 250px) and (min-width: 280px) {
  .player-card-back {
    gap: 4px;
    padding: 5px;
  }

  .card-back-header {
    min-height: 28px;
  }

  .card-back-identity > span,
  .card-back-section__copy,
  .damage-sources,
  .designation-list {
    display: none;
  }

  .card-back-body {
    grid-template-columns: minmax(0, 1.16fr) minmax(0, 0.84fr);
    gap: 4px;
  }

  .card-back-section {
    padding: 4px;
  }

  .card-back-section__header {
    margin-bottom: 3px;
  }

  .commander-card {
    min-height: 38px;
  }

  .commander-card__art {
    min-height: 30px;
  }

  .card-back-actions {
    position: absolute;
    right: 6px;
    bottom: 6px;
    z-index: 3;
  }

  .card-back-action {
    width: 32px;
    min-height: 32px;
    flex: 0 0 32px;
    padding: 6px;
    border-radius: 9px;
  }

  .card-back-action > span:last-child {
    display: none;
  }

  .tactical-section {
    padding-bottom: 40px;
  }
}

@container card (max-height: 175px) {
  .card-back-seal,
  .card-back-life span,
  .card-back-section__header,
  .commander-card__art,
  .commander-card__meta span:first-child,
  .tactical-counters,
  .damage-sources,
  .designation-list {
    display: none;
  }

  .card-back-header {
    grid-template-columns: minmax(0, 1fr) auto auto;
    min-height: 25px;
  }

  .card-back-life {
    padding-block: 2px;
  }

  .commander-card,
  .commander-card--without-art {
    grid-template-columns: minmax(0, 1fr) auto;
    min-height: 31px;
    padding: 3px 4px 3px 7px;
  }

  .commander-cast-button {
    min-width: 30px;
    min-height: 28px;
  }

  .commander-cast-button span {
    display: none;
  }

  .critical-metric {
    padding: 3px 4px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .commander-cast-button,
  .commander-empty,
  .card-back-action,
  .card-back-flip,
  .critical-metric__track > span {
    transition-duration: 0.01ms;
  }
}
</style>
