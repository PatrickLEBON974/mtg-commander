<template>
  <ion-page class="app-screen">
    <SanctumHeader
      :title="t('multiplayer.title')"
      :eyebrow="t('multiplayer.headerEyebrow')"
      :badge="t('multiplayer.onlineBadge')"
      back-href="/home"
      :back-label="t('common.back')"
    />

    <ion-content class="sanctum-content multiplayer-sanctum-content ion-padding">
      <ion-item
        v-if="multiplayerStore.connectionError || (multiplayerStore.isMultiplayer && !multiplayerStore.isConnected)"
        lines="none"
        class="connection-banner ion-margin-horizontal ion-margin-bottom"
        :color="multiplayerStore.connectionState === 'offline' ? 'warning' : 'danger'"
      >
        <ion-icon
          :icon="multiplayerStore.connectionState === 'offline' ? cloudOfflineOutline : alertCircleOutline"
          slot="start"
        />
        <ion-label class="ion-text-wrap">
          <h3>{{ connectionStatusLabel }}</h3>
          <p v-if="multiplayerStore.connectionError">{{ multiplayerStore.connectionError }}</p>
        </ion-label>
        <ion-button
          v-if="multiplayerStore.errorState?.recoverable || multiplayerStore.connectionState === 'offline'"
          slot="end"
          fill="clear"
          :disabled="multiplayerStore.isConnecting"
          @click="retryConnection"
        >
          <ion-icon :icon="refreshOutline" slot="start" />
          {{ t('common.retry') }}
        </ion-button>
      </ion-item>

      <section
        v-if="multiplayerStore.isAwaitingApproval"
        class="multiplayer-layout approval-wait"
        aria-live="polite"
        data-animate
      >
        <div class="approval-wait__sigil" aria-hidden="true">
          <ion-icon :icon="shieldCheckmarkOutline" />
        </div>
        <ion-spinner name="crescent" color="primary" />
        <h1>{{ t('multiplayer.waitingApprovalTitle') }}</h1>
        <p>{{ t('multiplayer.waitingApprovalDescription') }}</p>
        <code v-if="multiplayerStore.roomCode" class="room-code-chip">
          {{ multiplayerStore.roomCode }}
        </code>
        <ion-button fill="outline" color="medium" @click="cancelPendingRequest">
          <ion-icon :icon="closeCircleOutline" slot="start" />
          {{ t('multiplayer.cancelJoinRequest') }}
        </ion-button>
      </section>

      <!-- Not in a room: show create/join -->
      <div v-else-if="!multiplayerStore.isMultiplayer" class="multiplayer-layout multiplayer-layout--setup">
        <!-- Local player setup -->
        <ion-list :inset="true" data-animate>
          <ion-list-header>
            <ion-label>{{ t('multiplayer.localPlayers') }}</ion-label>
          </ion-list-header>

          <ion-item lines="inset">
            <ion-icon :icon="phonePortraitOutline" slot="start" color="medium" />
            <ion-label>{{ t('multiplayer.count') }}</ion-label>
            <ion-select v-model="localPlayerCount" interface="action-sheet">
              <ion-select-option :value="1">1</ion-select-option>
              <ion-select-option :value="2">2</ion-select-option>
              <ion-select-option :value="3">3</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item v-for="(_, index) in localPlayerCount" :key="index" :lines="index === localPlayerCount - 1 ? 'none' : 'inset'">
            <ion-icon :icon="personOutline" slot="start" color="tertiary" />
            <ion-input
              v-model="localPlayerNames[index]"
              :label="localPlayerCount > 1 ? t('multiplayer.playerN', { n: index + 1 }) : t('multiplayer.yourName')"
              label-placement="floating"
              :placeholder="t('multiplayer.playerN', { n: index + 1 })"
              :maxlength="PLAYER_NAME_MAX_LENGTH"
            />
          </ion-item>
        </ion-list>

        <!-- Create room -->
        <ion-list :inset="true" data-animate>
          <ion-list-header>
            <ion-label>{{ t('multiplayer.createGame') }}</ion-label>
          </ion-list-header>

          <ion-item lines="inset">
            <ion-icon :icon="peopleOutline" slot="start" color="tertiary" />
            <ion-label>{{ t('multiplayer.totalPlayers') }}</ion-label>
            <ion-select v-model="totalPlayerCount" interface="action-sheet">
              <ion-select-option :value="2">2</ion-select-option>
              <ion-select-option :value="3">3</ion-select-option>
              <ion-select-option :value="4">4</ion-select-option>
              <ion-select-option :value="5">5</ion-select-option>
              <ion-select-option :value="6">6</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item lines="none">
            <ion-button
              expand="block"
              :disabled="!canCreateRoom || multiplayerStore.isConnecting"
              :aria-busy="setupOperation === 'create'"
              @click="createNewRoom"
              class="ion-margin-vertical"
              style="width: 100%"
            >
              <ion-spinner v-if="setupOperation === 'create'" name="crescent" slot="start" />
              <ion-icon v-else :icon="addCircleOutline" slot="start" />
              {{ setupOperation === 'create' ? t('multiplayer.creatingRoom') : t('multiplayer.createRoom') }}
            </ion-button>
          </ion-item>
        </ion-list>

        <!-- Join room -->
        <ion-list :inset="true" data-animate>
          <ion-list-header>
            <ion-label>{{ t('multiplayer.joinGame') }}</ion-label>
          </ion-list-header>

          <ion-item lines="inset">
            <ion-icon :icon="keyOutline" slot="start" color="warning" />
            <ion-input
              v-model="joinRoomCode"
              :label="t('multiplayer.roomCode')"
              label-placement="floating"
              :placeholder="t('multiplayer.roomCodePlaceholder')"
              :maxlength="ROOM_CODE_LENGTH"
              autocomplete="off"
              autocapitalize="characters"
              :spellcheck="false"
              class="room-code-input"
              @ion-input="normalizeRoomCodeInput"
            />
          </ion-item>

          <ion-item lines="none" class="room-code-help">
            <ion-icon :icon="shieldCheckmarkOutline" slot="start" color="success" />
            <ion-label class="ion-text-wrap">
              <p>{{ t('multiplayer.roomCodeHelp') }}</p>
            </ion-label>
          </ion-item>

          <ion-item lines="none">
            <ion-button
              expand="block"
              fill="clear"
              :disabled="scanningQrCode || multiplayerStore.isConnecting"
              :aria-busy="scanningQrCode"
              class="scan-qr-button"
              @click="scanRoomQrCode"
            >
              <ion-spinner v-if="scanningQrCode" name="crescent" slot="start" />
              <ion-icon v-else :icon="qrCodeOutline" slot="start" />
              {{ scanningQrCode ? t('multiplayer.scanningQrCode') : t('multiplayer.scanQrCode') }}
            </ion-button>
          </ion-item>

          <p
            v-if="scanFeedback"
            class="scan-feedback"
            :class="{ 'scan-feedback--error': scanFeedback.isError }"
            role="status"
          >
            {{ t(scanFeedback.key) }}
          </p>

          <ion-item lines="none">
            <ion-button
              expand="block"
              fill="outline"
              :disabled="!canJoinRoom || multiplayerStore.isConnecting"
              :aria-busy="setupOperation === 'join'"
              @click="joinExisting"
              class="ion-margin-vertical"
              style="width: 100%"
            >
              <ion-spinner v-if="setupOperation === 'join'" name="crescent" slot="start" />
              <ion-icon v-else :icon="enterOutline" slot="start" />
              {{ setupOperation === 'join' ? t('multiplayer.requestingAccess') : t('multiplayer.join') }}
            </ion-button>
          </ion-item>
        </ion-list>

      </div>

      <!-- In a room: show lobby -->
      <div v-else class="multiplayer-layout multiplayer-layout--lobby">
        <div class="lobby-toolbar" data-animate>
          <div class="lobby-toolbar__room">
            <span>{{ t('multiplayer.roomCode') }}</span>
            <code>{{ multiplayerStore.roomCode }}</code>
          </div>
          <ion-button
            fill="outline"
            color="danger"
            size="small"
            :disabled="leavingRoom || multiplayerStore.isConnecting"
            :aria-busy="leavingRoom"
            @click="confirmLeaveRoom"
          >
            <ion-spinner v-if="leavingRoom" name="crescent" slot="start" />
            <ion-icon v-else :icon="exitOutline" slot="start" />
            {{ t('multiplayer.leaveRoom') }}
          </ion-button>
        </div>

        <section
          v-if="multiplayerStore.isHost"
          class="secure-panel"
          data-animate
        >
          <div class="secure-panel__heading">
            <span class="secure-panel__icon" aria-hidden="true">
              <ion-icon :icon="qrCodeOutline" />
            </span>
            <div>
              <p class="secure-panel__eyebrow">{{ t('multiplayer.roomCode') }}</p>
              <h2>{{ t('multiplayer.inviteTitle') }}</h2>
            </div>
          </div>
          <p class="secure-panel__description">{{ t('multiplayer.inviteDescription') }}</p>
          <div class="room-invite-grid">
            <div class="room-code-display">
              <span>{{ t('multiplayer.roomCode') }}</span>
              <code>{{ multiplayerStore.roomCode }}</code>
              <p>{{ t('multiplayer.hostApprovalReminder') }}</p>
            </div>
            <div
              v-if="roomJoinLink"
              class="room-qr-code"
              role="img"
              :aria-label="t('multiplayer.qrCodeAriaLabel', { code: multiplayerStore.roomCode })"
            >
              <QrcodeSvg
                :value="roomJoinLink"
                :size="208"
                level="M"
                :margin="2"
                background="#ffffff"
                foreground="#07110d"
              />
              <span>{{ t('multiplayer.scanToJoin') }}</span>
            </div>
          </div>
          <div class="secure-panel__actions">
            <ion-button
              fill="outline"
              :disabled="!multiplayerStore.roomCode"
              @click="copyRoomCode"
            >
              <ion-icon :icon="roomCodeCopied ? checkmarkCircleOutline : copyOutline" slot="start" />
              {{ roomCodeCopied ? t('multiplayer.roomCodeCopied') : t('multiplayer.copyRoomCode') }}
            </ion-button>
            <ion-button
              :disabled="!multiplayerStore.roomCode"
              @click="shareRoomCode"
            >
              <ion-icon :icon="shareSocialOutline" slot="start" />
              {{ t('multiplayer.shareRoomCode') }}
            </ion-button>
          </div>
          <p
            v-if="shareFeedback"
            class="share-feedback"
            :class="{ 'share-feedback--error': shareFeedback.isError }"
            role="status"
          >
            {{ t(shareFeedback.key) }}
          </p>
        </section>

        <div v-else class="room-identity" data-animate>
          <ion-icon :icon="shieldCheckmarkOutline" color="success" />
          <div>
            <span>{{ t('multiplayer.roomCode') }}</span>
            <strong>{{ multiplayerStore.roomCode }}</strong>
          </div>
        </div>

        <ion-list
          v-if="multiplayerStore.isHost && multiplayerStore.pendingJoinRequests.length > 0"
          :inset="true"
          class="admission-list"
          data-animate
        >
          <ion-list-header>
            <ion-label>
              {{ t('multiplayer.admissionRequests', { count: multiplayerStore.pendingJoinRequests.length }) }}
            </ion-label>
          </ion-list-header>
          <ion-item
            v-for="request in multiplayerStore.pendingJoinRequests"
            :key="request.uid"
            lines="inset"
          >
            <ion-icon :icon="personAddOutline" slot="start" color="warning" />
            <ion-label class="ion-text-wrap">
              <h2>{{ request.playerNames.join(', ') }}</h2>
              <p>{{ t('multiplayer.requestedPlayers', request.playerNames.length) }}</p>
            </ion-label>
            <div slot="end" class="admission-actions">
              <ion-button
                size="small"
                color="success"
                :disabled="admissionBusyUid !== null"
                :aria-label="`${t('multiplayer.approveRequest')} ${request.playerNames.join(', ')}`"
                @click="approveRequest(request.uid)"
              >
                <ion-spinner v-if="admissionBusyUid === request.uid" name="crescent" />
                <ion-icon v-else :icon="checkmarkCircleOutline" />
              </ion-button>
              <ion-button
                size="small"
                fill="outline"
                color="danger"
                :disabled="admissionBusyUid !== null"
                :aria-label="`${t('multiplayer.rejectRequest')} ${request.playerNames.join(', ')}`"
                @click="rejectRequest(request.uid)"
              >
                <ion-icon :icon="closeCircleOutline" />
              </ion-button>
            </div>
          </ion-item>
        </ion-list>

        <!-- Connected players -->
        <ion-list :inset="true" data-animate>
          <ion-list-header>
            <ion-label>
              {{ t('multiplayer.playersList', { count: multiplayerStore.connectedPlayerCount, total: multiplayerStore.roomData?.settings.playerCount }) }}
            </ion-label>
          </ion-list-header>

          <ion-item
            v-for="(player, index) in multiplayerStore.allPlayers"
            :key="player.id"
            :lines="index === multiplayerStore.allPlayers.length - 1 ? 'none' : 'inset'"
          >
            <ion-icon
              :icon="player.connected ? radioButtonOnOutline : radioButtonOffOutline"
              slot="start"
              :color="player.connected ? 'success' : 'danger'"
            />
            <ion-label>
              <h2>
                {{ player.name }}
                <ion-text v-if="multiplayerStore.isLocalPlayer(player.id)" color="medium"> {{ t('multiplayer.you') }}</ion-text>
              </h2>
              <p v-if="player.ownerUid === multiplayerStore.roomData?.hostUid">{{ t('multiplayer.host') }}</p>
            </ion-label>
            <ion-note slot="end" :color="player.connected ? 'success' : 'danger'">
              {{ player.connected ? t('multiplayer.connected') : t('multiplayer.disconnected') }}
            </ion-note>
          </ion-item>
        </ion-list>

        <!-- Start game (host only) -->
        <div class="ion-padding-horizontal">
          <ion-button
            v-if="multiplayerStore.isHost"
            expand="block"
            color="primary"
            size="large"
            :disabled="!multiplayerStore.isRoomReady || !multiplayerStore.isConnected || multiplayerStore.isConnecting"
            @click="startMultiplayerGame"
          >
            <ion-icon :icon="playOutline" slot="start" />
            {{ t('multiplayer.startGame', { count: multiplayerStore.connectedPlayerCount }) }}
          </ion-button>

          <p
            v-if="multiplayerStore.isHost && multiplayerStore.pendingJoinRequests.length > 0"
            class="pending-start-note ion-text-center"
          >
            {{ t('multiplayer.resolveRequestsBeforeStart') }}
          </p>

          <p v-if="!multiplayerStore.isHost" class="ion-text-center ion-padding" style="color: var(--ion-color-medium); font-size: 14px;">
            {{ t('multiplayer.waitingForHost') }}
          </p>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Capacitor } from '@capacitor/core'
