<template>
  <Teleport to="body">
    <Transition name="numpad-overlay">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        @click.self="cancel"
      >
        <div class="numpad-panel relative w-[300px] overflow-hidden rounded-2xl border border-arena-gold/20 shadow-2xl" style="background: linear-gradient(180deg, #1a1f35 0%, #111827 100%);">
          <!-- Subtle gold inner glow at top -->
          <div class="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-2xl" style="background: radial-gradient(ellipse at 50% -20%, rgba(212, 168, 67, 0.08) 0%, transparent 70%);" />

          <!-- Corner accents -->
          <CornerAccent position="top-left" />
          <CornerAccent position="top-right" />
          <CornerAccent position="bottom-left" />
          <CornerAccent position="bottom-right" />

          <!-- Header with logo -->
          <div class="relative flex flex-col items-center gap-1 px-4 pt-5 pb-2">
            <img
              :src="logoUrl"
              alt="MTG Commander"
              class="h-8 w-8 opacity-80 drop-shadow-lg"
            />
            <span class="numpad-title text-xs font-bold uppercase tracking-[0.2em] text-arena-gold-light/90">
              {{ t('lifeNumpad.title') }}
            </span>
          </div>

          <DividerOrnament width="80%" />

          <!-- Display -->
          <div class="numpad-display mx-4 mb-3 rounded-xl px-4 py-4 text-center">
            <span
              class="numpad-display-value block text-5xl font-bold tabular-nums"
              :class="displayValue ? 'text-arena-gold-light' : 'text-arena-gold/40'"
            >
              {{ displayValue || currentLifeDisplay }}
            </span>
          </div>

          <!-- Keypad grid: 4 rows x 3 columns -->
          <div class="grid grid-cols-3 gap-2.5 px-5 pb-5">
            <button
              v-for="digit in digitKeys"
              :key="digit"
              class="numpad-key flex min-h-[52px] items-center justify-center rounded-xl text-xl font-semibold btn-press"
              @click="appendDigit(digit)"
            >
              {{ digit }}
            </button>

            <!-- Backspace -->
            <button
              class="numpad-action-key flex min-h-[52px] items-center justify-center rounded-xl btn-press"
              style="--action-color: 239, 68, 68;"
              aria-label="Backspace"
              @click="backspace"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" class="text-life-negative">
                <path
                  d="M9 7L4 12l5 5"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M20 7H9l-5 5 5 5h11a1 1 0 001-1V8a1 1 0 00-1-1z"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linejoin="round"
                  opacity="0.3"
                />
                <path d="M13 10l4 4M17 10l-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </button>

            <!-- Zero -->
            <button
              class="numpad-key flex min-h-[52px] items-center justify-center rounded-xl text-xl font-semibold btn-press"
              @click="appendDigit('0')"
            >
              0
            </button>

            <!-- Confirm -->
            <button
              class="numpad-confirm flex min-h-[52px] items-center justify-center rounded-xl btn-press"
              aria-label="Confirm"
              @click="confirm"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5L20 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CornerAccent from '@/components/icons/decorative/CornerAccent.vue'
import DividerOrnament from '@/components/icons/decorative/DividerOrnament.vue'
import logoUrl from '@/assets/icons/ui/logo.svg'

const { t } = useI18n()

const props = defineProps<{
  modelValue: number
  isOpen: boolean
}>()

const emit = defineEmits<{
  confirm: [newLife: number]
  cancel: []
}>()

const inputBuffer = ref('')
const digitKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

const currentLifeDisplay = computed(() => String(props.modelValue))

const displayValue = ref('')

// Reset buffer each time the numpad opens
watch(() => props.isOpen, (opened) => {
  if (opened) {
    inputBuffer.value = ''
    displayValue.value = ''
  }
})

function appendDigit(digit: string) {
  // Cap at 4 digits to prevent absurd values
  if (inputBuffer.value.length >= 4) return
  inputBuffer.value += digit
  displayValue.value = inputBuffer.value
}

function backspace() {
  inputBuffer.value = inputBuffer.value.slice(0, -1)
  displayValue.value = inputBuffer.value
}

function confirm() {
  const parsedLife = parseInt(inputBuffer.value, 10)
  if (!isNaN(parsedLife)) {
    emit('confirm', parsedLife)
  } else {
    // No input — treat as cancel
    emit('cancel')
  }
}

function cancel() {
  emit('cancel')
}
</script>

<style scoped>
.numpad-title {
  font-family: var(--font-beleren);
  text-shadow: 0 0 12px rgba(212, 168, 67, 0.25);
}

/* Display area — dark inset with gold border */
.numpad-display {
  background: rgba(10, 14, 23, 0.7);
  border: 1px solid rgba(212, 168, 67, 0.12);
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5);
}
.numpad-display-value {
  font-family: var(--font-beleren);
  text-shadow: 0 0 16px rgba(240, 208, 120, 0.15);
}

/* Digit keys — dark surface with gold text, Beleren font */
.numpad-key {
  font-family: var(--font-beleren);
  color: var(--color-arena-gold-light);
  background: linear-gradient(180deg, rgba(212, 168, 67, 0.05) 0%, rgba(10, 14, 23, 0.5) 100%);
  border: 1px solid rgba(212, 168, 67, 0.1);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}
.numpad-key:active {
  color: #fff;
  background: linear-gradient(180deg, rgba(212, 168, 67, 0.2) 0%, rgba(212, 168, 67, 0.1) 100%);
  border-color: rgba(212, 168, 67, 0.35);
  box-shadow: 0 0 10px rgba(212, 168, 67, 0.15), inset 0 0 8px rgba(212, 168, 67, 0.06);
}

/* Backspace / action keys — tinted with --action-color */
.numpad-action-key {
  background: rgba(var(--action-color), 0.08);
  border: 1px solid rgba(var(--action-color), 0.12);
}
.numpad-action-key:active {
  background: rgba(var(--action-color), 0.18);
  border-color: rgba(var(--action-color), 0.3);
}

/* Confirm — Arena gold, the premium action */
.numpad-confirm {
  color: var(--color-arena-gold-light);
  background: linear-gradient(180deg, rgba(212, 168, 67, 0.18) 0%, rgba(212, 168, 67, 0.06) 100%);
  border: 1px solid rgba(212, 168, 67, 0.2);
  box-shadow: 0 0 8px rgba(212, 168, 67, 0.08);
}
.numpad-confirm:active {
  color: #fff;
  background: linear-gradient(180deg, rgba(212, 168, 67, 0.35) 0%, rgba(212, 168, 67, 0.15) 100%);
  border-color: rgba(212, 168, 67, 0.5);
  box-shadow: 0 0 14px rgba(212, 168, 67, 0.25), inset 0 0 8px rgba(212, 168, 67, 0.06);
}

/* --- Overlay transitions --- */
.numpad-overlay-enter-active {
  transition: opacity 0.3s ease-out;
}
.numpad-overlay-enter-active .numpad-panel {
  transition: opacity 0.3s ease-out, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.numpad-overlay-leave-active {
  transition: opacity 0.15s ease-in;
}
.numpad-overlay-leave-active .numpad-panel {
  transition: opacity 0.15s ease-in, transform 0.15s ease-in;
}
.numpad-overlay-enter-from {
  opacity: 0;
}
.numpad-overlay-enter-from .numpad-panel {
  opacity: 0;
  transform: scale(0.92) translateY(8px);
}
.numpad-overlay-leave-to {
  opacity: 0;
}
.numpad-overlay-leave-to .numpad-panel {
  opacity: 0;
  transform: scale(0.95);
}
</style>
