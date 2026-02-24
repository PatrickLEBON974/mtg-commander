<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Two people — player registry -->
    <circle cx="9" cy="7" r="3.5" fill="currentColor" opacity="0.15" />
    <circle cx="9" cy="7" r="3.5" stroke="currentColor" stroke-width="1.5" fill="none" />
    <path
      d="M2 19c0-3.3 2.7-6 6-6h2c3.3 0 6 2.7 6 6"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      fill="currentColor"
      fill-opacity="0.1"
    />
    <!-- Second person (behind) -->
    <circle cx="16.5" cy="6.5" r="2.5" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.6" />
    <path
      d="M18 13.5c2.2.6 4 2.8 4 5.5"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      opacity="0.6"
    />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 24 })
</script>