import { QrcodeSvg } from 'qrcode.vue'
import {
  IonPage,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonInput,
  IonLabel,
  IonNote,
  IonText,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonSpinner,
  alertController,
} from '@ionic/vue'
import {
  phonePortraitOutline,
  personOutline,
  peopleOutline,
  addCircleOutline,
  keyOutline,
  enterOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  copyOutline,
  radioButtonOnOutline,
  radioButtonOffOutline,
  playOutline,
  exitOutline,
  cloudOfflineOutline,
  refreshOutline,
  qrCodeOutline,
  shareSocialOutline,
  shieldCheckmarkOutline,
  personAddOutline,
} from 'ionicons/icons'
import { useMultiplayerStore } from '@/stores/multiplayerStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { usePageEnterAnimation } from '@/composables/usePageEnterAnimation'
import { normalizeRoomCode } from '@/services/firebase'
import { createRoomJoinLink, parseRoomJoinPayload } from '@/services/roomJoinLink'
import { PLAYER_NAME_MAX_LENGTH, ROOM_CODE_LENGTH } from '@/config/gameConstants'
import SanctumHeader from '@/components/ui/SanctumHeader.vue'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const multiplayerStore = useMultiplayerStore()
const settingsStore = useSettingsStore()

usePageEnterAnimation()

