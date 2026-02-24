import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite'
import { LOCAL_SEARCH_LIMIT } from '@/config/gameConstants'

const DB_NAME = 'mtg_cards'
const DB_VERSION = 1

let sqliteConnection: SQLiteConnection | null = null
let database: SQLiteDBConnection | null = null
let initialized = false
let ftsAvailable = false

const JEEP_SQLITE_INIT_TIMEOUT_MS = 5000

const CREATE_CARDS_TABLE = `
  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    printed_name TEXT,
    lang TEXT DEFAULT 'en',
    oracle_id TEXT,
    mana_cost TEXT,
    cmc REAL,
    type_line TEXT,
    oracle_text TEXT,
    colors TEXT,
    color_identity TEXT,
    keywords TEXT,
    power TEXT,
    toughness TEXT,
    loyalty TEXT,
    legalities TEXT,
    set_code TEXT,
    set_name TEXT,
    collector_number TEXT,
    rarity TEXT,
    artist TEXT,
    image_small TEXT,
    image_normal TEXT,
    image_art_crop TEXT,
    is_commander INTEGER DEFAULT 0,
    commander_legal INTEGER DEFAULT 0
  );
`

const CREATE_FTS_TABLE = `
  CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
    name,
    printed_name,
    type_line,
    oracle_text,
    content=cards,
    content_rowid=rowid
  );
`

const CREATE_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);
  CREATE INDEX IF NOT EXISTS idx_cards_printed_name ON cards(printed_name);
  CREATE INDEX IF NOT EXISTS idx_cards_lang ON cards(lang);
  CREATE INDEX IF NOT EXISTS idx_cards_oracle_id ON cards(oracle_id);
  CREATE INDEX IF NOT EXISTS idx_cards_commander_legal ON cards(commander_legal);
  CREATE INDEX IF NOT EXISTS idx_cards_is_commander ON cards(is_commander);
