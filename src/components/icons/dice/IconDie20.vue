<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- D20 — icosahedron (hexagon approximation) -->
    <path d="M12 1L21.5 6.5V17.5L12 23L2.5 17.5V6.5L12 1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="currentColor" fill-opacity="0.1" />
    <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" stroke-width="0.75" opacity="0.3" />
    <line x1="2.5" y1="6.5" x2="21.5" y2="17.5" stroke="currentColor" stroke-width="0.75" opacity="0.3" />
    <line x1="21.5" y1="6.5" x2="2.5" y2="17.5" stroke="currentColor" stroke-width="0.75" opacity="0.3" />
    <text x="12" y="15" text-anchor="middle" fill="currentColor" font-size="8" font-weight="700">20</text>
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 24 })
</script>
