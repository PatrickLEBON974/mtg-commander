<template>
  <svg :width="size" :height="size" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Stylized card deck — "Start a game" prompt -->
    <!-- Back cards (stacked) -->
    <rect x="28" y="18" width="56" height="78" rx="6" fill="#1a1f35" stroke="#d4a843" stroke-width="1" opacity="0.3" transform="rotate(-6 56 57)" />
    <rect x="32" y="16" width="56" height="78" rx="6" fill="#1a1f35" stroke="#d4a843" stroke-width="1" opacity="0.5" transform="rotate(-3 60 55)" />
    <!-- Front card -->
    <rect x="32" y="14" width="56" height="78" rx="6" fill="#1a1f35" stroke="#d4a843" stroke-width="1.5" />
    <!-- Card frame interior -->
    <rect x="38" y="22" width="44" height="24" rx="3" fill="#d4a843" opacity="0.08" />
    <rect x="38" y="52" width="44" height="34" rx="3" fill="#d4a843" opacity="0.05" />
    <!-- Mana symbols -->
    <circle cx="48" cy="100" r="5" fill="#e8600a" opacity="0.3" />
    <circle cx="60" cy="100" r="5" fill="#d4a843" opacity="0.3" />
    <circle cx="72" cy="100" r="5" fill="#4a90e2" opacity="0.3" />
    <!-- Decorative sparkles -->
    <circle cx="20" cy="30" r="1.5" fill="#d4a843" opacity="0.4" />
    <circle cx="100" cy="40" r="1" fill="#d4a843" opacity="0.3" />
    <circle cx="95" cy="75" r="1.5" fill="#e8600a" opacity="0.3" />
    <circle cx="25" cy="80" r="1" fill="#4a90e2" opacity="0.3" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 120 })
</script>
