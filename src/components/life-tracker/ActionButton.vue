<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  show: boolean
  bgClass: string
  tooltipKey: string
  tooltipId: string
  activeTooltip: string | null
  sound?: string
}>()

defineEmits<{
  click: []
  'tooltip-show': [id: string]
  'tooltip-hide': []
}>()

const { t } = useI18n()
</script>

<template>
  <div v-if="show" class="pointer-events-auto relative">
    <button
      class="group flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg btn-press"
      :class="bgClass"
      :aria-label="t(tooltipKey)"
      :data-sound="sound || undefined"
      @click="$emit('click')"
      @touchstart.passive="$emit('tooltip-show', tooltipId)"
      @touchend.passive="$emit('tooltip-hide')"
      @touchcancel.passive="$emit('tooltip-hide')"
    >
      <slot />
    </button>
    <Transition name="tooltip-pop">
      <span v-if="activeTooltip === tooltipId" class="action-tooltip">{{ t(tooltipKey) }}</span>
    </Transition>
  </div>
</template>

<style scoped>
.action-tooltip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  pointer-events: none;
  z-index: 30;
}

.tooltip-pop-enter-active {
  transition: opacity 0.15s ease-out, transform 0.15s ease-out;
}
.tooltip-pop-leave-active {
  transition: opacity 0.1s ease-in, transform 0.1s ease-in;
}
.tooltip-pop-enter-from,
.tooltip-pop-leave-to {
  opacity: 0;
  transform: translateX(-50%) scale(0.85) translateY(4px);
}
</style>
