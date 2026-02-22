import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getCardCount, getMeta, initDatabase, clearCards } from '@/services/database'
import { downloadBulkData, type DownloadProgress } from '@/services/bulkDownload'
import { useSettingsStore } from './settingsStore'

export const useOfflineStore = defineStore('offline', () => {
  const isDbReady = ref(false)
  const cardCount = ref(0)
  const lastUpdateDate = ref<string | null>(null)
  const isDownloading = ref(false)
  const downloadProgress = ref<DownloadProgress | null>(null)
  const downloadError = ref<string | null>(null)

  const hasLocalData = computed(() => cardCount.value > 0)
  const formattedLastUpdate = computed(() => {
    if (!lastUpdateDate.value) return 'Jamais'
    return new Date(lastUpdateDate.value).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  })

  const estimatedSizeMb = computed(() => {
    // Rough estimate: ~1KB per card in SQLite
    return Math.round(cardCount.value / 1000)
  })

  async function initialize() {
    try {
      await initDatabase()
      isDbReady.value = true
      await refreshStats()
    } catch (error) {
      console.error('Database init failed:', error)
    }
  }

  async function refreshStats() {
    cardCount.value = await getCardCount()
    lastUpdateDate.value = await getMeta('last_bulk_update')
  }

  async function startDownload() {
    if (isDownloading.value) return

    if (!isDbReady.value) {
      downloadError.value = 'Base de donnees non disponible (SQLite requis sur appareil natif)'
      return
    }

    isDownloading.value = true
    downloadError.value = null
    downloadProgress.value = null

    try {
      const settingsStore = useSettingsStore()
      const count = await downloadBulkData((progress) => {
        downloadProgress.value = progress
      }, settingsStore.cardLanguages)
      cardCount.value = count
      await refreshStats()
    } catch (error) {
      downloadError.value = error instanceof Error ? error.message : 'Erreur inconnue'
    } finally {
      isDownloading.value = false
    }
  }

  async function clearCache() {
    try {
      await clearCards()
      cardCount.value = 0
      lastUpdateDate.value = null
    } catch (error) {
      console.error('Clear cache failed:', error)
    }
  }

  return {
    isDbReady,
    cardCount,
    lastUpdateDate,
    isDownloading,
    downloadProgress,
    downloadError,
    hasLocalData,
    formattedLastUpdate,
    estimatedSizeMb,
    initialize,
    refreshStats,
    startDownload,
    clearCache,
  }
})
