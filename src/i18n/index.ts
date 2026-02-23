import { createI18n } from 'vue-i18n'
import fr from './locales/fr'
import en from './locales/en'

export type MessageSchema = typeof fr

const i18n = createI18n<[MessageSchema], 'fr' | 'en'>({
  legacy: false,
  locale: 'fr',
  fallbackLocale: 'fr',
  messages: {
    fr,
    en,
  },
})

export default i18n