`

const CREATE_META_TABLE = `
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`

export async function initDatabase(): Promise<void> {
  if (initialized) return

  const platform = Capacitor.getPlatform()
  sqliteConnection = new SQLiteConnection(CapacitorSQLite)

  if (platform === 'web') {
    // Register jeep-sqlite web component (required for SQLite on web)
    const { defineCustomElements } = await import('jeep-sqlite/loader')
    defineCustomElements(window)

    const jeepSqliteEl = document.createElement('jeep-sqlite')
    document.body.appendChild(jeepSqliteEl)

    await Promise.race([
      customElements.whenDefined('jeep-sqlite'),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`jeep-sqlite web component timeout (${JEEP_SQLITE_INIT_TIMEOUT_MS}ms)`)), JEEP_SQLITE_INIT_TIMEOUT_MS),
      ),
    ])
    await sqliteConnection.initWebStore()
  }

  database = await sqliteConnection.createConnection(
    DB_NAME,
    false,
    'no-encryption',
    DB_VERSION,
    false,
  )
  await database.open()

  await database.execute(CREATE_CARDS_TABLE)
  await database.execute(CREATE_META_TABLE)

  // Migrate: add columns introduced after initial schema
  for (const col of [
    { name: 'printed_name', def: 'TEXT' },
    { name: 'lang', def: "TEXT DEFAULT 'en'" },
    { name: 'oracle_id', def: 'TEXT' },
  ]) {
    try {
      await database.execute(`ALTER TABLE cards ADD COLUMN ${col.name} ${col.def};`)
    } catch {
      // Column already exists — expected after first migration
    }
  }

  await database.execute(CREATE_INDEXES)

  // FTS5 table creation — log actual error if it fails
  try {
    await database.execute(CREATE_FTS_TABLE)
    ftsAvailable = true
  } catch (ftsError) {
    console.warn('FTS5 table creation failed:', ftsError)
    ftsAvailable = false
  }

  initialized = true
}

export async function getDb(): Promise<SQLiteDBConnection> {
  if (!database) {
    await initDatabase()
  }
  return database!
}

export async function getCardCount(): Promise<number> {
  const db = await getDb()
  const result = await db.query('SELECT COUNT(*) as count FROM cards;')
  return result.values?.[0]?.count ?? 0
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb()
  const result = await db.query('SELECT value FROM meta WHERE key = ?;', [key])
  return result.values?.[0]?.value ?? null
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb()
  await db.run(
    'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?);',
    [key, value],
  )
  await saveIfWeb()
}

export async function searchCardsLocal(
  query: string,
  limit = LOCAL_SEARCH_LIMIT,
  commanderOnly = true,
): Promise<LocalCard[]> {
  if (query.length < 2) return []

  const db = await getDb()

  if (ftsAvailable) {
    const sanitized = query.replace(/[^\w\s]/g, '').trim()
    if (!sanitized) return []
    const ftsQuery = `"${sanitized}"*`
    const ftsBaseQuery = `SELECT c.* FROM cards c
       WHERE c.rowid IN (
         SELECT rowid FROM cards_fts WHERE cards_fts MATCH ?
       ) `
    const ftsFullQuery = commanderOnly
      ? ftsBaseQuery + `AND c.commander_legal = 1 ORDER BY c.name LIMIT ?;`
      : ftsBaseQuery + `ORDER BY c.name LIMIT ?;`
    const result = await db.query(ftsFullQuery, [ftsQuery, limit])
    return (result.values ?? []) as LocalCard[]
  }

  // LIKE fallback when FTS5 is not available (web/sql.js)
  const likePattern = `%${query}%`
  const likeBaseQuery = `SELECT * FROM cards c
     WHERE (c.name LIKE ? OR c.printed_name LIKE ? OR c.type_line LIKE ? OR c.oracle_text LIKE ?) `
  const likeFullQuery = commanderOnly
    ? likeBaseQuery + `AND c.commander_legal = 1 ORDER BY c.name LIMIT ?;`
    : likeBaseQuery + `ORDER BY c.name LIMIT ?;`
  const result = await db.query(likeFullQuery, [likePattern, likePattern, likePattern, likePattern, limit])
  return (result.values ?? []) as LocalCard[]
}

export interface LocalSearchFilters {
  commanderOnly?: boolean
  colorIdentity?: string[]
  cardTypes?: string[]
  cmcValues?: number[]
  rarities?: string[]
  powerMin?: number | null
  powerMax?: number | null
  toughnessMin?: number | null
  toughnessMax?: number | null
}

export async function autocompleteLocal(
  query: string,
  limit = LOCAL_SEARCH_LIMIT,
  filters: LocalSearchFilters = {},
): Promise<string[]> {
  if (query.length < 2) return []

  const db = await getDb()

  // Build dynamic filter conditions
  const conditions: string[] = ['c.commander_legal = 1']
  const filterParams: unknown[] = []

  if (filters.commanderOnly) {
    conditions.push('c.is_commander = 1')
  }
  if (filters.colorIdentity && filters.colorIdentity.length > 0) {
    const colorClauses = filters.colorIdentity.map(() => 'c.color_identity LIKE ?')
    conditions.push(`(${colorClauses.join(' OR ')})`)
    for (const color of filters.colorIdentity) {
      filterParams.push(`%"${color}"%`)
    }
  }

  if (filters.cardTypes && filters.cardTypes.length > 0) {
    const typeClauses = filters.cardTypes.map(() => 'c.type_line LIKE ?')
    conditions.push(`(${typeClauses.join(' OR ')})`)
    for (const cardType of filters.cardTypes) {
      filterParams.push(`%${cardType}%`)
    }
  }

  if (filters.cmcValues && filters.cmcValues.length > 0) {
    const cmcClauses: string[] = []
    const regularValues = filters.cmcValues.filter((v) => v < 8)
    const has8Plus = filters.cmcValues.includes(8)
    if (regularValues.length > 0) {
      cmcClauses.push(`c.cmc IN (${regularValues.map(() => '?').join(', ')})`)
      filterParams.push(...regularValues)
    }
    if (has8Plus) {
      cmcClauses.push('c.cmc >= 8')
    }
    conditions.push(`(${cmcClauses.join(' OR ')})`)
  }

  if (filters.rarities && filters.rarities.length > 0) {
    conditions.push(`c.rarity IN (${filters.rarities.map(() => '?').join(', ')})`)
    filterParams.push(...filters.rarities)
  }

  if (filters.powerMin != null) {
    conditions.push("c.power IS NOT NULL AND c.power GLOB '[0-9]*' AND CAST(c.power AS REAL) >= ?")
    filterParams.push(filters.powerMin)
  }
  if (filters.powerMax != null) {
    conditions.push("c.power IS NOT NULL AND c.power GLOB '[0-9]*' AND CAST(c.power AS REAL) <= ?")
    filterParams.push(filters.powerMax)
  }
  if (filters.toughnessMin != null) {
    conditions.push("c.toughness IS NOT NULL AND c.toughness GLOB '[0-9]*' AND CAST(c.toughness AS REAL) >= ?")
    filterParams.push(filters.toughnessMin)
  }
  if (filters.toughnessMax != null) {
    conditions.push("c.toughness IS NOT NULL AND c.toughness GLOB '[0-9]*' AND CAST(c.toughness AS REAL) <= ?")
    filterParams.push(filters.toughnessMax)
  }

  const filterWhere = conditions.join(' AND ')

  if (ftsAvailable) {
    const sanitized = query.replace(/[^\w\s]/g, '').trim()
    if (!sanitized) return []
    const ftsQuery = `"${sanitized}"*`
    const result = await db.query(
      `SELECT DISTINCT c.name FROM cards c
       WHERE c.rowid IN (
         SELECT rowid FROM cards_fts WHERE cards_fts MATCH ?
       )
       AND ${filterWhere}
       ORDER BY c.name
       LIMIT ?;`,
      [ftsQuery, ...filterParams, limit],
    )
    return (result.values ?? []).map((row: Record<string, unknown>) => row.name as string)
  }

  // LIKE fallback
  const likePattern = `%${query}%`
  const result = await db.query(
    `SELECT DISTINCT COALESCE(c.printed_name, c.name) as display_name FROM cards c
     WHERE (c.name LIKE ? OR c.printed_name LIKE ?)
     AND ${filterWhere}
     ORDER BY display_name
     LIMIT ?;`,
    [likePattern, likePattern, ...filterParams, limit],
  )
  return (result.values ?? []).map((row: Record<string, unknown>) => row.display_name as string)
}

export async function getCardByNameLocal(name: string): Promise<LocalCard | null> {
  const db = await getDb()
  const result = await db.query(
    'SELECT * FROM cards WHERE name = ? LIMIT 1;',
    [name],
  )
  return (result.values?.[0] as LocalCard) ?? null
}

export async function clearCards(): Promise<void> {
  const db = await getDb()
  if (ftsAvailable) {
    await db.execute('DELETE FROM cards_fts;')
  }
  await db.execute('DELETE FROM cards;')
  await saveIfWeb()
}

export interface BulkInsertProgress {
  inserted: number
  total: number
}

export async function bulkInsertCards(
  cards: RawScryfallBulkCard[],
  onProgress?: (progress: BulkInsertProgress) => void,
): Promise<number> {
  const db = await getDb()

  const BATCH_SIZE = 500
  const RECORDS_PER_SAVE_CHECKPOINT = 5000
  let totalInserted = 0

  try {
    await db.execute('BEGIN TRANSACTION;')

    // Clear existing data inside the transaction
    if (ftsAvailable) {
      await db.execute('DELETE FROM cards_fts;')
    }
    await db.execute('DELETE FROM cards;')

    for (let startIndex = 0; startIndex < cards.length; startIndex += BATCH_SIZE) {
      const batch = cards.slice(startIndex, startIndex + BATCH_SIZE)

      const statements = batch.map((card) => {
        const imageUris = card.image_uris ?? card.card_faces?.[0]?.image_uris
        const oracleText = card.oracle_text ?? card.card_faces?.map((f) => f.oracle_text).join('\n') ?? ''
        const isCommander =
          (card.type_line?.includes('Legendary') && card.type_line?.includes('Creature')) ||
          oracleText.toLowerCase().includes('can be your commander') ||
          (card.type_line?.includes('Legendary') && card.type_line?.includes('Background'))
        const commanderLegal = card.legalities?.commander === 'legal'

        return {
          statement: `INSERT OR REPLACE INTO cards (
            id, name, printed_name, lang, oracle_id,
            mana_cost, cmc, type_line, oracle_text,
            colors, color_identity, keywords,
            power, toughness, loyalty, legalities,
            set_code, set_name, collector_number, rarity, artist,
            image_small, image_normal, image_art_crop,
            is_commander, commander_legal
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          values: [
            card.id,
            card.name,
            card.printed_name ?? null,
            card.lang ?? 'en',
            card.oracle_id ?? null,
            card.mana_cost ?? '',
            card.cmc ?? 0,
            card.type_line ?? '',
            card.oracle_text ?? card.card_faces?.map((f) => f.oracle_text).join('\n---\n') ?? '',
            JSON.stringify(card.colors ?? []),
            JSON.stringify(card.color_identity ?? []),
            JSON.stringify(card.keywords ?? []),
            card.power ?? null,
            card.toughness ?? null,
            card.loyalty ?? null,
            JSON.stringify(card.legalities ?? {}),
            card.set ?? '',
            card.set_name ?? '',
            card.collector_number ?? '',
            card.rarity ?? '',
            card.artist ?? '',
            imageUris?.small ?? null,
            imageUris?.normal ?? null,
            imageUris?.art_crop ?? null,
            isCommander ? 1 : 0,
            commanderLegal ? 1 : 0,
          ],
        }
      })

      await db.executeSet(statements, false)
      totalInserted += batch.length

      // Persist to web store periodically to prevent data loss if the tab closes
      if (totalInserted % RECORDS_PER_SAVE_CHECKPOINT < BATCH_SIZE) {
        await saveIfWeb()
      }

      onProgress?.({ inserted: totalInserted, total: cards.length })
    }

    // Rebuild FTS index (skip on web where FTS5 is unavailable)
    if (ftsAvailable) {
      await db.execute(`
        INSERT INTO cards_fts(rowid, name, printed_name, type_line, oracle_text)
        SELECT rowid, name, COALESCE(printed_name, ''), type_line, oracle_text FROM cards;
      `)
    }

    await db.execute('COMMIT;')
  } catch (error) {
    try {
      await db.execute('ROLLBACK;')
    } catch {
      // Rollback may fail if the transaction was already aborted
    }
    throw error
  }

  await setMeta('last_bulk_update', new Date().toISOString())
  await setMeta('card_count', String(totalInserted))
  await saveIfWeb()

  return totalInserted
}

