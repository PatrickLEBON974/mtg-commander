import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { GameRecord } from '@/types/player'
import { MAX_RECENT_GAMES } from '@/config/gameConstants'

const STORAGE_KEY = 'mtg_commander_game_records'

function loadGameRecords(): GameRecord[] {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return []
  try {
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return parsed as GameRecord[]
  } catch {
    return []
  }
}

export const useStatsStore = defineStore('stats', () => {
  const gameRecords = ref<GameRecord[]>(loadGameRecords())

  watch(
    gameRecords,
    (records) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    },
    { deep: true },
  )

  function recordGame(record: Omit<GameRecord, 'id'>) {
    gameRecords.value.push({
      ...record,
      id: crypto.randomUUID(),
    })
  }

  const totalGamesPlayed = computed(() => gameRecords.value.length)

  const overallStats = computed(() => {
    const records = gameRecords.value
    if (records.length === 0) {
      return {
        totalGames: 0,
        averageDurationMs: 0,
        mostPlayedCommander: null as string | null,
      }
    }

    const totalDurationMs = records.reduce((sum, record) => sum + record.gameDurationMs, 0)
    const averageDurationMs = Math.round(totalDurationMs / records.length)

    // Count commander appearances across all records
    const commanderCounts = new Map<string, number>()
    for (const record of records) {
      for (const commanderName of record.commanderNames) {
        commanderCounts.set(commanderName, (commanderCounts.get(commanderName) ?? 0) + 1)
      }
    }

    let mostPlayedCommander: string | null = null
    let highestCount = 0
    for (const [name, count] of commanderCounts) {
      if (count > highestCount) {
        highestCount = count
        mostPlayedCommander = name
      }
    }

    return {
      totalGames: records.length,
      averageDurationMs,
      mostPlayedCommander,
    }
  })

  const recentGames = computed(() => {
    // Group records by gameId, then sort by playedAt descending, take last 10 unique games
    const gameMap = new Map<string, { gameId: string; playedAt: number; durationMs: number; playerCount: number }>()

    for (const record of gameRecords.value) {
      const existing = gameMap.get(record.gameId)
      if (existing) {
        existing.playerCount++
      } else {
        gameMap.set(record.gameId, {
          gameId: record.gameId,
          playedAt: record.playedAt,
          durationMs: record.gameDurationMs,
          playerCount: 1,
        })
      }
    }

    return Array.from(gameMap.values())
      .sort((a, b) => b.playedAt - a.playedAt)
      .slice(0, MAX_RECENT_GAMES)
  })

  return {
    gameRecords,
    totalGamesPlayed,
    overallStats,
    recentGames,
    recordGame,
  }
})
