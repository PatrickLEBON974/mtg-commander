<template>
  <AppModal
    :is-open="isOpen"
    :title="props.rule ? t('rules.editor.title') : t('rules.editor.createTitle')"
    @close="$emit('close')"
  >
    <ion-list :inset="true">
      <!-- Rule name -->
      <ion-item lines="inset">
        <ion-label position="stacked">{{ t('rules.editor.ruleName') }}</ion-label>
        <ion-input v-model="editForm.name" :placeholder="t('rules.editor.ruleName')" />
      </ion-item>

      <!-- Category -->
      <ion-item lines="inset">
        <ion-label>{{ t('rules.editor.trigger') }}</ion-label>
        <ion-select v-model="editForm.category" interface="action-sheet">
          <ion-select-option v-for="category in CATEGORY_OPTIONS" :key="category.value" :value="category.value">
            {{ category.label }}
          </ion-select-option>
        </ion-select>
      </ion-item>

      <!-- Trigger type -->
      <ion-item lines="inset">
        <ion-label>{{ t('rules.editor.trigger') }}</ion-label>
        <ion-select v-model="editForm.triggerType" interface="action-sheet">
          <ion-select-option v-for="trigger in TRIGGER_TYPE_OPTIONS" :key="trigger.value" :value="trigger.value">
            {{ trigger.label }}
          </ion-select-option>
        </ion-select>
      </ion-item>

      <!-- Trigger threshold (conditionally shown) -->
      <ion-item v-if="triggerHasThreshold" lines="inset">
        <ion-label position="stacked">{{ t('rules.editor.threshold') }}</ion-label>
        <ion-input v-model.number="editForm.triggerThreshold" type="number" :min="0" />
      </ion-item>

      <!-- Scope -->
      <ion-item lines="inset">
        <ion-label>{{ t('rules.editor.scope') }}</ion-label>
        <ion-segment :value="editForm.scope" @ionChange="editForm.scope = ($event.detail.value as TriggerScope)">
          <ion-segment-button value="per_player">
            <ion-label>{{ t('rules.editor.perPlayer') }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="global">
            <ion-label>{{ t('rules.editor.global') }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-item>

      <!-- Fire once -->
      <ion-item :lines="editForm.fireOnce ? 'none' : 'inset'">
        <ion-label>{{ t('rules.editor.fireOnce') }}</ion-label>
        <ion-toggle slot="end" v-model="editForm.fireOnce" />
      </ion-item>

      <!-- Repeat interval (shown only when fireOnce is false) -->
      <ion-item v-if="!editForm.fireOnce" lines="none">
        <ion-label position="stacked">{{ t('rules.editor.repeatInterval') }}</ion-label>
        <ion-input v-model.number="editForm.repeatIntervalSeconds" type="number" :min="1" />
      </ion-item>
    </ion-list>

    <!-- Effects list -->
    <ion-list :inset="true">
      <ion-list-header>
        <ion-label>{{ t('rules.editor.effect') }}</ion-label>
      </ion-list-header>

      <ion-item
        v-for="(effect, index) in editForm.effects"
        :key="index"
        :lines="index === editForm.effects.length - 1 ? 'none' : 'inset'"
      >
        <ion-label>
          <h3>{{ getEffectLabel(effect) }}</h3>
          <p>{{ getEffectDetail(effect) }}</p>
        </ion-label>
        <ion-button slot="end" fill="clear" color="danger" @click="removeEffect(index)">
          <ion-icon :icon="trashOutline" slot="icon-only" />
        </ion-button>
      </ion-item>

      <!-- Add effect button -->
      <ion-item button lines="none" @click="isAddingEffect = true">
        <ion-icon :icon="addOutline" slot="start" color="primary" />
        <ion-label color="primary">{{ t('rules.editor.addEffect') }}</ion-label>
      </ion-item>
    </ion-list>

    <!-- Add Effect panel (shown when isAddingEffect is true) -->
    <ion-list v-if="isAddingEffect" :inset="true">
      <ion-list-header>
        <ion-label>{{ t('rules.editor.addEffect') }}</ion-label>
      </ion-list-header>

      <!-- Effect type selector -->
      <ion-item lines="inset">
        <ion-label>{{ t('rules.editor.effect') }}</ion-label>
        <ion-select v-model="newEffectType" interface="action-sheet">
          <ion-select-option v-for="effectOption in EFFECT_TYPE_OPTIONS" :key="effectOption.value" :value="effectOption.value">
            {{ effectOption.label }}
          </ion-select-option>
        </ion-select>
      </ion-item>

      <!-- Effect-specific config: play_sound -->
      <ion-item v-if="newEffectType === 'play_sound'" lines="inset">
        <ion-label>Sound</ion-label>
        <ion-select v-model="newEffectSoundName" interface="action-sheet">
          <ion-select-option value="warning">{{ t('rules.soundWarning') }}</ion-select-option>
          <ion-select-option value="urgent">{{ t('rules.soundUrgent') }}</ion-select-option>
        </ion-select>
      </ion-item>

      <!-- Effect-specific config: haptic_buzz -->
      <ion-item v-if="newEffectType === 'haptic_buzz'" lines="inset">
        <ion-label>Pattern</ion-label>
        <ion-select v-model="newEffectHapticPattern" interface="action-sheet">
          <ion-select-option value="single">{{ t('rules.hapticSingle') }}</ion-select-option>
          <ion-select-option value="repeated">{{ t('rules.hapticRepeated') }}</ion-select-option>
        </ion-select>
      </ion-item>

      <!-- Effect-specific config: visual_flash -->
      <ion-item v-if="newEffectType === 'visual_flash'" lines="inset">
        <ion-label>Target</ion-label>
        <ion-select v-model="newEffectFlashTarget" interface="action-sheet">
          <ion-select-option value="affected_player">{{ t('rules.flashAffectedPlayer') }}</ion-select-option>
          <ion-select-option value="all_players">{{ t('rules.flashAllPlayers') }}</ion-select-option>
          <ion-select-option value="timer_zone">{{ t('rules.flashTimerZone') }}</ion-select-option>
        </ion-select>
      </ion-item>

      <!-- Effect-specific config: modify_life -->
      <ion-item v-if="newEffectType === 'modify_life'" lines="inset">
        <ion-label position="stacked">Amount</ion-label>
        <ion-input v-model.number="newEffectAmount" type="number" />
      </ion-item>

      <!-- Effect-specific config: modify_counter -->
      <template v-if="newEffectType === 'modify_counter'">
        <ion-item lines="inset">
          <ion-label>Counter</ion-label>
          <ion-select v-model="newEffectCounterType" interface="action-sheet">
            <ion-select-option value="poisonCounters">{{ t('rules.counterPoison') }}</ion-select-option>
            <ion-select-option value="experienceCounters">{{ t('rules.counterExperience') }}</ion-select-option>
            <ion-select-option value="energyCounters">{{ t('rules.counterEnergy') }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item lines="inset">
          <ion-label position="stacked">Amount</ion-label>
          <ion-input v-model.number="newEffectAmount" type="number" />
        </ion-item>
      </template>

      <!-- Effect-specific config: announce_text -->
      <ion-item v-if="newEffectType === 'announce_text'" lines="inset">
        <ion-label position="stacked">Message key</ion-label>
        <ion-input v-model="newEffectMessageKey" placeholder="e.g. rules.announceTurnExpired" />
      </ion-item>

      <!-- Confirm add effect -->
      <ion-item lines="none">
        <ion-button slot="end" size="small" @click="confirmAddEffect">
          {{ t('common.confirm') }}
        </ion-button>
        <ion-button slot="end" size="small" fill="clear" @click="isAddingEffect = false">
          {{ t('common.cancel') }}
        </ion-button>
      </ion-item>
    </ion-list>

    <!-- Action buttons -->
    <div class="p-4 flex flex-col gap-2">
      <ion-button expand="block" @click="handleSave">
        {{ t('rules.editor.save') }}
      </ion-button>

      <ion-button
        v-if="props.rule && !props.rule.isPreset"
        expand="block"
        color="danger"
        fill="outline"
        @click="$emit('delete', props.rule!.id)"
      >
        {{ t('rules.editor.delete') }}
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
  IonToggle,
  IonSegment,
  IonSegmentButton,
  IonButton,
  IonIcon,
  IonListHeader,
} from '@ionic/vue'
import { addOutline, trashOutline } from 'ionicons/icons'
import AppModal from '@/components/ui/AppModal.vue'
import type {
  BehaviorRule,
  BehaviorRuleEffect,
  BehaviorRuleTrigger,
  RuleCategory,
  TriggerScope,
  PlaySoundEffect,
  HapticBuzzEffect,
  VisualFlashEffect,
  ModifyLifeEffect,
  ModifyCounterEffect,
  AnnounceTextEffect,
} from '@/types/game'

const props = defineProps<{
  isOpen: boolean
  rule: BehaviorRule | null
}>()

const emit = defineEmits<{
  close: []
  save: [rule: BehaviorRule]
  delete: [ruleId: string]
}>()

const { t } = useI18n()

// ─── Form state ──────────────────────────────────────────────────────
const editForm = ref({
  name: '',
  category: 'life' as RuleCategory,
  triggerType: 'life_below' as BehaviorRuleTrigger['type'],
  triggerThreshold: 10,
  scope: 'per_player' as TriggerScope,
  fireOnce: true,
  repeatIntervalSeconds: 30,
  effects: [] as BehaviorRuleEffect[],
  isPreset: false,
})

// ─── Add effect state ────────────────────────────────────────────────
const isAddingEffect = ref(false)
const newEffectType = ref<BehaviorRuleEffect['type']>('play_sound')
const newEffectSoundName = ref<'warning' | 'urgent'>('warning')
const newEffectHapticPattern = ref<'single' | 'repeated'>('single')
const newEffectFlashTarget = ref<'affected_player' | 'all_players' | 'timer_zone'>('affected_player')
const newEffectAmount = ref(-1)
const newEffectCounterType = ref<'poisonCounters' | 'experienceCounters' | 'energyCounters'>('poisonCounters')
const newEffectMessageKey = ref('rules.announceTurnExpired')

// ─── Constants ───────────────────────────────────────────────────────

const CATEGORY_OPTIONS = computed(() => [
  { value: 'life', label: t('rules.categoryLife') },
  { value: 'poison', label: t('rules.categoryPoison') },
  { value: 'commander_damage', label: t('rules.categoryCommanderDamage') },
  { value: 'turn_timer', label: t('rules.categoryTurnTimer') },
  { value: 'game_time', label: t('rules.categoryGameTime') },
  { value: 'death', label: t('rules.categoryDeath') },
  { value: 'penalty', label: t('rules.categoryPenalty') },
])

const TRIGGER_TYPE_OPTIONS = computed(() => [
  { value: 'life_below', label: t('rules.triggers.lifeBelow') },
  { value: 'life_exact', label: t('rules.triggers.lifeExact') },
  { value: 'poison_above', label: t('rules.triggers.poisonAbove') },
  { value: 'commander_damage_above', label: t('rules.triggers.commanderDamageAbove') },
  { value: 'turn_timer_remaining', label: t('rules.triggers.turnTimerRemaining') },
  { value: 'turn_timer_expired', label: t('rules.triggers.turnTimerExpired') },
  { value: 'turn_timer_overtime', label: t('rules.triggers.turnTimerOvertime') },
  { value: 'game_time_exceeded', label: t('rules.triggers.gameTimeExceeded') },
  { value: 'player_death', label: t('rules.triggers.playerDeath') },
])

const EFFECT_TYPE_OPTIONS = computed(() => [
  { value: 'play_sound', label: t('rules.effects.playSound') },
  { value: 'haptic_buzz', label: t('rules.effects.hapticBuzz') },
  { value: 'visual_flash', label: t('rules.effects.visualFlash') },
  { value: 'overtime_display', label: t('rules.effects.overtimeDisplay') },
  { value: 'modify_life', label: t('rules.effects.modifyLife') },
  { value: 'modify_counter', label: t('rules.effects.modifyCounter') },
  { value: 'announce_text', label: t('rules.effects.announceText') },
])

// Trigger types that have no threshold field
const TRIGGERS_WITHOUT_THRESHOLD = new Set<string>([
  'turn_timer_expired',
  'player_death',
])

const triggerHasThreshold = computed(() => !TRIGGERS_WITHOUT_THRESHOLD.has(editForm.value.triggerType))

// ─── Watch props.rule to populate form ───────────────────────────────
watch(() => props.rule, (rule) => {
  if (rule) {
    const trigger = rule.trigger
    let thresholdValue = 10
    if ('threshold' in trigger) thresholdValue = trigger.threshold
    if ('thresholdSeconds' in trigger) thresholdValue = trigger.thresholdSeconds

    editForm.value = {
      name: rule.name,
      category: rule.category,
      triggerType: trigger.type,
      triggerThreshold: thresholdValue,
      scope: rule.scope,
      fireOnce: rule.fireOnce,
      repeatIntervalSeconds: rule.repeatIntervalSeconds ?? 30,
      effects: structuredClone(rule.effects),
      isPreset: rule.isPreset,
    }
  } else {
    editForm.value = {
      name: '',
      category: 'life',
      triggerType: 'life_below',
      triggerThreshold: 10,
      scope: 'per_player',
      fireOnce: true,
      repeatIntervalSeconds: 30,
      effects: [],
      isPreset: false,
    }
  }
  isAddingEffect.value = false
}, { immediate: true })

// ─── Effect helpers ──────────────────────────────────────────────────

function getEffectLabel(effect: BehaviorRuleEffect): string {
  const effectTypeLabels: Record<BehaviorRuleEffect['type'], string> = {
    play_sound: t('rules.effects.playSound'),
    haptic_buzz: t('rules.effects.hapticBuzz'),
    visual_flash: t('rules.effects.visualFlash'),
    overtime_display: t('rules.effects.overtimeDisplay'),
    modify_life: t('rules.effects.modifyLife'),
    modify_counter: t('rules.effects.modifyCounter'),
    announce_text: t('rules.effects.announceText'),
  }
  return effectTypeLabels[effect.type] ?? effect.type
}

function getEffectDetail(effect: BehaviorRuleEffect): string {
  switch (effect.type) {
    case 'play_sound':
      return effect.soundName === 'warning' ? t('rules.soundWarning') : t('rules.soundUrgent')
    case 'haptic_buzz':
      return effect.pattern === 'single' ? t('rules.hapticSingle') : t('rules.hapticRepeated')
    case 'visual_flash':
      if (effect.target === 'affected_player') return t('rules.flashAffectedPlayer')
      if (effect.target === 'all_players') return t('rules.flashAllPlayers')
      return t('rules.flashTimerZone')
    case 'modify_life':
      return `${effect.amount > 0 ? '+' : ''}${effect.amount}`
    case 'modify_counter':
      return `${effect.counterType}: ${effect.amount > 0 ? '+' : ''}${effect.amount}`
    case 'announce_text':
      return effect.messageKey
    case 'overtime_display':
      return ''
    default:
      return ''
  }
}

function removeEffect(index: number) {
  editForm.value.effects.splice(index, 1)
}

function confirmAddEffect() {
  let newEffect: BehaviorRuleEffect

  switch (newEffectType.value) {
    case 'play_sound':
      newEffect = { type: 'play_sound', soundName: newEffectSoundName.value } satisfies PlaySoundEffect
      break
    case 'haptic_buzz':
      newEffect = { type: 'haptic_buzz', pattern: newEffectHapticPattern.value } satisfies HapticBuzzEffect
      break
    case 'visual_flash':
      newEffect = { type: 'visual_flash', target: newEffectFlashTarget.value } satisfies VisualFlashEffect
      break
    case 'overtime_display':
      newEffect = { type: 'overtime_display' }
      break
    case 'modify_life':
      newEffect = { type: 'modify_life', amount: newEffectAmount.value } satisfies ModifyLifeEffect
      break
    case 'modify_counter':
      newEffect = {
        type: 'modify_counter',
        counterType: newEffectCounterType.value,
        amount: newEffectAmount.value,
      } satisfies ModifyCounterEffect
      break
    case 'announce_text':
      newEffect = { type: 'announce_text', messageKey: newEffectMessageKey.value } satisfies AnnounceTextEffect
      break
    default:
      return
  }

  editForm.value.effects.push(newEffect)
  isAddingEffect.value = false
}

// ─── Build trigger from form state ───────────────────────────────────
function buildTrigger(): BehaviorRuleTrigger {
  const triggerType = editForm.value.triggerType
  const threshold = editForm.value.triggerThreshold

  switch (triggerType) {
    case 'life_below':
      return { type: 'life_below', threshold }
    case 'life_exact':
      return { type: 'life_exact', threshold }
    case 'poison_above':
      return { type: 'poison_above', threshold }
    case 'commander_damage_above':
      return { type: 'commander_damage_above', threshold }
    case 'turn_timer_remaining':
      return { type: 'turn_timer_remaining', thresholdSeconds: threshold }
    case 'turn_timer_expired':
      return { type: 'turn_timer_expired' }
    case 'turn_timer_overtime':
      return { type: 'turn_timer_overtime', thresholdSeconds: threshold }
    case 'game_time_exceeded':
      return { type: 'game_time_exceeded', thresholdSeconds: threshold }
    case 'player_death':
      return { type: 'player_death' }
    default:
      return { type: 'life_below', threshold }
  }
}

// ─── Save handler ────────────────────────────────────────────────────
function handleSave() {
  const builtRule: BehaviorRule = {
    id: props.rule?.id ?? crypto.randomUUID(),
    name: editForm.value.name || t('rules.editor.createTitle'),
    trigger: buildTrigger(),
    effects: structuredClone(editForm.value.effects),
    scope: editForm.value.scope,
    fireOnce: editForm.value.fireOnce,
    repeatIntervalSeconds: editForm.value.fireOnce ? undefined : editForm.value.repeatIntervalSeconds,
    category: editForm.value.category,
    isPreset: editForm.value.isPreset,
  }
  emit('save', builtRule)
}
</script>
