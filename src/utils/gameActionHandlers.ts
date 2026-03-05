import type { PlayerState, GameAction, GameState } from '@/types/game'

interface ActionSettings {
  commanderDamageThreshold: number
  poisonThreshold: number
}

function checkPlayerDead(player: PlayerState, settings: ActionSettings): boolean {
  if (player.lifeTotal <= 0) return true
  if (settings.poisonThreshold > 0 && player.poisonCounters >= settings.poisonThreshold) return true
  for (const damage of Object.values(player.commanderDamageReceived)) {
    if (damage >= settings.commanderDamageThreshold) return true
  }
  return false
}

function findPlayerInList(players: PlayerState[], playerId: string): PlayerState | undefined {
  return players.find((player) => player.id === playerId)
}

export function applyActionReverse(
  players: PlayerState[],
  action: GameAction,
  settings: ActionSettings,
  gameState: GameState,
): void {
  const player = findPlayerInList(players, action.playerId)
  if (!player) return

  switch (action.type) {
    case 'life_change':
      player.lifeTotal -= action.value
      break
    case 'commander_damage':
      if (action.commanderId) {
        const previousDamage = player.commanderDamageReceived[action.commanderId] ?? 0
        player.commanderDamageReceived[action.commanderId] = Math.max(0, previousDamage - action.value)
        player.lifeTotal += action.value
      }
      break
    case 'poison_change':
      player.poisonCounters = Math.max(0, player.poisonCounters - action.value)
      break
    case 'experience_change':
      player.experienceCounters = Math.max(0, player.experienceCounters - action.value)
      break
    case 'energy_change':
      player.energyCounters = Math.max(0, player.energyCounters - action.value)
      break
    case 'commander_cast': {
      const commander = player.commanders[action.value]
      if (commander) {
        commander.castCount = Math.max(0, commander.castCount - 1)
      }
      break
    }
    case 'turn_advance': {
      if (action.previousValue !== undefined) {
        gameState.currentTurnPlayerIndex = action.previousValue
      } else {
        // Fallback for old actions without previousValue
        const playerCount = players.length
        gameState.currentTurnPlayerIndex = (gameState.currentTurnPlayerIndex - 1 + playerCount) % playerCount
      }
      gameState.turnNumber = Math.max(1, gameState.turnNumber - 1)
      break
    }
    case 'monarch_change':
      if (action.value === 1) {
        // Was toggled ON -> undo by toggling OFF
        player.isMonarch = false
        // Restore previous monarch if one existed
        if (action.targetPlayerId) {
          const previousMonarch = findPlayerInList(players, action.targetPlayerId)
          if (previousMonarch) previousMonarch.isMonarch = true
        }
      } else {
        // Was toggled OFF -> undo by toggling ON
        player.isMonarch = true
      }
      break
    case 'initiative_change':
      if (action.value === 1) {
        // Was toggled ON -> undo by toggling OFF
        player.hasInitiative = false
        // Restore previous initiative holder if one existed
        if (action.targetPlayerId) {
          const previousHolder = findPlayerInList(players, action.targetPlayerId)
          if (previousHolder) previousHolder.hasInitiative = true
        }
      } else {
        // Was toggled OFF -> undo by toggling ON
        player.hasInitiative = true
      }
      break
    case 'city_blessing_change':
      player.cityBlessing = !player.cityBlessing
      break
    case 'ring_level_change':
      if (action.previousValue !== undefined) {
        player.ringLevel = action.previousValue
      }
      break
    case 'rad_change':
      player.radCounters = Math.max(0, player.radCounters - action.value)
      break
    case 'hourglass_change':
      if (action.previousValue !== undefined) {
        player.hourglassTokens = action.previousValue
      } else {
        player.hourglassTokens = Math.max(0, player.hourglassTokens - action.value)
      }
      break
    case 'day_night_change': {
      const previousDayNightValue = action.previousValue
      if (previousDayNightValue === -1) {
        gameState.dayNightState = null
      } else {
        gameState.dayNightState = previousDayNightValue === 1 ? 'day' : 'night'
      }
      break
    }
    case 'game_result':
      // Game result undo is complex — skip reversal for now
      break
    case 'behavior_rule_life':
      player.lifeTotal -= action.value
      break
    case 'behavior_rule_counter':
      if (action.commanderId === 'poisonCounters') {
        player.poisonCounters = Math.max(0, player.poisonCounters - action.value)
      } else if (action.commanderId === 'experienceCounters') {
        player.experienceCounters = Math.max(0, player.experienceCounters - action.value)
      } else if (action.commanderId === 'energyCounters') {
        player.energyCounters = Math.max(0, player.energyCounters - action.value)
      }
      break
    default: {
      const _exhaustiveCheck: never = action.type
      console.warn('Unhandled action type:', _exhaustiveCheck)
    }
  }
}

