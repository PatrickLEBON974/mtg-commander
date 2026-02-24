<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- D6 — cube -->
    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.1" />
    <text x="12" y="16" text-anchor="middle" fill="currentColor" font-size="10" font-weight="700">6</text>
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 24 })
</script>
