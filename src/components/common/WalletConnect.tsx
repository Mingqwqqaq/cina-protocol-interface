import { CopyOutlined, DownOutlined, LinkOutlined, LogoutOutlined } from '@ant-design/icons'
import { App } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppKit } from '@reown/appkit/react'
import { useDisconnect } from 'wagmi'
import { useWalletStore } from '@/stores/wallet'
import { resolveText } from '@/utils/i18n'

export function WalletConnect() {
  const { modal } = App.useApp()
  const { t } = useTranslation()
  const { disconnectAsync } = useDisconnect()
  const wallet = useWalletStore()
  const { open } = useAppKit()
  const [menuOpen, setMenuOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  async function onMenuClick(action: string) {
    setMenuOpen(false)

    switch (action) {
      case 'copy':
        if (wallet.address) {
          await navigator.clipboard.writeText(wallet.address)
        }
        return
      case 'network':
        await open({ view: 'Networks' })
        return
      case 'wallet':
        await open()
        return
      case 'explorer':
        if (wallet.chainId && wallet.address) {
          const baseUrl = wallet.chainId === 11155111 ? 'https://sepolia.etherscan.io' : 'https://etherscan.io'
          window.open(`${baseUrl}/address/${wallet.address}`, '_blank', 'noopener,noreferrer')
        }
        return
      case 'disconnect':
        modal.confirm({
          title: resolveText(t('wallet.disconnect'), 'wallet.disconnect', 'Disconnect Wallet'),
          content: resolveText(t('wallet.confirmDisconnect'), 'wallet.confirmDisconnect', 'Confirm wallet disconnection?'),
          onOk: async () => {
            await disconnectAsync()
          }
        })
    }
  }

  if (!wallet.isConnected) {
    return (
      <button
        className="app-nav-link"
        style={{ color: 'var(--primary-color)' }}
        disabled={wallet.isConnecting}
        type="button"
        onClick={() => void open()}
      >
        <span>{resolveText(t('wallet.connect'), 'wallet.connect', 'Connect')}</span>
      </button>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        aria-expanded={menuOpen}
        className="app-nav-link"
        style={{ color: 'var(--primary-color)' }}
        type="button"
        onClick={() => setMenuOpen(current => !current)}
      >
        <span>{wallet.shortAddress}</span>
        <DownOutlined style={{ fontSize: '0.75rem', marginLeft: '0.25rem' }} />
      </button>

      {menuOpen ? (
        <div className="app-dropdown-menu">
          <button className="app-dropdown-item" type="button" onClick={() => void onMenuClick('copy')}>
            <span>{resolveText(t('wallet.copyAddress'), 'wallet.copyAddress', 'Copy Address')}</span>
            <CopyOutlined />
          </button>
          <button className="app-dropdown-item" type="button" onClick={() => void onMenuClick('network')}>
            <span>{resolveText(t('wallet.switchNetwork'), 'wallet.switchNetwork', 'Switch Network')}</span>
          </button>
          <button className="app-dropdown-item" type="button" onClick={() => void onMenuClick('wallet')}>
            <span>{resolveText(t('wallet.showWallet'), 'wallet.showWallet', 'Show Wallet')}</span>
          </button>
          <button className="app-dropdown-item" type="button" onClick={() => void onMenuClick('explorer')}>
            <span>{resolveText(t('wallet.viewOnExplorer'), 'wallet.viewOnExplorer', 'View On Explorer')}</span>
            <LinkOutlined />
          </button>
          <button className="app-dropdown-item is-danger" type="button" onClick={() => void onMenuClick('disconnect')}>
            <span>{resolveText(t('wallet.disconnect'), 'wallet.disconnect', 'Disconnect')}</span>
            <LogoutOutlined />
          </button>
        </div>
      ) : null}
    </div>
  )
}
