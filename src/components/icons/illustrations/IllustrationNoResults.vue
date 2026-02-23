<template>
  <svg :width="size" :height="size" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Empty search crystal ball -->
    <!-- Stand -->
    <path d="M45 95h30l-5-8H50l-5 8z" fill="#222842" stroke="#d4a843" stroke-width="1" />
    <ellipse cx="60" cy="96" rx="18" ry="3" fill="#1a1f35" stroke="#d4a843" stroke-width="1" />
    <!-- Ball -->
    <circle cx="60" cy="55" r="32" fill="#111827" stroke="#d4a843" stroke-width="1.5" />
    <!-- Inner glow -->
    <circle cx="60" cy="55" r="26" fill="#d4a843" opacity="0.03" />
    <!-- Reflection highlight -->
    <ellipse cx="50" cy="42" rx="10" ry="6" fill="white" opacity="0.04" />
    <!-- Mist particles -->
    <circle cx="52" cy="50" r="2" fill="#d4a843" opacity="0.08" />
    <circle cx="68" cy="58" r="3" fill="#4a90e2" opacity="0.06" />
    <circle cx="58" cy="65" r="2.5" fill="#e8600a" opacity="0.06" />
    <!-- "No results" hint -->
    <path d="M53 55h14M60 48v14" stroke="#d4a843" stroke-width="1.5" stroke-linecap="round" opacity="0.15" transform="rotate(45 60 55)" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 120 })
</script>
