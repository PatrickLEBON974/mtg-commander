<template>
  <div class="layout-picker-content">
    <div class="layout-decor" aria-hidden="true">
      <CornerAccent position="top-left" />
      <CornerAccent position="top-right" />
      <div class="layout-top-accent" />
    </div>

    <h3 class="layout-title">{{ t('game.layoutTitle') }}</h3>
    <div class="flex flex-wrap justify-center gap-3">
      <!-- Default (hidden at 5 players) -->
      <button
        v-if="currentPlayerCount !== 5"
        class="layout-option card-lift"
        :class="currentLayout === 'default' ? 'layout-option--active' : ''"
        @click="select('default')"
      >
        <svg viewBox="0 0 24 24" class="h-8 w-8" fill="currentColor" :opacity="currentLayout === 'default' ? 1 : 0.6">
          <rect x="2" y="2" width="9" height="9" rx="2" />
          <rect x="13" y="2" width="9" height="9" rx="2" />
          <rect x="2" y="13" width="9" height="9" rx="2" />
          <rect x="13" y="13" width="9" height="9" rx="2" />
        </svg>
        <span class="layout-label" :class="currentLayout === 'default' ? 'layout-label--active' : ''">
          {{ t('game.layoutDefault') }}
        </span>
      </button>

      <!-- Face-to-face -->
      <button
        class="layout-option card-lift"
        :class="currentLayout === 'faceToFace' ? 'layout-option--active' : ''"
        @click="select('faceToFace')"
      >
        <svg viewBox="0 0 24 24" class="h-8 w-8" fill="currentColor" :opacity="currentLayout === 'faceToFace' ? 1 : 0.6">
          <rect x="2" y="2" width="9" height="9" rx="2" opacity="0.5" />
          <rect x="13" y="2" width="9" height="9" rx="2" opacity="0.5" />
          <rect x="2" y="13" width="9" height="9" rx="2" />
          <rect x="13" y="13" width="9" height="9" rx="2" />
          <line x1="0" y1="12" x2="24" y2="12" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" opacity="0.4" />
        </svg>
        <span class="layout-label" :class="currentLayout === 'faceToFace' ? 'layout-label--active' : ''">
          {{ t('game.layoutFaceToFace') }}
        </span>
      </button>

      <!-- Face-to-face side -->
      <button
        class="layout-option card-lift"
        :class="currentLayout === 'faceToFaceSide' ? 'layout-option--active' : ''"
        @click="select('faceToFaceSide')"
      >
        <svg viewBox="0 0 24 24" class="h-8 w-8" fill="currentColor" :opacity="currentLayout === 'faceToFaceSide' ? 1 : 0.6">
          <rect x="2" y="2" width="9" height="9" rx="2" opacity="0.5" />
          <rect x="2" y="13" width="9" height="9" rx="2" opacity="0.5" />
          <rect x="13" y="2" width="9" height="9" rx="2" />
          <rect x="13" y="13" width="9" height="9" rx="2" />
          <line x1="12" y1="0" x2="12" y2="24" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" opacity="0.4" />
        </svg>
        <span class="layout-label" :class="currentLayout === 'faceToFaceSide' ? 'layout-label--active' : ''">
          {{ t('game.layoutFaceToFaceSide') }}
        </span>
      </button>

      <!-- Star (only for 4 players) -->
      <button
        v-if="currentPlayerCount === 4"
        class="layout-option card-lift"
        :class="currentLayout === 'star' ? 'layout-option--active' : ''"
        @click="select('star')"
      >
        <svg viewBox="0 0 24 24" class="h-8 w-8" fill="currentColor" :opacity="currentLayout === 'star' ? 1 : 0.6">
          <rect x="7" y="1" width="10" height="7" rx="2" />
          <rect x="16" y="8.5" width="7" height="7" rx="2" />
          <rect x="7" y="16" width="10" height="7" rx="2" />
          <rect x="1" y="8.5" width="7" height="7" rx="2" />
        </svg>
        <span class="layout-label" :class="currentLayout === 'star' ? 'layout-label--active' : ''">
          {{ t('game.layoutStar') }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import CornerAccent from '@/components/icons/decorative/CornerAccent.vue'

const props = defineProps<{
  currentPlayerCount: number
  currentLayout: string
  dismiss: (data?: unknown, role?: string) => void
}>()

const { t } = useI18n()

function select(layout: string) {
  props.dismiss(layout, 'confirm')
}
</script>

<style scoped>
.layout-picker-content {
  position: relative;
  padding: 20px 16px;
}

.layout-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  overflow: hidden;
  border-radius: inherit;
}

.layout-top-accent {
  position: absolute;
  top: 0;
  left: 10%;
  right: 10%;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, rgba(212, 168, 67, 0.15) 20%, rgba(212, 168, 67, 0.4) 50%, rgba(212, 168, 67, 0.15) 80%, transparent 100%);
  box-shadow: 0 0 12px rgba(212, 168, 67, 0.15);
}

.layout-title {
  margin-bottom: 16px;
  text-align: center;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.layout-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--surface-card, rgba(26, 31, 53, 1));
}

.layout-option--active {
  background: rgba(232, 96, 10, 0.2);
  box-shadow: 0 0 0 2px var(--color-accent);
}

.layout-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.layout-label--active {
  color: var(--color-accent);
  font-weight: 600;
}
</style>
