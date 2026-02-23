<template>
  <div class="flex items-center gap-3">
    <button
      class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg font-bold active:bg-white/20"
      :disabled="currentIndex <= 0"
      :class="currentIndex <= 0 ? 'opacity-30' : ''"
      :aria-label="t('common.decrease', { label })"
      @click="prev"
    >
      -
    </button>

    <span class="min-w-[4rem] text-center text-lg font-bold tabular-nums text-text-primary">
      {{ displayValue }}
    </span>

    <button
      class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg font-bold active:bg-white/20"
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
