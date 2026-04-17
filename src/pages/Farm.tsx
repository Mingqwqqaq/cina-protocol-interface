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
import { feedback } from '@/lib/feedback'
import { PageScaffold, PageSection } from '@/pages/PageScaffold'
import { contractService } from '@/services/contracts'
import { useFarmStore } from '@/stores/farm'
import { useWalletStore } from '@/stores/wallet'
import { calculatePercentageAmount, formatNumber, formatNumberK } from '@/utils/format'
import { resolveText } from '@/utils/i18n'

interface FarmView {
  liquidityAmount: string
  usdtBalance: string
  depositedAmount: string
  pendingCINA: string
  farmAPY: string
  farmRate: string
  exchangeRate: string
}

const emptyFarmView: FarmView = {
  liquidityAmount: '0',
  usdtBalance: '0',
  depositedAmount: '0',
  pendingCINA: '0',
  farmAPY: '0',
  farmRate: '0',
  exchangeRate: '1'
}

export default function FarmPage() {
  const { t } = useTranslation()
  const wallet = useWalletStore()
  const queryClient = useQueryClient()
  const activeTab = useFarmStore(state => state.activeTab)
  const setActiveTab = useFarmStore(state => state.setActiveTab)
  const chainId = wallet.chainId || DEFAULT_CHAIN_ID

  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawCINA, setWithdrawCINA] = useState(false)
  const [transactionVisible, setTransactionVisible] = useState(false)
  const [transactionTitle, setTransactionTitle] = useState('')
  const [transactionHash, setTransactionHash] = useState('')
  const [transactionError, setTransactionError] = useState('')
  const [transactionStatus, setTransactionStatus] = useState<'pending' | 'loading' | 'success' | 'error'>('pending')
  const [transactionStep, setTransactionStep] = useState(0)

  const farmQuery = useQuery({
    queryKey: ['farm', 'overview', chainId, wallet.address],
    refetchInterval: wallet.isConnected ? 6_000 : 30_000,
    queryFn: async (): Promise<FarmView> => {
      const farmVaultContract = contractService.getFarmVaultContract()
      const usdtContract = contractService.getUSDTContract()
      if (!farmVaultContract || !usdtContract) {
        return emptyFarmView
      }

      const farmAddress = await farmVaultContract.getAddress()
      const [totalSupply, rewardRate, earnedAmount, userBalance, liquidityAmount, userUsdtBalance] = await Promise.all([
        farmVaultContract.totalSupply().catch(() => 0n),
        farmVaultContract.rewardRate().catch(() => 0n),
        wallet.address ? farmVaultContract.earned(wallet.address).catch(() => 0n) : 0n,
        wallet.address ? farmVaultContract.balanceOf(wallet.address).catch(() => 0n) : 0n,
        usdtContract.balanceOf(farmAddress).catch(() => 0n),
        wallet.address ? usdtContract.balanceOf(wallet.address).catch(() => 0n) : 0n
      ])

      const farmRate = formatUnits(rewardRate, 18)
      const totalSupplyFormatted = Number.parseFloat(formatUnits(totalSupply, 6))
      const annualRewards = Number.parseFloat(farmRate) * 365 * 24 * 60 * 60

      return {
        depositedAmount: formatUnits(userBalance, 6),
        exchangeRate: '1',
        farmAPY: totalSupplyFormatted > 0 ? ((annualRewards / totalSupplyFormatted) * 100).toFixed(2) : '0',
        farmRate,
        liquidityAmount: formatUnits(liquidityAmount, 6),
        pendingCINA: formatUnits(earnedAmount, 18),
        usdtBalance: formatUnits(userUsdtBalance, 6)
      }
    }
  })

  const farmView = farmQuery.data ?? emptyFarmView

  const depositPreview = useMemo(() => {
    const amount = Number.parseFloat(depositAmount)
    if (!amount || amount <= 0) {
      return null
    }

    const estimatedCINA = amount * Number.parseFloat(farmView.exchangeRate)
    const dailyReward = (estimatedCINA * Number.parseFloat(farmView.farmAPY || '0')) / 365 / 100
    return {
      estimatedCINA,
      dailyReward
    }
  }, [depositAmount, farmView.exchangeRate, farmView.farmAPY])

  const isDepositValid =
    Number.parseFloat(depositAmount) > 0 && Number.parseFloat(depositAmount) <= Number.parseFloat(farmView.usdtBalance)

  const isWithdrawValid = useMemo(() => {
    const amount = Number.parseFloat(withdrawAmount)
    if (withdrawCINA && (!withdrawAmount || amount === 0)) {
      return Number.parseFloat(farmView.pendingCINA) > 0
    }
    return amount > 0 && amount <= Number.parseFloat(farmView.depositedAmount)
  }, [farmView.depositedAmount, farmView.pendingCINA, withdrawAmount, withdrawCINA])

  const infoCards = useMemo(
    () => [
      {
        icon: <InfoCircleOutlined />,
        title: t('farm.whatIsFarming'),
        content: t('farm.farmingDescription')
      },
      {
        icon: <QuestionCircleOutlined />,
        title: t('farm.farmingFees'),
        content: t('farm.farmingFeesDescription')
      },
      {
        icon: <WarningOutlined />,
        title: t('farm.farmingRisks'),
        content: t('farm.farmingRisksDescription')
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

  const transactionDetails = useMemo<TransactionDetail[]>(() => {
    if (activeTab === 'deposit' && Number.parseFloat(depositAmount) > 0) {
      return [
        {
          label: t('pay'),
          values: [`-${formatNumber(depositAmount, 6)} USDT`],
          highlight: true,
          type: 'debit'
        }
      ]
    }

    if (activeTab === 'withdraw') {
      const values: string[] = []
      if (withdrawCINA && Number.parseFloat(farmView.pendingCINA) > 0) {
        values.push(`+${formatNumber(farmView.pendingCINA, 6)} CINA`)
      }
      if (Number.parseFloat(withdrawAmount) > 0) {
        values.push(`+${formatNumber(withdrawAmount, 6)} USDT`)
      }
      return [
        {
          label: t('receive'),
          values,
          type: 'credit'
        }
      ]
    }

    return []
  }, [activeTab, depositAmount, farmView.pendingCINA, t, withdrawAmount, withdrawCINA])

  const refreshData = async () => {
    await queryClient.invalidateQueries({ queryKey: ['farm'] })
  }

  const resetTransaction = () => {
    setTransactionVisible(false)
    setTransactionHash('')
    setTransactionError('')
    setTransactionStatus('pending')
    setTransactionStep(0)
  }

  const handleDeposit = async () => {
    if (!wallet.isConnected || !wallet.address || !isDepositValid) {
      return
    }

    const usdtContract = contractService.getUSDTContract(true)
    const farmContract = contractService.getFarmVaultContract(true)
    if (!usdtContract || !farmContract) {
      feedback.error(t('farm.depositFailed'))
      return
    }

    setTransactionVisible(true)
    setTransactionTitle(t('savings.depositTransaction'))
    setTransactionStatus('pending')
    setTransactionStep(0)

    try {
      const amountWei = parseUnits(depositAmount, 6)
      const farmAddress = await farmContract.getAddress()
      const allowance = await usdtContract.allowance(wallet.address, farmAddress)
      if (allowance < amountWei) {
        setTransactionStatus('loading')
        const approveTx = await usdtContract.approve(farmAddress, ethers.MaxUint256)
        await approveTx.wait()
      }

      setTransactionStep(1)
      setTransactionStatus('loading')
      const depositTx = await farmContract.deposit(amountWei)
      const receipt = await depositTx.wait()

      setTransactionStep(2)
      setTransactionStatus('success')
      setTransactionHash(receipt.hash)
      setDepositAmount('')
      await refreshData()
      feedback.success(t('farm.depositSuccess'))
    } catch (error) {
      setTransactionStatus('error')
      setTransactionError(error instanceof Error ? error.message : t('farm.depositFailed'))
    }
  }

  const handleWithdraw = async () => {
    if (!wallet.isConnected || !isWithdrawValid) {
      return
    }

    const farmContract = contractService.getFarmVaultContract(true)
    if (!farmContract) {
      feedback.error(t('farm.withdrawFailed'))
      return
    }

    setTransactionVisible(true)
    setTransactionTitle(t('savings.withdrawTransaction'))
    setTransactionStatus('pending')
    setTransactionStep(0)

    try {
      setTransactionStatus('loading')

      if (withdrawCINA && (!withdrawAmount || Number.parseFloat(withdrawAmount) === 0)) {
        const claimTx = await farmContract.getReward()
        setTransactionStep(1)
        const receipt = await claimTx.wait()
        setTransactionStep(2)
        setTransactionStatus('success')
        setTransactionHash(receipt.hash)
        feedback.success(t('farm.claimSuccess'))
      } else {
        const amountWei = parseUnits(withdrawAmount, 6)
        const withdrawTx = await farmContract.withdraw(amountWei, withdrawCINA)
        setTransactionStep(1)
        const receipt = await withdrawTx.wait()
        setTransactionStep(2)
        setTransactionStatus('success')
        setTransactionHash(receipt.hash)
        feedback.success(t('farm.withdrawSuccess'))
      }

      setWithdrawAmount('')
      setWithdrawCINA(false)
      await refreshData()
    } catch (error) {
      setTransactionStatus('error')
      setTransactionError(error instanceof Error ? error.message : t('farm.withdrawFailed'))
    }
  }

  const pageTitle = resolveText(t('navigation.farm'), 'navigation.farm', 'Farm')
  const overviewTitle = resolveText(t('farm.overview'), 'farm.overview', 'Overview')
  const connectWalletLabel = resolveText(t('wallet.connectWallet'), 'wallet.connectWallet', 'Connect Wallet')
  const depositLabel = resolveText(t('farm.deposit'), 'farm.deposit', 'Deposit')
  const withdrawLabel = resolveText(t('farm.withdraw'), 'farm.withdraw', 'Withdraw')

  return (
    <PageScaffold title={pageTitle}>
      <PullToRefresh isRefreshing={farmQuery.isRefetching}>
        {!wallet.isConnected ? <div className="app-inline-note is-info mb-6">{connectWalletLabel}</div> : null}

        <PageSection>
          <div className="mb-6">
            <h2 className="page-section-title">{overviewTitle}</h2>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
              <div className="text-sm font-semibold text-[var(--text-secondary)]">
                {resolveText(t('farm.yourMined'), 'farm.yourMined', 'Your Mined')}
              </div>
              <div className="mt-4 flex items-center gap-3 text-3xl font-bold text-[var(--number-color)]">
                <TokenIcon size="large" symbol="CINA" />
                <AnimatedNumber decimals={4} value={farmView.pendingCINA} />
              </div>
              <div className="mt-2 text-sm text-[var(--text-secondary)]">
                {resolveText(t('farm.apy'), 'farm.apy', 'APY')} {formatNumber(farmView.farmAPY, 2)}%
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-[var(--card-bg)] p-4">
                <div className="text-sm text-[var(--text-secondary)]">{resolveText(t('farm.usdtBalance'), 'farm.usdtBalance', 'USDT Balance')}</div>
                <div className="mt-2 font-semibold text-[var(--text-primary)]">{formatNumberK(farmView.usdtBalance)}</div>
              </div>
              <div className="rounded-2xl bg-[var(--card-bg)] p-4">
                <div className="text-sm text-[var(--text-secondary)]">{resolveText(t('farm.depositedBalance'), 'farm.depositedBalance', 'Deposited')}</div>
                <div className="mt-2 font-semibold text-[var(--text-primary)]">{formatNumberK(farmView.depositedAmount)}</div>
              </div>
              <div className="rounded-2xl bg-[var(--card-bg)] p-4">
                <div className="text-sm text-[var(--text-secondary)]">{resolveText(t('farm.claim'), 'farm.claim', 'Claim')}</div>
                <div className="mt-2 font-semibold text-[var(--text-primary)]">{formatNumberK(farmView.pendingCINA)} CINA</div>
              </div>
            </div>
          </div>
        </PageSection>

        <PageSection>
          <div className="mb-8 flex items-center justify-center rounded-2xl bg-[var(--bg-secondary)] p-1">
            <button
              className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
                activeTab === 'deposit' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              type="button"
              onClick={() => {
                setActiveTab('deposit')
                setDepositAmount('')
                setWithdrawAmount('')
              }}
            >
              {depositLabel}
            </button>
            <button
              className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
                activeTab === 'withdraw' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              type="button"
              onClick={() => {
                setActiveTab('withdraw')
                setDepositAmount('')
                setWithdrawAmount('')
              }}
            >
              {withdrawLabel}
            </button>
          </div>

          {activeTab === 'deposit' ? (
            <div className="space-y-6">
              <div>
                <div className="mb-3 flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-[var(--text-primary)]">{depositLabel}</span>
                  <span className="text-[var(--text-secondary)]">{formatNumberK(farmView.usdtBalance)} available</span>
                </div>
                <FormattedInput
                  className="w-full"
                  decimals={6}
                  maxDecimals={6}
                  modelValue={depositAmount}
                  placeholder={`${formatNumberK(farmView.usdtBalance)} ${t('available')}`}
                  size="large"
                  useAbbreviation
                  onChange={setDepositAmount}
                >
                  <span className="flex items-center gap-2">
                    <TokenIcon size="medium" symbol="USDT" />
                    <span>USDT</span>
                  </span>
                </FormattedInput>
                <div className="mt-4">
                  <QuickAmounts
                    maxLabel={t('common.max')}
                    onSelectMax={() => setDepositAmount(farmView.usdtBalance)}
                    onSelectPercentage={percentage => setDepositAmount(calculatePercentageAmount(farmView.usdtBalance, percentage, 6))}
                  />
                </div>
              </div>

              {depositPreview ? (
                <div className="rounded-2xl bg-[var(--bg-secondary)] p-5">
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">{resolveText(t('farm.preview'), 'farm.preview', 'Preview')}</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[var(--text-secondary)]">{resolveText(t('farm.estimatedCINA'), 'farm.estimatedCINA', 'Estimated CINA')}</span>
                      <span className="font-medium text-[var(--text-primary)]">{formatNumber(depositPreview.estimatedCINA, 2)} CINA</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-[var(--border-color)] pt-3">
                      <span className="text-[var(--text-secondary)]">{resolveText(t('farm.dailyReward'), 'farm.dailyReward', 'Daily Reward')}</span>
                      <span className="font-medium text-[var(--text-primary)]">{formatNumber(depositPreview.dailyReward, 2)} CINA</span>
                    </div>
                  </div>
                </div>
              ) : null}

              <button className="app-action-button is-primary w-full" disabled={!isDepositValid || !wallet.isConnected} type="button" onClick={() => void handleDeposit()}>
                {wallet.isConnected ? depositLabel : connectWalletLabel}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="mb-3 flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-[var(--text-primary)]">{withdrawLabel}</span>
                  <span className="text-[var(--text-secondary)]">{formatNumberK(farmView.depositedAmount)} available</span>
                </div>
                <FormattedInput
                  className="w-full"
                  decimals={6}
                  maxDecimals={6}
                  modelValue={withdrawAmount}
                  placeholder={`${formatNumberK(farmView.depositedAmount)} ${t('available')}`}
                  size="large"
                  useAbbreviation
                  onChange={setWithdrawAmount}
                >
                  <span className="flex items-center gap-2">
                    <TokenIcon size="medium" symbol="USDT" />
                    <span>USDT</span>
                  </span>
                </FormattedInput>
                <div className="mt-4">
                  <QuickAmounts
                    maxLabel={t('common.max')}
                    onSelectMax={() => setWithdrawAmount(farmView.depositedAmount)}
                    onSelectPercentage={percentage => setWithdrawAmount(calculatePercentageAmount(farmView.depositedAmount, percentage, 6))}
                  />
                </div>
              </div>

              <button
                className="flex w-full items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-left"
                type="button"
                onClick={() => setWithdrawCINA(!withdrawCINA)}
              >
                <span className="font-medium text-[var(--text-primary)]">{resolveText(t('farm.withdrawCINA'), 'farm.withdrawCINA', 'Withdraw CINA')}</span>
                <span className={`relative h-6 w-11 rounded-full transition ${withdrawCINA ? 'bg-[var(--primary-color)]' : 'bg-[var(--card-bg)]'}`}>
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${withdrawCINA ? 'left-6' : 'left-1'}`} />
                </span>
              </button>

              {(withdrawCINA || Number.parseFloat(withdrawAmount) > 0) ? (
                <div className="rounded-2xl bg-[var(--bg-secondary)] p-5">
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">{resolveText(t('farm.preview'), 'farm.preview', 'Preview')}</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    {Number.parseFloat(withdrawAmount) > 0 ? (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[var(--text-secondary)]">Liquidity</span>
                        <span className="font-medium text-[var(--text-primary)]">{formatNumber(withdrawAmount, 2)} USDT</span>
                      </div>
                    ) : null}
                    {withdrawCINA ? (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[var(--text-secondary)]">Farm Reward</span>
                        <span className="font-medium text-[var(--text-primary)]">{formatNumber(farmView.pendingCINA, 2)} CINA</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <button className="app-action-button is-primary w-full" disabled={!isWithdrawValid || !wallet.isConnected} type="button" onClick={() => void handleWithdraw()}>
                {wallet.isConnected
                  ? withdrawCINA && (!withdrawAmount || Number.parseFloat(withdrawAmount) === 0)
                    ? resolveText(t('farm.claim'), 'farm.claim', 'Claim')
                    : withdrawLabel
                  : connectWalletLabel}
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
          if (activeTab === 'deposit') {
            void handleDeposit()
          } else {
            void handleWithdraw()
          }
        }}
      />
    </PageScaffold>
  )
}
