import { create } from 'zustand'
import { STORAGE_KEYS } from '@/constants'
import type { AppLanguage, AppNotification, ThemeMode } from '@/types/app'

interface AppState {
  globalLoading: boolean
  initialized: boolean
  language: AppLanguage
  notifications: AppNotification[]
  sidebarCollapsed: boolean
  theme: ThemeMode
  initializeApp: () => void
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp'>) => string
  clearNotifications: () => void
  removeNotification: (id: string) => void
  setGlobalLoading: (loading: boolean) => void
  setLanguage: (language: AppLanguage) => void
  setTheme: (theme: ThemeMode) => void
  toggleSidebar: () => void
  toggleTheme: () => void
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.dataset.theme = theme
}

function detectTheme(): ThemeMode {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME)
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function detectLanguage(): AppLanguage {
  const savedLanguage = localStorage.getItem(STORAGE_KEYS.LANGUAGE)
  if (savedLanguage === 'en' || savedLanguage === 'zh') {
    return savedLanguage
  }

  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export const useAppStore = create<AppState>((set, get) => ({
  globalLoading: false,
  initialized: false,
  language: 'en',
  notifications: [],
  sidebarCollapsed: false,
  theme: 'light',
  initializeApp: () => {
    if (get().initialized) {
      return
    }

    const theme = detectTheme()
    const language = detectLanguage()
    applyTheme(theme)
    document.documentElement.lang = language

    set({
      initialized: true,
      language,
      theme
    })

    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', event => {
        if (!localStorage.getItem(STORAGE_KEYS.THEME)) {
          get().setTheme(event.matches ? 'dark' : 'light')
        }
      })
  },
  addNotification: notification => {
    const id = crypto.randomUUID()
    const nextNotification: AppNotification = {
      ...notification,
      id,
      timestamp: Date.now()
    }

    set(state => ({
      notifications: [nextNotification, ...state.notifications]
    }))

    if (notification.duration !== 0) {
      window.setTimeout(() => {
        get().removeNotification(id)
      }, notification.duration ?? 5_000)
    }

    return id
  },
  clearNotifications: () => set({ notifications: [] }),
  removeNotification: id =>
    set(state => ({
      notifications: state.notifications.filter(notification => notification.id !== id)
    })),
  setGlobalLoading: loading => set({ globalLoading: loading }),
  setLanguage: language => {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, language)
    document.documentElement.lang = language
    set({ language })
  },
  setTheme: theme => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme)
    applyTheme(theme)
    set({ theme })
  },
  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(nextTheme)
  }
}))
