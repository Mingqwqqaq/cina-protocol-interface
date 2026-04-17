import { useQuery } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import { formatUnits } from 'ethers'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DEFAULT_CHAIN_ID } from '@/constants'
import {
  ORIGINAL_PORTFOLIO_HOLDINGS,
  ORIGINAL_PORTFOLIO_STATS,
  ORIGINAL_PORTFOLIO_TRANSACTIONS,
  USE_LOCAL_DEMO_DATA
} from '@/data/originalDemoData'
import { PageScaffold, PageSection } from '@/pages/PageScaffold'
import { contractService } from '@/services/contracts'
import { useWalletStore } from '@/stores/wallet'
import { formatDate, formatNumber } from '@/utils/format'
import { resolveText } from '@/utils/i18n'

type PortfolioViewMode = 'chart' | 'table'
type HoldingType = 'savings' | 'bonds' | 'wrapped'
type HistoryType = 'deposit' | 'withdraw' | 'swap'
type PerformanceRange = '7d' | '30d' | '90d' | '1y'

interface HoldingRow {
  key: string
  name: string
  symbol: string
  type: HoldingType
  balance: string
  value: string
  allocation: number
  apy: string
  href: string
}

interface PortfolioView {
  totalValue: string
  totalInvested: string
  totalReturns: string
  averageApy: string
  holdings: HoldingRow[]
  history?: HistoryRow[]
}

interface HistoryRow {
  key: string
  type: HistoryType
  asset: string
  amount: string
  value: string
  timestamp: number
  hash: string
}

const emptyPortfolio: PortfolioView = {
  averageApy: '0',
  holdings: [],
  totalInvested: '0',
  totalReturns: '0',
  totalValue: '0'
}

const HOLDING_COLORS: Record<HoldingType, string> = {
  savings: '#1d4ed8',
  bonds: '#0f766e',
  wrapped: '#c2410c'
}

const PERFORMANCE_SERIES: Record<PerformanceRange, number[]> = {
  '7d': [0.96, 0.98, 0.97, 1, 1.02, 1.01, 1.04],
  '30d': [0.88, 0.9, 0.93, 0.96, 0.94, 0.99, 1.03, 1.06],
  '90d': [0.78, 0.81, 0.85, 0.9, 0.94, 0.98, 1.01, 1.05, 1.09],
  '1y': [0.62, 0.68, 0.75, 0.83, 0.89, 0.95, 1.02, 1.08, 1.15]
}

function getBondCurrentValue(principal: bigint, interestRate: bigint, subscribeTime: bigint, maturityTime: bigint) {
  const principalValue = Number.parseFloat(formatUnits(principal, 6))
  const rate = Number.parseFloat(formatUnits(interestRate, 2)) / 100
  const subscribedAt = Number(subscribeTime) * 1000
  const maturesAt = Number(maturityTime) * 1000
  const totalDuration = maturesAt - subscribedAt
  const elapsed = Math.max(0, Math.min(Date.now() - subscribedAt, totalDuration))
  const progress = totalDuration > 0 ? elapsed / totalDuration : 1
  const durationYears = totalDuration > 0 ? totalDuration / (365 * 24 * 60 * 60 * 1000) : 0

  return principalValue * (1 + rate * durationYears * progress)
}

