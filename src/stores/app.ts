import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Types
export interface Notification {
  id: string
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message: string
  duration?: number
  timestamp: number
  read?: boolean
}

export const useAppStore = defineStore('app', () => {
  // State
  const isDark = ref(false)
  const globalLoading = ref(false)
  const language = ref('en')
  const sidebarCollapsed = ref(false)
  const notifications = ref<Notification[]>([])
  
  // Getters
  const theme = computed(() => isDark.value ? 'dark' : 'light')
  const unreadNotifications = computed(() => 
    notifications.value.filter(n => !n.read)
  )
  
  // Actions
  const toggleTheme = () => {
    isDark.value = !isDark.value
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
    updateThemeClass()
  }
  
  const setTheme = (theme: 'light' | 'dark') => {
    isDark.value = theme === 'dark'
    localStorage.setItem('theme', theme)
    updateThemeClass()
  }
  
  const updateThemeClass = () => {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
  
  const setLanguage = (lang: string) => {
    language.value = lang
    localStorage.setItem('language', lang)
  }
  
  const setGlobalLoading = (loading: boolean) => {
    globalLoading.value = loading
  }
  
  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }
  
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = Date.now().toString()
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
      read: false
    }
    notifications.value.unshift(newNotification)
    
    // Auto remove after duration
    if (notification.duration !== 0) {
      setTimeout(() => {
        removeNotification(id)
      }, notification.duration || 5000)
    }
    
    return id
  }
  
  const removeNotification = (id: string) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }
  
  const clearNotifications = () => {
    notifications.value = []
  }
  
  // Initialize from localStorage
  const initializeApp = () => {
    // Theme
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setTheme(savedTheme as 'light' | 'dark')
    } else {
      // Detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(prefersDark ? 'dark' : 'light')
    }
    
    // Language
    const savedLanguage = localStorage.getItem('language')
    if (savedLanguage) {
      setLanguage(savedLanguage)
    }
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    })
  }
  
  return {
    // State
    isDark,
    globalLoading,
    language,
    sidebarCollapsed,
    notifications,
    
    // Getters
    theme,
    unreadNotifications,
    
    // Actions
    toggleTheme,
    setTheme,
    setLanguage,
    setGlobalLoading,
    toggleSidebar,
    addNotification,
    removeNotification,
    clearNotifications,
    initializeApp
  }
})