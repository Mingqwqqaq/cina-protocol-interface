import { useEffect, useState } from 'react'
import { Outlet, useLocation, useMatches } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppHeader } from '@/components/layout/AppHeader'
import { WalletBridge } from '@/components/system/WalletBridge'
import { useAppStore } from '@/stores/app'
import type { RouteHandle } from '@/types/app'
import { resolveText } from '@/utils/i18n'

function useDocumentTitle() {
  const matches = useMatches()

  useEffect(() => {
    const titledMatch = [...matches].reverse().find(match => Boolean((match.handle as RouteHandle | undefined)?.title))
    const title = (titledMatch?.handle as RouteHandle | undefined)?.title
    document.title = title ? `${title} - WRMB Protocol` : 'WRMB Protocol'
  }, [matches])
}

function useScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
}

export function AppShell() {
  const { t } = useTranslation()
  const globalLoading = useAppStore(state => state.globalLoading)
  const notifications = useAppStore(state => state.notifications)
  const removeNotification = useAppStore(state => state.removeNotification)
  const addNotification = useAppStore(state => state.addNotification)
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  useDocumentTitle()
  useScrollToTop()

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
      addNotification({
        title: resolveText(t('common.connectionRestored'), 'common.connectionRestored', 'Connection restored'),
        type: 'success'
      })
    }

    function handleOffline() {
      setIsOnline(false)
      addNotification({
        title: resolveText(t('common.connectionLost'), 'common.connectionLost', 'Connection lost'),
        type: 'warning'
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [addNotification, t])

  return (
    <div className="app-shell">
      <WalletBridge />
      <AppHeader />

      {notifications.length ? (
        <div className="app-notification-stack">
          {notifications.map(notification => (
            <div key={notification.id} className={`app-notification is-${notification.type}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="app-notification-title">{notification.title}</div>
                  {notification.message ? <div className="app-notification-copy">{notification.message}</div> : null}
                </div>
                <button
                  aria-label="Dismiss notification"
                  className="text-sm text-[var(--text-secondary)]"
                  type="button"
                  onClick={() => removeNotification(notification.id)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!isOnline ? (
        <div className="app-banner is-warning">
          <div className="app-notification-title">{resolveText(t('common.offline'), 'common.offline', 'Offline')}</div>
          <div className="app-notification-copy">
            {resolveText(t('common.connectionLost'), 'common.connectionLost', 'Connection lost')}
          </div>
        </div>
      ) : null}

      <div className="app-page">
        <main className="app-page-main">
          <Outlet />
        </main>
      </div>

      {globalLoading ? (
        <div className="app-loading-overlay">
          <div className="app-loading-panel">
            <div className="app-spinner" />
            <div className="font-semibold text-[var(--text-primary)]">
              {resolveText(t('common.loading'), 'common.loading', 'Loading')}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
