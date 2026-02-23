<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Stylized castle/tower — MTG flavored home -->
    <path
      d="M12 2L3 9v11a1 1 0 001 1h5v-6a1 1 0 011-1h4a1 1 0 011 1v6h5a1 1 0 001-1V9l-9-7z"
      fill="currentColor"
      opacity="0.15"
    />
    <path
      d="M12 2L3 9v11a1 1 0 001 1h5v-6a1 1 0 011-1h4a1 1 0 011 1v6h5a1 1 0 001-1V9l-9-7z"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
    />
    <!-- Tower crenellations -->
    <path d="M8 2v3M12 0v4M16 2v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.6" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 24 })
</script>
