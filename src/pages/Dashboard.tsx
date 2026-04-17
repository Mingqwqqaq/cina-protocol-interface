import { ArrowRightOutlined, FolderOutlined, LineChartOutlined, SwapOutlined, FileTextOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import { formatUnits } from 'ethers'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DEFAULT_CHAIN_ID } from '@/constants'
import {
  ORIGINAL_ASSET_ALLOCATION,
  ORIGINAL_DASHBOARD_ACTIVITIES,
  ORIGINAL_PORTFOLIO_STATS,
  USE_LOCAL_DEMO_DATA
} from '@/data/originalDemoData'
import { PageScaffold } from '@/pages/PageScaffold'
import { contractService } from '@/services/contracts'
import { useWalletStore } from '@/stores/wallet'
import { formatNumber, formatTimeAgo } from '@/utils/format'
import { resolveText } from '@/utils/i18n'

interface DashboardAllocation {
  key: string
  label: string
  href: string
  value: string
  balance: string
  percentage: number
  color: string
  symbol: string
  change24h: number
}

interface DashboardView {
  totalWrappedValue: string
  savingsLiquidity: string
  activeBonds: number
  currentApy: string
  totalPending: string
  totalBondPool: string
  allocation: DashboardAllocation[]
  isDemo?: boolean
}

const emptyView: DashboardView = {
  activeBonds: 0,
  allocation: [],
  currentApy: '0',
  savingsLiquidity: '0',
  totalBondPool: '0',
  totalPending: '0',
  totalWrappedValue: '0'
}

const performanceData = [
  { x: 50, y: 250 },
  { x: 150, y: 200 },
  { x: 250, y: 180 },
  { x: 350, y: 220 },
  { x: 450, y: 160 },
  { x: 550, y: 140 },
  { x: 650, y: 120 },
  { x: 750, y: 100 }
]