const localPlayerCount = ref(1)
const localPlayerNames = ref<string[]>([t('multiplayer.playerN', { n: 1 })])
const joinRoomCode = ref('')
const totalPlayerCount = ref(settingsStore.gameSettings.playerCount)
const admissionBusyUid = ref<string | null>(null)
const scanningQrCode = ref(false)
const roomCodeCopied = ref(false)
const leavingRoom = ref(false)
const scanFeedback = ref<{ key: string; isError: boolean } | null>(null)
const shareFeedback = ref<{ key: string; isError: boolean } | null>(null)
const setupOperation = ref<'create' | 'join' | null>(null)
let scanFeedbackTimer: ReturnType<typeof setTimeout> | null = null
let shareFeedbackTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => route.query.code,
  (routeCode) => {
    if (typeof routeCode !== 'string') return
    try {
      joinRoomCode.value = normalizeRoomCode(routeCode)
    } catch {
      // Invalid external links never trigger a room request.
    }
  },
  { immediate: true },
)

// Keep names array in sync with count
watch(localPlayerCount, (newCount) => {
  while (localPlayerNames.value.length < newCount) {
    localPlayerNames.value.push(t('multiplayer.playerN', { n: localPlayerNames.value.length + 1 }))
  }
  localPlayerNames.value.length = newCount
})

