<template>
  <div class="flex items-center" :class="size === 'lg' ? 'gap-6' : 'gap-3'">
    <button
      class="flex items-center justify-center rounded-full bg-white/10 font-bold active:bg-white/20"
      :class="[
        size === 'lg' ? 'h-14 w-14 text-2xl' : 'h-10 w-10 text-lg',
        decrementClass,
      ]"
      :aria-label="ariaDecrement"
      @click="decrement"
      @touchstart.passive="startRepeat(decrement)"
      @touchend.passive="stopRepeat"
      @touchcancel.passive="stopRepeat"
    >
      -
    </button>

    <input
      ref="inputRef"
      type="number"
      inputmode="numeric"
      :value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      class="stepper-input bg-transparent text-center font-bold tabular-nums"
      :class="[
        size === 'lg' ? 'min-w-[4rem] text-5xl' : 'min-w-[2rem] text-lg',
        valueClass,
      ]"
      @input="onInput"
      @blur="onBlur"
      @keydown.enter="($event.target as HTMLInputElement).blur()"
    />

    <button
      class="flex items-center justify-center rounded-full bg-white/10 font-bold active:bg-white/20"
      :class="[
        size === 'lg' ? 'h-14 w-14 text-2xl' : 'h-10 w-10 text-lg',
        incrementClass,
      ]"
      :aria-label="ariaIncrement"
      @click="increment"
      @touchstart.passive="startRepeat(increment)"
      @touchend.passive="stopRepeat"
      @touchcancel.passive="stopRepeat"
    >
      +
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const REPEAT_DELAY_MS = 400
const REPEAT_INTERVAL_MS = 100

const props = withDefaults(defineProps<{
  modelValue: number
  min?: number
  max?: number
  step?: number
  size?: 'sm' | 'lg'
  valueClass?: string
  decrementClass?: string
  incrementClass?: string
  ariaDecrement?: string
  ariaIncrement?: string
}>(), {
  min: 0,
  max: undefined,
  step: 1,
  size: 'sm',
  valueClass: 'text-text-primary',
  decrementClass: '',
  incrementClass: '',
  ariaDecrement: undefined,
  ariaIncrement: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const inputRef = ref<HTMLInputElement>()

let repeatDelayTimer: ReturnType<typeof setTimeout> | null = null
let repeatIntervalTimer: ReturnType<typeof setInterval> | null = null

function clamp(value: number): number {
  let clamped = value
  if (props.min !== undefined) clamped = Math.max(props.min, clamped)
  if (props.max !== undefined) clamped = Math.min(props.max, clamped)
  return clamped
}

function decrement() {
  emit('update:modelValue', clamp(props.modelValue - props.step))
}

function increment() {
  emit('update:modelValue', clamp(props.modelValue + props.step))
}

function startRepeat(action: () => void) {
  stopRepeat()
  repeatDelayTimer = setTimeout(() => {
    action()
    repeatIntervalTimer = setInterval(action, REPEAT_INTERVAL_MS)
  }, REPEAT_DELAY_MS)
}

function stopRepeat() {
  if (repeatDelayTimer) {
    clearTimeout(repeatDelayTimer)
    repeatDelayTimer = null
  }
  if (repeatIntervalTimer) {
    clearInterval(repeatIntervalTimer)
    repeatIntervalTimer = null
  }
}

onUnmounted(stopRepeat)

function onInput(event: Event) {
  const rawValue = (event.target as HTMLInputElement).value
  if (rawValue === '' || rawValue === '-') return
  const parsed = parseInt(rawValue, 10)
  if (!isNaN(parsed)) {
    emit('update:modelValue', clamp(parsed))
  }
}

function onBlur() {
  // Ensure displayed value matches the model after blur
  if (inputRef.value) {
    inputRef.value.value = String(props.modelValue)
  }
}
</script>

<style scoped>
/* Hide browser spinner arrows */
.stepper-input::-webkit-outer-spin-button,
.stepper-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.stepper-input {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
