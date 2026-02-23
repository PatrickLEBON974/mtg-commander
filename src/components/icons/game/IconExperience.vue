<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Star/gem for experience counters -->
    <path
      d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.4 4.8 2.4-7.2-6-4.8h7.6L12 2z"
      fill="currentColor"
      opacity="0.15"
    />
    <path
      d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.4 4.8 2.4-7.2-6-4.8h7.6L12 2z"
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
