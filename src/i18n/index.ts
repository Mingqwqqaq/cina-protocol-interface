import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import zh from '@/locales/zh.json'

const messages = {
  en,
  zh
}

// Get locale from localStorage or default to 'en'
const getLocale = (): string => {
  const stored = localStorage.getItem('locale')
  if (stored && Object.keys(messages).includes(stored)) {
    return stored
  }
  
  // Detect browser language
  const browserLang = navigator.language.split('-')[0]
  if (Object.keys(messages).includes(browserLang)) {
    return browserLang
  }
  
  return 'en'
}

const i18n = createI18n({
  legacy: false,
  locale: getLocale(),
  fallbackLocale: 'en',
  messages,
  globalInjection: true
})

export default i18n

// Helper function to change locale
export const setLocale = (locale: string) => {
  if (Object.keys(messages).includes(locale)) {
    i18n.global.locale.value = locale as 'en' | 'zh'
    localStorage.setItem('locale', locale)
    document.documentElement.lang = locale
  }
}

// Helper function to get current locale
export const getCurrentLocale = (): string => {
  return i18n.global.locale.value
}

// Helper function to get available locales
export const getAvailableLocales = () => {
  return Object.keys(messages)
}