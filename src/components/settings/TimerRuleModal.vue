<template>
  <AppModal :is-open="isOpen" :title="isEditing ? t('settings.editRule') : t('settings.addRule')" @close="handleClose">
    <ion-list :inset="true">
      <!-- Rule name -->
      <ion-item lines="inset">
        <ion-label position="stacked">{{ t('settings.ruleName') }}</ion-label>
        <ion-input v-model="ruleName" :placeholder="t('settings.ruleName')" />
      </ion-item>

      <!-- Trigger type -->
      <ion-item lines="inset">
        <ion-label>{{ t('settings.ruleTrigger') }}</ion-label>
        <ion-select v-model="triggerType" interface="action-sheet">
          <ion-select-option value="timer_b_remaining">{{ t('settings.triggerTimerBRemaining') }}</ion-select-option>
          <ion-select-option value="timer_b_expired">{{ t('settings.triggerTimerBExpired') }}</ion-select-option>
          <ion-select-option value="timer_a_exceeded">{{ t('settings.triggerTimerAExceeded') }}</ion-select-option>
        </ion-select>
      </ion-item>

      <!-- Threshold (not shown for timer_b_expired which is always 0) -->
      <ion-item v-if="triggerType !== 'timer_b_expired'" lines="inset">
        <ion-label>{{ t('settings.thresholdSeconds') }}</ion-label>
        <SettingStepper
          slot="end"
          v-model="triggerThreshold"
          :options="thresholdOptions"
          :label="t('settings.thresholdSeconds')"
        />
      </ion-item>

      <!-- Effect type -->
      <ion-item lines="inset">
        <ion-label>{{ t('settings.ruleEffect') }}</ion-label>
        <ion-select v-model="effectType" interface="action-sheet">
          <ion-select-option value="overtime_display">{{ t('settings.effectOvertimeDisplay') }}</ion-select-option>
          <ion-select-option value="repeated_buzz">{{ t('settings.effectRepeatedBuzz') }}</ion-select-option>
          <ion-select-option value="aggressive_flash">{{ t('settings.effectAggressiveFlash') }}</ion-select-option>
          <ion-select-option value="play_sound">{{ t('settings.effectPlaySound') }}</ion-select-option>
        </ion-select>
      </ion-item>

      <!-- Repeat interval (only for repeated_buzz) -->
      <ion-item v-if="effectType === 'repeated_buzz'" lines="inset">
        <ion-label>{{ t('settings.repeatInterval') }}</ion-label>
        <SettingStepper
          slot="end"
          v-model="repeatInterval"
          :options="repeatIntervalOptions"
          :label="t('settings.repeatInterval')"
        />
      </ion-item>

      <!-- Sound type (only for play_sound) -->
      <ion-item v-if="effectType === 'play_sound'" lines="none">
        <ion-label>{{ t('settings.ruleEffect') }}</ion-label>
        <ion-select v-model="soundType" interface="action-sheet">
          <ion-select-option value="warning">{{ t('settings.soundWarning') }}</ion-select-option>
          <ion-select-option value="urgent">{{ t('settings.soundUrgent') }}</ion-select-option>
        </ion-select>
      </ion-item>
    </ion-list>

    <div class="flex gap-3 p-4">
      <ion-button expand="block" fill="outline" color="medium" class="flex-1" @click="handleClose">
        {{ t('common.cancel') }}
      </ion-button>
      <ion-button expand="block" color="primary" class="flex-1" :disabled="!isValid" @click="handleSave">
        {{ t('common.confirm') }}
      </ion-button>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
} from '@ionic/vue'
import type { TimerRule, RuleTriggerType, RuleEffectType } from '@/types/game'
import AppModal from '@/components/ui/AppModal.vue'
import SettingStepper from '@/components/ui/SettingStepper.vue'

const props = defineProps<{
  isOpen: boolean
  editingRule?: TimerRule | null
}>()

const emit = defineEmits<{
  close: []
  save: [rule: TimerRule]
}>()

const { t } = useI18n()

const isEditing = computed(() => !!props.editingRule)

// Form state
const ruleName = ref('')
const triggerType = ref<RuleTriggerType>('timer_b_remaining')
const triggerThreshold = ref(60)
const effectType = ref<RuleEffectType>('aggressive_flash')
const repeatInterval = ref(30)
const soundType = ref<'warning' | 'urgent'>('warning')

const thresholdOptions = [
  { value: 10, label: '10s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1:00' },
  { value: 120, label: '2:00' },
  { value: 300, label: '5:00' },
  { value: 600, label: '10:00' },
]

const repeatIntervalOptions = [
  { value: 10, label: '10s' },
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1:00' },
]

const isValid = computed(() => ruleName.value.trim().length > 0)

// Reset form when modal opens/closes or editing rule changes
watch(() => props.isOpen, (open) => {
  if (open) {
    if (props.editingRule) {
      ruleName.value = props.editingRule.name
      triggerType.value = props.editingRule.trigger.type
      triggerThreshold.value = props.editingRule.trigger.thresholdSeconds
      effectType.value = props.editingRule.effect.type
      repeatInterval.value = props.editingRule.effect.repeatIntervalSeconds ?? 30
      soundType.value = props.editingRule.effect.soundType ?? 'warning'
    } else {
      ruleName.value = ''
      triggerType.value = 'timer_b_remaining'
      triggerThreshold.value = 60
      effectType.value = 'aggressive_flash'
      repeatInterval.value = 30
      soundType.value = 'warning'
    }
  }
})

function handleClose() {
  emit('close')
}

function handleSave() {
  const resolvedThreshold = triggerType.value === 'timer_b_expired' ? 0 : triggerThreshold.value

  const rule: TimerRule = {
    id: props.editingRule?.id ?? crypto.randomUUID(),
    name: ruleName.value.trim(),
    trigger: {
      type: triggerType.value,
      thresholdSeconds: resolvedThreshold,
    },
    effect: {
      type: effectType.value,
      ...(effectType.value === 'repeated_buzz' ? { repeatIntervalSeconds: repeatInterval.value } : {}),
      ...(effectType.value === 'play_sound' ? { soundType: soundType.value } : {}),
    },
  }

  emit('save', rule)
  emit('close')
}
</script>
