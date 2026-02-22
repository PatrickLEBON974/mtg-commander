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

export async function downloadBulkData(
  onProgress: ProgressCallback,
  languages: string[] = ['en'],
): Promise<number> {
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

    // Use all_cards when a second language is selected (contains every language)
    // Use oracle_cards for English-only (much smaller, ~170MB vs ~1.5GB)
    const needsMultiLang = languages.length > 1
    const bulkType = needsMultiLang ? 'all_cards' : 'oracle_cards'
    const bulkData = manifest.data?.find(
      (entry: { type: string }) => entry.type === bulkType,
    )

    if (!bulkData?.download_uri) {
      throw new Error(`${bulkType} introuvable dans le manifest`)
    }

    const downloadUrl: string = bulkData.download_uri
    const totalSizeBytes: number = bulkData.size ?? 0

    await safeSaveMeta('bulk_download_url', downloadUrl)

    // Phase 2: Download the JSON file
    const dataResponse = await fetch(downloadUrl)
    if (!dataResponse.ok) {
      throw new Error(`Erreur telechargement: ${dataResponse.status}`)
    }

    // Use Content-Length if available, otherwise fall back to manifest size
    const contentLength = dataResponse.headers.get('Content-Length')
    const totalBytes = contentLength ? parseInt(contentLength, 10) : totalSizeBytes
    const totalMb = totalBytes > 0 ? Math.round(totalBytes / 1_000_000) : 170

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
        totalMb,
        message: `Telechargement (${downloadedMb} / ${totalMb} MB)...`,
      })
    }

    // Phase 3: Parse JSON
    // Yield to let the UI repaint before heavy synchronous work
    onProgress({
      phase: 'parsing',
      message: 'Assemblage des donnees...',
    })
    await new Promise((resolve) => setTimeout(resolve, 50))

    const combinedLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    const combined = new Uint8Array(combinedLength)
    let offset = 0
    for (const chunk of chunks) {
      combined.set(chunk, offset)
      offset += chunk.length
    }

    onProgress({
      phase: 'parsing',
      message: 'Decodage du JSON (~170 MB)...',
    })
    await new Promise((resolve) => setTimeout(resolve, 50))

    const jsonText = new TextDecoder().decode(combined)
    const allCards: RawScryfallBulkCard[] = JSON.parse(jsonText)

    // Filter: keep only cards with a name, an image, and matching selected languages
    const langSet = new Set(languages)
    onProgress({
      phase: 'parsing',
      message: `Filtrage de ${allCards.length} cartes (langues: ${languages.join(', ')})...`,
    })
    await new Promise((resolve) => setTimeout(resolve, 50))

    const validCards = allCards.filter(
      (card) =>
        card.name &&
        (card.image_uris || card.card_faces?.[0]?.image_uris) &&
        langSet.has(card.lang ?? 'en'),
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
