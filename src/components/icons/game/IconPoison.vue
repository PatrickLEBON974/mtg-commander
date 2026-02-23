<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Poison drop with skull hint -->
    <path
      d="M12 2C12 2 6 9 6 14a6 6 0 1012 0c0-5-6-12-6-12z"
      fill="currentColor"
      opacity="0.15"
    />
    <path
      d="M12 2C12 2 6 9 6 14a6 6 0 1012 0c0-5-6-12-6-12z"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linejoin="round"
      fill="none"
    />
    <!-- Skull mark inside drop -->
    <circle cx="10" cy="14" r="1" fill="currentColor" opacity="0.5" />
    <circle cx="14" cy="14" r="1" fill="currentColor" opacity="0.5" />
    <path d="M10.5 17h3" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.4" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 24 })
</script>
