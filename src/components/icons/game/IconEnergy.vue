<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Lightning bolt for energy -->
    <path
      d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"
      fill="currentColor"
      opacity="0.15"
    />
    <path
      d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linejoin="round"
      fill="none"
    />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 24 })
</script>
