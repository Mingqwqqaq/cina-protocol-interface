import { InfoCircleOutlined, QuestionCircleOutlined, WarningOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ethers, formatUnits, parseUnits } from 'ethers'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatedNumber } from '@/components/common/AnimatedNumber'
import { FormattedInput } from '@/components/common/FormattedInput'
import { InfoCards } from '@/components/common/InfoCards'
import { PullToRefresh } from '@/components/common/PullToRefresh'
import { QuickAmounts } from '@/components/common/QuickAmounts'
import { TokenIcon } from '@/components/common/TokenIcon'
import { TransactionModal, type TransactionDetail, type TransactionStep } from '@/components/common/TransactionModal'
import { DEFAULT_CHAIN_ID } from '@/constants'
import {
  ORIGINAL_STAKING_BALANCES,
  ORIGINAL_STAKING_OVERVIEW,
  USE_LOCAL_DEMO_DATA
} from '@/data/originalDemoData'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { feedback } from '@/lib/feedback'
import { PageScaffold, PageSection } from '@/pages/PageScaffold'
import { contractService } from '@/services/contracts'
import { useStakingStore } from '@/stores/staking'
import { useWalletStore } from '@/stores/wallet'
import { calculatePercentageAmount, formatNumber, formatNumberK } from '@/utils/format'
import { resolveText } from '@/utils/i18n'

interface StakingView {
  yourStaked: string
  totalSupply: string
  cinaBalance: string
  stCINABalance: string
  stakedAmount: string
  currentAPY: string
  minStakeAmount: string
  navCina: string
  totalPendingAmount: string
}

interface PreviewResult {
  shares: string
  fee: string
}

const emptyStakingView: StakingView = {
  yourStaked: '0',
  totalSupply: '0',
  cinaBalance: '0',
  stCINABalance: '0',
  stakedAmount: '0',
  currentAPY: '0',
  minStakeAmount: '0',
  navCina: '1',
  totalPendingAmount: '0'
}

const emptyPreview: PreviewResult = {
  shares: '',
  fee: '0'
}

function getDemoStakingView(address: string): StakingView {
  return {
    cinaBalance: address ? ORIGINAL_STAKING_BALANCES.cinaBalance : '0',
    currentAPY: ORIGINAL_STAKING_OVERVIEW.currentAPY,
    minStakeAmount: ORIGINAL_STAKING_OVERVIEW.minStakeAmount,
    navCina: ORIGINAL_STAKING_OVERVIEW.navCina,
    stCINABalance: address ? ORIGINAL_STAKING_BALANCES.stCINABalance : ORIGINAL_STAKING_OVERVIEW.stCINABalance,
    stakedAmount: address ? ORIGINAL_STAKING_BALANCES.stakedAmount : ORIGINAL_STAKING_OVERVIEW.stakedAmount,
    totalPendingAmount: ORIGINAL_STAKING_OVERVIEW.totalPendingAmount,
    totalSupply: ORIGINAL_STAKING_OVERVIEW.totalSupply,
    yourStaked: ORIGINAL_STAKING_OVERVIEW.yourStaked
  }
}