const validPlayerNames = computed(() =>
  localPlayerNames.value.slice(0, localPlayerCount.value).filter((n) => n.trim()),
)

const canSubmit = computed(() => validPlayerNames.value.length === localPlayerCount.value)
const canCreateRoom = computed(() => canSubmit.value && localPlayerCount.value <= totalPlayerCount.value)
const canJoinRoom = computed(() => {
  if (!canSubmit.value) return false
  try {
    normalizeRoomCode(joinRoomCode.value)
    return true
  } catch {
    return false
  }
})
const roomJoinLink = computed(() => {
  if (!multiplayerStore.roomCode) return ''
  try {
    return createRoomJoinLink(multiplayerStore.roomCode)
  } catch {
    return ''
  }
})
const connectionStatusLabel = computed(() => {
  if (multiplayerStore.errorState) {
    return t('multiplayer.connectionStates.error')
  }
  const key = `multiplayer.connectionStates.${multiplayerStore.connectionState}`
  return t(key)
})

async function createNewRoom() {
  if (setupOperation.value !== null) return
  setupOperation.value = 'create'
  try {
    await multiplayerStore.hostRoom(validPlayerNames.value, {
      startingLife: settingsStore.gameSettings.startingLife,
      commanderDamageThreshold: settingsStore.gameSettings.commanderDamageThreshold,
      poisonThreshold: settingsStore.gameSettings.poisonThreshold,
      playerCount: totalPlayerCount.value,
      enableTimer: settingsStore.gameSettings.enableTimer,
      timerMode: settingsStore.gameSettings.timerMode,
      turnTimerSeconds: settingsStore.gameSettings.turnTimerSeconds,
      chessGameDurationMinutes: settingsStore.gameSettings.chessGameDurationMinutes,
      chessExpectedRounds: settingsStore.gameSettings.chessExpectedRounds,
      hourglassEnabled: settingsStore.gameSettings.hourglassEnabled,
      hourglassMode: settingsStore.gameSettings.hourglassMode,
      hourglassGracePeriodSeconds: settingsStore.gameSettings.hourglassGracePeriodSeconds,
      hourglassLossThreshold: settingsStore.gameSettings.hourglassLossThreshold,
      hourglassTimeBankCapEnabled: settingsStore.gameSettings.hourglassTimeBankCapEnabled,
      hourglassTimeBankCapSeconds: settingsStore.gameSettings.hourglassTimeBankCapSeconds,
    })
  } catch {
    // Error is already in store
  } finally {
    setupOperation.value = null
  }
}

