import { InfoCircleOutlined, QuestionCircleOutlined, WarningOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ethers, formatUnits, parseUnits } from 'ethers'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormattedInput } from '@/components/common/FormattedInput'
import { InfoCards } from '@/components/common/InfoCards'
import { PullToRefresh } from '@/components/common/PullToRefresh'
import { QuickAmounts } from '@/components/common/QuickAmounts'
import { TokenIcon } from '@/components/common/TokenIcon'
import { TransactionModal, type TransactionDetail, type TransactionStep } from '@/components/common/TransactionModal'
import { DEFAULT_CHAIN_ID } from '@/constants'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { feedback } from '@/lib/feedback'
import { PageScaffold, PageSection } from '@/pages/PageScaffold'
import { contractService } from '@/services/contracts'
import { useWalletStore } from '@/stores/wallet'
import { calculatePercentageAmount, formatDate, formatNumber, formatNumberK } from '@/utils/format'
import { resolveText } from '@/utils/i18n'

type BondsFilter = 'all' | 'active' | 'matured'
type TransactionMode = 'subscribe' | 'redeem'

interface BondInfo {
  bondId: number
  principal: string
  wrmbAmount: string
  subscribeTime: number
  maturityTime: number
  interestRate: string
  isActive: boolean
  isMatured: boolean
}

interface BondPreview {
  principal: string
  wrmbAmount: string
  maturityDate: number
  expectedReturn: string
}

interface BondsView {
  totalSize: string
  activeBonds: number
  interestRate: string
  availableCapacity: string
  durationDays: number
  minimumAmount: string
  maximumAmount: string
  subscriptionOpen: boolean
  usdtAllowance: string
  usdtBalance: string
  userBonds: BondInfo[]
}

const emptyView: BondsView = {
  activeBonds: 0,
  availableCapacity: '0',
  durationDays: 0,
  interestRate: '0',
  maximumAmount: '0',
  minimumAmount: '0',
  subscriptionOpen: false,
  totalSize: '0',
  usdtAllowance: '0',
  usdtBalance: '0',
  userBonds: []
}

const emptyPreview: BondPreview = {
  expectedReturn: '0',
  maturityDate: 0,
  principal: '0',
  wrmbAmount: '0'
}

function safeParseUnits(value: string, decimals: number) {
  if (!value || Number.parseFloat(value) <= 0) {
    return 0n
  }

  try {
    return parseUnits(value, decimals)
  } catch {
    return 0n
  }
}

function getBondProgress(bond: BondInfo) {
  const totalDuration = bond.maturityTime - bond.subscribeTime
  if (totalDuration <= 0) {
    return 100
  }

  const elapsed = Date.now() - bond.subscribeTime
  return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
}

function getCurrentValue(bond: BondInfo, durationDays: number) {
  const principal = Number.parseFloat(bond.principal)
  const rate = Number.parseFloat(bond.interestRate) / 100
  const progress = getBondProgress(bond) / 100
  const durationYears = durationDays / 365

  if (!principal || !Number.isFinite(principal)) {
    return 0
  }

  return principal * (1 + rate * durationYears * progress)
}

function getRemainingTime(maturityTime: number, maturedLabel: string, daysRemainingLabel: string) {
  const remaining = maturityTime - Date.now()
  if (remaining <= 0) {
    return maturedLabel
  }

  const days = Math.ceil(remaining / (24 * 60 * 60 * 1000))
  return `${days} ${daysRemainingLabel}`
}

