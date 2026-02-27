import { createI18n } from 'vue-i18n'
import en from './locales/en'
import fr from './locales/fr'

export type MessageSchema = typeof en

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