async function joinExisting() {
  if (setupOperation.value !== null) return
  setupOperation.value = 'join'
  try {
    await multiplayerStore.joinExistingRoom(
      normalizeRoomCode(joinRoomCode.value),
      validPlayerNames.value,
    )
  } catch {
    // Error is already in store
  } finally {
    setupOperation.value = null
  }
}

function normalizeRoomCodeInput(event: CustomEvent<{ value?: string | null }>) {
  joinRoomCode.value = (event.detail.value ?? '')
    .replace(/[^a-z]/gi, '')
    .toUpperCase()
    .slice(0, ROOM_CODE_LENGTH)
}

function showScanFeedback(key: string, isError = false) {
  if (scanFeedbackTimer !== null) clearTimeout(scanFeedbackTimer)
  scanFeedback.value = { key, isError }
  scanFeedbackTimer = setTimeout(() => {
    scanFeedback.value = null
    scanFeedbackTimer = null
  }, 3_000)
}

function showShareFeedback(key: string, isError = false) {
  if (shareFeedbackTimer !== null) clearTimeout(shareFeedbackTimer)
  shareFeedback.value = { key, isError }
  shareFeedbackTimer = setTimeout(() => {
    shareFeedback.value = null
    shareFeedbackTimer = null
  }, 3_000)
}