async function saveIfWeb(): Promise<void> {
  if (Capacitor.getPlatform() === 'web' && sqliteConnection) {
    await sqliteConnection.saveToStore(DB_NAME)
  }
}

export interface LocalCard {
  id: string
  name: string
  printed_name: string | null
  lang: string
  oracle_id: string | null
  mana_cost: string
  cmc: number
  type_line: string
  oracle_text: string
  colors: string
  color_identity: string
  keywords: string
  power: string | null
  toughness: string | null
  loyalty: string | null
  legalities: string
  set_code: string
  set_name: string
  collector_number: string
  rarity: string
  artist: string
  image_small: string | null
  image_normal: string | null
  image_art_crop: string | null
  is_commander: number
  commander_legal: number
}

export interface RawScryfallBulkCard {
  id: string
  name: string
  printed_name?: string
  lang?: string
  oracle_id?: string
  mana_cost?: string
  cmc?: number
  type_line?: string
  oracle_text?: string
  colors?: string[]
  color_identity?: string[]
  keywords?: string[]
  power?: string
  toughness?: string
  loyalty?: string
  legalities?: Record<string, string>
  set?: string
  set_name?: string
  collector_number?: string
  rarity?: string
  artist?: string
  image_uris?: { small: string; normal: string; art_crop: string }
  card_faces?: Array<{
    oracle_text?: string
    image_uris?: { small: string; normal: string; art_crop: string }
  }>
}
