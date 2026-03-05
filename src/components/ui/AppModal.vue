<template>
  <ion-modal
    :is-open="isOpen"
    v-bind="$attrs"
    class="app-modal-frame"
    :enter-animation="isSheetModal ? undefined : enterAnimation"
    :leave-animation="isSheetModal ? undefined : leaveAnimation"
    @didDismiss="$emit('close')"
  >
    <!-- Decorative overlay — matching GameFrame visual language -->
    <div class="app-modal-decor" aria-hidden="true">
      <CornerAccent position="top-left" />
      <CornerAccent position="top-right" />
      <CornerAccent v-if="!isSheetModal" position="bottom-left" />
      <CornerAccent v-if="!isSheetModal" position="bottom-right" />
      <div class="app-modal-radiance" />
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
      <slot />
    </ion-content>

    <!-- Sheet mode (no header): raw content with opaque background -->
    <div v-else class="app-modal-sheet">
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
import DividerOrnament from '@/components/icons/decorative/DividerOrnament.vue'
import CornerAccent from '@/components/icons/decorative/CornerAccent.vue'

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

/* Warm radiance at top — matching GameFrame */
.app-modal-radiance {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    ellipse 80% 50% at 50% 0%,
    rgba(212, 168, 67, 0.07) 0%,
    transparent 65%
  );
}

/* ═══ Sheet mode ═══ */
.app-modal-sheet {
  position: relative;
  background: var(--modal-background);
  min-height: 100%;
}
</style>

<!-- Unscoped: ion-modal Shadow DOM parts need global selectors -->
<style>
.app-modal-frame {
  --border-radius: 16px;
  --box-shadow:
    0 12px 48px rgba(0, 0, 0, 0.65),
    0 4px 16px rgba(0, 0, 0, 0.5),
    0 0 24px rgba(212, 168, 67, 0.06);
}

.app-modal-frame::part(content) {
  border: 1.5px solid rgba(212, 168, 67, 0.25);
}
</style>