function webRoomJoinLink(code: string): string {
  if (typeof window === 'undefined') return createRoomJoinLink(code)
  const resolvedPath = router.resolve('/multiplayer').href
  const url = new URL(resolvedPath, window.location.origin)
  url.searchParams.set('code', normalizeRoomCode(code))
  return url.toString()
}

async function scanRoomQrCode() {
  if (scanningQrCode.value || setupOperation.value !== null) return
  scanningQrCode.value = true
  scanFeedback.value = null
  try {
    const {
      CapacitorBarcodeScanner,
      CapacitorBarcodeScannerAndroidScanningLibrary,
      CapacitorBarcodeScannerCameraDirection,
      CapacitorBarcodeScannerScanOrientation,
      CapacitorBarcodeScannerTypeHint,
    } = await import('@capacitor/barcode-scanner')
    const result = await CapacitorBarcodeScanner.scanBarcode({
      hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
      scanInstructions: t('multiplayer.qrScannerInstructions'),
      scanButton: false,
      cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
      scanOrientation: CapacitorBarcodeScannerScanOrientation.ADAPTIVE,
      cancelButtonAccessibilityLabel: t('common.cancel'),
      torchButtonOnAccessibilityLabel: t('multiplayer.turnTorchOff'),
      torchButtonOffAccessibilityLabel: t('multiplayer.turnTorchOn'),
      android: {
        scanningLibrary: CapacitorBarcodeScannerAndroidScanningLibrary.ZXING,
      },
      web: {
        showCameraSelection: true,
        scannerFPS: 15,
      },
    })
    try {
      joinRoomCode.value = parseRoomJoinPayload(result.ScanResult)
      showScanFeedback('multiplayer.qrCodeScanned')
    } catch {
      showScanFeedback('multiplayer.errors.invalidQrCode', true)
    }
  } catch (error) {
    if (!String(error).toLowerCase().includes('cancel')) {
      showScanFeedback('multiplayer.errors.qrScanFailed', true)
    }
  } finally {
    scanningQrCode.value = false
  }
}

async function copyRoomCode() {
  const code = multiplayerStore.roomCode
  if (!code) return
  try {
    await navigator.clipboard.writeText(code)
    roomCodeCopied.value = true
    showShareFeedback('multiplayer.roomCodeCopied')
  } catch {
    showShareFeedback('multiplayer.errors.copyRoomCodeFailed', true)
  }
}

async function shareRoomCode() {
  const code = multiplayerStore.roomCode
  if (!code) return
  try {
    const { Share } = await import('@capacitor/share')
    const canShare = await Share.canShare()
    if (!canShare.value) {
      await copyRoomCode()
      return
    }
    const native = Capacitor.isNativePlatform()
    const text = t('multiplayer.shareRoomCodeText', { code })
    await Share.share({
      title: t('multiplayer.inviteTitle'),
      text: native ? `${text}\n${createRoomJoinLink(code)}` : text,
      url: native ? undefined : webRoomJoinLink(code),
      dialogTitle: t('multiplayer.shareRoomCode'),
    })
  } catch (error) {
    if (String(error).toLowerCase().includes('cancel')) return
    showShareFeedback('multiplayer.errors.shareRoomCodeFailed', true)
  }
}

async function approveRequest(uid: string) {
  admissionBusyUid.value = uid
  try {
    await multiplayerStore.approveAdmission(uid)
  } catch {
    // Error is already in store.
  } finally {
    admissionBusyUid.value = null
  }
}

async function rejectRequest(uid: string) {
  admissionBusyUid.value = uid
  try {
    await multiplayerStore.rejectAdmission(uid)
  } catch {
    // Error is already in store.
  } finally {
    admissionBusyUid.value = null
  }
}

async function cancelPendingRequest() {
  try {
    await multiplayerStore.cancelPendingJoin()
  } catch {
    // Error is already in store.
  }
}

