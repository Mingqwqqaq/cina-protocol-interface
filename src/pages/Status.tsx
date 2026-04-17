import { CopyOutlined, DownOutlined, LinkOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatUnits, parseUnits } from 'ethers'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_CHAIN_ID, NETWORKS, TOKENS, CONTRACTS } from '@/constants'
import { feedback } from '@/lib/feedback'
import { PageScaffold, PageSection } from '@/pages/PageScaffold'
import { contractService } from '@/services/contracts'
import { useWalletStore } from '@/stores/wallet'
import { formatAddress, formatLargeNumber } from '@/utils/format'
import { resolveText } from '@/utils/i18n'

interface TokenView {
  totalSupply: string
  userBalance: string
  loading: boolean
}

const emptyTokenView: TokenView = {
  loading: false,
  totalSupply: '0',
  userBalance: '0'
}

export default function StatusPage() {
  const { t } = useTranslation()
  const wallet = useWalletStore()
  const queryClient = useQueryClient()
  const currentChainId = wallet.chainId || DEFAULT_CHAIN_ID

  const [selectedNetwork, setSelectedNetwork] = useState(currentChainId)
  const [networkMenuOpen, setNetworkMenuOpen] = useState(false)
  const [queryOpen, setQueryOpen] = useState(false)
  const [queryAddress, setQueryAddress] = useState('')
  const [queryLoading, setQueryLoading] = useState(false)
  const [queryResults, setQueryResults] = useState<Record<string, string>>({})
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferTokenKey, setTransferTokenKey] = useState<keyof typeof TOKENS | ''>('')
  const [transferToAddress, setTransferToAddress] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)

  useEffect(() => {
    if (selectedNetwork === currentChainId) {
      setSelectedNetwork(currentChainId)
    }
  }, [currentChainId, selectedNetwork])

  const liveDataEnabled = selectedNetwork === currentChainId
  const tokenEntries = Object.entries(TOKENS)
  const contractEntries = Object.entries(CONTRACTS)
  const selectedNetworkConfig =
    Object.values(NETWORKS).find(network => network.chainId === selectedNetwork) ?? NETWORKS.ETHEREUM

  const tokenDataQuery = useQuery({
    queryKey: ['status', 'tokens', selectedNetwork, currentChainId, wallet.address],
    refetchInterval: liveDataEnabled ? 15_000 : false,
    queryFn: async (): Promise<Record<string, TokenView>> => {
      if (!liveDataEnabled) {
        return Object.fromEntries(tokenEntries.map(([key]) => [key, emptyTokenView]))
      }

      const results = await Promise.all(
        tokenEntries.map(async ([key, token]) => {
          const tokenAddress = token.addresses[selectedNetwork as keyof typeof token.addresses]
          if (!tokenAddress) {
            return [key, emptyTokenView] as const
          }

          const contract = contractService.getERC20Contract(tokenAddress)
          if (!contract) {
            return [key, emptyTokenView] as const
          }

          const [totalSupply, userBalance] = await Promise.all([
            contract.totalSupply().catch(() => 0n),
            wallet.address ? contract.balanceOf(wallet.address).catch(() => 0n) : 0n
          ])

          return [
            key,
            {
              loading: false,
              totalSupply: formatUnits(totalSupply, token.decimals),
              userBalance: formatUnits(userBalance, token.decimals)
            }
          ] as const
        })
      )

      return Object.fromEntries(results)
    }
  })

  const tokenData = tokenDataQuery.data ?? {}
  const networkOptions = useMemo(
    () =>
      Object.values(NETWORKS).map(network => ({
        label: network.name,
        value: network.chainId
      })),
    []
  )

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      feedback.success(t('status.toast.addressCopied'))
    } catch {
      feedback.error(t('status.toast.queryFailed'))
    }
  }

  const openExplorer = (address: string) => {
    if (!selectedNetworkConfig.blockExplorer) {
      return
    }

    window.open(`${selectedNetworkConfig.blockExplorer}/address/${address}`, '_blank', 'noopener,noreferrer')
  }

  const refreshData = async () => {
    await queryClient.invalidateQueries({ queryKey: ['status'] })
  }

  const openQueryModal = (initialAddress: string) => {
    setQueryAddress(initialAddress)
    setQueryResults({})
    setQueryOpen(true)
  }

  const queryAddressBalance = async () => {
    if (!queryAddress) {
      return
    }

    if (!liveDataEnabled) {
      feedback.warning(`${t('status.selectNetwork')}: ${selectedNetworkConfig.name}`)
      return
    }

    setQueryLoading(true)
    setQueryResults({})

    try {
      const results = await Promise.all(
        tokenEntries.map(async ([key, token]) => {
          const tokenAddress = token.addresses[selectedNetwork as keyof typeof token.addresses]
          if (!tokenAddress) {
            return [key, '0'] as const
          }

          const contract = contractService.getERC20Contract(tokenAddress)
          if (!contract) {
            return [key, '0'] as const
          }

          const balance = await contract.balanceOf(queryAddress).catch(() => 0n)
          return [key, formatUnits(balance, token.decimals)] as const
        })
      )

      setQueryResults(Object.fromEntries(results))
    } catch {
      feedback.error(t('status.toast.queryFailed'))
    } finally {
      setQueryLoading(false)
    }
  }

  const openTransferModal = (tokenKey: keyof typeof TOKENS) => {
    setTransferTokenKey(tokenKey)
    setTransferToAddress('')
    setTransferAmount('')
    setTransferOpen(true)
  }

  const executeTransfer = async () => {
    if (!transferTokenKey || !transferToAddress || !transferAmount) {
      return
    }

    if (!wallet.isConnected || !liveDataEnabled) {
      feedback.warning(t('wallet.connectWallet'))
      return
    }

    const token = TOKENS[transferTokenKey]
    const tokenAddress = token.addresses[selectedNetwork as keyof typeof token.addresses]
    const contract = tokenAddress ? contractService.getERC20Contract(tokenAddress, true) : null
    if (!contract) {
      feedback.error(t('status.toast.transferFailed'))
      return
    }

    setTransferLoading(true)

    try {
      feedback.info(t('status.toast.transferSubmitted'))
      const tx = await contract.transfer(transferToAddress, parseUnits(transferAmount, token.decimals))
      await tx.wait()
      feedback.success(t('status.toast.transferSuccess'))
      setTransferOpen(false)
      await refreshData()
    } catch (error) {
      feedback.error(error instanceof Error ? error.message : t('status.toast.transferFailed'))
    } finally {
      setTransferLoading(false)
    }
  }

  const pageTitle = resolveText(t('status.title'), 'status.title', 'Status')
  const connectWalletLabel = resolveText(t('wallet.connectWallet'), 'wallet.connectWallet', 'Connect Wallet')
  const tokenContractsTitle = resolveText(t('status.tokenContracts'), 'status.tokenContracts', 'Token Contracts')
  const smartContractsTitle = resolveText(t('status.smartContracts'), 'status.smartContracts', 'Smart Contracts')
  const myBalanceLabel = resolveText(t('status.myBalance'), 'status.myBalance', 'My Balance')
  const refreshLabel = resolveText(t('status.refresh'), 'status.refresh', 'Refresh')
  const selectNetworkLabel = resolveText(t('status.selectNetwork'), 'status.selectNetwork', 'Select Network')
  const queryBalanceLabel = resolveText(t('status.queryBalance'), 'status.queryBalance', 'Query Balance')
  const quickTransferLabel = resolveText(t('status.quickTransfer'), 'status.quickTransfer', 'Quick Transfer')
  const addressLabel = resolveText(t('status.address'), 'status.address', 'Address')
  const totalSupplyLabel = resolveText(t('status.totalSupply'), 'status.totalSupply', 'Total Supply')
  const decimalsLabel = resolveText(t('status.decimals'), 'status.decimals', 'Decimals')
  const notDeployedLabel = resolveText(t('status.notDeployed'), 'status.notDeployed', 'Not Deployed')
  const contractLabel = resolveText(t('status.contract'), 'status.contract', 'Contract')
  const transferTitle = resolveText(t('status.transferModal.title'), 'status.transferModal.title', 'Transfer Token')
  const transferConfirmLabel = resolveText(
    t('status.transferModal.confirmTransfer'),
    'status.transferModal.confirmTransfer',
    'Confirm Transfer'
  )
  const transferCancelLabel = resolveText(t('status.transferModal.cancel'), 'status.transferModal.cancel', 'Cancel')
  const transferReceiverLabel = resolveText(
    t('status.transferModal.receiverPlaceholder'),
    'status.transferModal.receiverPlaceholder',
    'Receiver Address'
  )
  const transferAmountLabel = resolveText(
    t('status.transferModal.amountPlaceholder'),
    'status.transferModal.amountPlaceholder',
    'Amount'
  )
  const availableBalanceLabel = resolveText(
    t('status.transferModal.availableBalance'),
    'status.transferModal.availableBalance',
    'Available Balance'
  )
  const queryTitle = resolveText(t('status.queryBalanceModal.title'), 'status.queryBalanceModal.title', 'Query Balance')
  const queryPlaceholder = resolveText(
    t('status.queryBalanceModal.placeholder'),
    'status.queryBalanceModal.placeholder',
    'Wallet Address'
  )
  const queryConfirmLabel = resolveText(t('status.queryBalanceModal.query'), 'status.queryBalanceModal.query', 'Query')
  const queryCancelLabel = resolveText(t('status.queryBalanceModal.cancel'), 'status.queryBalanceModal.cancel', 'Cancel')

  const networkToolbar = (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div className="relative">
        <button className="app-action-button is-subtle" type="button" onClick={() => setNetworkMenuOpen(open => !open)}>
          <span>{selectedNetworkConfig.name}</span>
          <DownOutlined />
        </button>
        {networkMenuOpen ? (
          <div className="app-dropdown-menu min-w-[15rem]">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
              {selectNetworkLabel}
            </div>
            {networkOptions.map(option => (
              <button
                key={option.value}
                className={`app-dropdown-item ${selectedNetwork === option.value ? 'text-[var(--primary-color)]' : ''}`}
                type="button"
                onClick={() => {
                  setSelectedNetwork(option.value)
                  setNetworkMenuOpen(false)
                }}
              >
                <span>{option.label}</span>
                {selectedNetwork === option.value ? <span>Current</span> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <button className="app-action-button is-subtle" type="button" onClick={() => void refreshData()}>
        <ReloadOutlined />
        <span>{refreshLabel}</span>
      </button>
    </div>
  )

  return (
    <PageScaffold extra={networkToolbar} title={pageTitle}>
      {!liveDataEnabled ? (
        <div className="app-inline-note is-info mb-6">
          {selectNetworkLabel}: {selectedNetworkConfig.name}
        </div>
      ) : null}

      <div className="mb-8">
        <div className="mb-6">
          <h2 className="page-section-title">{tokenContractsTitle}</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {wallet.isConnected ? myBalanceLabel : resolveText(t('wallet.connectWallet'), 'wallet.connectWallet', 'Connect Wallet')}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {tokenEntries.map(([key, token]) => {
            const rawTokenAddress = token.addresses[selectedNetwork as keyof typeof token.addresses] as string | undefined
            const tokenAddress = rawTokenAddress || '0x0000000000000000000000000000000000000000'
            const tokenView = tokenData[key] ?? emptyTokenView

            return (
              <article key={key} className="flex flex-col h-full rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] p-6 relative">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">{token.name}</h3>
                  <span className="rounded-md bg-[var(--bg-secondary)] px-2 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    {token.symbol}
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">{decimalsLabel}:</span>
                    <span className="font-medium text-[var(--text-primary)]">{token.decimals}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">{totalSupplyLabel}:</span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {tokenAddress ? `${formatLargeNumber(tokenView.totalSupply)} ${token.symbol}` : notDeployedLabel}
                    </span>
                  </div>
                  {wallet.isConnected ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">{myBalanceLabel}:</span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {`${formatLargeNumber(tokenView.userBalance)} ${token.symbol}`}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between text-sm pt-1">
                    <span className="text-[var(--text-secondary)]">{addressLabel}:</span>
                    {tokenAddress ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[var(--text-secondary)]">{formatAddress(tokenAddress)}</span>
                        <button className="text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors p-1" type="button" onClick={() => void handleCopy(tokenAddress)} title={t('status.copyAddress')}>
                          <CopyOutlined />
                        </button>
                        <button className="text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors p-1" type="button" onClick={() => openExplorer(tokenAddress)} title={t('status.viewOnExplorer')}>
                          <LinkOutlined />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[var(--text-secondary)]">{notDeployedLabel}</span>
                    )}
                  </div>
                </div>

                <div className="mt-auto">
                  <button
                    className="app-action-button w-full justify-center is-subtle mt-4"
                    style={{ backgroundColor: '#8a94b5', color: '#fff', border: 'none' }}
                    disabled={!tokenAddress || !wallet.isConnected || !liveDataEnabled}
                    type="button"
                    onClick={() => openTransferModal(key as keyof typeof TOKENS)}
                  >
                    {quickTransferLabel}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-6">
          <h2 className="page-section-title">{smartContractsTitle}</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{selectedNetworkConfig.name}</p>
        </div>

        {contractEntries.length === 0 ? (
          <div className="app-inline-note">{notDeployedLabel}</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {contractEntries.map(([key, contract]) => {
              const rawValue = contract[selectedNetwork as keyof typeof contract] as string | undefined
              const value = rawValue || '0x0000000000000000000000000000000000000000'
              return (
              <article key={key} className="flex flex-col h-full rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] p-6 relative">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
                  <span className="rounded-md bg-[var(--success-color)] px-2 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                    {contractLabel}
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm pt-1">
                    <span className="text-[var(--text-secondary)]">{addressLabel}:</span>
                    {value ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[var(--text-secondary)]">{formatAddress(value)}</span>
                        <button className="text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors p-1" type="button" onClick={() => void handleCopy(value)} title={t('status.copyAddress')}>
                          <CopyOutlined />
                        </button>
                        <button className="text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors p-1" type="button" onClick={() => openExplorer(value)} title={t('status.viewOnExplorer')}>
                          <LinkOutlined />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[var(--text-secondary)]">{notDeployedLabel}</span>
                    )}
                  </div>
                </div>

                <div className="mt-auto">
                  <button
                    className="app-action-button w-full justify-center is-subtle mt-4"
                    disabled={!value}
                    type="button"
                    onClick={() => openQueryModal(value || '')}
                  >
                    {queryBalanceLabel}
                  </button>
                </div>
              </article>
            )})}
          </div>
        )}
      </div>

      {queryOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.45)] p-4">
          <div className="w-full max-w-xl rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{queryTitle}</h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{queryPlaceholder}</p>
              </div>
              <button className="app-icon-button" type="button" onClick={() => setQueryOpen(false)}>
                ×
              </button>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--text-primary)]">{addressLabel}</span>
                <input
                  className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-[var(--text-primary)] outline-none"
                  placeholder={queryPlaceholder}
                  value={queryAddress}
                  onChange={event => setQueryAddress(event.target.value)}
                />
              </label>

              {Object.keys(queryResults).length > 0 ? (
                <div className="rounded-2xl bg-[var(--bg-secondary)] p-4">
                  <div className="space-y-3">
                    {Object.entries(queryResults).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-[var(--text-secondary)]">{TOKENS[key as keyof typeof TOKENS].symbol}</span>
                        <span className="font-medium text-[var(--text-primary)]">{formatLargeNumber(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-3">
                <button className="app-action-button is-subtle" type="button" onClick={() => setQueryOpen(false)}>
                  {queryCancelLabel}
                </button>
                <button
                  className="app-action-button is-primary"
                  disabled={queryLoading}
                  type="button"
                  onClick={() => void queryAddressBalance()}
                >
                  {queryLoading ? `${queryConfirmLabel}...` : queryConfirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {transferOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.45)] p-4">
          <div className="w-full max-w-xl rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  {transferTitle}
                  {transferTokenKey ? ` - ${TOKENS[transferTokenKey].symbol}` : ''}
                </h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{selectedNetworkConfig.name}</p>
              </div>
              <button className="app-icon-button" type="button" onClick={() => setTransferOpen(false)}>
                ×
              </button>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--text-primary)]">{transferReceiverLabel}</span>
                <input
                  className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-[var(--text-primary)] outline-none"
                  placeholder={transferReceiverLabel}
                  value={transferToAddress}
                  onChange={event => setTransferToAddress(event.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--text-primary)]">{transferAmountLabel}</span>
                <input
                  className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-[var(--text-primary)] outline-none"
                  placeholder={transferAmountLabel}
                  value={transferAmount}
                  onChange={event => setTransferAmount(event.target.value)}
                />
                {transferTokenKey ? (
                  <div className="mt-2 text-sm text-[var(--text-secondary)]">
                    {availableBalanceLabel}: {formatLargeNumber(tokenData[transferTokenKey]?.userBalance || '0')} {TOKENS[transferTokenKey].symbol}
                  </div>
                ) : null}
              </label>

              <div className="flex flex-wrap justify-end gap-3">
                <button className="app-action-button is-subtle" disabled={transferLoading} type="button" onClick={() => setTransferOpen(false)}>
                  {transferCancelLabel}
                </button>
                <button
                  className="app-action-button is-primary"
                  disabled={!transferAmount || !transferToAddress || transferLoading}
                  type="button"
                  onClick={() => void executeTransfer()}
                >
                  {transferLoading ? `${transferConfirmLabel}...` : transferConfirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PageScaffold>
  )
}
