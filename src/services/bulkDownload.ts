import { bulkInsertCards, setMeta, type RawScryfallBulkCard, type BulkInsertProgress } from './database'
import i18n from '@/i18n'

const BULK_DATA_URL = 'https://api.scryfall.com/bulk-data'

/**
 * Find the end index of a complete top-level JSON object in `text` starting
 * from position 0.  Returns the index of the closing `}` or -1 when the
 * buffer does not yet contain a full object.
 *
 * Brackets inside JSON string values are correctly ignored by tracking
 * whether we are inside a quoted string and handling backslash escapes.
 */
function findObjectEnd(text: string): number {
  let depth = 0
  let insideString = false
  let escaped = false

  for (let index = 0; index < text.length; index++) {
    const character = text[index]

    if (escaped) {
      escaped = false
      continue
    }

    if (character === '\\' && insideString) {
      escaped = true
      continue
    }

    if (character === '"') {
      insideString = !insideString
      continue
    }

    if (insideString) continue

    if (character === '{') {
      depth++
    } else if (character === '}') {
      depth--
      if (depth === 0) return index
    }
  }

  return -1
}

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
    const { t } = i18n.global

    // Phase 1: Fetch bulk data manifest
    onProgress({
      phase: 'fetching_manifest',
      message: t('offline.fetchingManifest'),
    })

    const manifestResponse = await fetch(BULK_DATA_URL, {
      headers: { Accept: 'application/json' },
    })

    if (!manifestResponse.ok) {
      throw new Error(t('offline.manifestError', { status: manifestResponse.status }))
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
      throw new Error(t('offline.bulkTypeNotFound', { bulkType }))
    }

    const downloadUrl: string = bulkData.download_uri
    const totalSizeBytes: number = bulkData.size ?? 0

    await safeSaveMeta('bulk_download_url', downloadUrl)

    // Phase 2: Download the JSON file
    const dataResponse = await fetch(downloadUrl)
    if (!dataResponse.ok) {
      throw new Error(t('offline.downloadError', { status: dataResponse.status }))
    }

    // Use Content-Length if available, otherwise fall back to manifest size
    const contentLength = dataResponse.headers.get('Content-Length')
    const totalBytes = contentLength ? parseInt(contentLength, 10) : totalSizeBytes
    const totalMb = totalBytes > 0 ? Math.round(totalBytes / 1_000_000) : 170

    const reader = dataResponse.body?.getReader()
    if (!reader) {
      throw new Error(t('offline.streamNotSupported'))
    }

    // Phase 2+3: Stream, decode, and parse JSON incrementally.
    // Instead of accumulating Uint8Array chunks and then combining + decoding
    // + JSON.parsing the whole blob (triple memory allocation), we decode each
    // chunk to text immediately, track JSON object boundaries with bracket
    // counting, and parse individual card objects as soon as they are complete.

    const decoder = new TextDecoder()
    const langSet = new Set(languages)
    const validCards: RawScryfallBulkCard[] = []
    let buffer = ''
    let downloadedBytes = 0
    let totalParsed = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      downloadedBytes += value.length
      buffer += decoder.decode(value, { stream: true })

      // Strip the leading '[' of the JSON array on the very first chunk
      if (buffer.startsWith('[')) {
        buffer = buffer.substring(1)
      }

      // Extract and parse every complete JSON object from the buffer
      let objectEndIndex: number
      while ((objectEndIndex = findObjectEnd(buffer)) !== -1) {
        const objectString = buffer.substring(0, objectEndIndex + 1).trim()
        buffer = buffer.substring(objectEndIndex + 1).replace(/^[\s,]+/, '')

        if (!objectString || objectString === ']') continue

        try {
          const card: RawScryfallBulkCard = JSON.parse(objectString)
          totalParsed++

          const hasImage = card.image_uris || card.card_faces?.[0]?.image_uris
          if (card.name && hasImage && langSet.has(card.lang ?? 'en')) {
            validCards.push(card)
          }
        } catch {
          // Skip malformed JSON objects
        }
      }

      // Report download + parsing progress
      const downloadedMb = Math.round(downloadedBytes / 1_000_000)
      onProgress({
        phase: 'downloading',
        downloadedMb,
        totalMb,
        message: t('offline.downloading', { downloadedMb, totalMb, count: validCards.length }),
      })
    }

    // Flush any remaining decoded bytes from the stream
    buffer += decoder.decode()

    onProgress({
      phase: 'parsing',
      message: t('offline.parsingDone', { validCount: validCards.length, totalCount: totalParsed, languages: languages.join(', ') }),
    })

    // Phase 4: Import into SQLite
    onProgress({
      phase: 'importing',
      importProgress: { inserted: 0, total: validCards.length },
      message: t('offline.importing', { inserted: 0, total: validCards.length }),
    })

    const insertedCount = await bulkInsertCards(validCards, (importProgress) => {
      onProgress({
        phase: 'importing',
        importProgress,
        message: t('offline.importProgress', { inserted: importProgress.inserted, total: importProgress.total }),
      })
    })

    // Done
    onProgress({
      phase: 'done',
      message: t('offline.importSuccess', { count: insertedCount }),
    })

    return insertedCount
  } catch (error) {
    const { t: tError } = i18n.global
    const errorMessage = error instanceof Error ? error.message : tError('offline.unknownError')
    onProgress({
      phase: 'error',
      message: tError('offline.importFailed', { error: errorMessage }),
      error: errorMessage,
    })
    throw error
  }
}
