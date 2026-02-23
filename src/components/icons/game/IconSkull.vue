<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Death indicator skull -->
    <path
      d="M12 2C7.58 2 4 5.58 4 10c0 2.76 1.35 5.2 3.43 6.7L7 20h10l-.43-3.3A8.003 8.003 0 0020 10c0-4.42-3.58-8-8-8z"
      fill="currentColor"
      opacity="0.15"
    />
    <path
      d="M12 2C7.58 2 4 5.58 4 10c0 2.76 1.35 5.2 3.43 6.7L7 20h10l-.43-3.3A8.003 8.003 0 0020 10c0-4.42-3.58-8-8-8z"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linejoin="round"
      fill="none"
    />
    <!-- Eyes -->
    <circle cx="9" cy="10" r="1.5" fill="currentColor" />
    <circle cx="15" cy="10" r="1.5" fill="currentColor" />
    <!-- Jaw -->
    <path d="M9 20v2M12 20v2M15 20v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <!-- Nose -->
    <path d="M12 13v1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 24 })
</script>
