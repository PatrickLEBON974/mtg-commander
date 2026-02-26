<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- D12 — dodecahedron (pentagon) -->
    <path d="M12 1.5L22.5 8.5L19 20.5H5L1.5 8.5L12 1.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="currentColor" fill-opacity="0.1" />
    <text x="12" y="15" text-anchor="middle" fill="currentColor" font-size="8" font-weight="700">12</text>
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 24 })
</script>