export default function StakingPage() {
  const { t } = useTranslation()
  const wallet = useWalletStore()
  const queryClient = useQueryClient()
  const activeTab = useStakingStore(state => state.activeTab)
  const setActiveTab = useStakingStore(state => state.setActiveTab)
  const chainId = wallet.chainId || DEFAULT_CHAIN_ID

  const [stakeAmount, setStakeAmount] = useState('')
  const [unstakeAmount, setUnstakeAmount] = useState('')
  const [transactionVisible, setTransactionVisible] = useState(false)
  const [transactionTitle, setTransactionTitle] = useState('')
  const [transactionHash, setTransactionHash] = useState('')
  const [transactionError, setTransactionError] = useState('')
  const [transactionStatus, setTransactionStatus] = useState<'pending' | 'loading' | 'success' | 'error'>('pending')
  const [transactionStep, setTransactionStep] = useState(0)
  const debouncedStakeAmount = useDebouncedValue(stakeAmount)
  const debouncedUnstakeAmount = useDebouncedValue(unstakeAmount)

  const infoCards = useMemo(
    () => [
      {
        icon: <InfoCircleOutlined />,
        title: t('staking.whatIsStaking'),
        content: t('staking.stakingDescription')
      },
      {
        icon: <QuestionCircleOutlined />,
        title: t('staking.stakingRewards'),
        content: t('staking.stakingRewardsDescription')
      },
      {
        icon: <WarningOutlined />,
        title: t('staking.stakingRisks'),
        content: t('staking.stakingRisksDescription')
      }
    ],
    [t]
  )

  const transactionSteps: TransactionStep[] = useMemo(
    () => [
      { label: t('transaction.approve'), description: t('transaction.approveDescription') },
      { label: t('transaction.confirm'), description: t('transaction.confirmDescription') },
      { label: t('transaction.complete'), description: t('transaction.completeDescription') }
    ],
    [t]
  )

  const stakingQuery = useQuery({
    queryKey: ['staking', 'overview', chainId, wallet.address],
    refetchInterval: wallet.isConnected ? 6_000 : 30_000,
    queryFn: async (): Promise<StakingView> => {
      const stakingContract = contractService.getStakingVaultContract()
      const cinaContract = contractService.getCINAContract()
      if (!stakingContract) {
        return USE_LOCAL_DEMO_DATA ? getDemoStakingView(wallet.address) : emptyStakingView
      }

      const [totalSupply, navCina, minStakeAmount, maxWithdraw, lastDayRewardAmount, totalPendingAmount] =
        await Promise.all([
          stakingContract.totalSupply().catch(() => 0n),
          stakingContract.getNAV_CINA().catch(() => 1n),
          stakingContract.minStakeAmount().catch(() => 0n),
          wallet.address ? stakingContract.maxWithdraw(wallet.address).catch(() => 0n) : 0n,
          stakingContract.lastDayRewardAmount().catch(() => 0n),
          stakingContract.getTotalPendingAmount().catch(() => 0n)
        ])

      const totalSupplyValue = formatUnits(totalSupply, 18)
      const currentApy =
        Number.parseFloat(totalSupplyValue) > 0
          ? (
              (Number.parseFloat(formatUnits(lastDayRewardAmount, 18)) / Number.parseFloat(totalSupplyValue)) *
              365 *
              100
            ).toFixed(2)
          : '0'

      if (!wallet.address || !cinaContract) {
        return {
          ...emptyStakingView,
          currentAPY: currentApy,
          minStakeAmount: formatUnits(minStakeAmount, 18),
          navCina: formatUnits(navCina, 18),
          totalPendingAmount: formatUnits(totalPendingAmount, 18),
          totalSupply: totalSupplyValue,
          yourStaked: formatUnits(maxWithdraw, 18)
        }
      }

      const [cinaBalance, stCINABalance] = await Promise.all([
        cinaContract.balanceOf(wallet.address).catch(() => 0n),
        stakingContract.balanceOf(wallet.address).catch(() => 0n)
      ])

      return {
        cinaBalance: formatUnits(cinaBalance, 18),
        currentAPY: currentApy,
        minStakeAmount: formatUnits(minStakeAmount, 18),
        navCina: formatUnits(navCina, 18),
        stCINABalance: formatUnits(stCINABalance, 18),
        stakedAmount: formatUnits(maxWithdraw, 18),
        totalPendingAmount: formatUnits(totalPendingAmount, 18),
        totalSupply: totalSupplyValue,
        yourStaked: formatUnits(maxWithdraw, 18)
      }
    }
  })

  const stakingView = stakingQuery.data ?? emptyStakingView

  const stakePreviewQuery = useQuery({
    enabled: Number.parseFloat(debouncedStakeAmount) > 0,
    queryKey: ['staking', 'preview', 'stake', chainId, debouncedStakeAmount],
    queryFn: async (): Promise<PreviewResult> => {
      const stakingContract = contractService.getStakingVaultContract()
      if (!stakingContract) {
        return emptyPreview
      }

      const shares = await stakingContract.previewDeposit(parseUnits(debouncedStakeAmount, 18))
      return {
        shares: formatUnits(shares, 18),
        fee: '0'
      }
    }
  })

  const unstakePreviewQuery = useQuery({
    enabled: Number.parseFloat(debouncedUnstakeAmount) > 0,
    queryKey: ['staking', 'preview', 'unstake', chainId, debouncedUnstakeAmount],
    queryFn: async (): Promise<PreviewResult> => {
      const stakingContract = contractService.getStakingVaultContract()
      if (!stakingContract) {
        return emptyPreview
      }

      const shares = await stakingContract.previewWithdraw(parseUnits(debouncedUnstakeAmount, 18))
      return {
        shares: formatUnits(shares, 18),
        fee: '0'
      }
    }
  })

  const stakePreview = stakePreviewQuery.data ?? emptyPreview
  const unstakePreview = unstakePreviewQuery.data ?? emptyPreview

  const isStakeValid =
    Number.parseFloat(stakeAmount) > 0 &&
    Number.parseFloat(stakeAmount) <= Number.parseFloat(stakingView.cinaBalance) &&
    Number.parseFloat(stakeAmount) >= Number.parseFloat(stakingView.minStakeAmount)
  const isUnstakeValid =
    Number.parseFloat(unstakeAmount) > 0 &&
    Number.parseFloat(unstakeAmount) <= Number.parseFloat(stakingView.stakedAmount)
  const showMinStakeWarning =
    Number.parseFloat(stakeAmount) > 0 &&
    Number.parseFloat(stakeAmount) < Number.parseFloat(stakingView.minStakeAmount)

  const transactionDetails = useMemo<TransactionDetail[]>(() => {
    if (activeTab === 'stake' && stakeAmount) {
      return [
        {
          label: t('pay'),
          values: [`-${formatNumber(stakeAmount, 6)} CINA`],
          highlight: true,
          type: 'debit'
        },
        {
          label: t('receive'),
          values: [`+${formatNumber(stakePreview.shares || '0', 6)} stCINA`],
          type: 'credit'
        }
      ]
    }

    if (activeTab === 'unstake' && unstakeAmount) {
      return [
        {
          label: t('pay'),
          values: [`-${formatNumber(unstakePreview.shares || '0', 6)} stCINA`],
          type: 'debit'
        },
        {
          label: t('receive'),
          values: [`+${formatNumber(unstakeAmount, 6)} CINA`],
          highlight: true,
          type: 'credit'
        }
      ]
    }

    return []
  }, [activeTab, stakeAmount, stakePreview.shares, t, unstakeAmount, unstakePreview.shares])

  const refreshData = async () => {
    await queryClient.invalidateQueries({ queryKey: ['staking'] })
  }

  const resetTransaction = () => {
    setTransactionVisible(false)
    setTransactionHash('')
    setTransactionError('')
    setTransactionStatus('pending')
    setTransactionStep(0)
  }

  const handleStake = async () => {
    if (!wallet.isConnected || !wallet.address || !isStakeValid) {
      return
    }

    const stakingContract = contractService.getStakingVaultContract(true)
    const cinaContract = contractService.getCINAContract(true)
    if (!stakingContract || !cinaContract) {
      feedback.error(t('staking.stakeFailed'))
      return
    }

    setTransactionVisible(true)
    setTransactionTitle(t('staking.stakeTransaction'))
    setTransactionStatus('pending')
    setTransactionStep(0)

    try {
      const amountWei = parseUnits(stakeAmount, 18)
      const stakingAddress = await stakingContract.getAddress()
      const allowance = await cinaContract.allowance(wallet.address, stakingAddress)
      if (allowance < amountWei) {
        setTransactionStatus('loading')
        const approveTx = await cinaContract.approve(stakingAddress, ethers.MaxUint256)
        await approveTx.wait()
      }

      setTransactionStep(1)
      setTransactionStatus('loading')
      const depositTx = await stakingContract.deposit(amountWei, wallet.address)
      const receipt = await depositTx.wait()

      setTransactionStep(2)
      setTransactionStatus('success')
      setTransactionHash(receipt.hash)
      setStakeAmount('')
      await refreshData()
      feedback.success(t('staking.stakeSuccess'))
    } catch (error) {
      setTransactionStatus('error')
      setTransactionError(error instanceof Error ? error.message : t('staking.stakeFailed'))
    }
  }

  const handleUnstake = async () => {
    if (!wallet.isConnected || !wallet.address || !isUnstakeValid) {
      return
    }

    const stakingContract = contractService.getStakingVaultContract(true)
    if (!stakingContract) {
      feedback.error(t('staking.unstakeFailed'))
      return
    }

    setTransactionVisible(true)
    setTransactionTitle(t('staking.unstakeTransaction'))
    setTransactionStatus('loading')
    setTransactionStep(0)

    try {
      const amountWei = parseUnits(unstakeAmount, 18)
      const transaction =
        unstakeAmount === stakingView.stakedAmount
          ? await stakingContract.redeem(parseUnits(stakingView.stCINABalance, 18), wallet.address, wallet.address)
          : await stakingContract.withdraw(amountWei, wallet.address, wallet.address)

      setTransactionStep(1)
      const receipt = await transaction.wait()
      setTransactionStep(2)
      setTransactionStatus('success')
      setTransactionHash(receipt.hash)
      setUnstakeAmount('')
      await refreshData()
      feedback.success(t('staking.unstakeSuccess'))
    } catch (error) {
      setTransactionStatus('error')
      setTransactionError(error instanceof Error ? error.message : t('staking.unstakeFailed'))
    }
  }

  const pageTitle = resolveText(t('navigation.staking'), 'navigation.staking', 'Staking')
  const overviewTitle = resolveText(t('staking.overview'), 'staking.overview', 'Overview')
  const connectWalletLabel = resolveText(t('wallet.connectWallet'), 'wallet.connectWallet', 'Connect Wallet')
  const stakeLabel = resolveText(t('staking.stakeCINA'), 'staking.stakeCINA', 'Stake CINA')
  const unstakeLabel = resolveText(t('staking.unstakeCINA'), 'staking.unstakeCINA', 'Unstake CINA')
  const previewLabel = resolveText(t('staking.preview'), 'staking.preview', 'Preview')
  const yourStakedLabel = resolveText(t('staking.yourStaked'), 'staking.yourStaked', 'Your Staked')
  const apyLabel = resolveText(t('staking.apy'), 'staking.apy', 'APY')
  const balanceLabel = resolveText(t('wrap.balance'), 'wrap.balance', 'Balance')

  return (
    <PageScaffold title={pageTitle}>
      <PullToRefresh isRefreshing={stakingQuery.isRefetching}>
        {!wallet.isConnected ? <div className="app-inline-note is-info mb-6">{connectWalletLabel}</div> : null}

        <PageSection>
          <div className="mb-6">
            <h2 className="page-section-title">{overviewTitle}</h2>
          </div>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-[var(--text-secondary)]">{yourStakedLabel}</div>
                <div className="mt-2 text-sm text-[var(--text-secondary)]">
                  {apyLabel} {formatNumber(stakingView.currentAPY, 2)}%
                </div>
              </div>
              <div className="rounded-full bg-[var(--card-bg)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                stCINA Vault
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 text-3xl font-bold text-[var(--number-color)]">
              <TokenIcon size="large" symbol="CINA" />
              <AnimatedNumber decimals={4} value={stakingView.yourStaked} />
            </div>
          </div>
        </PageSection>

        <PageSection>
          <div className="mb-8 flex items-center justify-center rounded-2xl bg-[var(--bg-secondary)] p-1">
            <button
              className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
                activeTab === 'stake' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              type="button"
              onClick={() => {
                setActiveTab('stake')
                setStakeAmount('')
                setUnstakeAmount('')
              }}
            >
              {stakeLabel}
            </button>
            <button
              className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
                activeTab === 'unstake'
                  ? 'bg-[var(--primary-color)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              type="button"
              onClick={() => {
                setActiveTab('unstake')
                setStakeAmount('')
                setUnstakeAmount('')
              }}
            >
              {unstakeLabel}
            </button>
          </div>

          {activeTab === 'stake' ? (
            <div className="space-y-6">
              <div>
                <div className="mb-3 flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-[var(--text-primary)]">{stakeLabel}</span>
                  <span className="text-[var(--text-secondary)]">
                    {balanceLabel}: {formatNumberK(stakingView.cinaBalance)} CINA
                  </span>
                </div>
                <FormattedInput
                  className="w-full"
                  decimals={6}
                  maxDecimals={18}
                  modelValue={stakeAmount}
                  placeholder={`${formatNumberK(stakingView.cinaBalance)} ${t('available')}`}
                  size="large"
                  useAbbreviation
                  onChange={setStakeAmount}
                >
                  <span className="flex items-center gap-2">
                    <TokenIcon size="medium" symbol="CINA" />
                    <span>CINA</span>
                  </span>
                </FormattedInput>
                <div className="mt-4">
                  <QuickAmounts
                    maxLabel={t('common.max')}
                    onSelectMax={() => setStakeAmount(stakingView.cinaBalance)}
                    onSelectPercentage={percentage =>
                      setStakeAmount(calculatePercentageAmount(stakingView.cinaBalance, percentage))
                    }
                  />
                </div>
              </div>

              {showMinStakeWarning ? (
                <div className="app-inline-note is-warning">
                  {t('staking.minStakeWarning', { amount: stakingView.minStakeAmount })}
                </div>
              ) : null}

              {stakePreview.shares ? (
                <div className="rounded-2xl bg-[var(--bg-secondary)] p-5">
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">{previewLabel}</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[var(--text-secondary)]">
                        {resolveText(t('staking.youWillReceive'), 'staking.youWillReceive', 'You Will Receive')}
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">{formatNumber(stakePreview.shares, 2)} stCINA</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-[var(--border-color)] pt-3">
                      <span className="text-[var(--text-secondary)]">
                        {resolveText(t('staking.exchangeRate'), 'staking.exchangeRate', 'Exchange Rate')}
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">
                        1 CINA to {formatNumber(1 / Number.parseFloat(stakingView.navCina || '1'), 6)} stCINA
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              <button
                className="app-action-button is-primary w-full"
                disabled={!isStakeValid || !wallet.isConnected}
                type="button"
                onClick={() => void handleStake()}
              >
                {wallet.isConnected ? stakeLabel : connectWalletLabel}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="mb-3 flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-[var(--text-primary)]">{unstakeLabel}</span>
                  <span className="text-[var(--text-secondary)]">
                    {balanceLabel}: {formatNumberK(stakingView.stakedAmount)} CINA
                  </span>
                </div>
                <FormattedInput
                  className="w-full"
                  decimals={6}
                  maxDecimals={18}
                  modelValue={unstakeAmount}
                  placeholder={`${formatNumberK(stakingView.stakedAmount)} ${t('available')}`}
                  size="large"
                  useAbbreviation
                  onChange={setUnstakeAmount}
                >
                  <span className="flex items-center gap-2">
                    <TokenIcon size="medium" symbol="CINA" />
                    <span>CINA</span>
                  </span>
                </FormattedInput>
                <div className="mt-4">
                  <QuickAmounts
                    maxLabel={t('common.max')}
                    onSelectMax={() => setUnstakeAmount(stakingView.stakedAmount)}
                    onSelectPercentage={percentage =>
                      setUnstakeAmount(calculatePercentageAmount(stakingView.stakedAmount, percentage))
                    }
                  />
                </div>
              </div>

              {unstakePreview.shares ? (
                <div className="rounded-2xl bg-[var(--bg-secondary)] p-5">
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">{previewLabel}</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[var(--text-secondary)]">
                        {resolveText(t('staking.required'), 'staking.required', 'Required')}
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">{formatNumber(unstakePreview.shares, 2)} stCINA</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-[var(--border-color)] pt-3">
                      <span className="text-[var(--text-secondary)]">
                        {resolveText(t('staking.exchangeRate'), 'staking.exchangeRate', 'Exchange Rate')}
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">
                        1 stCINA to {formatNumber(stakingView.navCina, 6)} CINA
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-[var(--bg-secondary)] p-4">
                  <div className="text-sm text-[var(--text-secondary)]">
                    {resolveText(t('staking.stakedBalance'), 'staking.stakedBalance', 'Staked Balance')}
                  </div>
                  <div className="mt-2 font-semibold text-[var(--text-primary)]">{formatNumberK(stakingView.stCINABalance)} stCINA</div>
                </div>
                <div className="rounded-2xl bg-[var(--bg-secondary)] p-4">
                  <div className="text-sm text-[var(--text-secondary)]">{apyLabel}</div>
                  <div className="mt-2 font-semibold text-[var(--text-primary)]">{formatNumber(stakingView.currentAPY, 2)}%</div>
                </div>
                <div className="rounded-2xl bg-[var(--bg-secondary)] p-4">
                  <div className="text-sm text-[var(--text-secondary)]">
                    {resolveText(t('dashboard.todaysRemaining'), 'dashboard.todaysRemaining', "Today's Remaining")}
                  </div>
                  <div className="mt-2 font-semibold text-[var(--text-primary)]">{formatNumberK(stakingView.totalPendingAmount)} CINA</div>
                </div>
              </div>

              <button
                className="app-action-button is-primary w-full"
                disabled={!isUnstakeValid || !wallet.isConnected}
                type="button"
                onClick={() => void handleUnstake()}
              >
                {wallet.isConnected ? unstakeLabel : connectWalletLabel}
              </button>
            </div>
          )}
        </PageSection>

        <InfoCards cards={infoCards} />
      </PullToRefresh>

      <TransactionModal
        currentStep={transactionStep}
        errorMessage={transactionError}
        status={transactionStatus}
        steps={transactionSteps}
        title={transactionTitle}
        transactionDetails={transactionDetails}
        transactionHash={transactionHash}
        visible={transactionVisible}
        onClose={resetTransaction}
        onRetry={() => {
          if (activeTab === 'stake') {
            void handleStake()
          } else {
            void handleUnstake()
          }
        }}
      />
    </PageScaffold>
  )
}
