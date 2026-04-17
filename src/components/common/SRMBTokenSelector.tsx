import { DownOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { formatUnits, isAddress } from 'ethers'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TokenIcon } from '@/components/common/TokenIcon'
import { feedback } from '@/lib/feedback'
import { contractService } from '@/services/contracts'
import { useWalletStore } from '@/stores/wallet'
import { resolveText } from '@/utils/i18n'

export interface SRMBToken {
  address: string
  symbol: string
  name: string
  balance: string
  active: boolean
  displayName: string
  wrappedAmount: string
}

interface SRMBTokenSelectorProps {
  value?: string
  disabled?: boolean
  showInactiveTokens?: boolean
  onChange: (value: string) => void
  onTokenChange?: (token: SRMBToken | null) => void
}

const RECENT_KEY_PREFIX = 'srmb_recent_selected'
const MAX_RECENT = 5

function getRecentKey(chainId: number, address: string) {
  return `${RECENT_KEY_PREFIX}_${chainId}_${address}`
}

export function SRMBTokenSelector({
  disabled,
  onChange,
  onTokenChange,
  showInactiveTokens = false,
  value = ''
}: SRMBTokenSelectorProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [addressInput, setAddressInput] = useState('')
  const wallet = useWalletStore()

  const srmbTokensQuery = useQuery({
    enabled: Boolean(wallet.chainId),
    queryKey: ['srmb-tokens', wallet.chainId, wallet.address, showInactiveTokens],
    queryFn: async () => {
      const factoryContract = contractService.getSRMBFactoryContract()
      const wrapManagerContract = contractService.getWrapManagerContract()

      if (!factoryContract || !wrapManagerContract || !wallet.address) {
        return [] as SRMBToken[]
      }

      const contractInfos = await factoryContract.getAllSRMBContracts()
      const tokens = await Promise.all(
        contractInfos.map(async (info: { sRMBContract: string; wrappedAmount: bigint; active: boolean }) => {
          if (!showInactiveTokens && !info.active) {
            return null
          }

          const tokenContract = contractService.getERC20Contract(info.sRMBContract)
          if (!tokenContract) {
            return null
          }

          const [isActive, name, symbol, balance, paused] = await Promise.all([
            wrapManagerContract.checkSRMBWrapActive(info.sRMBContract),
            tokenContract.name(),
            tokenContract.symbol(),
            tokenContract.balanceOf(wallet.address),
            tokenContract.paused().catch(() => false)
          ])

          if (!isActive || paused) {
            return null
          }

          const formattedBalance = formatUnits(balance, 6)
          return {
            address: info.sRMBContract,
            symbol,
            name,
            balance: formattedBalance,
            active: info.active,
            displayName: `${symbol} (${name})`,
            wrappedAmount: formatUnits(info.wrappedAmount, 6)
          } satisfies SRMBToken
        })
      )

      return tokens
        .filter((token): token is SRMBToken => Boolean(token))
        .sort((left, right) => Number.parseFloat(right.balance) - Number.parseFloat(left.balance))
    }
  })

  const selectedToken = useMemo(
    () => srmbTokensQuery.data?.find(token => token.address.toLowerCase() === value.toLowerCase()) ?? null,
    [srmbTokensQuery.data, value]
  )

  const recentTokens = useMemo(() => {
    if (!wallet.address || !wallet.chainId || !srmbTokensQuery.data?.length) {
      return [] as SRMBToken[]
    }

    try {
      const raw = localStorage.getItem(getRecentKey(wallet.chainId, wallet.address))
      const recentAddresses = raw ? (JSON.parse(raw) as string[]) : []
      const tokenMap = new Map(srmbTokensQuery.data.map(token => [token.address.toLowerCase(), token]))
      return recentAddresses
        .map(address => tokenMap.get(address.toLowerCase()))
        .filter((token): token is SRMBToken => Boolean(token))
    } catch {
      return []
    }
  }, [srmbTokensQuery.data, wallet.address, wallet.chainId])

  const persistRecentToken = (address: string) => {
    if (!wallet.address || !wallet.chainId) {
      return
    }

    const storageKey = getRecentKey(wallet.chainId, wallet.address)
    const existing = recentTokens.map(token => token.address).filter(item => item.toLowerCase() !== address.toLowerCase())
    const nextValue = [address, ...existing].slice(0, MAX_RECENT)
    localStorage.setItem(storageKey, JSON.stringify(nextValue))
  }

  const selectToken = (token: SRMBToken) => {
    onChange(token.address)
    onTokenChange?.(token)
    persistRecentToken(token.address)
    setOpen(false)
  }

  const handleAddressSelect = async () => {
    const contractAddress = addressInput.trim()
    if (!contractAddress) {
      feedback.warning(t('tokenSelector.enterContractAddress'))
      return
    }

    if (!isAddress(contractAddress)) {
      feedback.error(t('tokenSelector.invalidContractAddress'))
      return
    }

    const wrapManagerContract = contractService.getWrapManagerContract()
    const tokenContract = contractService.getERC20Contract(contractAddress)
    if (!wrapManagerContract || !tokenContract || !wallet.address) {
      feedback.error(t('tokenSelector.networkNotSupported'))
      return
    }

    const [isActive, name, symbol, balance, paused] = await Promise.all([
      wrapManagerContract.checkSRMBWrapActive(contractAddress),
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.balanceOf(wallet.address),
      tokenContract.paused().catch(() => false)
    ])

    if (!isActive) {
      feedback.warning(t('tokenSelector.tokenNotActive'))
      return
    }

    if (paused) {
      feedback.warning(t('tokenSelector.tokenPaused'))
      return
    }

    selectToken({
      address: contractAddress,
      symbol,
      name,
      balance: formatUnits(balance, 6),
      active: true,
      displayName: `${symbol} (${name})`,
      wrappedAmount: '0'
    })
  }

  const selectTokenLabel = resolveText(t('wrap.selectToken'), 'wrap.selectToken', 'Select Token')

  return (
    <>
      <button
        className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--primary-color)] hover:text-[var(--primary-color)] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        type="button"
        onClick={() => setOpen(true)}
      >
        {selectedToken ? <TokenIcon size="medium" symbol={selectedToken.symbol} /> : null}
        <span>{selectedToken?.symbol || selectTokenLabel}</span>
        <DownOutlined />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.45)] p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{selectTokenLabel}</h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {resolveText(
                    t('tokenSelector.enterContractAddress'),
                    'tokenSelector.enterContractAddress',
                    'Paste a token contract or choose one below.'
                  )}
                </p>
              </div>
              <button className="app-icon-button" type="button" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>

            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  className="min-w-0 flex-1 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-[var(--text-primary)] outline-none"
                  disabled={disabled}
                  placeholder={resolveText(
                    t('tokenSelector.enterContractAddress'),
                    'tokenSelector.enterContractAddress',
                    'Enter contract address'
                  )}
                  value={addressInput}
                  onChange={event => setAddressInput(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      void handleAddressSelect()
                    }
                  }}
                />
                <button className="app-action-button is-primary" disabled={disabled} type="button" onClick={() => void handleAddressSelect()}>
                  {resolveText(t('common.select'), 'common.select', 'Select')}
                </button>
              </div>

              {recentTokens.length ? (
                <div>
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                    {resolveText(t('tokenSelector.recentlySelected'), 'tokenSelector.recentlySelected', 'Recently Selected')}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentTokens.map(token => (
                      <button
                        key={token.address}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]"
                        type="button"
                        onClick={() => selectToken(token)}
                      >
                        <TokenIcon size="small" symbol={token.symbol} />
                        <span>{token.symbol}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {!srmbTokensQuery.data?.length ? (
                <div className="app-inline-note">{resolveText(t('tokenSelector.noAvailableTokens'), 'tokenSelector.noAvailableTokens', 'No available tokens')}</div>
              ) : (
                <div className="space-y-3">
                  {srmbTokensQuery.data.map(token => (
                    <button
                      key={token.address}
                      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4 text-left transition hover:border-[var(--primary-color)]"
                      type="button"
                      onClick={() => selectToken(token)}
                    >
                      <span className="flex items-center gap-3">
                        <TokenIcon size="large" symbol={token.symbol} />
                        <span className="flex flex-col">
                          <span className="font-semibold text-[var(--text-primary)]">{token.symbol}</span>
                          <span className="text-xs text-[var(--text-secondary)]">{token.name}</span>
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block text-xs font-medium text-[var(--text-secondary)]">{token.balance}</span>
                        <span className="mt-1 block text-xs text-[var(--text-secondary)]">{token.address.slice(0, 6)}...{token.address.slice(-4)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