async function startMultiplayerGame() {
  try {
    await multiplayerStore.startGame()
    await router.push('/game')
  } catch {
    // The store exposes the localized error in the connection banner.
  }
}

async function confirmLeaveRoom() {
  if (leavingRoom.value || !multiplayerStore.isMultiplayer) return
  const hostIsLeaving = multiplayerStore.isHost
  const alert = await alertController.create({
    header: t(hostIsLeaving ? 'multiplayer.closeRoomTitle' : 'multiplayer.leaveRoomTitle'),
    message: t(
      hostIsLeaving ? 'multiplayer.closeRoomConfirm' : 'multiplayer.leaveRoomConfirm',
      { code: multiplayerStore.roomCode ?? '' },
    ),
    buttons: [
      { text: t('common.cancel'), role: 'cancel' },
      {
        text: t(hostIsLeaving ? 'multiplayer.closeRoom' : 'multiplayer.leaveRoom'),
        role: 'destructive',
      },
    ],
  })
  await alert.present()
  const { role } = await alert.onDidDismiss()
  if (role !== 'destructive') return

  leavingRoom.value = true
  try {
    await multiplayerStore.disconnect()
  } catch {
    // Recoverable leave errors keep the session available for a safe retry.
  } finally {
    leavingRoom.value = false
  }
}

async function retryConnection() {
  await multiplayerStore.retryConnection()
}

onScopeDispose(() => {
  if (scanFeedbackTimer !== null) clearTimeout(scanFeedbackTimer)
  if (shareFeedbackTimer !== null) clearTimeout(shareFeedbackTimer)
})
</script>

<style scoped>
.multiplayer-sanctum-content {
  --padding-start: max(16px, var(--ion-safe-area-left, 0px));
  --padding-end: max(16px, var(--ion-safe-area-right, 0px));
  --padding-top: 8px;
  --padding-bottom: calc(28px + var(--app-safe-bottom));
}

.multiplayer-sanctum-content ion-list-header ion-label::before {
  content: '◆';
  margin-right: 8px;
  color: rgba(216, 171, 79, 0.55);
  font-size: 7px;
  vertical-align: 1px;
}

.multiplayer-layout {
  width: min(100%, 900px);
  margin: 0 auto;
}

.connection-banner {
  overflow: hidden;
  border-radius: 12px;
}

