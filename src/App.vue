<template>
  <div id="app" :class="[appStore.theme, { 'sidebar-collapsed': appStore.sidebarCollapsed }]">
    <!-- Loading overlay -->
    <div v-if="appStore.globalLoading"
      class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <LoadingSpinner size="large" :text="$t('common.loading')" />
    </div>

    <el-config-provider :locale="locale">
      <div class="content-app bg-app">
        <!-- Navigation Header -->
        <AppHeader />

        <!-- Main Content -->
        <main class="content-main">
          <div class="max-w-4xl mx-auto sm:px-6 lg:px-8 h-full">
            <!-- Router view with transition -->
            <router-view v-slot="{ Component, route }">
              <transition name="page" mode="out-in" @enter="onPageEnter" @leave="onPageLeave">
                <component :is="Component" :key="route.path" />
              </transition>
            </router-view>
          </div>
        </main>
      </div>
    </el-config-provider>

    <!-- Global modals -->
    <!-- Removed TransactionModal until a proper transaction flow is implemented -->

    <!-- Notifications -->
    <div class="fixed top-20 right-4 z-40 space-y-2">
      <transition-group name="notification" tag="div">
        <el-alert v-for="notification in appStore.notifications" :key="notification.id" :type="notification.type"
          :title="notification.title" :description="notification.message" :closable="true"
          @close="appStore.removeNotification(notification.id)" class="max-w-sm" />
      </transition-group>
    </div>

    <!-- Network status indicator -->
    <div v-if="!isOnline" class="fixed bottom-4 left-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-40">
      <div class="flex items-center space-x-2">
        <el-icon>
          <Warning />
        </el-icon>
        <span class="text-sm font-medium">{{ $t('common.offline') }}</span>
      </div>
    </div>

    <!-- Update available notification -->
    <div v-if="updateAvailable"
      class="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-40">
      <div class="flex items-center space-x-2">
        <el-icon>
          <InfoFilled />
        </el-icon>
        <span class="text-sm font-medium">{{ $t('common.updateAvailable') }}</span>
        <button @click="refreshApp" class="ml-2 text-sm underline hover:no-underline">
          {{ $t('common.refresh') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElConfigProvider } from 'element-plus'
import { Warning, InfoFilled } from '@element-plus/icons-vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'

// Components
import AppHeader from './components/layout/AppHeader.vue'
import LoadingSpinner from './components/common/LoadingSpinner.vue'
// Removed: import TransactionModal from './components/common/TransactionModal.vue'

// Stores
import { useAppStore } from './stores/app'
import { useWalletStore } from './stores/wallet'

// Utils
import { logError } from './utils/error'
import { STORAGE_KEYS } from './constants'

import {
  createAppKit,
} from '@reown/appkit/vue'
import { wagmiAdapter, networks, projectId } from './config/index'

const route = useRoute()
const { t, locale: i18nLocale } = useI18n()
const appStore = useAppStore()
const walletStore = useWalletStore()

// Initialize AppKit
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  themeMode: appStore.theme,
  features: {
    analytics: false,
    swaps: false,
    send: false,
    onramp: false,
    email: false,
    socials: false,
    pay: false,
    receive: false,
    history: false,
  },
  enableWalletConnect: true,
  metadata: {
    name: 'CINA Protocol - Web3 DApp',
    description: 'CINA Protocol - Web3 DApp',
    url: 'https://cina-beta.dev.isecsp.cn',
    icons: ['https://cina-beta.dev.isecsp.cn/favicon.ico']
  },
  featuredWalletIds: [
    '1aedbcfc1f31aade56ca34c38b0a1607b41cccfa3de93c946ef3b4ba2dfab11c', // OneKey
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    '5d9f1395b3a8e848684848dc4147cbd05c8d54bb737eac78fe103901fe6b01a1', // OKX Wallet
    'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase Wallet
    '8a0ee50d1f22f6651afcae7eb4253e52a3310b90af5daef78a8c4929a9bb99d4', // Binance Wallet
    'a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393', // Phantom Wallet
    '20459438007b75f4f4acb98bf29aa3b800550309646d375da5fd4aac6c2a2c66', // TokenPocket
    'c03dfee351b6fcc421b4494ea33b9d4b92a984f87aa76d1663bb28705e95034a', // Uniswap Wallet
  ],
  themeVariables: {
    "--w3m-z-index": 1000,
  }
})

// Reactive state
const isOnline = ref(navigator.onLine)
const updateAvailable = ref(false)
// Removed TransactionModal local state
// const showTransactionModal = ref(false)
// const currentTransaction = ref(null)

// Computed
const locale = computed(() => {
  return i18nLocale.value === 'zh' ? zhCn : en
})

const pageTitle = computed(() => {
  const routeTitle = route.meta?.title
  if (routeTitle) {
    return `${routeTitle} - ${t('common.appName')}`
  }
  return t('common.appName')
})

