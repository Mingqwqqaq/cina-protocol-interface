export type ThemeMode = 'light' | 'dark'
export type AppLanguage = 'en' | 'zh'
export type NotificationType = 'success' | 'warning' | 'error' | 'info'
export type WalletStatus = 'connecting' | 'connected' | 'disconnected'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number
  timestamp: number
}

export interface RouteHandle {
  title: string
}

export interface WalletSnapshot {
  status: WalletStatus
  address: string
  chainId: number
  balance: string
  isConnecting: boolean
  isSupportedNetwork: boolean
}
