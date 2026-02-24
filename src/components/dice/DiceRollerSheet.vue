<template>
  <AppModal
    :is-open="isOpen"
    :initial-breakpoint="0.45"
    :breakpoints="[0, 0.45]"
    @close="handleClose"
  >
    <div class="dice-sheet">
      <!-- Die type picker -->
      <template v-if="rollResult === null && !isRolling">
        <h3 class="sheet-title">{{ t('dice.title') }}</h3>
        <div class="dice-grid">
          <button
            v-for="die in dieTypes"
            :key="die.sides"
            class="die-button"
            @click="rollDie(die.sides)"
          >
            <component :is="die.icon" :size="48" />
            <span class="die-label">{{ die.label }}</span>
          </button>
        </div>
      </template>

      <!-- Roll result -->
      <template v-else>
        <div class="result-area">
          <component :is="currentDieIcon" :size="32" class="result-die-icon" />
          <div class="result-number" ref="resultNumberRef">
            {{ displayValue }}
          </div>
          <div class="result-actions">
            <ion-button fill="outline" color="primary" @click="reroll">
              {{ t('dice.reroll') }}
            </ion-button>
            <ion-button fill="clear" color="medium" @click="resetToSelection">
              {{ t('common.back') }}
            </ion-button>
          </div>
        </div>
      </template>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonButton } from '@ionic/vue'
import gsap from 'gsap'
import AppModal from '@/components/ui/AppModal.vue'
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
let autoDismissTimer: ReturnType<typeof setTimeout> | null = null
let rollInterval: ReturnType<typeof setInterval> | null = null

const currentDieIcon = computed(() => {
  const die = dieTypes.find((d) => d.sides === selectedDieSides.value)
  return die?.icon ?? IconDie6
})

function cryptoRandom(sides: number): number {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return (array[0]! % sides) + 1
}

function rollDie(sides: number) {
  clearAutoDismiss()
  selectedDieSides.value = sides
  isRolling.value = true
  rollResult.value = 1 // show result area

  const steps = 10
  const intervalMs = 60
  let step = 0

  rollInterval = setInterval(() => {
    displayValue.value = Math.floor(Math.random() * sides) + 1
    step++
    if (step >= steps) {
      if (rollInterval) clearInterval(rollInterval)
      rollInterval = null
      // Final fair value
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

function resetToSelection() {
  cleanup()
  rollResult.value = null
  selectedDieSides.value = null
  isRolling.value = false
}

function startAutoDismiss() {
  clearAutoDismiss()
  autoDismissTimer = setTimeout(() => {
    resetToSelection()
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

// Reset state when modal opens
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
.dice-sheet {
  padding: 20px 16px 32px;
}

.sheet-title {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #fff);
  margin-bottom: 20px;
}

.dice-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  max-width: 280px;
  margin: 0 auto;
}

.die-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  border-radius: 16px;
  background: var(--ion-color-step-50, #1a1f35);
  border: 1px solid rgba(212, 168, 67, 0.12);
  color: var(--text-primary, #fff);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 150ms ease, transform 150ms ease, box-shadow 150ms ease;
}

.die-button:active {
  transform: scale(0.95);
  background: rgba(232, 96, 10, 0.15);
  box-shadow: 0 0 12px rgba(232, 96, 10, 0.3);
}

.die-label {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1px;
}

.result-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
}

.result-die-icon {
  opacity: 0.5;
}

.result-number {
  font-size: 72px;
  font-weight: 900;
  color: #fff;
  text-shadow: 0 0 24px rgba(232, 96, 10, 0.6), 0 0 48px rgba(232, 96, 10, 0.3);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.result-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
</style>