.connection-banner[color='danger'] ion-label p {
  color: var(--ion-color-danger-contrast, #fff) !important;
  opacity: 0.88;
}

.connection-banner[color='warning'] ion-label p {
  color: var(--ion-color-warning-contrast, #000) !important;
  opacity: 0.82;
}

.approval-wait {
  min-height: min(66vh, 560px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 36px 24px;
  text-align: center;
}

.approval-wait__sigil,
.secure-panel__icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border: 1px solid rgba(82, 196, 132, 0.35);
  border-radius: 18px;
  color: var(--ion-color-success);
  background: rgba(82, 196, 132, 0.1);
  box-shadow: 0 0 32px rgba(82, 196, 132, 0.12);
}

.approval-wait__sigil ion-icon,
.secure-panel__icon ion-icon {
  font-size: 30px;
}

.approval-wait h1 {
  margin: 4px 0 0;
  font-family: var(--font-display, inherit);
  font-size: clamp(1.65rem, 5vw, 2.2rem);
}

.approval-wait p {
  max-width: 520px;
  margin: 0;
  color: var(--ion-color-medium);
  line-height: 1.55;
}

.room-code-chip {
  padding: 9px 14px;
  border: 1px solid rgba(216, 171, 79, 0.28);
  border-radius: 999px;
  color: var(--ion-color-primary);
  background: rgba(216, 171, 79, 0.08);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.22em;
}

.room-code-help {
  --min-height: 42px;
}

.room-code-input {
  font-weight: 750;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.scan-qr-button {
  width: 100%;
  margin-block: 2px;
}

.scan-feedback {
  margin: 0;
  padding: 0 18px 12px;
  color: var(--ion-color-success);
  font-size: 0.82rem;
  text-align: center;
}

.scan-feedback--error {
  color: var(--ion-color-danger);
}

.lobby-toolbar {
  position: sticky;
  top: 8px;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 58px;
  margin: 8px 16px 0;
  padding: 7px 8px 7px 15px;
  border: 1px solid rgba(216, 171, 79, 0.22);
  border-radius: 15px;
  background: rgba(9, 15, 17, 0.92);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(18px);
}

.lobby-toolbar__room {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.lobby-toolbar__room span {
  overflow: hidden;
  color: var(--ion-color-medium);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.lobby-toolbar__room code {
  overflow: hidden;
  color: var(--ion-color-primary);
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-overflow: ellipsis;
}

.lobby-toolbar ion-button {
  flex: 0 0 auto;
  margin: 0;
}

.secure-panel {
  margin: 16px;
  padding: clamp(18px, 4vw, 28px);
  overflow: hidden;
  border: 1px solid rgba(216, 171, 79, 0.24);
  border-radius: 18px;
  background:
    radial-gradient(circle at 90% 0%, rgba(82, 196, 132, 0.11), transparent 38%),
    linear-gradient(145deg, rgba(216, 171, 79, 0.08), rgba(15, 18, 24, 0.7));
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.2);
}

.secure-panel__heading {
  display: flex;
  align-items: center;
  gap: 14px;
}

.secure-panel__heading h2 {
  margin: 3px 0 0;
  font-family: var(--font-display, inherit);
  font-size: clamp(1.2rem, 4vw, 1.55rem);
}

.secure-panel__eyebrow,
.room-code-display span,
.room-identity span {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.secure-panel__description {
  margin: 18px 0;
  color: var(--ion-color-medium);
  line-height: 1.5;
}

.room-invite-grid {
  display: grid;
  gap: 16px;
  align-items: stretch;
}

.room-code-display {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  min-width: 0;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.22);
}

.room-code-display code {
  color: var(--ion-color-primary);
  font-size: clamp(2rem, 12vw, 3rem);
  font-weight: 800;
  letter-spacing: 0.18em;
  line-height: 1.5;
}

.room-code-display p {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.86rem;
  line-height: 1.5;
}

.room-qr-code {
  display: grid;
  place-items: center;
  gap: 10px;
  width: fit-content;
  max-width: 100%;
  margin-inline: auto;
  padding: 12px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
}

.room-qr-code :deep(svg) {
  display: block;
  width: min(208px, 62vw);
  height: auto;
}

.room-qr-code span {
  color: #25322d;
  font-size: 0.76rem;
  font-weight: 750;
  letter-spacing: 0.03em;
  text-align: center;
}

.secure-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.secure-panel__actions ion-button {
  margin: 0;
}

.share-feedback {
  margin: 12px 0 0;
  color: var(--ion-color-success);
  font-size: 0.82rem;
}

.share-feedback--error {
  color: var(--ion-color-danger);
}

.room-identity {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 28px 16px 18px;
}

.room-identity > ion-icon {
  font-size: 34px;
}

.room-identity div {
  display: grid;
  gap: 3px;
}

.room-identity strong {
  color: var(--ion-color-primary);
  font-size: 1.55rem;
  letter-spacing: 0.18em;
}

.admission-list {
  border: 1px solid rgba(255, 196, 77, 0.18);
}

.admission-actions {
  display: flex;
  gap: 4px;
}

.admission-actions ion-button {
  --padding-start: 10px;
  --padding-end: 10px;
}

.pending-start-note {
  margin: 10px auto 0;
  max-width: 520px;
  color: var(--ion-color-warning);
  font-size: 0.84rem;
  line-height: 1.45;
}

@media (min-width: 700px) {
  .multiplayer-sanctum-content {
    --padding-top: 20px;
    --padding-start: max(24px, var(--ion-safe-area-left, 0px));
    --padding-end: max(24px, var(--ion-safe-area-right, 0px));
  }

  .multiplayer-layout--setup {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start;
    gap: 16px;
  }

  .multiplayer-layout--setup > ion-list {
    margin: 0;
  }

  .multiplayer-layout--setup > ion-list:first-of-type,
  .multiplayer-layout--setup > ion-item {
    grid-column: 1 / -1;
  }

  .multiplayer-layout--lobby {
    max-width: 720px;
  }

  .secure-panel {
    margin-inline: 0;
  }

  .lobby-toolbar {
    margin-inline: 0;
  }

  .room-invite-grid {
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
</style>
