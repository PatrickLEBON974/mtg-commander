<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Single sword for commander damage -->
    <path
      d="M12 2l2 10-2 2-2-2 2-10z"
      fill="currentColor"
      opacity="0.15"
    />
    <path d="M12 2v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <!-- Cross guard -->
    <path d="M8 14h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    <!-- Handle -->
    <path d="M12 14v5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    <!-- Pommel -->
    <circle cx="12" cy="20" r="1.2" fill="currentColor" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 24 })
</script>
