import type { PropsWithChildren } from 'react'
import { useEffect } from 'react'
import { App as AntdApp, ConfigProvider, theme } from 'antd'
import enUS from 'antd/locale/en_US'
import zhCN from 'antd/locale/zh_CN'
import { I18nextProvider } from 'react-i18next'
import { QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { wagmiAdapter } from '@/config'
import { queryClient } from '@/app/queryClient'
import { FeedbackBridge } from '@/components/system/FeedbackBridge'
import { i18n } from '@/i18n'
import { useAppStore } from '@/stores/app'

export function AppProviders({ children }: PropsWithChildren) {
  const initializeApp = useAppStore(state => state.initializeApp)
  const language = useAppStore(state => state.language)
  const themeMode = useAppStore(state => state.theme)

  useEffect(() => {
    initializeApp()
  }, [initializeApp])

  useEffect(() => {
    void i18n.changeLanguage(language)
  }, [language])

  return (
    <ConfigProvider
      locale={language === 'zh' ? zhCN : enUS}
      theme={{
        algorithm: themeMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          borderRadius: 12,
          colorPrimary: themeMode === 'dark' ? '#EBB257' : '#343A6C',
          fontFamily: 'Inter, system-ui, sans-serif'
        }
      }}
    >
      <AntdApp>
        <FeedbackBridge />
        <WagmiProvider config={wagmiAdapter.wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </AntdApp>
    </ConfigProvider>
  )
}
