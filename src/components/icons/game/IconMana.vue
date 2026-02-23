<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Generic mana crystal -->
    <path
      d="M12 2L5 9l7 13 7-13-7-7z"
      fill="currentColor"
      opacity="0.15"
    />
    <path
      d="M12 2L5 9l7 13 7-13-7-7z"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linejoin="round"
      fill="none"
    />
    <!-- Inner facet -->
    <path d="M12 2L8 9h8l-4-7z" fill="currentColor" opacity="0.1" />
    <path d="M8 9l4 13 4-13" stroke="currentColor" stroke-width="1" opacity="0.3" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 24 })
</script>
