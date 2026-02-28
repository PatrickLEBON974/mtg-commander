<template>
  <ion-modal
    :is-open="isOpen"
    v-bind="$attrs"
    :enter-animation="isSheetModal ? undefined : enterAnimation"
    :leave-animation="isSheetModal ? undefined : leaveAnimation"
    @didDismiss="$emit('close')"
  >
    <!-- Decorative overlay — pinned to modal viewport, above content -->
    <div class="app-modal-decor" aria-hidden="true">
      <CornerAccent position="top-left" />
      <CornerAccent position="top-right" />
      <CornerAccent v-if="!isSheetModal" position="bottom-left" />
      <CornerAccent v-if="!isSheetModal" position="bottom-right" />
      <div class="app-modal-top-accent" />
      <div class="app-modal-bottom-glow" />
    </div>

    <!-- Standard header with title + close button -->
    <ion-header v-if="hasHeader" data-animate>
      <ion-toolbar v-if="title">
        <ion-title>{{ title }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')">{{ closeLabel ?? t('common.close') }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
      <DividerOrnament v-if="title" width="80%" />
      <slot name="header-extra" />
    </ion-header>

    <!-- With header: ion-content for scrollable area -->
    <ion-content v-if="hasHeader" :class="contentClass" class="app-modal-content">
      <div class="app-modal-vignette" />
      <slot />
    </ion-content>

    <!-- Sheet mode (no header): raw content with opaque background -->
    <div v-else class="app-modal-sheet">
      <div class="app-modal-vignette" />
      <slot />
    </div>

    <!-- Anything that lives inside ion-modal but outside ion-content (nested modals) -->
    <slot name="after-content" />
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
} from '@ionic/vue'
import { useModalAnimation } from '@/composables/useModalAnimation'
import CornerAccent from '@/components/icons/decorative/CornerAccent.vue'
import DividerOrnament from '@/components/icons/decorative/DividerOrnament.vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  isOpen: boolean
  title?: string
  showHeader?: boolean
  contentClass?: string
  closeLabel?: string
}>(), {
  title: undefined,
  showHeader: undefined,
  contentClass: undefined,
  closeLabel: undefined,
})

defineEmits<{
  close: []
}>()

const { t } = useI18n()
const attrs = useAttrs()

const { enterAnimation, leaveAnimation } = useModalAnimation()

// Sheet modals (with breakpoints) use Ionic's built-in slide animation.
// Custom enter/leave animations conflict with the breakpoint transform system.
const isSheetModal = computed(() => 'breakpoints' in attrs || 'initial-breakpoint' in attrs || 'initialBreakpoint' in attrs)

const hasHeader = computed(() => props.showHeader ?? !!props.title)
</script>

<style scoped>
.app-modal-content {
  --padding-bottom: var(--ion-safe-area-bottom, 0px);
}

.app-modal-content::part(scroll) {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* ═══ Decorative overlay ═══ */
.app-modal-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  overflow: hidden;
  border-radius: inherit;
}

/* Gold accent line at top of modal */
.app-modal-top-accent {
  position: absolute;
  top: 0;
  left: 10%;
  right: 10%;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(212, 168, 67, 0.15) 20%,
    rgba(212, 168, 67, 0.4) 50%,
    rgba(212, 168, 67, 0.15) 80%,
    transparent 100%
  );
  box-shadow: 0 0 12px rgba(212, 168, 67, 0.15);
}

/* Subtle warm glow at bottom */
.app-modal-bottom-glow {
  position: absolute;
  bottom: 0;
  inset-inline: 0;
  height: 60px;
  background: radial-gradient(ellipse at 50% 100%, rgba(212, 168, 67, 0.03) 0%, transparent 70%);
}

/* ═══ Top radial vignette ═══ */
.app-modal-vignette {
  position: absolute;
  inset-inline: 0;
  top: 0;
  height: 120px;
  background: radial-gradient(ellipse at 50% 0%, rgba(212, 168, 67, 0.06) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* ═══ Sheet mode ═══ */
.app-modal-sheet {
  position: relative;
  background: var(--modal-background);
  min-height: 100%;
}

/* ═══ Surface grain on modal background ═══ */
.app-modal-content::part(background),
.app-modal-sheet::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(
      92deg, transparent 0px, transparent 3px,
      rgba(255, 255, 255, 0.005) 3px, rgba(255, 255, 255, 0.005) 4px
    ),
    repeating-linear-gradient(
      178deg, transparent 0px, transparent 5px,
      rgba(255, 255, 255, 0.003) 5px, rgba(255, 255, 255, 0.003) 6px
    );
  pointer-events: none;
  z-index: 0;
}
</style>
