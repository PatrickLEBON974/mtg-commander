<template>
  <div class="flex items-center gap-3">
    <button
      class="setting-stepper-btn flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold"
      :disabled="currentIndex <= 0"
      :class="currentIndex <= 0 ? 'opacity-30' : ''"
      :aria-label="t('common.decrease', { label })"
      @click="prev"
    >
      -
    </button>

    <span class="setting-stepper-value min-w-[4rem] text-center text-lg font-bold tabular-nums text-text-primary">
      {{ displayValue }}
    </span>

    <button
      class="setting-stepper-btn flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold"
      :disabled="currentIndex >= options.length - 1"
      :class="currentIndex >= options.length - 1 ? 'opacity-30' : ''"
      :aria-label="t('common.increase', { label })"
      @click="next"
    >
      +
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

export interface StepperOption {
  value: number | string
  label: string
}

const props = defineProps<{
  modelValue: number | string
  options: StepperOption[]
  label?: string
}>()

const { t } = useI18n()

const emit = defineEmits<{
  'update:modelValue': [value: number | string]
}>()

const currentIndex = computed(() =>
  props.options.findIndex((opt) => opt.value === props.modelValue),
)

const displayValue = computed(() => {
  const option = props.options.find((opt) => opt.value === props.modelValue)
  return option?.label ?? String(props.modelValue)
})

function prev() {
  const newIndex = currentIndex.value - 1
  const option = props.options[newIndex]
  if (newIndex >= 0 && option) {
    emit('update:modelValue', option.value)
  }
}

function next() {
  const newIndex = currentIndex.value + 1
  const option = props.options[newIndex]
  if (newIndex < props.options.length && option) {
    emit('update:modelValue', option.value)
  }
}
</script>

<style scoped>
.setting-stepper-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.8);
  box-shadow: var(--shadow-btn-beveled);
  transition: transform 0.1s ease, box-shadow 0.1s ease, background 0.1s ease;
  -webkit-tap-highlight-color: transparent;
}

.setting-stepper-btn:active {
  transform: scale(0.88) translateY(1px);
  box-shadow: var(--shadow-btn-pressed);
  background: rgba(255, 255, 255, 0.12);
}

.setting-stepper-btn:disabled {
  pointer-events: none;
}

.setting-stepper-value {
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3), 0 -1px 0 rgba(255, 255, 255, 0.05);
}
</style>