export default function DashboardPage() {
  const { t } = useTranslation()
  const wallet = useWalletStore()
  const chainId = wallet.chainId || DEFAULT_CHAIN_ID
  const demoDashboardView = useMemo<DashboardView>(() => {
    const allocation = ORIGINAL_ASSET_ALLOCATION.map(item => ({
      color: item.color,
      href: item.href,
      key: item.key,
      label:
        item.key === 'savings'
          ? resolveText(t('dashboard.savingsLiquidity'), 'dashboard.savingsLiquidity', 'Savings Vault')
          : item.key === 'bonds'
            ? resolveText(t('dashboard.bondInvestments'), 'dashboard.bondInvestments', 'Bond Pool')
            : resolveText(t('dashboard.wrapTokens'), 'dashboard.wrapTokens', 'Wrapped Tokens'),
      percentage: item.percentage,
      value: item.value,
      balance: item.balance,
      symbol: item.symbol,
      change24h: item.key === 'savings' ? 1.2 : item.key === 'bonds' ? 0.8 : -0.5
    }))

    return {
      activeBonds: 4,
      allocation,
      currentApy: ORIGINAL_PORTFOLIO_STATS.averageApy,
      isDemo: true,
      savingsLiquidity: ORIGINAL_ASSET_ALLOCATION[0].value,
      totalBondPool: ORIGINAL_ASSET_ALLOCATION[1].value,
      totalPending: ORIGINAL_PORTFOLIO_STATS.totalReturns,
      totalWrappedValue: ORIGINAL_PORTFOLIO_STATS.totalValue
    }
  }, [t])

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', chainId, wallet.address],
    refetchInterval: wallet.isConnected ? 6_000 : 30_000,
    queryFn: async (): Promise<DashboardView> => {
      const wrapManagerContract = contractService.getWrapManagerContract()
      const savingsContract = contractService.getSavingsVaultContract()
      const stakingContract = contractService.getStakingVaultContract()
      const bondPoolContract = contractService.getBondPoolContract()

      if (USE_LOCAL_DEMO_DATA && (!wrapManagerContract || !savingsContract || !stakingContract || !bondPoolContract)) {
        return demoDashboardView
      }

      const [
        totalWrapped,
        savingsAssets,
        savingsSupply,
        totalMMFSupply,
        lastIncreaseAmount,
        stakingPendingAmount,
        bondStats
      ] = await Promise.all([
        wrapManagerContract?.totalWrapped().catch(() => 0n) ?? 0n,
        savingsContract?.totalAssets().catch(() => 0n) ?? 0n,
        savingsContract?.totalSupply().catch(() => 0n) ?? 0n,
        savingsContract?.totalMMFSupply().catch(() => 0n) ?? 0n,
        savingsContract?.lastIncreaseAmount().catch(() => 0n) ?? 0n,
        stakingContract?.getTotalPendingAmount().catch(() => 0n) ?? 0n,
        bondPoolContract?.getPoolStats().catch(() => [0n, 0n, 0n] as const) ?? [0n, 0n, 0n]
      ])

      const totalWrappedValue = formatUnits(totalWrapped, 6)
      const savingsLiquidity = formatUnits(savingsAssets, 18)
      const totalSupplyValue = formatUnits(savingsSupply, 18)
      const totalMMFSupplyValue = formatUnits(totalMMFSupply, 18)
      const apyBase = new BigNumber(formatUnits(lastIncreaseAmount, 16))
      const apy =
        totalMMFSupplyValue === '0' ? new BigNumber(0) : apyBase.dividedBy(totalMMFSupplyValue).multipliedBy(365)
      const boostedApy =
        totalSupplyValue === '0'
          ? new BigNumber(0)
          : apy.multipliedBy(totalMMFSupplyValue || '0').dividedBy(totalSupplyValue)

      const totalBondPool = formatUnits(bondStats[0] ?? 0, 6)
      const activeBonds = Number(bondStats[1] ?? 0)
      const totalPending = formatUnits(stakingPendingAmount, 18)

      const allocationSource = [
        {
          color: '#f59e0b',
          href: '/wrap',
          key: 'wrapped',
          label: resolveText(t('dashboard.wrapTokens'), 'dashboard.wrapTokens', 'Wrapped Tokens'),
          value: totalWrappedValue,
          balance: totalWrappedValue,
          symbol: 'sWRMB',
          change24h: -0.5
        },
        {
          color: '#6366f1',
          href: '/savings',
          key: 'savings',
          label: resolveText(t('dashboard.savingsLiquidity'), 'dashboard.savingsLiquidity', 'Savings Vault'),
          value: savingsLiquidity,
          balance: savingsLiquidity,
          symbol: 'sWRMB',
          change24h: 1.2
        },
        {
          color: '#10b981',
          href: '/bonds',
          key: 'bonds',
          label: resolveText(t('dashboard.bondInvestments'), 'dashboard.bondInvestments', 'Bond Pool'),
          value: totalBondPool,
          balance: totalBondPool,
          symbol: 'WRMB',
          change24h: 0.8
        }
      ]

      const totalAllocation = allocationSource.reduce((sum, item) => sum + Number.parseFloat(item.value || '0'), 0)
      const allocation = allocationSource.map(item => ({
        ...item,
        percentage: totalAllocation > 0 ? (Number.parseFloat(item.value || '0') / totalAllocation) * 100 : 0
      }))

      return {
        activeBonds,
        allocation,
        currentApy: boostedApy.gt(0) ? boostedApy.toString() : '0',
        savingsLiquidity,
        totalBondPool,
        totalPending,
        totalWrappedValue
      }
    }
  })

  const shouldShowDashboardDemo =
    USE_LOCAL_DEMO_DATA &&
    (!contractService.getWrapManagerContract() ||
      !contractService.getSavingsVaultContract() ||
      !contractService.getStakingVaultContract() ||
      !contractService.getBondPoolContract())

  const dashboard = shouldShowDashboardDemo ? demoDashboardView : dashboardQuery.data ?? emptyView

  const recentActivities = useMemo(
    () => {
      if (dashboard.isDemo) {
        return ORIGINAL_DASHBOARD_ACTIVITIES.map(activity => ({
          amount: activity.amount,
          description: resolveText(t(activity.descriptionKey), activity.descriptionKey, activity.descriptionFallback),
          href: activity.href,
          key: activity.key,
          title: resolveText(t(activity.titleKey), activity.titleKey, activity.titleFallback),
          timestamp: Date.now() - activity.timestampOffsetMs
        }))
      }

      return [
        {
          amount: `${formatNumber(dashboard.savingsLiquidity, 2)} WRMB`,
          description: resolveText(t('dashboard.depositDescription'), 'dashboard.depositDescription', 'Deposited into the savings vault'),
          href: '/savings',
          key: 'savings',
          title: resolveText(t('dashboard.depositSavings'), 'dashboard.depositSavings', 'Deposit Savings'),
          timestamp: Date.now() - 60 * 60 * 1000
        },
        {
          amount: `${formatNumber(dashboard.totalBondPool, 2)} USDT`,
          description: resolveText(t('dashboard.bondDescription'), 'dashboard.bondDescription', 'Subscribed to the bond pool'),
          href: '/bonds',
          key: 'bonds',
          title: resolveText(t('dashboard.bondSubscription'), 'dashboard.bondSubscription', 'Bond Subscription'),
          timestamp: Date.now() - 2 * 60 * 60 * 1000
        },
        {
          amount: `${formatNumber(dashboard.totalWrappedValue, 2)} WRMB`,
          description: resolveText(t('dashboard.wrapDescription'), 'dashboard.wrapDescription', 'Converted RWA into sWRMB'),
          href: '/wrap',
          key: 'wrap',
          title: resolveText(t('dashboard.wrapTokens'), 'dashboard.wrapTokens', 'Wrap Tokens'),
          timestamp: Date.now() - 24 * 60 * 60 * 1000
        }
      ]
    },
    [dashboard.isDemo, dashboard.savingsLiquidity, dashboard.totalBondPool, dashboard.totalWrappedValue, t]
  )

  const chartSegments = useMemo(() => {
    let offset = 0
    const circumference = 314

    return dashboard.allocation.map(item => {
      const length = (item.percentage / 100) * circumference
      const segment = {
        color: item.color,
        length,
        offset: -offset
      }

      offset += length
      return segment
    })
  }, [dashboard.allocation])

  const totalPortfolioValue = dashboard.allocation.reduce(
    (sum, item) => sum + Number.parseFloat(item.value || '0'),
    0
  )

  const [allocationView, setAllocationView] = useState('chart')
  const [performanceRange, setPerformanceRange] = useState('30d')

  const getActivityIcon = (key: string) => {
    switch (key) {
      case 'savings': return { icon: <FolderOutlined />, color: 'var(--success-color)' }
      case 'bonds': return { icon: <LineChartOutlined />, color: '#3b82f6' }
      case 'wrap': return { icon: <SwapOutlined />, color: '#8b5cf6' }
      default: return { icon: <FileTextOutlined />, color: 'var(--text-secondary)' }
    }
  }

  const performancePoints = performanceData.map(point => `${point.x},${point.y}`).join(' ')
  const pageTitle = resolveText(t('navigation.dashboard'), 'navigation.dashboard', 'Dashboard')
  const portfolioHeading = resolveText(t('dashboard.portfolio'), 'dashboard.portfolio', 'Portfolio')
  const recentActivityHeading = resolveText(t('dashboard.recentActivity'), 'dashboard.recentActivity', 'Recent Activity')
  const performanceHeading = resolveText(t('portfolio.performance'), 'portfolio.performance', 'Performance')

  return (
    <PageScaffold title={pageTitle}>
      <div className="space-y-6 mb-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Protocol Overview</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {resolveText(t('portfolio.overview'), 'portfolio.overview', 'Track the live state of WRMB, savings, bonds, and staking rewards.')}
            </p>
          </div>
          <div className="rounded-full bg-[var(--bg-secondary)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]">
            {dashboard.activeBonds} {resolveText(t('dashboard.activeBonds'), 'dashboard.activeBonds', 'Active Bonds')}
          </div>
        </div>

        <div className="app-grid cols-2 lg:cols-4">
          <Link
            className="rounded-xl p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md bg-gradient-to-br from-[var(--primary-color)] to-[var(--accent-color)] text-white"
            to="/wrap"
          >
            <div className="text-sm font-medium text-white/80">
              {resolveText(t('dashboard.totalValue'), 'dashboard.totalValue', 'Total Value')}
            </div>
            <div className="mt-4 text-2xl font-bold text-white">{formatNumber(dashboard.totalWrappedValue, 2)}</div>
            <div className="mt-2 text-sm text-white/80">+2.34%</div>
          </Link>

          <Link className="rounded-xl bg-[var(--card-bg)] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md" to="/savings">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-[var(--text-secondary)]">
                WRMB {resolveText(t('dashboard.savingsLiquidity'), 'dashboard.savingsLiquidity', 'Savings Liquidity')}
              </div>
            </div>
            <div className="text-2xl font-bold text-[var(--number-color)]">
              {formatNumber(dashboard.savingsLiquidity, 2)}
            </div>
            <div className="mt-1 text-sm text-[var(--text-secondary)]">
              ${formatNumber(Number.parseFloat(dashboard.savingsLiquidity || '0') * 0.14, 2)}
            </div>
          </Link>

          <Link className="rounded-xl bg-[var(--card-bg)] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md" to="/savings">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-[var(--text-secondary)]">
                {resolveText(t('dashboard.currentAPY'), 'dashboard.currentAPY', 'Current APY')}
              </div>
            </div>
            <div className="text-2xl font-bold text-[var(--number-color)]">
              {formatNumber(dashboard.currentApy, 2)}%
            </div>
            <div className="mt-1 text-sm text-[var(--text-secondary)]">
              {resolveText(t('dashboard.todaysRemaining'), 'dashboard.todaysRemaining', "Today's Remaining")} {' '}
              <span className="text-green-600 dark:text-green-400">{formatNumber(dashboard.totalPending, 2)} WRMB</span>
            </div>
          </Link>

          <Link className="rounded-xl bg-[var(--card-bg)] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md" to="/staking">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-[var(--text-secondary)]">
                {resolveText(t('dashboard.totalPendingOfYear'), 'dashboard.totalPendingOfYear', 'Total Pending of Year')}
              </div>
            </div>
            <div className="text-2xl font-bold text-[var(--number-color)]">
              {formatNumber(dashboard.totalPending, 2)} CINA
            </div>
          </Link>
        </div>
      </div>

      <div className="space-y-6 mb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">{portfolioHeading}</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {resolveText(t('portfolio.assetAllocation'), 'portfolio.assetAllocation', 'Asset Allocation')}
            </p>
          </div>
          <div className="flex rounded-lg bg-[var(--bg-secondary)] p-1">
            <button
              onClick={() => setAllocationView('chart')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition ${allocationView === 'chart' ? 'bg-[var(--card-bg)] shadow text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              Chart
            </button>
            <button
              onClick={() => setAllocationView('table')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition ${allocationView === 'table' ? 'bg-[var(--card-bg)] shadow text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              Table
            </button>
          </div>
        </div>

        {dashboard.allocation.length === 0 ? (
          <div className="app-inline-note">
            {resolveText(t('dashboard.noActivity'), 'dashboard.noActivity', 'No activity yet')}
          </div>
        ) : allocationView === 'table' ? (
          <div className="rounded-2xl bg-[var(--card-bg)] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-[var(--border-color)]">
                    <th className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{resolveText(t('portfolio.asset'), 'portfolio.asset', 'ASSET')}</th>
                    <th className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{resolveText(t('portfolio.balance'), 'portfolio.balance', 'BALANCE')}</th>
                    <th className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{resolveText(t('portfolio.value'), 'portfolio.value', 'VALUE')}</th>
                    <th className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{resolveText(t('portfolio.allocation'), 'portfolio.allocation', 'ALLOCATION')}</th>
                    <th className="px-6 py-4 font-semibold text-[var(--text-secondary)]">{resolveText(t('portfolio.change24h'), 'portfolio.change24h', '24H CHANGE')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {dashboard.allocation.map(item => (
                    <tr key={item.key} className="hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <div>
                            <div className="font-semibold text-[var(--text-primary)]">{item.label}</div>
                            <div className="text-xs text-[var(--text-secondary)]">{item.symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[var(--text-secondary)]">
                        {formatNumber(item.balance, 2)} {item.symbol}
                      </td>
                      <td className="px-6 py-4 text-[var(--text-secondary)]">
                        ${formatNumber(item.value, 2)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-16 h-2 rounded-full bg-[var(--bg-secondary)] mr-3 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: item.color }} />
                          </div>
                          <span className="text-[var(--text-secondary)] font-medium">{formatNumber(item.percentage, 1)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`font-medium ${item.change24h >= 0 ? 'text-[var(--success-color)]' : 'text-red-500'}`}>
                          {item.change24h}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-[var(--card-bg)] p-6">
            <div className="grid gap-12 lg:grid-cols-[18rem,minmax(0,1fr)] items-center">
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
                    <div className="text-2xl font-bold text-[var(--number-color)]">${formatNumber(totalPortfolioValue, 2)}</div>
                    <div className="text-sm text-[var(--text-secondary)]">
                      {resolveText(t('portfolio.totalValue'), 'portfolio.totalValue', 'Total Value')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-6">
                {dashboard.allocation.map(item => (
                  <div key={item.key} className="flex items-center space-x-4">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></div>
                    <div className="flex-1">
                      <div className="font-semibold text-[var(--text-primary)]">{item.label}</div>
                      <div className="mt-1 text-sm text-[var(--text-secondary)]">
                        <span className="font-medium mr-2">${formatNumber(item.value, 2)}</span>
                        <span>({formatNumber(item.percentage, 2)}%)</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6 mb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">{performanceHeading}</h2>
          </div>
          <div className="flex rounded-lg bg-[var(--bg-secondary)] p-1">
            <button
              onClick={() => setPerformanceRange('7d')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition ${performanceRange === '7d' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              7D
            </button>
            <button
              onClick={() => setPerformanceRange('30d')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition ${performanceRange === '30d' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              30D
            </button>
            <button
              onClick={() => setPerformanceRange('90d')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition ${performanceRange === '90d' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              90D
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--card-bg)] p-6">
          <div className="h-64 mb-6">
            <svg className="h-full w-full" viewBox="0 0 800 300">
              <defs>
                <pattern height="30" id="dashboard-grid" patternUnits="userSpaceOnUse" width="80">
                  <path d="M 80 0 L 0 0 0 30" fill="none" opacity="0.55" stroke="var(--border-color)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect fill="url(#dashboard-grid)" height="100%" width="100%" />
              <polyline fill="none" points={performanceData.map(point => `${point.x},${point.y}`).join(' ')} stroke="var(--primary-color)" strokeWidth="3" />
              {performanceData.map(point => (
                <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} fill="var(--primary-color)" r="4" />
              ))}
            </svg>
          </div>

          <div className="app-grid cols-3 border-t border-[var(--border-color)] pt-6 mt-2">
            <div className="text-center">
              <div className="text-sm text-[var(--text-secondary)]">
                {resolveText(t('portfolio.highestValue'), 'portfolio.highestValue', 'Highest Value')}
              </div>
              <div className="mt-2 text-xl font-bold text-[var(--number-color)]">$26,500</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-[var(--text-secondary)]">
                {resolveText(t('portfolio.lowestValue'), 'portfolio.lowestValue', 'Lowest Value')}
              </div>
              <div className="mt-2 text-xl font-bold text-[var(--number-color)]">$23,800</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-[var(--text-secondary)]">
                {resolveText(t('portfolio.volatility'), 'portfolio.volatility', 'Volatility')}
              </div>
              <div className="mt-2 text-xl font-bold text-[var(--number-color)]">12.5%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 mb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">{recentActivityHeading}</h2>
          </div>
        </div>

        <div className="divide-y divide-[var(--border-color)] rounded-2xl bg-[var(--card-bg)]">
          {recentActivities.map(activity => {
            const iconData = getActivityIcon(activity.key)
            return (
              <Link
                key={activity.key}
                className="flex items-center p-5 transition hover:bg-[var(--bg-secondary)] hover:opacity-90"
                to={activity.href}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[10px] text-white mr-5 flex-shrink-0" style={{ backgroundColor: iconData.color, fontSize: '1.25rem' }}>
                  {iconData.icon}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[var(--text-primary)] text-[1.05rem]">{activity.title}</div>
                  <div className="mt-1 text-[0.85rem] text-[var(--text-secondary)]">{activity.description}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-[1.05rem]" style={{ color: activity.key === 'savings' ? 'var(--success-color)' : 'var(--text-primary)' }}>
                    {activity.key === 'savings' && !activity.amount.startsWith('-') && !activity.amount.startsWith('+') ? '+' : ''}{activity.amount}
                  </div>
                  <div className="mt-1 text-[0.825rem] text-[var(--text-secondary)]">{formatTimeAgo(activity.timestamp)}</div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </PageScaffold>
  )
}
