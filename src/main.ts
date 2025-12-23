import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './style.css'

import App from './App.vue'
import router from './router'
import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import zh from './locales/zh.json'
import { useAppStore } from './stores/app'
import { WagmiPlugin } from '@wagmi/vue'
import { wagmiAdapter } from './config/index'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en,
    zh
  }
})

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// Initialize theme before mount to avoid FOUC
const appStore = useAppStore()
appStore.initializeApp()

app.use(router)
app.use(ElementPlus)
app.use(i18n)
app.use(WagmiPlugin, { config: wagmiAdapter.wagmiConfig })

app.mount('#app')