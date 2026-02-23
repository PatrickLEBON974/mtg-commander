<template>
  <svg :width="size" :height="size" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Empty scroll/journal for no stats -->
    <!-- Scroll body -->
    <rect x="25" y="20" width="70" height="80" rx="4" fill="#1a1f35" stroke="#d4a843" stroke-width="1.5" />
    <!-- Top scroll roll -->
    <ellipse cx="60" cy="22" rx="38" ry="5" fill="#222842" stroke="#d4a843" stroke-width="1" />
    <!-- Bottom scroll roll -->
    <ellipse cx="60" cy="98" rx="38" ry="5" fill="#222842" stroke="#d4a843" stroke-width="1" />
    <!-- Empty lines (placeholder text) -->
    <rect x="38" y="38" width="44" height="3" rx="1.5" fill="#d4a843" opacity="0.1" />
    <rect x="38" y="48" width="36" height="3" rx="1.5" fill="#d4a843" opacity="0.08" />
    <rect x="38" y="58" width="40" height="3" rx="1.5" fill="#d4a843" opacity="0.06" />
    <rect x="38" y="68" width="30" height="3" rx="1.5" fill="#d4a843" opacity="0.04" />
    <!-- Question mark -->
    <text x="60" y="85" text-anchor="middle" fill="#d4a843" opacity="0.2" font-size="20" font-weight="bold">?</text>
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 120 })
</script>
