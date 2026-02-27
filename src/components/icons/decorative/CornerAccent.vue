<template>
  <svg
    class="corner-accent"
    :class="`corner-${position}`"
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Arc following the rounded corner (matches ~16px border-radius) -->
    <path d="M2 18 A16 16 0 0 1 18 2" stroke="#d4a843" stroke-width="0.8" opacity="0.25" fill="none" stroke-linecap="round" />
    <!-- Inner parallel arc -->
    <path d="M5 17 A12 12 0 0 1 17 5" stroke="#d4a843" stroke-width="0.5" opacity="0.15" fill="none" stroke-linecap="round" />
    <!-- Small diamond on the arc -->
    <rect x="8.5" y="2.5" width="2.5" height="2.5" rx="0.4" fill="#d4a843" opacity="0.12" transform="rotate(45 9.75 3.75)" />
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
