<template>
  <ion-modal
    :is-open="isOpen"
    v-bind="$attrs"
    :enter-animation="enterAnimation"
    :leave-animation="leaveAnimation"
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
    <ion-content v-if="hasHeader" :class="contentClass">
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
import { computed } from 'vue'
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

const { enterAnimation, leaveAnimation } = useModalAnimation()

const hasHeader = computed(() => props.showHeader ?? !!props.title)
</script>

<style scoped>
.app-modal-sheet {
  background: var(--modal-background);
  min-height: 100%;
}
</style>
