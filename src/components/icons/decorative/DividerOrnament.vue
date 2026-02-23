<template>
  <svg class="divider-ornament" :width="width" height="12" viewBox="0 0 200 12" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
    <!-- Horizontal ornamental divider -->
    <line x1="10" y1="6" x2="85" y2="6" stroke="#d4a843" stroke-width="0.5" opacity="0.2" />
    <!-- Center diamond -->
    <path d="M95 2l5 4-5 4-5-4 5-4z" fill="#d4a843" opacity="0.2" />
    <path d="M100 2l5 4-5 4-5-4 5-4z" fill="#d4a843" opacity="0.15" />
    <path d="M105 2l5 4-5 4-5-4 5-4z" fill="#d4a843" opacity="0.1" />
    <line x1="115" y1="6" x2="190" y2="6" stroke="#d4a843" stroke-width="0.5" opacity="0.2" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ width?: string }>(), { width: '100%' })
</script>

<style scoped>
.divider-ornament {
  display: block;
  margin: 8px auto;
}
</style>
