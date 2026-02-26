<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Coin — circle with dividing line -->
    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1" />
    <ellipse cx="12" cy="12" rx="2" ry="10" stroke="currentColor" stroke-width="0.75" opacity="0.3" />
    <circle cx="12" cy="8" r="1.5" fill="currentColor" opacity="0.5" />
    <path d="M9.5 14.5c0 1.5 1.1 2.5 2.5 2.5s2.5-1 2.5-2.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.5" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 24 })
</script>
