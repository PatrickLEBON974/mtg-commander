<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Scroll/parchment for stats -->
    <path
      d="M8 3H6a2 2 0 00-2 2v1a2 2 0 002 2h1v10a2 2 0 002 2h8a2 2 0 002-2V8h1a2 2 0 002-2V5a2 2 0 00-2-2h-2"
      fill="currentColor"
      opacity="0.12"
    />
    <path
      d="M8 3H6a2 2 0 00-2 2v1a2 2 0 002 2h1v10a2 2 0 002 2h8a2 2 0 002-2V8h1a2 2 0 002-2V5a2 2 0 00-2-2h-2"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
    />
    <!-- Scroll lines -->
    <path d="M10 11h4M10 14h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5" />
    <!-- Top roll -->
    <path d="M8 3v5h8V3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 24 })
</script>