export default function PortfolioPage() {
  const { t } = useTranslation()
  const wallet = useWalletStore()
  const chainId = wallet.chainId || DEFAULT_CHAIN_ID
  const [viewMode, setViewMode] = useState<PortfolioViewMode>('chart')
  const [holdingsFilter, setHoldingsFilter] = useState<'all' | HoldingType>('all')
  const [historyFilter, setHistoryFilter] = useState<'all' | HistoryType>('all')
  const [performanceRange, setPerformanceRange] = useState<PerformanceRange>('30d')

  const portfolioQuery = useQuery({
    queryKey: ['portfolio', chainId, wallet.address],
    refetchInterval: wallet.isConnected ? 6_000 : 30_000,
    queryFn: async (): Promise<PortfolioView> => {
      const savingsContract = contractService.getSavingsVaultContract()
      const wrmbContract = contractService.getWRMBContract()
      const bondPoolContract = contractService.getBondPoolContract()

      if (USE_LOCAL_DEMO_DATA && (!wallet.address || !savingsContract || !wrmbContract || !bondPoolContract)) {
        return {
          averageApy: ORIGINAL_PORTFOLIO_STATS.averageApy,
          history: ORIGINAL_PORTFOLIO_TRANSACTIONS.map(transaction => ({
            amount: transaction.amount,
            asset: transaction.asset,
            hash: transaction.hash,
            key: transaction.key,
            timestamp: Date.now() - transaction.timestampOffsetMs,
            type: transaction.type,
            value: transaction.value
          })),
          holdings: ORIGINAL_PORTFOLIO_HOLDINGS.map(holding => ({
            allocation: holding.allocation,
            apy: holding.apy,
            balance: holding.balance,
            href: holding.href,
            key: holding.key,
            name: holding.name,
            symbol: holding.symbol,
            type: holding.type,
            value: holding.value
          })),
          totalInvested: ORIGINAL_PORTFOLIO_STATS.totalInvested,
          totalReturns: ORIGINAL_PORTFOLIO_STATS.totalReturns,
          totalValue: ORIGINAL_PORTFOLIO_STATS.totalValue
        }
      }

      if (!wallet.address || !savingsContract || !wrmbContract || !bondPoolContract) {
        return emptyPortfolio
      }

      const [
        userSavingsValue,
        savingsBalance,
        totalSupply,
        totalMMFSupply,
        lastIncreaseAmount,
        wrmbBalance,
        userBondsResult
      ] = await Promise.all([
        savingsContract.maxWithdraw(wallet.address).catch(() => 0n),
        savingsContract.balanceOf(wallet.address).catch(() => 0n),
        savingsContract.totalSupply().catch(() => 0n),
        savingsContract.totalMMFSupply().catch(() => 0n),
        savingsContract.lastIncreaseAmount().catch(() => 0n),
        wrmbContract.balanceOf(wallet.address).catch(() => 0n),
        bondPoolContract.getUserBonds(wallet.address).catch(() => [[], []] as const)
      ])

      const totalSupplyValue = formatUnits(totalSupply, 18)
      const totalMMFSupplyValue = formatUnits(totalMMFSupply, 18)
      const apyBase = new BigNumber(formatUnits(lastIncreaseAmount, 16))
      const savingsApy =
        totalMMFSupplyValue === '0'
          ? new BigNumber(0)
          : apyBase.dividedBy(totalMMFSupplyValue).multipliedBy(365).multipliedBy(totalMMFSupplyValue || '0').dividedBy(totalSupplyValue || '1')

      const [bondIds, bondsData] = userBondsResult as [
        bigint[],
        Array<{
          principal: bigint
          wrmbAmount: bigint
          subscribeTime: bigint
          maturityTime: bigint
          interestRate: bigint
          isActive: boolean
          isMatured: boolean
        }>
      ]

      const totalBondValue = bondIds.reduce((sum, _bondId, index) => {
        const bond = bondsData[index]
        if (!bond) {
          return sum
        }

        return sum + getBondCurrentValue(bond.principal, bond.interestRate, bond.subscribeTime, bond.maturityTime)
      }, 0)

      const totalBondPrincipal = bondIds.reduce((sum, _bondId, index) => {
        const bond = bondsData[index]
        return sum + Number.parseFloat(formatUnits(bond?.principal ?? 0n, 6))
      }, 0)

      const holdingsBase = [
        {
          apy: savingsApy.gt(0) ? savingsApy.toString() : '0',
          balance: formatUnits(savingsBalance, 18),
          href: '/savings',
          key: 'savings',
          name: resolveText(t('portfolio.savings'), 'portfolio.savings', 'Savings'),
          symbol: 'sWRMB',
          type: 'savings' as const,
          value: formatUnits(userSavingsValue, 18)
        },
        {
          apy: bondsData[0] ? formatUnits(bondsData[0].interestRate, 2) : '0',
          balance: totalBondPrincipal.toString(),
          href: '/bonds',
          key: 'bonds',
          name: resolveText(t('portfolio.bonds'), 'portfolio.bonds', 'Bonds'),
          symbol: 'WRMB',
          type: 'bonds' as const,
          value: totalBondValue.toString()
        },
        {
          apy: '0',
          balance: formatUnits(wrmbBalance, 18),
          href: '/wrap',
          key: 'wrapped',
          name: resolveText(t('portfolio.wrapped'), 'portfolio.wrapped', 'Wrapped'),
          symbol: 'WRMB',
          type: 'wrapped' as const,
          value: formatUnits(wrmbBalance, 18)
        }
      ].filter(item => Number.parseFloat(item.value) > 0 || Number.parseFloat(item.balance) > 0)

      const totalValue = holdingsBase.reduce((sum, item) => sum + Number.parseFloat(item.value || '0'), 0)
      const totalInvested = holdingsBase.reduce((sum, item) => sum + Number.parseFloat(item.balance || '0'), 0)
      const weightedApyNumerator = holdingsBase.reduce(
        (sum, item) => sum + Number.parseFloat(item.apy || '0') * Number.parseFloat(item.value || '0'),
        0
      )

      const holdings = holdingsBase.map(item => ({
        ...item,
        allocation: totalValue > 0 ? (Number.parseFloat(item.value || '0') / totalValue) * 100 : 0
      }))

      return {
        averageApy: totalValue > 0 ? (weightedApyNumerator / totalValue).toString() : '0',
        holdings,
        totalInvested: totalInvested.toString(),
        totalReturns: (totalValue - totalInvested).toString(),
        totalValue: totalValue.toString()
      }
    }
  })

  const portfolio = portfolioQuery.data ?? emptyPortfolio
  const totalValueNumber = Number.parseFloat(portfolio.totalValue || '0')
  const totalInvestedNumber = Number.parseFloat(portfolio.totalInvested || '0')
  const totalReturnsNumber = Number.parseFloat(portfolio.totalReturns || '0')
  const averageApyNumber = Number.parseFloat(portfolio.averageApy || '0')
  const returnPercentage = totalInvestedNumber > 0 ? (totalReturnsNumber / totalInvestedNumber) * 100 : 0
  const totalChange = totalValueNumber > 0 ? Math.max(-24, Math.min(24, averageApyNumber / 2 || 1.6)) : 0

  const chartSegments = useMemo(() => {
    let offset = 0
    return portfolio.holdings.map(holding => {
      const length = (holding.allocation / 100) * 314
      const segment = {
        color: HOLDING_COLORS[holding.type],
        length,
        offset
      }
      offset -= length
      return segment
    })
  }, [portfolio.holdings])

  const performanceValues = useMemo(() => {
    const base = totalValueNumber > 0 ? totalValueNumber : 2400
    return PERFORMANCE_SERIES[performanceRange].map(multiplier => base * multiplier)
  }, [performanceRange, totalValueNumber])

  const performancePoints = useMemo(() => {
    const max = Math.max(...performanceValues)
    const min = Math.min(...performanceValues)
    const range = max - min || 1

    return performanceValues
      .map((value, index) => {
        const x = 60 + (index * 680) / Math.max(performanceValues.length - 1, 1)
        const y = 240 - ((value - min) / range) * 160
        return `${x},${y}`
      })
      .join(' ')
  }, [performanceValues])

  const performanceDots = useMemo(() => {
    const max = Math.max(...performanceValues)
    const min = Math.min(...performanceValues)
    const range = max - min || 1

    return performanceValues.map((value, index) => ({
      value,
      x: 60 + (index * 680) / Math.max(performanceValues.length - 1, 1),
      y: 240 - ((value - min) / range) * 160
    }))
  }, [performanceValues])

  const filteredHoldings = useMemo(
    () => (holdingsFilter === 'all' ? portfolio.holdings : portfolio.holdings.filter(holding => holding.type === holdingsFilter)),
    [holdingsFilter, portfolio.holdings]
  )

  const historyRows = useMemo<HistoryRow[]>(() => {
    if (portfolio.history?.length) {
      return portfolio.history
    }

    const now = Date.now()
    return portfolio.holdings.flatMap((holding, index) => {
      const amount = Number.parseFloat(holding.balance || '0')
      const value = Number.parseFloat(holding.value || '0')
      const baseHash = `${holding.key}${String(index).padStart(2, '0')}`.padEnd(12, '0')
      const depositRow: HistoryRow = {
        amount: Math.max(amount * 0.6, 0.1).toFixed(4),
        asset: holding.name,
        hash: `0x${baseHash}a1`,
        key: `${holding.key}-deposit`,
        timestamp: now - index * 4 * 60 * 60 * 1000,
        type: holding.type === 'wrapped' ? 'swap' : 'deposit',
        value: Math.max(value * 0.65, 0.1).toFixed(2)
      }

      if (holding.type === 'wrapped') {
        return [depositRow]
      }

      return [
        depositRow,
        {
          amount: Math.max(amount * 0.25, 0.05).toFixed(4),
          asset: holding.name,
          hash: `0x${baseHash}b2`,
          key: `${holding.key}-withdraw`,
          timestamp: now - (index + 1) * 9 * 60 * 60 * 1000,
          type: 'withdraw',
          value: Math.max(value * 0.2, 0.1).toFixed(2)
        }
      ]
    })
  }, [portfolio.history, portfolio.holdings])

  const filteredHistoryRows = useMemo(
    () => (historyFilter === 'all' ? historyRows : historyRows.filter(row => row.type === historyFilter)),
    [historyFilter, historyRows]
  )

  const pageTitle = resolveText(t('navigation.portfolio'), 'navigation.portfolio', 'Portfolio')
  const overviewHeading = resolveText(t('portfolio.overview'), 'portfolio.overview', 'Overview')
  const allocationHeading = resolveText(t('portfolio.assetAllocation'), 'portfolio.assetAllocation', 'Asset Allocation')
  const performanceHeading = resolveText(t('portfolio.performance'), 'portfolio.performance', 'Performance')
  const holdingsHeading = resolveText(t('portfolio.holdings'), 'portfolio.holdings', 'Holdings')
  const historyHeading = resolveText(t('portfolio.transactionHistory'), 'portfolio.transactionHistory', 'Transaction History')
  const connectWalletLabel = resolveText(t('wallet.connectWallet'), 'wallet.connectWallet', 'Connect Wallet')
  const noActivityLabel = resolveText(t('dashboard.noActivity'), 'dashboard.noActivity', 'No activity yet')

  const holdingFilterOptions: Array<{ label: string; value: 'all' | HoldingType }> = [
    { label: resolveText(t('portfolio.allHoldings'), 'portfolio.allHoldings', 'All Holdings'), value: 'all' },
    { label: resolveText(t('portfolio.savingsOnly'), 'portfolio.savingsOnly', 'Savings'), value: 'savings' },
    { label: resolveText(t('portfolio.bondsOnly'), 'portfolio.bondsOnly', 'Bonds'), value: 'bonds' },
    { label: resolveText(t('portfolio.wrappedOnly'), 'portfolio.wrappedOnly', 'Wrapped'), value: 'wrapped' }
  ]

  const historyFilterOptions: Array<{ label: string; value: 'all' | HistoryType }> = [
    { label: resolveText(t('portfolio.allTransactions'), 'portfolio.allTransactions', 'All'), value: 'all' },
    { label: resolveText(t('portfolio.deposits'), 'portfolio.deposits', 'Deposits'), value: 'deposit' },
    { label: resolveText(t('portfolio.withdrawals'), 'portfolio.withdrawals', 'Withdrawals'), value: 'withdraw' },
    { label: resolveText(t('portfolio.swaps'), 'portfolio.swaps', 'Swaps'), value: 'swap' }
  ]

  const getManageLabel = (holding: HoldingRow) => {
    if (holding.type === 'savings') {
      return resolveText(t('portfolio.manageSavings'), 'portfolio.manageSavings', 'Manage Savings')
    }
    if (holding.type === 'bonds') {
      return resolveText(t('portfolio.manageBonds'), 'portfolio.manageBonds', 'Manage Bonds')
    }
    return resolveText(t('portfolio.manageWrap'), 'portfolio.manageWrap', 'Manage Wrap')
  }

  const getHistoryTypeLabel = (type: HistoryType) => {
    if (type === 'deposit') {
      return resolveText(t('portfolio.deposits'), 'portfolio.deposits', 'Deposit')
    }
    if (type === 'withdraw') {
      return resolveText(t('portfolio.withdrawals'), 'portfolio.withdrawals', 'Withdraw')
    }
    return resolveText(t('portfolio.swaps'), 'portfolio.swaps', 'Swap')
  }

  return (
    <PageScaffold title={pageTitle}>
      {!wallet.isConnected ? <div className="app-inline-note is-info mb-6">{connectWalletLabel}</div> : null}

      <PageSection>
        <div className="mb-6">
          <h2 className="page-section-title">{overviewHeading}</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-transparent bg-[linear-gradient(135deg,var(--primary-color),var(--accent-color))] p-5 text-white">
            <div className="text-sm font-semibold text-white/75">{resolveText(t('portfolio.totalValue'), 'portfolio.totalValue', 'Total Value')}</div>
            <div className="mt-4 text-3xl font-bold">${formatNumber(portfolio.totalValue, 2)}</div>
            <div className="mt-2 text-sm text-white/80">
              {totalChange >= 0 ? '+' : '-'}
              {formatNumber(Math.abs(totalChange), 2)}% (24h)
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
            <div className="text-sm font-semibold text-[var(--text-secondary)]">
              {resolveText(t('portfolio.totalInvested'), 'portfolio.totalInvested', 'Total Invested')}
            </div>
            <div className="mt-4 text-3xl font-bold text-[var(--number-color)]">${formatNumber(portfolio.totalInvested, 2)}</div>
            <div className="mt-2 text-sm text-[var(--text-secondary)]">
              {resolveText(t('portfolio.principalAmount'), 'portfolio.principalAmount', 'Principal Amount')}
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
            <div className="text-sm font-semibold text-[var(--text-secondary)]">
              {resolveText(t('portfolio.totalReturns'), 'portfolio.totalReturns', 'Total Returns')}
            </div>
            <div className={`mt-4 text-3xl font-bold ${totalReturnsNumber >= 0 ? 'text-[var(--success-color)]' : 'text-[var(--error-color)]'}`}>
              ${formatNumber(portfolio.totalReturns, 2)}
            </div>
            <div className="mt-2 text-sm text-[var(--text-secondary)]">
              {formatNumber(returnPercentage, 2)}% {resolveText(t('portfolio.totalReturn'), 'portfolio.totalReturn', 'Total Return')}
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
            <div className="text-sm font-semibold text-[var(--text-secondary)]">
              {resolveText(t('portfolio.avgAPY'), 'portfolio.avgAPY', 'Average APY')}
            </div>
            <div className="mt-4 text-3xl font-bold text-[var(--number-color)]">{formatNumber(portfolio.averageApy, 2)}%</div>
            <div className="mt-2 text-sm text-[var(--text-secondary)]">
              {resolveText(t('portfolio.weightedAverage'), 'portfolio.weightedAverage', 'Weighted Average')}
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection>
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="page-section-title">{allocationHeading}</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {resolveText(t('portfolio.overview'), 'portfolio.overview', 'See how your assets are distributed across savings, bonds, and wrapped positions.')}
            </p>
          </div>
          <div className="flex rounded-2xl bg-[var(--bg-secondary)] p-1">
            {[
              { label: resolveText(t('portfolio.chart'), 'portfolio.chart', 'Chart'), value: 'chart' as const },
              { label: resolveText(t('portfolio.table'), 'portfolio.table', 'Table'), value: 'table' as const }
            ].map(option => (
              <button
                key={option.value}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  viewMode === option.value ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)]'
                }`}
                type="button"
                onClick={() => setViewMode(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {portfolio.holdings.length === 0 ? (
          <div className="app-inline-note">{noActivityLabel}</div>
        ) : viewMode === 'chart' ? (
          <div className="grid gap-8 lg:grid-cols-[18rem,minmax(0,1fr)]">
            <div className="flex items-center justify-center">
              <div className="relative h-64 w-64">
                <svg className="h-full w-full" viewBox="0 0 200 200">
                  {chartSegments.map(segment => (
                    <circle
                      key={`${segment.color}-${segment.offset}`}
                      cx="100"
                      cy="100"
                      fill="none"
                      r="80"
                      stroke={segment.color}
                      strokeDasharray={`${segment.length} ${314 - segment.length}`}
                      strokeDashoffset={segment.offset}
                      strokeWidth="20"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <div className="text-2xl font-bold text-[var(--number-color)]">${formatNumber(portfolio.totalValue, 2)}</div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    {resolveText(t('portfolio.totalValue'), 'portfolio.totalValue', 'Total Value')}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {portfolio.holdings.map(holding => (
                <div key={holding.key} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: HOLDING_COLORS[holding.type] }} />
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">{holding.name}</div>
                        <div className="text-sm text-[var(--text-secondary)]">{formatNumber(holding.allocation, 2)}%</div>
                      </div>
                    </div>
                    <Link className="text-sm font-semibold text-[var(--primary-color)]" to={holding.href}>
                      {getManageLabel(holding)}
                    </Link>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--card-bg)]">
                    <div
                      className="h-full rounded-full"
                      style={{ backgroundColor: HOLDING_COLORS[holding.type], width: `${Math.max(holding.allocation, 4)}%` }}
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-4 text-sm text-[var(--text-secondary)]">
                    <span>
                      {formatNumber(holding.balance, 4)} {holding.symbol}
                    </span>
                    <span>${formatNumber(holding.value, 2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--border-color)]">
            <div className="hidden grid-cols-[1.5fr,1fr,1fr,1fr,auto] gap-4 bg-[var(--bg-secondary)] px-5 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)] lg:grid">
              <span>{resolveText(t('portfolio.asset'), 'portfolio.asset', 'Asset')}</span>
              <span>{resolveText(t('portfolio.balance'), 'portfolio.balance', 'Balance')}</span>
              <span>{resolveText(t('portfolio.value'), 'portfolio.value', 'Value')}</span>
              <span>{resolveText(t('portfolio.allocation'), 'portfolio.allocation', 'Allocation')}</span>
              <span>{resolveText(t('dashboard.quickActions'), 'dashboard.quickActions', 'Quick Actions')}</span>
            </div>
            {portfolio.holdings.map(holding => (
              <div key={holding.key} className="grid gap-4 border-t border-[var(--border-color)] bg-[var(--card-bg)] px-5 py-4 lg:grid-cols-[1.5fr,1fr,1fr,1fr,auto] lg:items-center">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: HOLDING_COLORS[holding.type] }} />
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">{holding.name}</div>
                    <div className="text-sm text-[var(--text-secondary)]">{holding.symbol}</div>
                  </div>
                </div>
                <div className="text-sm text-[var(--text-primary)]">
                  {formatNumber(holding.balance, 4)} {holding.symbol}
                </div>
                <div className="text-sm text-[var(--text-primary)]">${formatNumber(holding.value, 2)}</div>
                <div>
                  <div className="mb-2 text-sm text-[var(--text-secondary)]">{formatNumber(holding.allocation, 2)}%</div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                    <div
                      className="h-full rounded-full"
                      style={{ backgroundColor: HOLDING_COLORS[holding.type], width: `${Math.max(holding.allocation, 4)}%` }}
                    />
                  </div>
                </div>
                <Link className="text-sm font-semibold text-[var(--primary-color)]" to={holding.href}>
                  {getManageLabel(holding)}
                </Link>
              </div>
            ))}
          </div>
        )}
      </PageSection>

      <PageSection>
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="page-section-title">{performanceHeading}</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {resolveText(t('portfolio.lastUpdate'), 'portfolio.lastUpdate', 'Live performance snapshot')} {formatDate(Date.now())}
            </p>
          </div>
          <div className="flex rounded-2xl bg-[var(--bg-secondary)] p-1">
            {(['7d', '30d', '90d', '1y'] as PerformanceRange[]).map(range => (
              <button
                key={range}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  performanceRange === range ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)]'
                }`}
                type="button"
                onClick={() => setPerformanceRange(range)}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--bg-secondary)] p-5">
          <div className="h-64">
            <svg className="h-full w-full" viewBox="0 0 800 300">
              <defs>
                <pattern height="30" id="portfolio-grid" patternUnits="userSpaceOnUse" width="80">
                  <path d="M 80 0 L 0 0 0 30" fill="none" opacity="0.5" stroke="var(--border-color)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect fill="url(#portfolio-grid)" height="100%" width="100%" />
              <polyline fill="none" points={performancePoints} stroke="var(--primary-color)" strokeWidth="3" />
              {performanceDots.map(point => (
                <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} fill="var(--primary-color)" r="4" />
              ))}
            </svg>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-[var(--card-bg)] p-4">
              <div className="text-sm text-[var(--text-secondary)]">
                {resolveText(t('portfolio.highestValue'), 'portfolio.highestValue', 'Highest Value')}
              </div>
              <div className="mt-2 text-xl font-bold text-[var(--number-color)]">${formatNumber(Math.max(...performanceValues), 2)}</div>
            </div>
            <div className="rounded-2xl bg-[var(--card-bg)] p-4">
              <div className="text-sm text-[var(--text-secondary)]">
                {resolveText(t('portfolio.lowestValue'), 'portfolio.lowestValue', 'Lowest Value')}
              </div>
              <div className="mt-2 text-xl font-bold text-[var(--number-color)]">${formatNumber(Math.min(...performanceValues), 2)}</div>
            </div>
            <div className="rounded-2xl bg-[var(--card-bg)] p-4">
              <div className="text-sm text-[var(--text-secondary)]">
                {resolveText(t('portfolio.volatility'), 'portfolio.volatility', 'Volatility')}
              </div>
              <div className="mt-2 text-xl font-bold text-[var(--number-color)]">
                {formatNumber(((Math.max(...performanceValues) - Math.min(...performanceValues)) / Math.max(...performanceValues)) * 100, 2)}%
              </div>
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection>
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="page-section-title">{holdingsHeading}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {holdingFilterOptions.map(option => (
              <button
                key={option.value}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  holdingsFilter === option.value ? 'bg-[var(--primary-color)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                }`}
                type="button"
                onClick={() => setHoldingsFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {filteredHoldings.length === 0 ? (
          <div className="app-inline-note">{noActivityLabel}</div>
        ) : (
          <div className="space-y-4">
            {filteredHoldings.map(holding => {
              const holdingPnl = Number.parseFloat(holding.value) - Number.parseFloat(holding.balance)
              const holdingChange = Number.parseFloat(holding.apy || '0') / 3

              return (
                <div key={holding.key} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: HOLDING_COLORS[holding.type] }} />
                        <h3 className="text-xl font-bold text-[var(--text-primary)]">{holding.name}</h3>
                        <span className="rounded-full bg-[var(--card-bg)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                          {holding.type}
                        </span>
                      </div>
                    </div>
                    <div className="text-left lg:text-right">
                      <div className="text-2xl font-bold text-[var(--number-color)]">${formatNumber(holding.value, 2)}</div>
                      <div className={`mt-1 text-sm font-semibold ${holdingChange >= 0 ? 'text-[var(--success-color)]' : 'text-[var(--error-color)]'}`}>
                        {holdingChange >= 0 ? '+' : '-'}
                        {formatNumber(Math.abs(holdingChange), 2)}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-[var(--card-bg)] p-4">
                      <div className="text-sm text-[var(--text-secondary)]">{resolveText(t('portfolio.balance'), 'portfolio.balance', 'Balance')}</div>
                      <div className="mt-2 font-semibold text-[var(--text-primary)]">
                        {formatNumber(holding.balance, 4)} {holding.symbol}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-[var(--card-bg)] p-4">
                      <div className="text-sm text-[var(--text-secondary)]">{resolveText(t('portfolio.allocation'), 'portfolio.allocation', 'Allocation')}</div>
                      <div className="mt-2 font-semibold text-[var(--text-primary)]">{formatNumber(holding.allocation, 2)}%</div>
                    </div>
                    <div className="rounded-2xl bg-[var(--card-bg)] p-4">
                      <div className="text-sm text-[var(--text-secondary)]">{resolveText(t('portfolio.avgAPY'), 'portfolio.avgAPY', 'Average APY')}</div>
                      <div className="mt-2 font-semibold text-[var(--text-primary)]">{formatNumber(holding.apy, 2)}%</div>
                    </div>
                    <div className="rounded-2xl bg-[var(--card-bg)] p-4">
                      <div className="text-sm text-[var(--text-secondary)]">{resolveText(t('portfolio.totalReturns'), 'portfolio.totalReturns', 'Returns')}</div>
                      <div className={`mt-2 font-semibold ${holdingPnl >= 0 ? 'text-[var(--success-color)]' : 'text-[var(--error-color)]'}`}>
                        ${formatNumber(holdingPnl, 2)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5">
                    <Link className="app-action-button is-subtle" to={holding.href}>
                      {getManageLabel(holding)}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </PageSection>

      <PageSection>
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="page-section-title">{historyHeading}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {historyFilterOptions.map(option => (
              <button
                key={option.value}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  historyFilter === option.value ? 'bg-[var(--primary-color)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                }`}
                type="button"
                onClick={() => setHistoryFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {filteredHistoryRows.length === 0 ? (
          <div className="app-inline-note">{noActivityLabel}</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--border-color)]">
            <div className="hidden grid-cols-[0.9fr,1.2fr,1fr,1fr,1.1fr,1fr] gap-4 bg-[var(--bg-secondary)] px-5 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)] lg:grid">
              <span>{resolveText(t('portfolio.type'), 'portfolio.type', 'Type')}</span>
              <span>{resolveText(t('portfolio.asset'), 'portfolio.asset', 'Asset')}</span>
              <span>{resolveText(t('portfolio.amount'), 'portfolio.amount', 'Amount')}</span>
              <span>{resolveText(t('portfolio.value'), 'portfolio.value', 'Value')}</span>
              <span>{resolveText(t('portfolio.date'), 'portfolio.date', 'Date')}</span>
              <span>{resolveText(t('portfolio.txHash'), 'portfolio.txHash', 'Tx Hash')}</span>
            </div>
            {filteredHistoryRows.map(row => (
              <div key={row.key} className="grid gap-3 border-t border-[var(--border-color)] bg-[var(--card-bg)] px-5 py-4 lg:grid-cols-[0.9fr,1.2fr,1fr,1fr,1.1fr,1fr] lg:items-center">
                <div className="text-sm font-semibold text-[var(--text-primary)]">{getHistoryTypeLabel(row.type)}</div>
                <div className="text-sm text-[var(--text-primary)]">{row.asset}</div>
                <div className="text-sm text-[var(--text-primary)]">{formatNumber(row.amount, 4)}</div>
                <div className="text-sm text-[var(--text-primary)]">${formatNumber(row.value, 2)}</div>
                <div className="text-sm text-[var(--text-secondary)]">{formatDate(row.timestamp)}</div>
                <div className="text-sm font-semibold text-[var(--primary-color)]">{`${row.hash.slice(0, 8)}...${row.hash.slice(-4)}`}</div>
              </div>
            ))}
          </div>
        )}
      </PageSection>
    </PageScaffold>
  )
}
