import { InfoCircleOutlined, QuestionCircleOutlined, WarningOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
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
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { feedback } from '@/lib/feedback'
import { PageScaffold, PageSection } from '@/pages/PageScaffold'
import { contractService } from '@/services/contracts'
import { useSavingsStore } from '@/stores/savings'
import { useWalletStore } from '@/stores/wallet'
import { calculatePercentageAmount, formatNumber, formatNumberK } from '@/utils/format'
import { resolveText } from '@/utils/i18n'

interface SavingsVaultView {
  userBalance: string
  wrmbBalance: string
  totalAssets: string
  currentNAV: string
  totalSupply: string
  totalMMFSupply: string
  dynamicAPY: string
  userAssetValue: string
  userIncrementAmount: string
  totalPendingAmount: string
  userSharePercentage: string
}

interface SavingsPreview {
  shares: string
  assets: string
  fee: string
}

const emptyPreview: SavingsPreview = {
  shares: '',
  assets: '',
  fee: '0'
}

const emptyVaultView: SavingsVaultView = {
  userBalance: '0',
  wrmbBalance: '0',
  totalAssets: '0',
  currentNAV: '1',
  totalSupply: '0',
  totalMMFSupply: '0',
  dynamicAPY: '0',
  userAssetValue: '0',
  userIncrementAmount: '0',
  totalPendingAmount: '0',
  userSharePercentage: '0'
}

export default function SavingsPage() {
  const { t } = useTranslation()
  const wallet = useWalletStore()
  const activeTab = useSavingsStore(state => state.activeTab)
  const setActiveTab = useSavingsStore(state => state.setActiveTab)
  const queryClient = useQueryClient()
  const chainId = wallet.chainId || DEFAULT_CHAIN_ID
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [transactionVisible, setTransactionVisible] = useState(false)
  const [transactionTitle, setTransactionTitle] = useState('')
  const [transactionHash, setTransactionHash] = useState('')
  const [transactionError, setTransactionError] = useState('')
  const [transactionStatus, setTransactionStatus] = useState<'pending' | 'loading' | 'success' | 'error'>('pending')
  const [transactionStep, setTransactionStep] = useState(0)
  const debouncedDepositAmount = useDebouncedValue(depositAmount)
  const debouncedWithdrawAmount = useDebouncedValue(withdrawAmount)

  const transactionSteps: TransactionStep[] = useMemo(
    () => [
      { label: t('transaction.approve'), description: t('transaction.approveDescription') },
      { label: t('transaction.confirm'), description: t('transaction.confirmDescription') },
      { label: t('transaction.complete'), description: t('transaction.completeDescription') }
    ],
    [t]
  )

  const infoCards = useMemo(
    () => [
      {
        icon: <InfoCircleOutlined />,
        title: t('savings.whatIsSavings'),
        content: t('savings.savingsDescription')
      },
      {
        icon: <QuestionCircleOutlined />,
        title: t('savings.savingsFees'),
        content: t('savings.savingsFeesDescription')
      },
      {
        icon: <WarningOutlined />,
        title: t('savings.savingsRisks'),
        content: t('savings.savingsRisksDescription')
      }
    ],
    [t]
  )

  const vaultQuery = useQuery({
    queryKey: ['savings', 'vault', chainId, wallet.address],
    refetchInterval: wallet.isConnected ? 6_000 : 30_000,
    queryFn: async (): Promise<SavingsVaultView> => {
      const savingsContract = contractService.getSavingsVaultContract()
      const wrmbContract = contractService.getWRMBContract()
      if (!savingsContract) {
        return emptyVaultView
      }

      const baseCalls = await Promise.all([
        savingsContract.totalAssets(),
        savingsContract.totalSupply(),
        savingsContract.totalMMFSupply(),
        savingsContract.getNAV_sWRMB(),
        savingsContract.lastIncreaseAmount(),
        savingsContract.currentPendingIncreaseAmount()
      ])

      const [totalAssets, totalSupply, totalMMFSupply, nav, lastIncreaseAmount, pendingAmount] = baseCalls
      const totalAssetsValue = formatUnits(totalAssets, 18)
      const totalSupplyValue = formatUnits(totalSupply, 18)
      const totalMMFSupplyValue = formatUnits(totalMMFSupply, 18)
      const navValue = formatUnits(nav, 18)
      const pendingValue = formatUnits(pendingAmount, 18)
      const apyBase = new BigNumber(formatUnits(lastIncreaseAmount, 16))
      const apy =
        totalMMFSupplyValue === '0' ? new BigNumber(0) : apyBase.dividedBy(totalMMFSupplyValue).multipliedBy(365)
      const boostedApy =
        totalSupplyValue === '0'
          ? new BigNumber(0)
          : apy.multipliedBy(totalMMFSupplyValue || '0').dividedBy(totalSupplyValue)

      if (!wallet.address || !wrmbContract) {
        return {
          ...emptyVaultView,
          currentNAV: navValue,
          dynamicAPY: boostedApy.gt(0) ? boostedApy.toString() : '0',
          totalAssets: totalAssetsValue,
          totalMMFSupply: totalMMFSupplyValue,
          totalPendingAmount: pendingValue,
          totalSupply: totalSupplyValue
        }
      }

      const [sWRMBBalance, wrmbBalance, maxWithdraw, userIncrementAmount] = await Promise.all([
        savingsContract.balanceOf(wallet.address),
        wrmbContract.balanceOf(wallet.address),
        savingsContract.maxWithdraw(wallet.address),
        savingsContract.getUserIncrementAmount(wallet.address)
      ])

      const userBalance = formatUnits(sWRMBBalance, 18)
      const userAssetValue = formatUnits(maxWithdraw, 18)
      const userSharePercentage =
        totalSupplyValue === '0'
          ? '0'
          : new BigNumber(userBalance).dividedBy(totalSupplyValue).multipliedBy(100).toFixed(4)

      return {
        currentNAV: navValue,
        dynamicAPY: boostedApy.gt(0) ? boostedApy.toString() : '0',
        totalAssets: totalAssetsValue,
        totalMMFSupply: totalMMFSupplyValue,
        totalPendingAmount: pendingValue,
        totalSupply: totalSupplyValue,
        userAssetValue,
        userBalance,
        userIncrementAmount: formatUnits(userIncrementAmount, 18),
        userSharePercentage,
        wrmbBalance: formatUnits(wrmbBalance, 18)
      }
    }
  })

  const vault = vaultQuery.data ?? emptyVaultView

  const depositPreviewQuery = useQuery({
    enabled: Number.parseFloat(debouncedDepositAmount) > 0,
    queryKey: ['savings', 'preview', 'deposit', chainId, debouncedDepositAmount],
    queryFn: async (): Promise<SavingsPreview> => {
      const savingsContract = contractService.getSavingsVaultContract()
      if (!savingsContract || !debouncedDepositAmount) {
        return emptyPreview
      }

      const shares = await savingsContract.previewDeposit(parseUnits(debouncedDepositAmount, 18))
      return {
        shares: formatUnits(shares, 18),
        assets: debouncedDepositAmount,
        fee: '0'
      }
    }
  })

  const withdrawPreviewQuery = useQuery({
    enabled: Number.parseFloat(debouncedWithdrawAmount) > 0,
    queryKey: ['savings', 'preview', 'withdraw', chainId, debouncedWithdrawAmount],
    queryFn: async (): Promise<SavingsPreview> => {
      const savingsContract = contractService.getSavingsVaultContract()
      if (!savingsContract || !debouncedWithdrawAmount) {
        return emptyPreview
      }

      const preview = await savingsContract.previewWithdrawOfFee(parseUnits(debouncedWithdrawAmount, 18))
      return {
        shares: formatUnits(preview[0], 18),
        assets: formatUnits(preview[1], 18),
        fee: formatUnits(preview[2], 18)
      }
    }
  })

  const depositPreview = depositPreviewQuery.data ?? emptyPreview
  const withdrawPreview = withdrawPreviewQuery.data ?? emptyPreview
  const withdrawPreviewFee = useMemo(
    () => new BigNumber(withdrawAmount || '0').multipliedBy(withdrawPreview.fee || '0').toString(),
    [withdrawAmount, withdrawPreview.fee]
  )

  const isDepositValid =
    Number.parseFloat(depositAmount) > 0 && Number.parseFloat(depositAmount) <= Number.parseFloat(vault.wrmbBalance)
  const isWithdrawValid =
    Number.parseFloat(withdrawAmount) > 0 &&
    Number.parseFloat(withdrawAmount) <= Number.parseFloat(vault.userAssetValue)

  const transactionDetails = useMemo<TransactionDetail[]>(() => {
    if (activeTab === 'deposit' && depositAmount) {
      return [
        {
          label: t('pay'),
          values: [`-${formatNumber(depositAmount, 6)} WRMB`],
          highlight: true,
          type: 'debit'
        },
        {
          label: t('receive'),
          values: [`+${formatNumber(depositPreview.shares || '0', 6)} sWRMB`],
          type: 'credit'
        }
      ]
    }

    if (activeTab === 'withdraw' && withdrawAmount) {
      return [
        {
          label: t('pay'),
          values: [`-${formatNumber(withdrawPreview.shares || '0', 6)} sWRMB`],
          type: 'debit'
        },
        {
          label: t('receive'),
          values: [`+${formatNumber(withdrawPreview.assets || '0', 6)} WRMB`],
          highlight: true,
          type: 'credit'
        }
      ]
    }

    return []
  }, [
    activeTab,
    depositAmount,
    depositPreview.shares,
    t,
    withdrawAmount,
    withdrawPreview.assets,
    withdrawPreview.shares
  ])

  const refreshData = async () => {
    await queryClient.invalidateQueries({ queryKey: ['savings'] })
  }

  const resetTransactionState = () => {
    setTransactionHash('')
    setTransactionError('')
    setTransactionStatus('pending')
    setTransactionStep(0)
  }

  const handleDeposit = async () => {
    if (!wallet.isConnected || !wallet.address || !isDepositValid) {
      return
    }

    const wrmbContract = contractService.getWRMBContract(true)
    const savingsContract = contractService.getSavingsVaultContract(true)
    if (!wrmbContract || !savingsContract) {
      feedback.error(t('savings.depositFailed'))
      return
    }

    setTransactionTitle(t('savings.depositTransaction'))
    setTransactionVisible(true)
    setTransactionStatus('pending')
    setTransactionStep(0)

    try {
      const amountWei = parseUnits(depositAmount, 18)
      const savingsAddress = await savingsContract.getAddress()
      const allowance = await wrmbContract.allowance(wallet.address, savingsAddress)

      if (allowance < amountWei) {
        setTransactionStatus('loading')
        const approveTx = await wrmbContract.approve(savingsAddress, ethers.MaxUint256)
        await approveTx.wait()
      }

      setTransactionStep(1)
      setTransactionStatus('loading')
      const depositTx = await savingsContract.deposit(amountWei, wallet.address)
      const receipt = await depositTx.wait()

      setTransactionStep(2)
      setTransactionStatus('success')
      setTransactionHash(receipt.hash)
      setDepositAmount('')
      await refreshData()
      feedback.success(t('savings.depositSuccess'))
    } catch (error) {
      setTransactionStatus('error')
      setTransactionError(error instanceof Error ? error.message : t('savings.depositFailed'))
    }
  }

  const handleWithdraw = async () => {
    if (!wallet.isConnected || !wallet.address || !isWithdrawValid) {
      return
    }

    const savingsContract = contractService.getSavingsVaultContract(true)
    if (!savingsContract) {
      feedback.error(t('savings.withdrawFailed'))
      return
    }

    setTransactionTitle(t('savings.withdrawTransaction'))
    setTransactionVisible(true)
    setTransactionStatus('loading')
    setTransactionStep(0)

    try {
      const amountWei = parseUnits(withdrawAmount, 18)
      const isFullWithdraw = withdrawAmount === vault.userAssetValue

      const transaction = isFullWithdraw
        ? await savingsContract.redeem(parseUnits(vault.userBalance, 18), wallet.address, wallet.address)
        : await savingsContract.withdraw(amountWei, wallet.address, wallet.address)

      setTransactionStep(1)
      const receipt = await transaction.wait()
      setTransactionStep(2)
      setTransactionStatus('success')
      setTransactionHash(receipt.hash)
      setWithdrawAmount('')
      await refreshData()
      feedback.success(t('savings.withdrawSuccess'))
    } catch (error) {
      setTransactionStatus('error')
      setTransactionError(error instanceof Error ? error.message : t('savings.withdrawFailed'))
    }
  }

  const pageTitle = resolveText(t('navigation.savings'), 'navigation.savings', 'Savings')
  const vaultOverviewTitle = resolveText(t('savings.vaultOverview'), 'savings.vaultOverview', 'Vault Overview')
  const statisticsTitle = 'Statistics'
  const connectWalletLabel = resolveText(t('wallet.connectWallet'), 'wallet.connectWallet', 'Connect Wallet')
  const depositLabel = resolveText(t('savings.deposit'), 'savings.deposit', 'Deposit')
  const withdrawLabel = resolveText(t('savings.withdraw'), 'savings.withdraw', 'Withdraw')

  return (
    <PageScaffold title={pageTitle}>
      <PullToRefresh isRefreshing={vaultQuery.isRefetching}>
        {!wallet.isConnected ? <div className="app-inline-note is-info mb-6">{connectWalletLabel}</div> : null}

        <PageSection>
          <div className="mb-6">
            <h2 className="page-section-title">{vaultOverviewTitle}</h2>
          </div>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-[var(--text-secondary)]">
                  {resolveText(t('savings.assetValue'), 'savings.assetValue', 'Asset Value')}
                </div>
                <div className="mt-2 text-sm text-[var(--text-secondary)]">
                  {resolveText(t('savings.apy'), 'savings.apy', 'APY')} {formatNumber(vault.dynamicAPY, 2)}%
                </div>
              </div>
              <div className="rounded-full bg-[var(--card-bg)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                sWRMB Vault
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 text-3xl font-bold text-[var(--number-color)]">
              <TokenIcon size="large" symbol="WRMB" />
              <AnimatedNumber decimals={4} value={vault.userAssetValue} />
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
                  <span className="text-[var(--text-secondary)]">
                    {resolveText(t('wrap.balance'), 'wrap.balance', 'Balance')}: {formatNumberK(vault.wrmbBalance)} WRMB
                  </span>
                </div>
                <FormattedInput
                  className="w-full"
                  decimals={6}
                  maxDecimals={18}
                  modelValue={depositAmount}
                  placeholder={`${formatNumberK(vault.wrmbBalance)} ${t('available')}`}
                  size="large"
                  useAbbreviation
                  onChange={setDepositAmount}
                >
                  <span className="flex items-center gap-2">
                    <TokenIcon size="medium" symbol="WRMB" />
                    <span>WRMB</span>
                  </span>
                </FormattedInput>
                <div className="mt-4">
                  <QuickAmounts
                    maxLabel={t('common.max')}
                    onSelectMax={() => setDepositAmount(vault.wrmbBalance)}
                    onSelectPercentage={percentage => setDepositAmount(calculatePercentageAmount(vault.wrmbBalance, percentage))}
                  />
                </div>
              </div>

              {depositPreview.shares ? (
                <div className="rounded-2xl bg-[var(--bg-secondary)] p-5">
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    {resolveText(t('savings.preview'), 'savings.preview', 'Preview')}
                  </h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[var(--text-secondary)]">
                        {resolveText(t('savings.youWillReceive'), 'savings.youWillReceive', 'You Will Receive')}
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">{formatNumber(depositPreview.shares, 2)} sWRMB</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-[var(--border-color)] pt-3">
                      <span className="text-[var(--text-secondary)]">
                        {resolveText(t('savings.currentExchangeRate'), 'savings.currentExchangeRate', 'Current Exchange Rate')}
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">
                        1 WRMB to {formatNumber(1 / Number.parseFloat(vault.currentNAV || '1'), 6)} sWRMB
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              <button
                className="app-action-button is-primary w-full"
                disabled={!isDepositValid || !wallet.isConnected}
                type="button"
                onClick={() => void handleDeposit()}
              >
                {wallet.isConnected ? depositLabel : connectWalletLabel}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="mb-3 flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-[var(--text-primary)]">{withdrawLabel}</span>
                  <span className="text-[var(--text-secondary)]">
                    {resolveText(t('wrap.balance'), 'wrap.balance', 'Balance')}: {formatNumberK(vault.userAssetValue)} WRMB
                  </span>
                </div>
                <FormattedInput
                  className="w-full"
                  decimals={6}
                  maxDecimals={18}
                  modelValue={withdrawAmount}
                  placeholder={`${formatNumberK(vault.userAssetValue)} ${t('available')}`}
                  size="large"
                  useAbbreviation
                  onChange={setWithdrawAmount}
                >
                  <span className="flex items-center gap-2">
                    <TokenIcon size="medium" symbol="WRMB" />
                    <span>WRMB</span>
                  </span>
                </FormattedInput>
                <div className="mt-4">
                  <QuickAmounts
                    maxLabel={t('common.max')}
                    onSelectMax={() => setWithdrawAmount(vault.userAssetValue)}
                    onSelectPercentage={percentage => setWithdrawAmount(calculatePercentageAmount(vault.userAssetValue, percentage))}
                  />
                </div>
              </div>

              {withdrawPreview.shares ? (
                <div className="rounded-2xl bg-[var(--bg-secondary)] p-5">
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    {resolveText(t('savings.preview'), 'savings.preview', 'Preview')}
                  </h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[var(--text-secondary)]">
                        {resolveText(t('savings.youWillReceive'), 'savings.youWillReceive', 'You Will Receive')}
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">{formatNumber(withdrawPreview.assets, 2)} WRMB</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[var(--text-secondary)]">
                        {resolveText(t('savings.fee'), 'savings.fee', 'Fee')} ({formatNumber(new BigNumber(withdrawPreview.fee).multipliedBy(100).toString())}%)
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">{formatNumber(withdrawPreviewFee, 2)} WRMB</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-[var(--border-color)] pt-3">
                      <span className="text-[var(--text-secondary)]">
                        {resolveText(t('savings.currentExchangeRate'), 'savings.currentExchangeRate', 'Current Exchange Rate')}
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">1 sWRMB to {formatNumber(vault.currentNAV, 6)} WRMB</span>
                    </div>
                  </div>
                </div>
              ) : null}

              <button
                className="app-action-button is-primary w-full"
                disabled={!isWithdrawValid || !wallet.isConnected}
                type="button"
                onClick={() => void handleWithdraw()}
              >
                {wallet.isConnected ? withdrawLabel : connectWalletLabel}
              </button>
            </div>
          )}
        </PageSection>

        <PageSection>
          <div className="mb-6">
            <h2 className="page-section-title">{statisticsTitle}</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                {resolveText(t('savings.totalSupply'), 'savings.totalSupply', 'Total Supply')}
              </div>
              <div className="mt-3 text-2xl font-bold text-[var(--number-color)]">{formatNumberK(vault.totalAssets)}</div>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                {resolveText(t('savings.yourShare'), 'savings.yourShare', 'Your Share')}
              </div>
              <div className="mt-3 text-2xl font-bold text-[var(--number-color)]">{formatNumberK(vault.userSharePercentage)}%</div>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                {resolveText(t('savings.totalValue'), 'savings.totalValue', 'Total Value')}
              </div>
              <div className="mt-3 text-2xl font-bold text-[var(--number-color)]">
                ${formatNumberK(new BigNumber(vault.totalAssets).multipliedBy(0.14).toString(), 2)}
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                {resolveText(t('savings.yourValue'), 'savings.yourValue', 'Your Value')}
              </div>
              <div className="mt-3 text-2xl font-bold text-[var(--number-color)]">
                ${formatNumberK(new BigNumber(vault.userAssetValue).multipliedBy(0.14).toString(), 2)}
              </div>
            </div>
          </div>
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
        onClose={() => {
          setTransactionVisible(false)
          resetTransactionState()
        }}
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
