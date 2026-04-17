import { BulbOutlined, MenuOutlined } from '@ant-design/icons'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { WalletConnect } from '@/components/common/WalletConnect'
import { useAppStore } from '@/stores/app'
import { resolveText } from '@/utils/i18n'

interface NavigationLink {
  label: string
  path: string
}

interface NavigationGroup {
  label: string
  children: NavigationLink[]
}

type NavigationItem = NavigationLink | NavigationGroup

const navigationItems: NavigationItem[] = [
  { label: 'dashboard', path: '/' },
  {
    label: 'WRMB',
    children: [
      { label: 'swap', path: '/swap' },
      { label: 'savings', path: '/savings' },
      { label: 'wrap', path: '/wrap' }
    ]
  },
  {
    label: 'CINA',
    children: [
      { label: 'farm', path: '/farm' },
      { label: 'staking', path: '/staking' },
      { label: 'bonds', path: '/bonds' }
    ]
  },
  { label: 'status', path: '/status' }
]

function isNavigationGroup(item: NavigationItem): item is NavigationGroup {
  return 'children' in item
}

function isActivePath(pathname: string, path: string) {
  return pathname === path
}

function isGroupActive(pathname: string, item: NavigationGroup) {
  return item.children.some(child => isActivePath(pathname, child.path))
}

function getNavigationLabel(label: string, t: (key: string) => string) {
  if (label === 'WRMB' || label === 'CINA') {
    return label
  }

  const key = `navigation.${label}`
  const fallbacks: Record<string, string> = {
    bonds: 'Bonds',
    dashboard: 'Dashboard',
    farm: 'Farm',
    savings: 'Savings',
    staking: 'Staking',
    status: 'Status',
    swap: 'Swap',
    wrap: 'Wrap'
  }

  return resolveText(t(key), key, fallbacks[label] ?? label)
}

export function AppHeader() {
  const { pathname } = useLocation()
  const { i18n, t } = useTranslation()
  const language = useAppStore(state => state.language)
  const theme = useAppStore(state => state.theme)
  const setLanguage = useAppStore(state => state.setLanguage)
  const toggleTheme = useAppStore(state => state.toggleTheme)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setActiveMenu(null)
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setActiveMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  async function handleLanguageChange(nextLanguage: 'en' | 'zh') {
    setLanguage(nextLanguage)
    setActiveMenu(null)
    await i18n.changeLanguage(nextLanguage)
  }

  return (
    <header className="app-header">
      <div ref={containerRef}>
        <div className="app-header-inner">
          <Link className="app-brand" to="/">
            CINA DOLLAR
          </Link>

          <nav aria-label="Primary navigation" className="app-header-nav">
            {navigationItems.map(item => {
              if (!isNavigationGroup(item)) {
                return (
                  <Link
                    key={item.path}
                    className={`app-nav-link ${isActivePath(pathname, item.path) ? 'is-active' : ''}`}
                    to={item.path}
                  >
                    {getNavigationLabel(item.label, t)}
                  </Link>
                )
              }

              const isActive = isGroupActive(pathname, item)
              const isOpen = activeMenu === item.label

              return (
                <div
                  key={item.label}
                  className={`app-nav-group ${isOpen ? 'is-open' : ''}`}
                  onMouseEnter={() => setActiveMenu(item.label)}
                  onMouseLeave={() => setActiveMenu(current => (current === item.label ? null : current))}
                >
                  <button
                    aria-expanded={isOpen}
                    className={`app-nav-trigger ${isActive ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => setActiveMenu(current => (current === item.label ? null : item.label))}
                  >
                    {item.label}
                    <span aria-hidden="true" className="text-xs">▾</span>
                  </button>
                  <div className="app-nav-group-menu">
                    {item.children.map(child => (
                      <Link
                        key={child.path}
                        className={`app-nav-group-link ${isActivePath(pathname, child.path) ? 'is-active' : ''}`}
                        to={child.path}
                      >
                        {getNavigationLabel(child.label, t)}
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </nav>

          <div className="app-header-actions">
            <button
              aria-label="Toggle color theme"
              className="app-icon-button"
              type="button"
              onClick={toggleTheme}
            >
              <BulbOutlined />
              <span className="sr-only">{theme}</span>
            </button>

            <div className="relative">
              <button
                aria-expanded={activeMenu === 'language'}
                aria-label="Toggle language menu"
                className="app-nav-link"
                style={{ background: 'transparent' }}
                type="button"
                onClick={() => setActiveMenu(current => (current === 'language' ? null : 'language'))}
              >
                {language === 'en' ? 'En' : 'Zh'}
              </button>
              {activeMenu === 'language' ? (
                <div className="app-dropdown-menu">
                  <button
                    className="app-dropdown-item"
                    type="button"
                    onClick={() => void handleLanguageChange('en')}
                  >
                    <span>English</span>
                    {language === 'en' ? <strong>EN</strong> : null}
                  </button>
                  <button
                    className="app-dropdown-item"
                    type="button"
                    onClick={() => void handleLanguageChange('zh')}
                  >
                    <span>中文</span>
                    {language === 'zh' ? <strong>ZH</strong> : null}
                  </button>
                </div>
              ) : null}
            </div>

            <WalletConnect />

            <button
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
              className="app-icon-button app-header-mobile-toggle"
              type="button"
              onClick={() => setMobileMenuOpen(current => !current)}
            >
              <MenuOutlined />
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="app-mobile-menu">
            <nav aria-label="Mobile navigation" className="app-mobile-menu-panel">
              {navigationItems.map(item => {
                if (isNavigationGroup(item)) {
                  return (
                    <div key={item.label}>
                      <div className="app-mobile-section-label">{item.label}</div>
                      <div className="app-mobile-group-children">
                        {item.children.map(child => (
                          <Link
                            key={child.path}
                            className={`app-mobile-link ${isActivePath(pathname, child.path) ? 'is-active' : ''}`}
                            to={child.path}
                          >
                            {getNavigationLabel(child.label, t)}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )
                }

                return (
                  <Link
                    key={item.path}
                    className={`app-mobile-link ${isActivePath(pathname, item.path) ? 'is-active' : ''}`}
                    to={item.path}
                  >
                    {getNavigationLabel(item.label, t)}
                  </Link>
                )
              })}
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  )
}
