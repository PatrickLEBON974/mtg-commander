<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Monarch crown -->
    <path
      d="M2 17l3-10 4 4 3-8 3 8 4-4 3 10H2z"
      :fill="color"
      opacity="0.2"
    />
    <path
      d="M2 17l3-10 4 4 3-8 3 8 4-4 3 10H2z"
      :stroke="color"
      stroke-width="1.5"
      stroke-linejoin="round"
      fill="none"
    />
    <!-- Crown base -->
    <path d="M3 17h18v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" :fill="color" opacity="0.3" />
    <!-- Gem dots -->
    <circle cx="8" cy="17" r="1" :fill="color" opacity="0.5" />
    <circle cx="12" cy="17" r="1" :fill="color" opacity="0.5" />
    <circle cx="16" cy="17" r="1" :fill="color" opacity="0.5" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string; color?: string }>(), {
  size: 24,
  color: 'currentColor',
})
</script>
