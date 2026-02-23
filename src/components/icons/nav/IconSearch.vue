<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Magnifying glass with card-frame hint -->
    <circle cx="10.5" cy="10.5" r="6.5" fill="currentColor" opacity="0.1" />
    <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.5" />
    <!-- Card outline inside lens -->
    <rect x="8" y="7" width="5" height="7" rx="0.5" stroke="currentColor" stroke-width="1" opacity="0.4" />
    <!-- Handle -->
    <path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 24 })
</script>
