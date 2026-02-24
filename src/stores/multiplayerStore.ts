import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  createRoom,
  joinRoom,
  listenToRoom,
  updateGameState,
  updatePartialGameState,
  updatePlayerState,
  leaveRoom,
  deleteRoom,
  type RoomData,
  type SyncedGameState,
  type SyncedPlayerState,
  type Unsubscribe,
} from '@/services/firebase'
import { useGameStore } from './gameStore'
import type { PlayerState } from '@/types/game'
import { MULTIPLAYER_PUSH_DEBOUNCE_MS, PLAYER_NAME_MAX_LENGTH } from '@/config/gameConstants'
import i18n from '@/i18n'

export const useMultiplayerStore = defineStore('multiplayer', () => {
  const isMultiplayer = ref(false)
  const roomCode = ref<string | null>(null)
  const deviceId = ref(getOrCreateDeviceId())
  const localPlayerIds = ref<string[]>([])
  const isHost = ref(false)
  const roomData = ref<RoomData | null>(null)
  const connectionError = ref<string | null>(null)
  const isConnecting = ref(false)

  let unsubscribe: Unsubscribe | null = null
  let pushDebounceTimer: ReturnType<typeof setTimeout> | null = null

  function toSyncedPlayerState(player: PlayerState): SyncedPlayerState {
    return {
      lifeTotal: player.lifeTotal,
      commanderDamageReceived: player.commanderDamageReceived,
      poisonCounters: player.poisonCounters,
      experienceCounters: player.experienceCounters,
      energyCounters: player.energyCounters,
      isMonarch: player.isMonarch,
      hasInitiative: player.hasInitiative,
      commanders: player.commanders,
    }
  }

  const connectedPlayerCount = computed(() => {
    if (!roomData.value) return 0
    return Object.values(roomData.value.players).filter((p) => p.connected).length
  })

  const allPlayers = computed(() => {
    if (!roomData.value) return []
    return Object.values(roomData.value.players)
  })

  const isRoomReady = computed(() => {
    if (!roomData.value) return false
    return connectedPlayerCount.value >= 2
  })

  function isLocalPlayer(playerId: string): boolean {
    return localPlayerIds.value.includes(playerId)
  }

  function getOrCreateDeviceId(): string {
    const stored = localStorage.getItem('mtg_local_player_id')
    if (stored) return stored
    const newId = crypto.randomUUID()
    localStorage.setItem('mtg_local_player_id', newId)
    return newId
  }

  async function hostRoom(playerNames: string[], settings: RoomData['settings']): Promise<string> {
    isConnecting.value = true
    connectionError.value = null

    try {
      const result = await createRoom(deviceId.value, playerNames, settings)

      roomCode.value = result.code
      localPlayerIds.value = result.playerIds
      isHost.value = true
      isMultiplayer.value = true

      await startListening(result.code)

      return result.code
    } catch (error) {
      connectionError.value = error instanceof Error ? error.message : i18n.global.t('multiplayer.connectionError')
      throw error
    } finally {
      isConnecting.value = false
    }
  }

  async function joinExistingRoom(code: string, playerNames: string[]): Promise<void> {
    isConnecting.value = true
    connectionError.value = null

    try {
      const result = await joinRoom(code.toUpperCase(), deviceId.value, playerNames)

      roomCode.value = code.toUpperCase()
      roomData.value = result.roomData
      localPlayerIds.value = result.playerIds
      isHost.value = false
      isMultiplayer.value = true

      await startListening(code.toUpperCase())
    } catch (error) {
      connectionError.value = error instanceof Error ? error.message : i18n.global.t('multiplayer.connectionError')
      throw error
    } finally {
      isConnecting.value = false
    }
  }

  async function startListening(code: string) {
    if (unsubscribe) unsubscribe()

    unsubscribe = await listenToRoom(code, (data) => {
      if (!data) {
        connectionError.value = i18n.global.t('multiplayer.roomClosed')
        disconnect()
        return
      }

      roomData.value = data

      // If game state changed remotely, sync to local gameStore
      if (data.gameState) {
        syncFromRemote(data.gameState)
      }
    })
  }

  function syncFromRemote(remoteState: SyncedGameState) {
    const gameStore = useGameStore()
    if (!gameStore.currentGame) return

    // Update turn info
    gameStore.currentGame.currentTurnPlayerIndex = remoteState.currentTurnPlayerIndex
    gameStore.currentGame.turnNumber = remoteState.turnNumber
    gameStore.currentGame.isRunning = remoteState.isRunning

    // Update each player's state from remote
    for (const player of gameStore.currentGame.players) {
      const remotePlayer = remoteState.players[player.id]
      if (!remotePlayer) continue

      if (isLocalPlayer(player.id)) {
        // For local players, only merge commander damage from remote.
        // A remote device may have dealt commander damage to this local player,
        // so we take the higher value for each damage source (damage only increases).
        const remoteDamage = remotePlayer.commanderDamageReceived ?? {}
        for (const [sourceCommanderId, remoteDamageValue] of Object.entries(remoteDamage)) {
          const localDamageValue = player.commanderDamageReceived[sourceCommanderId] ?? 0
          if (remoteDamageValue > localDamageValue) {
            const damageIncrease = remoteDamageValue - localDamageValue
            player.commanderDamageReceived[sourceCommanderId] = remoteDamageValue
            player.lifeTotal -= damageIncrease
          }
        }
        continue
      }

      // For remote players, accept full state from remote (their device is source of truth)
      player.lifeTotal = Number.isFinite(remotePlayer.lifeTotal) ? remotePlayer.lifeTotal : player.lifeTotal
      player.commanderDamageReceived = remotePlayer.commanderDamageReceived
      player.poisonCounters = Number.isFinite(remotePlayer.poisonCounters) ? Math.max(0, remotePlayer.poisonCounters) : player.poisonCounters
      player.experienceCounters = Number.isFinite(remotePlayer.experienceCounters) ? Math.max(0, remotePlayer.experienceCounters) : player.experienceCounters
      player.energyCounters = Number.isFinite(remotePlayer.energyCounters) ? Math.max(0, remotePlayer.energyCounters) : player.energyCounters
      player.isMonarch = remotePlayer.isMonarch
      player.hasInitiative = remotePlayer.hasInitiative
      player.commanders = remotePlayer.commanders.map((commander) => ({
        ...commander,
        id: commander.id || crypto.randomUUID(),
      }))
    }
  }

  function pushLocalPlayerState() {
    if (!isMultiplayer.value || !roomCode.value) return

    if (pushDebounceTimer) clearTimeout(pushDebounceTimer)
    pushDebounceTimer = setTimeout(() => {
      doPushLocalPlayerState().catch((error) => {
        console.error('[Multiplayer] Failed to push local player state:', error)
      })
    }, MULTIPLAYER_PUSH_DEBOUNCE_MS)
  }

  async function doPushLocalPlayerState() {
    if (!isMultiplayer.value || !roomCode.value) return

    const gameStore = useGameStore()
    if (!gameStore.currentGame) return

    // Push state for ALL local players
    const pushPromises = localPlayerIds.value.map((playerId) => {
      const localPlayer = gameStore.currentGame!.players.find((p) => p.id === playerId)
      if (!localPlayer) return Promise.resolve()

      return updatePlayerState(roomCode.value!, playerId, toSyncedPlayerState(localPlayer))
    })

    await Promise.all(pushPromises)
  }

  /**
   * Push a remote player's state to Firebase after it was locally modified.
   * This is needed when a local action (e.g. commander damage) modifies
   * a player that belongs to another device.
   */
  function pushRemotePlayerState(playerId: string) {
    if (!isMultiplayer.value || !roomCode.value) return

    const gameStore = useGameStore()
    if (!gameStore.currentGame) return

    const player = gameStore.currentGame.players.find((p) => p.id === playerId)
    if (!player) return

    const syncedState = toSyncedPlayerState(player)
    updatePlayerState(roomCode.value, playerId, syncedState).catch((error) => {
      console.error('[Multiplayer] Failed to push remote player state:', error)
    })
  }

  async function pushFullGameState() {
    if (!isMultiplayer.value || !roomCode.value || !isHost.value) return

    const gameStore = useGameStore()
    if (!gameStore.currentGame) return

    const playersState: Record<string, SyncedPlayerState> = {}
    for (const player of gameStore.currentGame.players) {
      playersState[player.id] = toSyncedPlayerState(player)
    }

    const syncedState: SyncedGameState = {
      currentTurnPlayerIndex: gameStore.currentGame.currentTurnPlayerIndex,
      turnNumber: gameStore.currentGame.turnNumber,
      startedAt: gameStore.currentGame.startedAt,
      elapsedMs: gameStore.currentGame.elapsedMs,
      isRunning: gameStore.currentGame.isRunning,
      players: playersState,
    }

    await updateGameState(roomCode.value, syncedState)
  }

  async function pushTurnAdvance() {
    if (!isMultiplayer.value || !roomCode.value) return

    const gameStore = useGameStore()
    if (!gameStore.currentGame) return

    await updatePartialGameState(roomCode.value, {
      currentTurnPlayerIndex: gameStore.currentGame.currentTurnPlayerIndex,
      turnNumber: gameStore.currentGame.turnNumber,
    })
  }

  function createMultiplayerGame(): PlayerState[] {
    if (!roomData.value) return []

    const players = Object.values(roomData.value.players)
    return players.map((roomPlayer) => ({
      id: roomPlayer.id,
      name: roomPlayer.name.slice(0, PLAYER_NAME_MAX_LENGTH),
      color: roomPlayer.color as PlayerState['color'],
      lifeTotal: roomData.value!.settings.startingLife,
      commanders: [],
      commanderDamageReceived: {},
      poisonCounters: 0,
      experienceCounters: 0,
      energyCounters: 0,
      isMonarch: false,
      hasInitiative: false,
    }))
  }

  async function disconnect() {
    if (pushDebounceTimer) {
      clearTimeout(pushDebounceTimer)
      pushDebounceTimer = null
    }

    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }

    if (roomCode.value) {
      if (isHost.value) {
        await deleteRoom(roomCode.value).catch(() => {})
      } else {
        await leaveRoom(roomCode.value, localPlayerIds.value).catch(() => {})
      }
    }

    isMultiplayer.value = false
    roomCode.value = null
    localPlayerIds.value = []
    isHost.value = false
    roomData.value = null
    connectionError.value = null
  }

  return {
    isMultiplayer,
    roomCode,
    localPlayerIds,
    isHost,
    roomData,
    connectionError,
    isConnecting,
    connectedPlayerCount,
    allPlayers,
    isRoomReady,
    isLocalPlayer,
    hostRoom,
    joinExistingRoom,
    pushLocalPlayerState,
    pushRemotePlayerState,
    pushFullGameState,
    pushTurnAdvance,
    createMultiplayerGame,
    disconnect,
  }
})