export function applyActionForward(
  players: PlayerState[],
  action: GameAction,
  settings: ActionSettings,
  gameState: GameState,
): void {
  const player = findPlayerInList(players, action.playerId)
  if (!player) return

  switch (action.type) {
    case 'life_change':
      player.lifeTotal += action.value
      break
    case 'commander_damage':
      if (action.commanderId) {
        const currentDamage = player.commanderDamageReceived[action.commanderId] ?? 0
        player.commanderDamageReceived[action.commanderId] = currentDamage + action.value
        player.lifeTotal -= action.value
      }
      break
    case 'poison_change':
      player.poisonCounters = Math.max(0, player.poisonCounters + action.value)
      break
    case 'experience_change':
      player.experienceCounters = Math.max(0, player.experienceCounters + action.value)
      break
    case 'energy_change':
      player.energyCounters = Math.max(0, player.energyCounters + action.value)
      break
    case 'commander_cast': {
      const commander = player.commanders[action.value]
      if (commander) {
        commander.castCount++
      }
      break
    }
    case 'turn_advance': {
      const playerCount = players.length
      if (playerCount === 0) break
      let nextIndex = (gameState.currentTurnPlayerIndex + 1) % playerCount
      let checkedCount = 0
      while (checkedCount < playerCount) {
        const candidate = players[nextIndex]
        if (candidate && !checkPlayerDead(candidate, settings)) break
        checkedCount++
        nextIndex = (nextIndex + 1) % playerCount
      }
      gameState.currentTurnPlayerIndex = nextIndex
      gameState.turnNumber = action.value // restore the turn number from the action
      break
    }
    case 'monarch_change':
      if (action.value === 1) {
        // Re-apply toggling ON: clear all, set this player
        for (const otherPlayer of players) {
          otherPlayer.isMonarch = false
        }
        player.isMonarch = true
      } else {
        // Re-apply toggling OFF
        player.isMonarch = false
      }
      break
    case 'initiative_change':
      if (action.value === 1) {
        for (const otherPlayer of players) {
          otherPlayer.hasInitiative = false
        }
        player.hasInitiative = true
      } else {
        player.hasInitiative = false
      }
      break
    case 'city_blessing_change':
      player.cityBlessing = action.value === 1
      break
    case 'ring_level_change':
      player.ringLevel = action.value
      break
    case 'rad_change':
      player.radCounters = Math.max(0, player.radCounters + action.value)
      break
    case 'hourglass_change':
      player.hourglassTokens = Math.max(0, (action.previousValue ?? player.hourglassTokens) + action.value)
      break
    case 'day_night_change': {
      gameState.dayNightState = action.value === 1 ? 'day' : 'night'
      break
    }
    case 'game_result':
      // Game result redo — skip for now
      break
    case 'behavior_rule_life':
      player.lifeTotal += action.value
      break
    case 'behavior_rule_counter':
      if (action.commanderId === 'poisonCounters') {
        player.poisonCounters = Math.max(0, player.poisonCounters + action.value)
      } else if (action.commanderId === 'experienceCounters') {
        player.experienceCounters = Math.max(0, player.experienceCounters + action.value)
      } else if (action.commanderId === 'energyCounters') {
        player.energyCounters = Math.max(0, player.energyCounters + action.value)
      }
      break
    default: {
      const _exhaustiveCheck: never = action.type
      console.warn('Unhandled action type:', _exhaustiveCheck)
    }
  }
}
