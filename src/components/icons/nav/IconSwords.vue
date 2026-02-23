<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Crossed swords for game tab -->
    <path
      d="M6 2l8 8M14 2l-8 8"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
    />
    <!-- Sword blades -->
    <path
      d="M4 20l5-5M20 20l-5-5"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
    />
    <!-- Hilts -->
    <path d="M3 15l4 4M17 15l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.7" />
    <!-- Cross guards -->
    <path d="M7.5 12.5l2-2M14.5 12.5l-2-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <!-- Blade fills -->
    <path d="M6 2l4 4 4-4" fill="currentColor" opacity="0.12" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 24 })
</script>
