<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Initiative shield -->
    <path
      d="M12 2L4 6v5c0 5.25 3.4 10.15 8 11.4 4.6-1.25 8-6.15 8-11.4V6l-8-4z"
      fill="currentColor"
      opacity="0.12"
    />
    <path
      d="M12 2L4 6v5c0 5.25 3.4 10.15 8 11.4 4.6-1.25 8-6.15 8-11.4V6l-8-4z"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linejoin="round"
      fill="none"
    />
    <!-- Inner emblem — star -->
    <path d="M12 8l1.5 3 3 .5-2.25 2 .75 3L12 15l-3 1.5.75-3-2.25-2 3-.5L12 8z" fill="currentColor" opacity="0.25" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 24 })
</script>
