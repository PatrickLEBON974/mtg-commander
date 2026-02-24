<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- D8 — octahedron (diamond) -->
    <path d="M12 1L22 12L12 23L2 12L12 1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="currentColor" fill-opacity="0.1" />
    <text x="12" y="16" text-anchor="middle" fill="currentColor" font-size="10" font-weight="700">8</text>
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 24 })
</script>
