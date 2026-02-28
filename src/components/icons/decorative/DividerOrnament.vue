<template>
  <svg class="divider-ornament" :width="width" height="12" viewBox="0 0 200 12" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
    <!-- Horizontal ornamental divider -->
    <line x1="10" y1="6" x2="83" y2="6" stroke="#d4a843" stroke-width="0.8" opacity="0.3" />
    <!-- Left flanking dot -->
    <circle cx="86" cy="6" r="1.2" fill="#d4a843" opacity="0.2" />
    <!-- Center diamonds -->
    <path d="M95 2l5 4-5 4-5-4 5-4z" fill="#d4a843" opacity="0.3" />
    <path d="M100 1.5l5.5 4.5-5.5 4.5-5.5-4.5 5.5-4.5z" fill="#d4a843" opacity="0.35" class="glow-breathe-diamond" />
    <path d="M105 2l5 4-5 4-5-4 5-4z" fill="#d4a843" opacity="0.15" />
    <!-- Right flanking dot -->
    <circle cx="114" cy="6" r="1.2" fill="#d4a843" opacity="0.2" />
    <line x1="117" y1="6" x2="190" y2="6" stroke="#d4a843" stroke-width="0.8" opacity="0.3" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ width?: string }>(), { width: '100%' })
</script>

<style scoped>
.divider-ornament {
  display: block;
  margin: 8px auto;
}

.glow-breathe-diamond {
  animation: diamond-breathe 3s ease-in-out infinite;
}

@keyframes diamond-breathe {
  0%, 100% { opacity: 0.25; }
  50% { opacity: 0.45; }
}
</style>
