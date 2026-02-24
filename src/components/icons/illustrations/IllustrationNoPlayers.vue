<template>
  <svg :width="size" :height="size" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Stylized group of people silhouettes — "No players" prompt -->
    <!-- Main figure -->
    <circle cx="60" cy="35" r="12" fill="#1a1f35" stroke="#d4a843" stroke-width="1.5" />
    <path
      d="M38 85c0-12.2 9.8-22 22-22s22 9.8 22 22"
      fill="#1a1f35"
      stroke="#d4a843"
      stroke-width="1.5"
      stroke-linecap="round"
    />
    <!-- Left figure (behind) -->
    <circle cx="32" cy="40" r="8" fill="#1a1f35" stroke="#d4a843" stroke-width="1" opacity="0.4" />
    <path
      d="M18 78c0-8.8 6.3-16 14-16"
      stroke="#d4a843"
      stroke-width="1"
      stroke-linecap="round"
      opacity="0.4"
    />
    <!-- Right figure (behind) -->
    <circle cx="88" cy="40" r="8" fill="#1a1f35" stroke="#d4a843" stroke-width="1" opacity="0.4" />
    <path
      d="M102 78c0-8.8-6.3-16-14-16"
      stroke="#d4a843"
      stroke-width="1"
      stroke-linecap="round"
      opacity="0.4"
    />
    <!-- Plus sign -->
    <circle cx="60" cy="100" r="8" fill="#e8600a" opacity="0.2" />
    <path d="M56 100h8M60 96v8" stroke="#e8600a" stroke-width="1.5" stroke-linecap="round" opacity="0.6" />
    <!-- Decorative sparkles -->
    <circle cx="15" cy="25" r="1.5" fill="#d4a843" opacity="0.3" />
    <circle cx="105" cy="30" r="1" fill="#d4a843" opacity="0.25" />
    <circle cx="100" cy="70" r="1.5" fill="#e8600a" opacity="0.25" />
    <circle cx="20" cy="70" r="1" fill="#4a90e2" opacity="0.25" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 120 })
</script>
