import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite'

const DB_NAME = 'mtg_cards'
const DB_VERSION = 1

let sqliteConnection: SQLiteConnection | null = null
let database: SQLiteDBConnection | null = null
let initialized = false

const CREATE_CARDS_TABLE = `
  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
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
    type_line,
    oracle_text,
    content=cards,
    content_rowid=rowid
  );
`

const CREATE_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);
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
    const jeepSqliteEl = document.createElement('jeep-sqlite')
    document.body.appendChild(jeepSqliteEl)

    // Timeout: jeep-sqlite may never register on web without proper setup
    await Promise.race([
      customElements.whenDefined('jeep-sqlite'),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('jeep-sqlite web component timeout (3s)')), 3000),
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
  await database.execute(CREATE_INDEXES)

  // FTS table creation - separate execute since virtual tables can fail if already exists
  try {
    await database.execute(CREATE_FTS_TABLE)
  } catch {
    // FTS table already exists, ignore
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
  limit = 20,
  commanderOnly = true,
): Promise<LocalCard[]> {
  const db = await getDb()

  const legalityFilter = commanderOnly ? 'AND c.commander_legal = 1' : ''

  // Use FTS for search if query is long enough
  if (query.length >= 2) {
    const ftsQuery = query.replace(/[^\w\s]/g, '') + '*'
    const result = await db.query(
      `SELECT c.* FROM cards c
       WHERE c.rowid IN (
         SELECT rowid FROM cards_fts WHERE cards_fts MATCH ?
       )
       ${legalityFilter}
       ORDER BY c.name
       LIMIT ?;`,
      [ftsQuery, limit],
    )
    return (result.values ?? []) as LocalCard[]
  }

  return []
}

export async function autocompleteLocal(query: string, limit = 20): Promise<string[]> {
  if (query.length < 2) return []

  const db = await getDb()
  const ftsQuery = query.replace(/[^\w\s]/g, '') + '*'

  const result = await db.query(
    `SELECT DISTINCT c.name FROM cards c
     WHERE c.rowid IN (
       SELECT rowid FROM cards_fts WHERE cards_fts MATCH ?
     )
     AND c.commander_legal = 1
     ORDER BY c.name
     LIMIT ?;`,
    [ftsQuery, limit],
  )

  return (result.values ?? []).map((row: Record<string, unknown>) => row.name as string)
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
  await db.execute('DELETE FROM cards_fts;')
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

  // Clear existing data
  await db.execute('DELETE FROM cards_fts;')
  await db.execute('DELETE FROM cards;')

  const BATCH_SIZE = 500
  let totalInserted = 0

  for (let startIndex = 0; startIndex < cards.length; startIndex += BATCH_SIZE) {
    const batch = cards.slice(startIndex, startIndex + BATCH_SIZE)

    const statements = batch.map((card) => {
      const imageUris = card.image_uris ?? card.card_faces?.[0]?.image_uris
      const isCommander = card.type_line?.includes('Legendary') && card.type_line?.includes('Creature')
      const commanderLegal = card.legalities?.commander === 'legal'

      return {
        statement: `INSERT OR REPLACE INTO cards (
          id, name, mana_cost, cmc, type_line, oracle_text,
          colors, color_identity, keywords,
          power, toughness, loyalty, legalities,
          set_code, set_name, collector_number, rarity, artist,
          image_small, image_normal, image_art_crop,
          is_commander, commander_legal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        values: [
          card.id,
          card.name,
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

    onProgress?.({ inserted: totalInserted, total: cards.length })
  }

  // Rebuild FTS index
  await db.execute(`
    INSERT INTO cards_fts(rowid, name, type_line, oracle_text)
    SELECT rowid, name, type_line, oracle_text FROM cards;
  `)

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