// Methods
const onPageEnter = (el: Element) => {
  // Page enter animation logic
  el.classList.add('page-enter-active')
}

const onPageLeave = (el: Element) => {
  // Page leave animation logic
  el.classList.add('page-leave-active')
}

// Removed: closeTransactionModal and refreshApp remains

const refreshApp = () => {
  window.location.reload()
}

const handleOnline = () => {
  isOnline.value = true
  appStore.addNotification({
    type: 'success',
    title: t('common.connectionRestored'),
    message: t('common.connectionRestoredMessage')
  })
}

const handleOffline = () => {
  isOnline.value = false
  appStore.addNotification({
    type: 'warning',
    title: t('common.connectionLost'),
    message: t('common.connectionLostMessage')
  })
}

const handleVisibilityChange = () => {
  if (!document.hidden && walletStore.isConnected) {
    // Refresh data when app becomes visible
    walletStore.updateBalance()
  }
}

// Removed beforeunload handler because walletStore.hasPendingTransactions does not exist
// const handleBeforeUnload = (event: BeforeUnloadEvent) => {
//   if (walletStore.hasPendingTransactions) {
//     event.preventDefault()
//     event.returnValue = t('common.pendingTransactionsWarning')
//     return event.returnValue
//   }
// }

const handleError = (error: ErrorEvent) => {
  logError(error.error, {
    type: 'global_error',
    filename: error.filename,
    lineno: error.lineno,
    colno: error.colno
  })

  appStore.addNotification({
    type: 'error',
    title: t('error.unexpectedError'),
    message: t('error.unexpectedErrorMessage')
  })
}

const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
  logError(event.reason, {
    type: 'unhandled_rejection'
  })

  appStore.addNotification({
    type: 'error',
    title: t('error.unexpectedError'),
    message: t('error.unexpectedErrorMessage')
  })
}

// Lifecycle
onMounted(async () => {
  try {
    // Initialize app
    await appStore.initializeApp()

    // Try to reconnect wallet if previously connected
    if (localStorage.getItem(STORAGE_KEYS.WALLET_CONNECTED) === 'true') {
      await walletStore.initializeConnection()
    }

    // Set up event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    // Removed: beforeunload listener
    // window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Check for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        updateAvailable.value = true
      })
    }

  } catch (error) {
    logError(error, { context: 'app_initialization' })
    appStore.addNotification({
      type: 'error',
      title: t('error.initializationFailed'),
      message: t('error.initializationFailedMessage')
    })
  }
})

onUnmounted(() => {
  // Clean up event listeners
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
  // Removed: beforeunload listener
  // window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('error', handleError)
  window.removeEventListener('unhandledrejection', handleUnhandledRejection)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

// Watch for route changes to update page title
watch(pageTitle, (newTitle) => {
  document.title = newTitle
}, { immediate: true })

// Watch for theme changes
watch(
  () => appStore.theme,
  (newTheme) => {
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  },
  { immediate: true }
)

// Watch for language changes
watch(
  () => appStore.language,
  (newLanguage) => {
    document.documentElement.lang = newLanguage
  },
  { immediate: true }
)

// Global transaction modal handling
// Removed global transaction modal handling watcher because walletStore.currentTransaction does not exist
// watch(
//   () => walletStore.currentTransaction,
//   (transaction) => {
//     if (transaction) {
//       currentTransaction.value = transaction
//       showTransactionModal.value = true
//     }
//   }
// )
</script>

<style scoped>
/* Page transitions */
.page-enter-active,
.page-leave-active {
  transition: all 0.3s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.page-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* Notification transitions */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification-move {
  transition: transform 0.3s ease;
}

/* App layout */
#app {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
}

/* Dark mode styles */
.dark {
  color-scheme: dark;
}

/* Desktop layout - normal scrolling */
.content-app {
  @apply min-h-screen transition-colors duration-300;
}

.content-main {
  @apply pt-16;
  min-height: calc(100vh - 4rem);
  /* 4rem = pt-16 */
}

/* Mobile layout - flex with contained scrolling */
@media (max-width: 768px) {
  #app {
    overflow: hidden;
  }

  .page-enter-from,
  .page-leave-to {
    transform: translateY(20px);
  }

  .content-app {
    @apply h-screen transition-colors duration-300 flex flex-col;
  }

  .content-main {
    @apply pt-16 flex-1;
    /* Enable scrolling on mobile */
    -webkit-overflow-scrolling: touch;
  }

  .content-main>div {
    @apply h-full;
  }
}

/* Loading overlay */
.loading-overlay {
  backdrop-filter: blur(4px);
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.7);
}

.dark ::-webkit-scrollbar-thumb {
  background: rgba(75, 85, 99, 0.5);
}

.dark ::-webkit-scrollbar-thumb:hover {
  background: rgba(75, 85, 99, 0.7);
}

/* Focus styles */
.focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}

/* Animation utilities */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* Print styles */
@media print {
  .no-print {
    display: none !important;
  }
}
</style>