export default function BondsPage() {
  const { t } = useTranslation()
  const wallet = useWalletStore()
  const queryClient = useQueryClient()
  const chainId = wallet.chainId || DEFAULT_CHAIN_ID

  const [bondsFilter, setBondsFilter] = useState<BondsFilter>('all')
  const [subscriptionAmount, setSubscriptionAmount] = useState('')
  const [transactionVisible, setTransactionVisible] = useState(false)
  const [transactionTitle, setTransactionTitle] = useState('')
  const [transactionHash, setTransactionHash] = useState('')
  const [transactionError, setTransactionError] = useState('')
  const [transactionStatus, setTransactionStatus] = useState<'pending' | 'loading' | 'success' | 'error'>('pending')
  const [transactionStep, setTransactionStep] = useState(0)
  const [transactionMode, setTransactionMode] = useState<TransactionMode>('subscribe')
  const [selectedBond, setSelectedBond] = useState<BondInfo | null>(null)
  const debouncedSubscriptionAmount = useDebouncedValue(subscriptionAmount)

  const transactionSteps: TransactionStep[] = useMemo(
    () => [
      { label: t('transaction.approve'), description: t('transaction.approveDescription') },
      { label: t('transaction.confirm'), description: t('transaction.confirmDescription') },
      { label: t('transaction.complete'), description: t('transaction.completeDescription') }
    ],
    [t]
  )

  const bondsQuery = useQuery({
    queryKey: ['bonds', 'overview', chainId, wallet.address],
    refetchInterval: wallet.isConnected ? 6_000 : 30_000,
    queryFn: async (): Promise<BondsView> => {
      const bondPoolContract = contractService.getBondPoolContract()
      const usdtContract = contractService.getUSDTContract()
      const addresses = contractService.getAddresses()

      if (!bondPoolContract) {
        return emptyView
      }

      const [poolStats, poolConfig] = await Promise.all([
        bondPoolContract.getPoolStats().catch(() => [0n, 0n, 0n] as const),
        bondPoolContract.poolConfig().catch(
          () =>
            ({
              bondDuration: 0n,
              interestRate: 0n,
              maxPoolSize: 0n,
              maxSubscription: 0n,
              minSubscription: 0n,
              subscriptionOpen: false
            }) as const
        )
      ])

      const nextView: BondsView = {
        activeBonds: Number(poolStats[1] ?? 0),
        availableCapacity: formatUnits(poolStats[2] ?? 0, 6),
        durationDays: Number(poolConfig.bondDuration ?? 0) / (24 * 60 * 60),
        interestRate: formatUnits(poolConfig.interestRate ?? 0, 2),
        maximumAmount: formatUnits(poolConfig.maxSubscription ?? 0, 6),
        minimumAmount: formatUnits(poolConfig.minSubscription ?? 0, 6),
        subscriptionOpen: Boolean(poolConfig.subscriptionOpen),
        totalSize: formatUnits(poolStats[0] ?? 0, 6),
        usdtAllowance: '0',
        usdtBalance: '0',
        userBonds: []
      }

      if (!wallet.address || !usdtContract || !addresses.BOND_POOL) {
        return nextView
      }

      const [usdtBalance, usdtAllowance, userBondsResult] = await Promise.all([
        usdtContract.balanceOf(wallet.address).catch(() => 0n),
        usdtContract.allowance(wallet.address, addresses.BOND_POOL).catch(() => 0n),
        bondPoolContract.getUserBonds(wallet.address).catch(() => [[], []] as const)
      ])

      const [bondIds, bondsData] = userBondsResult as [bigint[], Array<Record<string, bigint | boolean>>]
      const nowInSeconds = Date.now() / 1000
      const userBonds = bondIds.map((bondId, index) => {
        const bond = bondsData[index] ?? {}
        const maturityTime = Number(bond.maturityTime ?? 0)
        const isMatured = nowInSeconds >= maturityTime

        return {
          bondId: Number(bondId),
          interestRate: formatUnits((bond.interestRate as bigint | undefined) ?? 0n, 2),
          isActive: Boolean(bond.isActive) && !isMatured,
          isMatured,
          maturityTime: maturityTime * 1000,
          principal: formatUnits((bond.principal as bigint | undefined) ?? 0n, 6),
          subscribeTime: Number(bond.subscribeTime ?? 0) * 1000,
          wrmbAmount: formatUnits((bond.wrmbAmount as bigint | undefined) ?? 0n, 18)
        }
      })

      return {
        ...nextView,
        usdtAllowance: formatUnits(usdtAllowance, 6),
        usdtBalance: formatUnits(usdtBalance, 6),
        userBonds
      }
    }
  })

  const view = bondsQuery.data ?? emptyView

  const previewQuery = useQuery({
    enabled: Number.parseFloat(debouncedSubscriptionAmount) > 0,
    queryKey: ['bonds', 'preview', chainId, debouncedSubscriptionAmount],
    queryFn: async (): Promise<BondPreview> => {
      const amount = Number.parseFloat(debouncedSubscriptionAmount)
      if (!amount || amount <= 0) {
        return emptyPreview
      }

      const bondPoolContract = contractService.getBondPoolContract()
      if (!bondPoolContract) {
        const expectedReturn = amount * (1 + (Number.parseFloat(view.interestRate) / 100) * (view.durationDays / 365))

        return {
          expectedReturn: expectedReturn.toFixed(2),
          maturityDate: Date.now() + view.durationDays * 24 * 60 * 60 * 1000,
          principal: amount.toFixed(2),
          wrmbAmount: amount.toFixed(2)
        }
      }

      const [wrmbAmount, maturityDate, expectedReturn] = await bondPoolContract.previewSubscription(
        parseUnits(debouncedSubscriptionAmount, 6)
      )

      return {
        expectedReturn: formatUnits(expectedReturn, 18),
        maturityDate: Number(maturityDate) * 1000,
        principal: amount.toFixed(2),
        wrmbAmount: formatUnits(wrmbAmount, 18)
      }
    }
  })

  const subscriptionPreview = previewQuery.data ?? emptyPreview
  const filteredUserBonds = useMemo(() => {
    switch (bondsFilter) {
      case 'active':
        return view.userBonds.filter(bond => bond.isActive)
      case 'matured':
        return view.userBonds.filter(bond => bond.isMatured)
      default:
        return view.userBonds
    }
  }, [bondsFilter, view.userBonds])
  const maxSubscriptionAmount = useMemo(() => {
    return Math.max(
      0,
      Math.min(
        Number.parseFloat(view.usdtBalance) || 0,
        Number.parseFloat(view.maximumAmount) || 0,
        Number.parseFloat(view.availableCapacity) || 0
      )
    )
  }, [view.availableCapacity, view.maximumAmount, view.usdtBalance])
  const needsApproval = useMemo(() => {
    const amount = safeParseUnits(subscriptionAmount, 6)
    return amount > 0n && amount > safeParseUnits(view.usdtAllowance, 6)
  }, [subscriptionAmount, view.usdtAllowance])
  const isSubscriptionValid =
    wallet.isConnected &&
    view.subscriptionOpen &&
    Number.parseFloat(subscriptionAmount) > 0 &&
    Number.parseFloat(subscriptionAmount) >= Number.parseFloat(view.minimumAmount) &&
    Number.parseFloat(subscriptionAmount) <= Number.parseFloat(view.maximumAmount) &&
    Number.parseFloat(subscriptionAmount) <= Number.parseFloat(view.availableCapacity) &&
    Number.parseFloat(subscriptionAmount) <= Number.parseFloat(view.usdtBalance)

  const transactionDetails = useMemo<TransactionDetail[]>(() => {
    if (transactionMode === 'subscribe' && Number.parseFloat(subscriptionAmount) > 0) {
      return [
        {
          label: t('pay'),
          values: [`-${formatNumber(subscriptionAmount, 6)} USDT`],
          highlight: true,
          type: 'debit'
        },
        {
          label: t('receive'),
          values: [`+${formatNumber(subscriptionPreview.wrmbAmount, 6)} WRMB`],
          type: 'credit'
        },
        {
          label: t('bonds.maturityDate'),
          values: [formatDate(subscriptionPreview.maturityDate)]
        },
        {
          label: t('bonds.expectedReturn'),
          values: [`${formatNumber(subscriptionPreview.expectedReturn, 6)} WRMB`]
        }
      ]
    }

    if (transactionMode === 'redeem' && selectedBond) {
      return [
        {
          label: t('bonds.bondId'),
          values: [`#${selectedBond.bondId}`],
          highlight: true
        },
        {
          label: t('bonds.principal'),
          values: [`${formatNumber(selectedBond.principal, 6)} USDT`]
        },
        {
          label: t('bonds.wrmbAmount'),
          values: [`${formatNumber(selectedBond.wrmbAmount, 6)} WRMB`],
          type: 'credit'
        }
      ]
    }

    return []
  }, [
    selectedBond,
    subscriptionAmount,
    subscriptionPreview.expectedReturn,
    subscriptionPreview.maturityDate,
    subscriptionPreview.wrmbAmount,
    t,
    transactionMode
  ])

  const overviewItems = useMemo(
    () => [
      {
        label: t('bonds.totalPoolSize'),
        secondary: t('bonds.totalCapacity'),
        value: `${formatNumber(view.totalSize, 2)} USDT`
      },
      {
        label: t('bonds.currentRate'),
        secondary: t('bonds.annualRate'),
        value: `${formatNumber(view.interestRate, 2)}%`
      },
      {
        label: t('bonds.availableCapacity'),
        secondary: `${formatNumber(
          Number.parseFloat(view.totalSize) > 0
            ? (Number.parseFloat(view.availableCapacity) / Number.parseFloat(view.totalSize)) * 100
            : 0
        )}% ${t('bonds.remaining')}`,
        value: `${formatNumber(view.availableCapacity, 2)} USDT`
      },
      {
        label: t('bonds.activeBonds'),
        secondary: t('bonds.totalBonds'),
        value: formatNumber(view.activeBonds, 0)
      }
    ],
    [t, view.activeBonds, view.availableCapacity, view.interestRate, view.totalSize]
  )

  const infoCards = useMemo(
    () => [
      {
        icon: <InfoCircleOutlined />,
        title: t('bonds.bondPool'),
        content: t('bonds.description')
      },
      {
        icon: <QuestionCircleOutlined />,
        title: t('bonds.bondTerms'),
        content: `${formatNumber(view.durationDays, 0)} ${t('bonds.days')} / ${formatNumber(view.interestRate, 2)}%`
      },
      {
        icon: <WarningOutlined />,
        title: t('bonds.status'),
        content: t(view.subscriptionOpen ? 'bonds.subscriptionOpen' : 'bonds.subscriptionClosed')
      }
    ],
    [t, view.durationDays, view.interestRate, view.subscriptionOpen]
  )

  const refreshData = async () => {
    await queryClient.invalidateQueries({ queryKey: ['bonds'] })
  }

  const resetTransaction = () => {
    setTransactionVisible(false)
    setTransactionError('')
    setTransactionHash('')
    setTransactionStatus('pending')
    setTransactionStep(0)
    setSelectedBond(null)
    setTransactionMode('subscribe')
  }

  const handleSetSubscriptionAmount = (amount: string) => {
    setSubscriptionAmount(amount)
  }

  const handleSelectPercentage = (percentage: number) => {
    handleSetSubscriptionAmount(calculatePercentageAmount(maxSubscriptionAmount.toString(), percentage, 6))
  }

  const handleSelectMax = () => {
    handleSetSubscriptionAmount(maxSubscriptionAmount.toString())
  }

  const handleSubscribe = async () => {
    if (!wallet.isConnected || !wallet.address) {
      feedback.warning(t('wallet.connectWallet'))
      return
    }

    if (!isSubscriptionValid) {
      return
    }

    const bondPoolContract = contractService.getBondPoolContract(true)
    const usdtContract = contractService.getUSDTContract(true)
    const addresses = contractService.getAddresses()
    if (!bondPoolContract || !usdtContract || !addresses.BOND_POOL) {
      feedback.error(t('bonds.subscriptionFailed'))
      return
    }

    setTransactionMode('subscribe')
    setTransactionVisible(true)
    setTransactionTitle(t('bonds.subscriptionTransaction'))
    setTransactionStatus('pending')
    setTransactionStep(0)
    setTransactionError('')
    setTransactionHash('')

    try {
      const amount = parseUnits(subscriptionAmount, 6)

      if (needsApproval) {
        setTransactionStatus('loading')
        const approveTx = await usdtContract.approve(addresses.BOND_POOL, ethers.MaxUint256)
        await approveTx.wait()
        feedback.success(t('bonds.approvalSuccess'))
      }

      setTransactionStep(1)
      setTransactionStatus('loading')

      const subscribeTx = await bondPoolContract.subscribeBond(amount)
      const receipt = await subscribeTx.wait()

      setTransactionStep(2)
      setTransactionStatus('success')
      setTransactionHash(receipt.hash ?? subscribeTx.hash)
      setSubscriptionAmount('')
      await refreshData()
      feedback.success(t('bonds.subscriptionSuccess'))
    } catch (error) {
      setTransactionStatus('error')
      setTransactionError(error instanceof Error ? error.message : t('bonds.subscriptionFailed'))
    }
  }

  const handleRedeem = async (bond: BondInfo) => {
    if (!wallet.isConnected) {
      feedback.warning(t('wallet.connectWallet'))
      return
    }

    if (!bond.isMatured) {
      feedback.warning(t('bonds.bondNotMatured'))
      return
    }

    const bondPoolContract = contractService.getBondPoolContract(true)
    if (!bondPoolContract) {
      feedback.error(t('bonds.redeemFailed'))
      return
    }

    setSelectedBond(bond)
    setTransactionMode('redeem')
    setTransactionVisible(true)
    setTransactionTitle(t('bonds.redeem'))
    setTransactionStatus('pending')
    setTransactionStep(1)
    setTransactionError('')
    setTransactionHash('')

    try {
      setTransactionStatus('loading')
      const redeemTx = await bondPoolContract.matureBond(bond.bondId)
      const receipt = await redeemTx.wait()

      setTransactionStep(2)
      setTransactionStatus('success')
      setTransactionHash(receipt.hash ?? redeemTx.hash)
      await refreshData()
      feedback.success(t('bonds.redeemSuccess'))
    } catch (error) {
      setTransactionStatus('error')
      setTransactionError(error instanceof Error ? error.message : t('bonds.redeemFailed'))
    }
  }

  const pageTitle = resolveText(t('bonds.title'), 'bonds.title', 'Bond Trading')
  const poolOverviewHeading = resolveText(t('bonds.poolOverview'), 'bonds.poolOverview', 'Pool Overview')
  const yourBondsHeading = resolveText(t('bonds.yourBonds'), 'bonds.yourBonds', 'Your Bonds')

  return (
    <PageScaffold title={pageTitle}>
      <PullToRefresh>
        {!wallet.isConnected ? (
          <div className="app-inline-note is-info mb-6">{resolveText(t('wallet.connectWallet'), 'wallet.connectWallet', 'Connect Wallet')}</div>
        ) : null}
        {!view.subscriptionOpen ? (
          <div className="app-inline-note is-warning mb-6">{resolveText(t('bonds.subscriptionClosed'), 'bonds.subscriptionClosed', 'Subscription Closed')}</div>
        ) : null}

        <PageSection>
          <div className="mb-6">
            <h2 className="page-section-title">{poolOverviewHeading}</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {resolveText(t('bonds.description'), 'bonds.description', 'Subscribe to bonds and earn compound interest')}
            </p>
          </div>
          <div className="app-grid cols-4">
            {overviewItems.map((item, index) => (
              <div key={item.label} className={`rounded-2xl border p-5 ${index === 0 ? 'border-transparent bg-[linear-gradient(135deg,var(--primary-color),var(--accent-color))] text-white' : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'}`}>
                <div className={`text-sm font-semibold ${index === 0 ? 'text-white/75' : 'text-[var(--text-secondary)]'}`}>{item.label}</div>
                <div className={`mt-4 text-2xl font-bold ${index === 0 ? 'text-white' : 'text-[var(--number-color)]'}`}>{item.value}</div>
                <div className={`mt-2 text-xs ${index === 0 ? 'text-white/80' : 'text-[var(--text-secondary)]'}`}>{item.secondary}</div>
              </div>
            ))}
          </div>
        </PageSection>

        <div className="grid gap-6 xl:grid-cols-2">
          <PageSection>
            <div className="mb-6">
              <h2 className="page-section-title">{resolveText(t('bonds.subscribe'), 'bonds.subscribe', 'Subscribe')}</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{resolveText(t('bonds.subscribeWithUSDT'), 'bonds.subscribeWithUSDT', 'Subscribe with USDT')}</p>
            </div>

            <div className="space-y-5">
              <FormattedInput decimals={6} modelValue={subscriptionAmount} placeholder={`${formatNumberK(view.usdtBalance)} ${t('available')}`} size="large" onChange={handleSetSubscriptionAmount}>
                <div className="flex items-center gap-2"><TokenIcon size="small" symbol="USDT" /><span>USDT</span></div>
              </FormattedInput>
              <QuickAmounts disabled={!wallet.isConnected} maxLabel={t('common.max')} onSelectMax={handleSelectMax} onSelectPercentage={handleSelectPercentage} />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[var(--bg-secondary)] p-4"><div className="text-sm text-[var(--text-secondary)]">{resolveText(t('bonds.duration'), 'bonds.duration', 'Duration')}</div><div className="mt-2 font-semibold text-[var(--text-primary)]">{formatNumber(view.durationDays, 0)} {t('bonds.days')}</div></div>
                <div className="rounded-2xl bg-[var(--bg-secondary)] p-4"><div className="text-sm text-[var(--text-secondary)]">{resolveText(t('bonds.interestRate'), 'bonds.interestRate', 'Interest Rate')}</div><div className="mt-2 font-semibold text-[var(--text-primary)]">{formatNumber(view.interestRate, 2)}%</div></div>
                <div className="rounded-2xl bg-[var(--bg-secondary)] p-4"><div className="text-sm text-[var(--text-secondary)]">{resolveText(t('bonds.minimumAmount'), 'bonds.minimumAmount', 'Minimum Amount')}</div><div className="mt-2 font-semibold text-[var(--text-primary)]">{formatNumber(view.minimumAmount, 2)} USDT</div></div>
                <div className="rounded-2xl bg-[var(--bg-secondary)] p-4"><div className="text-sm text-[var(--text-secondary)]">{resolveText(t('bonds.maximumAmount'), 'bonds.maximumAmount', 'Maximum Amount')}</div><div className="mt-2 font-semibold text-[var(--text-primary)]">{formatNumber(view.maximumAmount, 2)} USDT</div></div>
              </div>

              {Number.parseFloat(subscriptionAmount) > 0 ? (
                <div className="rounded-2xl bg-[var(--bg-secondary)] p-5">
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">{resolveText(t('bonds.preview'), 'bonds.preview', 'Preview')}</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4"><span className="text-[var(--text-secondary)]">{resolveText(t('bonds.principalAmount'), 'bonds.principalAmount', 'Principal Amount')}</span><span className="font-medium text-[var(--text-primary)]">{formatNumber(subscriptionPreview.principal, 2)} USDT</span></div>
                    <div className="flex items-center justify-between gap-4"><span className="text-[var(--text-secondary)]">{resolveText(t('bonds.wrmbReceived'), 'bonds.wrmbReceived', 'WRMB Received')}</span><span className="font-medium text-[var(--text-primary)]">{formatNumber(subscriptionPreview.wrmbAmount, 6)} WRMB</span></div>
                    <div className="flex items-center justify-between gap-4"><span className="text-[var(--text-secondary)]">{resolveText(t('bonds.maturityDate'), 'bonds.maturityDate', 'Maturity Date')}</span><span className="font-medium text-[var(--text-primary)]">{formatDate(subscriptionPreview.maturityDate)}</span></div>
                    <div className="flex items-center justify-between gap-4 border-t border-[var(--border-color)] pt-3"><span className="text-[var(--text-secondary)]">{resolveText(t('bonds.expectedReturn'), 'bonds.expectedReturn', 'Expected Return')}</span><span className="font-semibold text-[var(--primary-color)]">{formatNumber(subscriptionPreview.expectedReturn, 6)} WRMB</span></div>
                    {needsApproval ? <div className="inline-flex rounded-full bg-[rgba(245,158,11,0.16)] px-3 py-1 text-xs font-semibold text-[var(--warning-color)]">{resolveText(t('transaction.approve'), 'transaction.approve', 'Approve')}</div> : null}
                  </div>
                </div>
              ) : null}

              <button className="app-action-button is-primary w-full" disabled={!isSubscriptionValid} type="button" onClick={() => void handleSubscribe()}>
                {resolveText(t('bonds.subscribeBond'), 'bonds.subscribeBond', 'Subscribe Bond')}
              </button>
            </div>
          </PageSection>

          <PageSection>
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="page-section-title">{yourBondsHeading}</h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{wallet.isConnected ? resolveText(t('bonds.myBonds'), 'bonds.myBonds', 'My Bonds') : resolveText(t('wallet.connectWallet'), 'wallet.connectWallet', 'Connect Wallet')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: resolveText(t('bonds.allBonds'), 'bonds.allBonds', 'All Bonds'), value: 'all' as const },
                  { label: resolveText(t('bonds.activeBonds'), 'bonds.activeBonds', 'Active Bonds'), value: 'active' as const },
                  { label: resolveText(t('bonds.maturedBonds'), 'bonds.maturedBonds', 'Matured Bonds'), value: 'matured' as const }
                ].map(option => (
                  <button key={option.value} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${bondsFilter === option.value ? 'bg-[var(--primary-color)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`} type="button" onClick={() => setBondsFilter(option.value)}>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredUserBonds.length === 0 ? (
              <div className="app-inline-note">{resolveText(t('bonds.noBonds'), 'bonds.noBonds', 'No bonds found')}</div>
            ) : (
              <div className="space-y-4">
                {filteredUserBonds.map(bond => {
                  const progress = getBondProgress(bond)
                  const currentValue = getCurrentValue(bond, view.durationDays)
                  const statusLabel = bond.isMatured ? resolveText(t('bonds.matured'), 'bonds.matured', 'Matured') : bond.isActive ? resolveText(t('bonds.active'), 'bonds.active', 'Active') : resolveText(t('bonds.inactive'), 'bonds.inactive', 'Inactive')

                  return (
                    <div key={bond.bondId} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div><div className="text-sm text-[var(--text-secondary)]">{resolveText(t('bonds.bondId'), 'bonds.bondId', 'Bond ID')}</div><div className="mt-1 text-xl font-bold text-[var(--text-primary)]">#{bond.bondId}</div></div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${bond.isMatured ? 'bg-[rgba(16,185,129,0.16)] text-[var(--success-color)]' : bond.isActive ? 'bg-[rgba(59,130,246,0.16)] text-[var(--primary-color)]' : 'bg-[var(--card-bg)] text-[var(--text-secondary)]'}`}>{statusLabel}</span>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div><div className="text-sm text-[var(--text-secondary)]">{resolveText(t('bonds.principal'), 'bonds.principal', 'Principal')}</div><div className="mt-1 font-medium text-[var(--text-primary)]">{formatNumber(bond.principal, 2)} USDT</div></div>
                        <div><div className="text-sm text-[var(--text-secondary)]">{resolveText(t('bonds.wrmbAmount'), 'bonds.wrmbAmount', 'WRMB Amount')}</div><div className="mt-1 font-medium text-[var(--text-primary)]">{formatNumber(bond.wrmbAmount, 6)} WRMB</div></div>
                        <div><div className="text-sm text-[var(--text-secondary)]">{resolveText(t('bonds.subscribeDate'), 'bonds.subscribeDate', 'Subscribe Date')}</div><div className="mt-1 font-medium text-[var(--text-primary)]">{formatDate(bond.subscribeTime)}</div></div>
                        <div><div className="text-sm text-[var(--text-secondary)]">{resolveText(t('bonds.maturityDate'), 'bonds.maturityDate', 'Maturity Date')}</div><div className="mt-1 font-medium text-[var(--text-primary)]">{formatDate(bond.maturityTime)}</div></div>
                        <div className="sm:col-span-2"><div className="text-sm text-[var(--text-secondary)]">{resolveText(t('bonds.currentValue'), 'bonds.currentValue', 'Current Value')}</div><div className="mt-1 font-semibold text-[var(--primary-color)]">{formatNumber(currentValue, 2)} USDT</div></div>
                      </div>

                      <div className="mt-5 space-y-3">
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--card-bg)]"><div className="h-full rounded-full bg-[var(--primary-color)]" style={{ width: `${Number(progress.toFixed(0))}%` }} /></div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs text-[var(--text-secondary)]">{formatNumber(progress, 0)}% {resolveText(t('bonds.completed'), 'bonds.completed', 'Completed')}</span>
                          {bond.isMatured ? (
                            <button className="app-action-button is-primary" type="button" onClick={() => void handleRedeem(bond)}>
                              {resolveText(t('bonds.redeem'), 'bonds.redeem', 'Redeem')}
                            </button>
                          ) : (
                            <span className="rounded-full bg-[var(--card-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                              {getRemainingTime(bond.maturityTime, resolveText(t('bonds.matured'), 'bonds.matured', 'Matured'), resolveText(t('bonds.daysRemaining'), 'bonds.daysRemaining', 'days remaining'))}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </PageSection>
        </div>

        <InfoCards cards={infoCards} />

        <TransactionModal currentStep={transactionStep} errorMessage={transactionError} onClose={resetTransaction} onRetry={() => { if (transactionMode === 'redeem' && selectedBond) { void handleRedeem(selectedBond); return } void handleSubscribe() }} status={transactionStatus} steps={transactionSteps} title={transactionTitle} transactionDetails={transactionDetails} transactionHash={transactionHash} visible={transactionVisible} />
      </PullToRefresh>
    </PageScaffold>
  )
}
