import { bulkInsertCards, setMeta, type RawScryfallBulkCard, type BulkInsertProgress } from './database'

const BULK_DATA_URL = 'https://api.scryfall.com/bulk-data'

async function safeSaveMeta(key: string, value: string): Promise<void> {
  try {
    await setMeta(key, value)
  } catch {
    // DB not available (web dev mode), skip metadata save
  }
}

export interface DownloadProgress {
  phase: 'fetching_manifest' | 'downloading' | 'parsing' | 'importing' | 'done' | 'error'
  downloadedMb?: number
  totalMb?: number
  importProgress?: BulkInsertProgress
  message: string
  error?: string
}

export type ProgressCallback = (progress: DownloadProgress) => void

export async function downloadBulkData(onProgress: ProgressCallback): Promise<number> {
  try {
    // Phase 1: Fetch bulk data manifest
    onProgress({
      phase: 'fetching_manifest',
      message: 'Recuperation du manifest Scryfall...',
    })

    const manifestResponse = await fetch(BULK_DATA_URL, {
      headers: { Accept: 'application/json' },
    })

    if (!manifestResponse.ok) {
      throw new Error(`Erreur manifest: ${manifestResponse.status}`)
    }

    const manifest = await manifestResponse.json()
    const oracleData = manifest.data?.find(
      (entry: { type: string }) => entry.type === 'oracle_cards',
    )

    if (!oracleData?.download_uri) {
      throw new Error('Oracle Cards introuvable dans le manifest')
    }

    const downloadUrl: string = oracleData.download_uri
    const estimatedSizeMb = Math.round((oracleData.size ?? 170_000_000) / 1_000_000)

    await safeSaveMeta('bulk_download_url', downloadUrl)

    // Phase 2: Download the JSON file
    onProgress({
      phase: 'downloading',
      downloadedMb: 0,
      totalMb: estimatedSizeMb,
      message: `Telechargement (0 / ~${estimatedSizeMb} MB)...`,
    })

    const dataResponse = await fetch(downloadUrl)
    if (!dataResponse.ok) {
      throw new Error(`Erreur telechargement: ${dataResponse.status}`)
    }

    const reader = dataResponse.body?.getReader()
    if (!reader) {
      throw new Error('ReadableStream non supporte')
    }

    const chunks: Uint8Array[] = []
    let downloadedBytes = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      chunks.push(value)
      downloadedBytes += value.length

      const downloadedMb = Math.round(downloadedBytes / 1_000_000)
      onProgress({
        phase: 'downloading',
        downloadedMb,
        totalMb: estimatedSizeMb,
        message: `Telechargement (${downloadedMb} / ~${estimatedSizeMb} MB)...`,
      })
    }

    // Phase 3: Parse JSON
    onProgress({
      phase: 'parsing',
      message: 'Analyse des donnees...',
    })

    const combinedLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    const combined = new Uint8Array(combinedLength)
    let offset = 0
    for (const chunk of chunks) {
      combined.set(chunk, offset)
      offset += chunk.length
    }

    const jsonText = new TextDecoder().decode(combined)
    const allCards: RawScryfallBulkCard[] = JSON.parse(jsonText)

    // Filter: keep only cards with at least a name and an image
    const validCards = allCards.filter(
      (card) => card.name && (card.image_uris || card.card_faces?.[0]?.image_uris),
    )

    onProgress({
      phase: 'parsing',
      message: `${validCards.length} cartes valides sur ${allCards.length} total`,
    })

    // Phase 4: Import into SQLite
    onProgress({
      phase: 'importing',
      importProgress: { inserted: 0, total: validCards.length },
      message: `Import dans la base locale (0 / ${validCards.length})...`,
    })

    const insertedCount = await bulkInsertCards(validCards, (importProgress) => {
      onProgress({
        phase: 'importing',
        importProgress,
        message: `Import (${importProgress.inserted} / ${importProgress.total})...`,
      })
    })

    // Done
    onProgress({
      phase: 'done',
      message: `${insertedCount} cartes importees avec succes`,
    })

    return insertedCount
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    onProgress({
      phase: 'error',
      message: `Echec: ${errorMessage}`,
      error: errorMessage,
    })
    throw error
  }
}
