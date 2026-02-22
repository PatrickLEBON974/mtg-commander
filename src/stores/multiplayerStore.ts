import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  createRoom,
  joinRoom,
  listenToRoom,
  updateGameState,
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

      startListening(result.code)

      return result.code
    } catch (error) {
      connectionError.value = error instanceof Error ? error.message : 'Erreur de connexion'
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

      startListening(code.toUpperCase())
    } catch (error) {
      connectionError.value = error instanceof Error ? error.message : 'Erreur de connexion'
      throw error
    } finally {
      isConnecting.value = false
    }
  }

  function startListening(code: string) {
    if (unsubscribe) unsubscribe()

    unsubscribe = listenToRoom(code, (data) => {
      if (!data) {
        connectionError.value = 'Room fermee'
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

      // Skip local players — this device is source of truth for them
      if (isLocalPlayer(player.id)) continue

      player.lifeTotal = remotePlayer.lifeTotal
      player.commanderDamageReceived = remotePlayer.commanderDamageReceived
      player.poisonCounters = remotePlayer.poisonCounters
      player.experienceCounters = remotePlayer.experienceCounters
      player.energyCounters = remotePlayer.energyCounters
      player.isMonarch = remotePlayer.isMonarch
      player.hasInitiative = remotePlayer.hasInitiative
      player.commanders = remotePlayer.commanders
    }
  }

  async function pushLocalPlayerState() {
    if (!isMultiplayer.value || !roomCode.value) return

    const gameStore = useGameStore()
    if (!gameStore.currentGame) return

    // Push state for ALL local players
    const pushPromises = localPlayerIds.value.map((playerId) => {
      const localPlayer = gameStore.currentGame!.players.find((p) => p.id === playerId)
      if (!localPlayer) return Promise.resolve()

      const playerState: SyncedPlayerState = {
        lifeTotal: localPlayer.lifeTotal,
        commanderDamageReceived: localPlayer.commanderDamageReceived,
        poisonCounters: localPlayer.poisonCounters,
        experienceCounters: localPlayer.experienceCounters,
        energyCounters: localPlayer.energyCounters,
        isMonarch: localPlayer.isMonarch,
        hasInitiative: localPlayer.hasInitiative,
        commanders: localPlayer.commanders,
      }

      return updatePlayerState(roomCode.value!, playerId, playerState)
    })

    await Promise.all(pushPromises)
  }

  async function pushFullGameState() {
    if (!isMultiplayer.value || !roomCode.value || !isHost.value) return

    const gameStore = useGameStore()
    if (!gameStore.currentGame) return

    const playersState: Record<string, SyncedPlayerState> = {}
    for (const player of gameStore.currentGame.players) {
      playersState[player.id] = {
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

    const { updatePartialGameState } = await import('@/services/firebase')
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
      name: roomPlayer.name,
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
    deviceId,
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
    pushFullGameState,
    pushTurnAdvance,
    createMultiplayerGame,
    disconnect,
  }
})
