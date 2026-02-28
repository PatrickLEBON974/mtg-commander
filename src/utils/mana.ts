/**
 * Mana symbol parsing utilities for Scryfall card data.
 *
 * Converts Scryfall notation ({3}, {W}, {W/U}, {W/P}, {T}, {X}, etc.)
 * into CSS class names for the mana-font icon library.
 */

/** Maps a single symbol token (between braces) to a mana-font CSS class suffix. */
function symbolToClassName(rawSymbol: string): string {
  const symbol = rawSymbol.toLowerCase()

  // Hybrid mana: {W/U} → "wu", {2/W} → "2w"
  if (symbol.includes('/')) {
    // Phyrexian: {W/P} → "wp", {U/P} → "up"
    if (symbol.endsWith('/p')) {
      return symbol.replace('/p', 'p')
    }
    return symbol.replace('/', '')
  }

  return symbol
}

/**
 * Parses a Scryfall mana cost string into an array of mana-font class suffixes.
 *
 * @example parseManaCostToSymbols("{3}{W}{U}") → ["3", "w", "u"]
 * @example parseManaCostToSymbols("{W/U}{B}") → ["wu", "b"]
 * @example parseManaCostToSymbols("{X}{X}{R}") → ["x", "x", "r"]
 */
export function parseManaCostToSymbols(manaCost: string): string[] {
  if (!manaCost) return []
  const symbolPattern = /\{([^}]+)\}/g
  const symbols: string[] = []
  let match: RegExpExecArray | null

  while ((match = symbolPattern.exec(manaCost)) !== null) {
    symbols.push(symbolToClassName(match[1]))
  }

  return symbols
}

export interface OracleTextSegment {
  type: 'text' | 'symbol'
  value: string
}

/**
 * Splits oracle text into segments of plain text and mana symbols,
 * allowing inline <i class="ms ms-{symbol}"> rendering.
 *
 * @example parseOracleText("Add {W} or {U}.")
 * → [{ type: 'text', value: 'Add ' }, { type: 'symbol', value: 'w' },
 *    { type: 'text', value: ' or ' }, { type: 'symbol', value: 'u' },
 *    { type: 'text', value: '.' }]
 */
export function parseOracleText(oracleText: string): OracleTextSegment[] {
  if (!oracleText) return []

  const segments: OracleTextSegment[] = []
  const symbolPattern = /\{([^}]+)\}/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = symbolPattern.exec(oracleText)) !== null) {
    // Text before this symbol
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: oracleText.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'symbol', value: symbolToClassName(match[1]) })
    lastIndex = match.index + match[0].length
  }

  // Trailing text after last symbol
  if (lastIndex < oracleText.length) {
    segments.push({ type: 'text', value: oracleText.slice(lastIndex) })
  }

  return segments
}
