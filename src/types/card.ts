export interface ScryfallCard {
  id: string
  name: string
  mana_cost: string
  cmc: number
  type_line: string
  oracle_text: string
  colors: string[]
  color_identity: string[]
  keywords: string[]
  power?: string
  toughness?: string
  loyalty?: string
  legalities: Record<string, string>
  set: string
  set_name: string
  collector_number: string
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic'
  artist: string
  image_uris?: CardImageUris
  card_faces?: CardFace[]
  prices: Record<string, string | null>
}

export interface CardImageUris {
  small: string
  normal: string
  large: string
  png: string
  art_crop: string
  border_crop: string
}

export interface CardFace {
  name: string
  mana_cost: string
  type_line: string
  oracle_text: string
  colors: string[]
  power?: string
  toughness?: string
  loyalty?: string
  image_uris?: CardImageUris
}

export interface CardSearchFilters {
  commanderOnly: boolean
  colorIdentity: string[]
  cardTypes: string[]
  cmcValues: number[]
  rarities: string[]
  powerMin: number | null
  powerMax: number | null
  toughnessMin: number | null
  toughnessMax: number | null
}
