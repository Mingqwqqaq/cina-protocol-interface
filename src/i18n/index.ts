import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { STORAGE_KEYS } from '@/constants'
import en from '@/locales/en.json'
import zh from '@/locales/zh.json'

function getInitialLanguage() {
  const stored = localStorage.getItem(STORAGE_KEYS.LANGUAGE)

  if (stored === 'en' || stored === 'zh') {
    return stored
  }

  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      zh: { translation: zh }
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  })
}

export { i18n }
