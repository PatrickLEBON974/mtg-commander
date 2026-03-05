<template>
  <div ref="frameRef" class="game-frame">
    <!-- Animated border glow (CSS only, no SVG) -->
    <div v-if="!reducedMotion" class="frame-glow-ring" />

    <!-- Main frame body -->
    <div class="frame-body">
      <!-- Warm inner radiance -->
      <div class="frame-radiance pointer-events-none" />

      <!-- Header -->
      <div v-if="title || showClose" class="frame-header">
        <div v-if="title" class="frame-titles">
          <span class="frame-title">{{ title }}</span>
          <span v-if="subtitle" class="frame-subtitle">{{ subtitle }}</span>
        </div>
        <div v-else class="flex-1" />
        <button
          v-if="showClose"
          class="frame-close"
          data-sound="none"
          :aria-label="t('common.close')"
          @click="emit('close')"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <!-- Divider -->
      <div v-if="title || showClose" class="frame-divider" aria-hidden="true" />

      <!-- Content -->
      <div class="frame-content">
        <slot />
      </div>
    </div>

    <!-- Corner rivets — small metallic dots, pure CSS -->
    <span class="frame-rivet frame-rivet--tl" />
    <span class="frame-rivet frame-rivet--tr" />
    <span class="frame-rivet frame-rivet--bl" />
    <span class="frame-rivet frame-rivet--br" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { prefersReducedMotion } from '@/utils/motion'

defineProps<{
  title?: string
  subtitle?: string
  showClose?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const reducedMotion = prefersReducedMotion

const frameRef = ref<HTMLElement>()
defineExpose({ el: frameRef })
</script>

<style scoped>
.game-frame {
  position: relative;
}

/* ═══════════════════════════════════════════════
   FRAME BODY — beveled panel with layered depth
   ═══════════════════════════════════════════════ */
.frame-body {
  position: relative;
  background: var(--color-surface-card, #1a1f35);
  border-radius: 16px;
  overflow: hidden;

  /* Thin warm border */
  border: 1.5px solid rgba(212, 168, 67, 0.25);

  /* Layered shadows for thick 3D feel */
  box-shadow:
    /* Outer deep shadow */
    0 12px 48px rgba(0, 0, 0, 0.65),
    0 4px 16px rgba(0, 0, 0, 0.5),
    /* Warm glow bleed */
    0 0 24px rgba(212, 168, 67, 0.06),
    /* Inner bevel — bright top edge, dark bottom */
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3),
    /* Inner side bevels */
    inset 1px 0 0 rgba(255, 255, 255, 0.03),
    inset -1px 0 0 rgba(255, 255, 255, 0.03);
}

/* ═══ Animated glow ring — GPU-composited rotate ═══ */
.frame-glow-ring {
  position: absolute;
  inset: -2px;
  border-radius: 18px;
  z-index: -1;
  overflow: hidden;
}

.frame-glow-ring::before {
  content: '';
  position: absolute;
  /* Oversized square so rotation covers the rounded rect */
  inset: -50%;
  background: conic-gradient(
    from 0deg,
    transparent 0%,
    transparent 30%,
    rgba(212, 168, 67, 0.2) 45%,
    rgba(240, 208, 120, 0.35) 50%,
    rgba(212, 168, 67, 0.2) 55%,
    transparent 70%,
    transparent 100%
  );
  animation: glow-spin 4s linear infinite;
  will-change: transform;
  opacity: 0.7;
}

@keyframes glow-spin {
  to { transform: rotate(360deg); }
}

/* ═══ Warm radiance at top ═══ */
.frame-radiance {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    ellipse 80% 50% at 50% 0%,
    rgba(212, 168, 67, 0.07) 0%,
    transparent 65%
  );
}

/* ═══════════════════════════════════════════════
   HEADER
   ═══════════════════════════════════════════════ */
.frame-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 14px 0;
  position: relative;
  z-index: 1;
}

.frame-titles {
  flex: 1;
  min-width: 0;
}

.frame-title {
  font-family: var(--font-beleren);
  color: var(--color-arena-gold-light, #f0d078);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 14px;
  font-weight: 700;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.7);
}

.frame-subtitle {
  display: block;
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  margin-top: 1px;
}

/* ═══ Divider ═══ */
.frame-divider {
  height: 1px;
  margin: 10px 14px 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(212, 168, 67, 0.25) 20%,
    rgba(212, 168, 67, 0.35) 50%,
    rgba(212, 168, 67, 0.25) 80%,
    transparent
  );
  position: relative;
  z-index: 1;
  transform-origin: center;
}

/* ═══════════════════════════════════════════════
   CLOSE BUTTON
   ═══════════════════════════════════════════════ */
.frame-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;
  -webkit-tap-highlight-color: transparent;
}

.frame-close:active {
  transform: scale(0.85);
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

/* ═══════════════════════════════════════════════
   CONTENT
   ═══════════════════════════════════════════════ */
.frame-content {
  position: relative;
  z-index: 1;
  padding: 10px 14px 16px;
}

/* ═══════════════════════════════════════════════
   CORNER RIVETS — small metallic dots
   ═══════════════════════════════════════════════ */
.frame-rivet {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  z-index: 2;
  pointer-events: none;

  /* Metallic rivet: layered radial gradient + shadow */
  background: radial-gradient(
    circle at 35% 35%,
    rgba(255, 255, 255, 0.4),
    rgba(212, 168, 67, 0.6) 40%,
    rgba(139, 105, 20, 0.8) 70%,
    rgba(80, 60, 10, 0.9)
  );
  box-shadow:
    0 0 4px rgba(212, 168, 67, 0.3),
    inset 0 -1px 1px rgba(0, 0, 0, 0.4);
}

.frame-rivet--tl { top: 6px; left: 6px; }
.frame-rivet--tr { top: 6px; right: 6px; }
.frame-rivet--bl { bottom: 6px; left: 6px; }
.frame-rivet--br { bottom: 6px; right: 6px; }

/* ═══ Reduced motion ═══ */
@media (prefers-reduced-motion: reduce) {
  .frame-glow-ring { animation: none; opacity: 0; }
}
</style>
