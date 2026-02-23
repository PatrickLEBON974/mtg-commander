/** Convert short locale code to BCP-47 locale tag */
export function toLocaleCode(language: 'en' | 'fr'): string {
  return language === 'en' ? 'en-US' : 'fr-FR'
}
