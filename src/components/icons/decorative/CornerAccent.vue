<template>
  <svg
    class="corner-accent"
    :class="`corner-${position}`"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Corner flourish for cards/panels -->
    <path d="M2 2h8" stroke="#d4a843" stroke-width="0.8" opacity="0.2" />
    <path d="M2 2v8" stroke="#d4a843" stroke-width="0.8" opacity="0.2" />
    <circle cx="2" cy="2" r="1.5" fill="#d4a843" opacity="0.15" />
    <!-- Decorative curve -->
    <path d="M2 8Q2 2 8 2" stroke="#d4a843" stroke-width="0.5" opacity="0.12" fill="none" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }>(), {
  position: 'top-left',
})
</script>

<style scoped>
.corner-accent {
  position: absolute;
  pointer-events: none;
  opacity: 0.6;
}

.corner-top-left {
  top: 0;
  left: 0;
}

.corner-top-right {
  top: 0;
  right: 0;
  transform: scaleX(-1);
}

.corner-bottom-left {
  bottom: 0;
  left: 0;
  transform: scaleY(-1);
}

.corner-bottom-right {
  bottom: 0;
  right: 0;
  transform: scale(-1);
}
</style>
