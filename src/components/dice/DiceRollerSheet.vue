<template>
  <Teleport to="body">
    <Transition name="dice-popup" @enter="onEnter" @leave="onLeave">
      <div v-if="isOpen" class="dice-overlay" @click.self="handleClose">
        <div class="dice-popup" ref="popupRef">
          <button class="close-btn" @click="handleClose" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>

          <!-- Die type picker -->
          <template v-if="rollResult === null && !isRolling">
            <div class="dice-row">
              <button
                v-for="die in dieTypes"
                :key="die.sides"
                class="die-button"
                @click="rollDie(die.sides)"
              >
                <component :is="die.icon" :size="36" />
                <span class="die-label">{{ die.label }}</span>
              </button>
            </div>
          </template>

          <!-- Roll result -->
          <template v-else>
            <div class="result-area">
              <component :is="currentDieIcon" :size="24" class="result-die-icon" />
              <div class="result-number" ref="resultNumberRef">
                {{ displayValue }}
              </div>
              <button class="action-btn action-btn--primary" @click="reroll">
                {{ t('dice.reroll') }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import gsap from 'gsap'
import IconDie4 from '@/components/icons/dice/IconDie4.vue'
import IconDie6 from '@/components/icons/dice/IconDie6.vue'
import IconDie8 from '@/components/icons/dice/IconDie8.vue'
import IconDie20 from '@/components/icons/dice/IconDie20.vue'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()

interface DieType {
  sides: number
  label: string
  icon: Component
}

const dieTypes: DieType[] = [
  { sides: 4, label: 'D4', icon: IconDie4 },
  { sides: 6, label: 'D6', icon: IconDie6 },
  { sides: 8, label: 'D8', icon: IconDie8 },
  { sides: 20, label: 'D20', icon: IconDie20 },
]

const selectedDieSides = ref<number | null>(null)
const rollResult = ref<number | null>(null)
const displayValue = ref<number>(1)
const isRolling = ref(false)
const resultNumberRef = ref<HTMLElement>()
const popupRef = ref<HTMLElement>()
let autoDismissTimer: ReturnType<typeof setTimeout> | null = null
let rollInterval: ReturnType<typeof setInterval> | null = null

const currentDieIcon = computed(() => {
  const die = dieTypes.find((d) => d.sides === selectedDieSides.value)
  return die?.icon ?? IconDie6
})

function onEnter(el: Element, done: () => void) {
  const popup = (el as HTMLElement).querySelector('.dice-popup')
  gsap.fromTo(
    el,
    { opacity: 0 },
    { opacity: 1, duration: 0.2 },
  )
  if (popup) {
    gsap.fromTo(
      popup,
      { scale: 0.8, opacity: 0, y: -20 },
      { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: 'back.out(2)', onComplete: done },
    )
  } else {
    done()
  }
}

function onLeave(el: Element, done: () => void) {
  const popup = (el as HTMLElement).querySelector('.dice-popup')
  if (popup) {
    gsap.to(popup, { scale: 0.8, opacity: 0, y: -10, duration: 0.2, ease: 'power2.in' })
  }
  gsap.to(el, { opacity: 0, duration: 0.2, onComplete: done })
}

function cryptoRandom(sides: number): number {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return (array[0]! % sides) + 1
}

function rollDie(sides: number) {
  clearAutoDismiss()
  selectedDieSides.value = sides
  isRolling.value = true
  rollResult.value = 1

  const steps = 10
  const intervalMs = 60
  let step = 0

  rollInterval = setInterval(() => {
    displayValue.value = Math.floor(Math.random() * sides) + 1
    step++
    if (step >= steps) {
      if (rollInterval) clearInterval(rollInterval)
      rollInterval = null
      const finalValue = cryptoRandom(sides)
      displayValue.value = finalValue
      rollResult.value = finalValue
      isRolling.value = false
      animateResult()
      startAutoDismiss()
    }
  }, intervalMs)
}

function animateResult() {
  const element = resultNumberRef.value
  if (!element) return
  gsap.fromTo(
    element,
    { scale: 1.4, opacity: 0.6 },
    { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2)' },
  )
}

function reroll() {
  if (!selectedDieSides.value) return
  rollDie(selectedDieSides.value)
}

function startAutoDismiss() {
  clearAutoDismiss()
  autoDismissTimer = setTimeout(() => {
    handleClose()
  }, 4000)
}

function clearAutoDismiss() {
  if (autoDismissTimer) {
    clearTimeout(autoDismissTimer)
    autoDismissTimer = null
  }
}

function cleanup() {
  clearAutoDismiss()
  if (rollInterval) {
    clearInterval(rollInterval)
    rollInterval = null
  }
}

function handleClose() {
  cleanup()
  rollResult.value = null
  selectedDieSides.value = null
  isRolling.value = false
  emit('close')
}

watch(() => props.isOpen, (open) => {
  if (open) {
    rollResult.value = null
    selectedDieSides.value = null
    isRolling.value = false
  } else {
    cleanup()
  }
})
</script>

<style scoped>
.dice-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: calc(var(--ion-safe-area-top, 44px) + 56px);
  background: rgba(0, 0, 0, 0.35);
}

.dice-popup {
  position: relative;
  background: var(--ion-color-step-100, #1c2138);
  border: 1px solid rgba(212, 168, 67, 0.15);
  border-radius: 20px;
  padding: 16px;
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.5),
    0 0 20px rgba(232, 96, 10, 0.08);
  min-width: 240px;
}

.close-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary, #8a8f98);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 150ms ease;
}

.close-btn:active {
  background: rgba(255, 255, 255, 0.15);
}

.dice-row {
  display: flex;
  gap: 8px;
}

.die-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex: 1;
  padding: 12px 8px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--text-primary, #fff);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 150ms ease, transform 150ms ease, box-shadow 150ms ease;
}

.die-button:active {
  transform: scale(0.93);
  background: rgba(232, 96, 10, 0.15);
  box-shadow: 0 0 12px rgba(232, 96, 10, 0.3);
}

.die-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  opacity: 0.7;
}

.result-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.result-die-icon {
  opacity: 0.4;
}

.result-number {
  font-size: 56px;
  font-weight: 900;
  color: #fff;
  text-shadow: 0 0 20px rgba(232, 96, 10, 0.6), 0 0 40px rgba(232, 96, 10, 0.3);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.action-btn {
  padding: 6px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 150ms ease;
  border: none;
  margin-top: 4px;
}

.action-btn--primary {
  background: rgba(232, 96, 10, 0.15);
  color: var(--color-accent, #e8600a);
  border: 1px solid rgba(232, 96, 10, 0.3);
}

.action-btn--primary:active {
  background: rgba(232, 96, 10, 0.3);
}
</style>
