<template>
  <ion-modal
    :is-open="isOpen"
    v-bind="$attrs"
    :enter-animation="isSheetModal ? undefined : enterAnimation"
    :leave-animation="isSheetModal ? undefined : leaveAnimation"
    @didDismiss="$emit('close')"
  >
    <!-- Standard header with title + close button -->
    <ion-header v-if="hasHeader" data-animate>
      <ion-toolbar v-if="title">
        <ion-title>{{ title }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')">{{ closeLabel ?? t('common.close') }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
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

.app-modal-sheet {
  background: var(--modal-background);
  min-height: 100%;
}
</style>
