import { ClockCircleOutlined, InfoCircleOutlined, QuestionCircleOutlined, ShareAltOutlined, SwapOutlined, WarningOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ethers, formatUnits, parseUnits } from 'ethers'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormattedInput } from '@/components/common/FormattedInput'
import { InfoCards } from '@/components/common/InfoCards'
import { PullToRefresh } from '@/components/common/PullToRefresh'
import { QuickAmounts } from '@/components/common/QuickAmounts'
import { SRMBTokenSelector, type SRMBToken } from '@/components/common/SRMBTokenSelector'
import { TokenIcon } from '@/components/common/TokenIcon'
import { TransactionModal, type TransactionDetail, type TransactionStep } from '@/components/common/TransactionModal'
import { DEFAULT_CHAIN_ID } from '@/constants'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { feedback } from '@/lib/feedback'
import { PageScaffold, PageSection } from '@/pages/PageScaffold'
import { contractService } from '@/services/contracts'
import { useWalletStore } from '@/stores/wallet'
import { calculatePercentageAmount, formatNumber, formatNumberK } from '@/utils/format'
import { resolveText } from '@/utils/i18n'

interface WrapConfig {
  minWrapAmount: string
  maxWrapAmount: string
  wrapFee: string
  minUnwrapAmount: string
  maxUnwrapAmount: string
  unwrapFee: string
}

interface WrapPreview {
  outputAmount: string
  fee: string
  feePercentage: string
  exchangeRate: string
  waitTime: number
}

interface UnwrapPreview {
  sWRMBBurned: string
  sRMBReceived: string
  fee: string
  feePercentage: string
  exchangeRate: string
  waitTime: number
}

const emptyWrapPreview: WrapPreview = { outputAmount: '0', fee: '0', feePercentage: '0', exchangeRate: '0', waitTime: 0 }
const emptyUnwrapPreview: UnwrapPreview = { sWRMBBurned: '0', sRMBReceived: '0', fee: '0', feePercentage: '0', exchangeRate: '0', waitTime: 0 }

function getExecutableTime(waitTimeSeconds: number) {
  return new Date(Date.now() + waitTimeSeconds * 1000).toLocaleString()
}

export default function WrapPage() {
  const { t } = useTranslation()
  const wallet = useWalletStore()
  const queryClient = useQueryClient()
  const chainId = wallet.chainId || DEFAULT_CHAIN_ID
  const [mode, setMode] = useState<'wrap' | 'unwrap'>('wrap')
  const [wrapAmount, setWrapAmount] = useState('')
  const [unwrapAmount, setUnwrapAmount] = useState('')
  const [selectedSRMBToken, setSelectedSRMBToken] = useState('')
  const [selectedTokenInfo, setSelectedTokenInfo] = useState<SRMBToken | null>(null)
  const [selectedUnwrapSRMBToken, setSelectedUnwrapSRMBToken] = useState('')
  const [selectedUnwrapTokenInfo, setSelectedUnwrapTokenInfo] = useState<SRMBToken | null>(null)
  const [transactionVisible, setTransactionVisible] = useState(false)
  const [transactionTitle, setTransactionTitle] = useState('')
  const [transactionHash, setTransactionHash] = useState('')
  const [transactionError, setTransactionError] = useState('')
  const [transactionStep, setTransactionStep] = useState(0)
  const [transactionStatus, setTransactionStatus] = useState<'pending' | 'loading' | 'success' | 'error'>('pending')
  const debouncedWrapAmount = useDebouncedValue(wrapAmount)
  const debouncedUnwrapAmount = useDebouncedValue(unwrapAmount)
  const currentTokenAddress = mode === 'wrap' ? selectedSRMBToken : selectedUnwrapSRMBToken

  const infoCards = useMemo(() => [
    { icon: <InfoCircleOutlined />, title: t('wrap.whatIsWrapping'), content: t('wrap.wrappingDescription') },
    { icon: <QuestionCircleOutlined />, title: t('wrap.fees'), content: t('wrap.feesDescription') },
    { icon: <WarningOutlined />, title: t('wrap.risks'), content: t('wrap.risksDescription') }
  ], [t])

  const transactionSteps: TransactionStep[] = useMemo(() => [
    { label: t('transaction.approve'), description: t('transaction.approveDescription') },
    { label: t('transaction.confirm'), description: t('transaction.confirmDescription') },
    { label: t('transaction.complete'), description: t('transaction.completeDescription') }
  ], [t])

  const wrapConfigQuery = useQuery({
    queryKey: ['wrap', 'config', chainId],
    queryFn: async (): Promise<WrapConfig | null> => {
      const wrapManager = contractService.getWrapManagerContract()
      if (!wrapManager) return null
      const config = await wrapManager.getConfiguration()
      return {
        minWrapAmount: formatUnits(config[2], 6),
        maxWrapAmount: formatUnits(config[3], 6),
        wrapFee: formatUnits(config[4], 6),
        minUnwrapAmount: formatUnits(config[5], 6),
        maxUnwrapAmount: formatUnits(config[6], 6),
        unwrapFee: formatUnits(config[7], 6)
      }
    }
  })

  const balancesQuery = useQuery({
    enabled: Boolean(wallet.address && currentTokenAddress),
    queryKey: ['wrap', 'balances', chainId, wallet.address, currentTokenAddress],
    queryFn: async () => {
      const sRMBContract = contractService.getSRMBContract(currentTokenAddress)
      const savingsVault = contractService.getSavingsVaultContract()
      if (!sRMBContract || !savingsVault || !wallet.address) return { sRMBBalance: '0', sWRMBBalance: '0' }
      const [sRMBBalance, sWRMBBalance] = await Promise.all([sRMBContract.balanceOf(wallet.address), savingsVault.balanceOf(wallet.address)])
      return { sRMBBalance: formatUnits(sRMBBalance, 6), sWRMBBalance: formatUnits(sWRMBBalance, 18) }
    }
  })

  const userWrapStatsQuery = useQuery({
    enabled: Boolean(wallet.address && selectedUnwrapSRMBToken),
    queryKey: ['wrap', 'user-stats', chainId, wallet.address, selectedUnwrapSRMBToken],
    queryFn: async () => {
      const wrapManager = contractService.getWrapManagerContract()
      if (!wrapManager || !wallet.address) return { userUnwrappableAmount: '0', userMaxUnwrappableAmount: '0' }
      const [availableToUnwrap, userMaxUnwrappedAmount] = await wrapManager.getUserWrapStats(wallet.address, selectedUnwrapSRMBToken)
      return { userUnwrappableAmount: formatUnits(availableToUnwrap, 6), userMaxUnwrappableAmount: formatUnits(userMaxUnwrappedAmount, 6) }
    }
  })

  const wrapPreviewQuery = useQuery({
    enabled: Boolean(wallet.address && selectedSRMBToken && Number.parseFloat(debouncedWrapAmount) > 0),
    queryKey: ['wrap', 'preview', 'wrap', chainId, wallet.address, selectedSRMBToken, debouncedWrapAmount],
    queryFn: async (): Promise<WrapPreview> => {
      const wrapManager = contractService.getWrapManagerContract()
      if (!wrapManager || !wallet.address) return emptyWrapPreview
      const preview = await wrapManager.previewWrap(wallet.address, selectedSRMBToken, parseUnits(debouncedWrapAmount, 6))
      const outputAmount = formatUnits(preview[0], 18)
      const feeAmount = formatUnits(preview[2], 6)
      const inputAmount = Number.parseFloat(debouncedWrapAmount || '0')
      return {
        outputAmount,
        fee: feeAmount,
        feePercentage: inputAmount > 0 ? ((Number.parseFloat(feeAmount) / inputAmount) * 100).toFixed(2) : '0',
        exchangeRate: inputAmount > 0 ? (Number.parseFloat(outputAmount) / inputAmount).toFixed(6) : '0',
        waitTime: Number(preview[3])
      }
    }
  })

  const unwrapPreviewQuery = useQuery({
    enabled: Boolean(wallet.address && selectedUnwrapSRMBToken && Number.parseFloat(debouncedUnwrapAmount) > 0),
    queryKey: ['wrap', 'preview', 'unwrap', chainId, wallet.address, selectedUnwrapSRMBToken, debouncedUnwrapAmount],
    queryFn: async (): Promise<UnwrapPreview> => {
      const wrapManager = contractService.getWrapManagerContract()
      if (!wrapManager || !wallet.address) return emptyUnwrapPreview
      const preview = await wrapManager.previewUnwrap(wallet.address, selectedUnwrapSRMBToken, parseUnits(debouncedUnwrapAmount, 6))
      const sWRMBBurned = formatUnits(preview[1], 18)
      const sRMBReceived = formatUnits(preview[0], 6)
      const feeAmount = formatUnits(preview[2], 6)
      const inputAmount = Number.parseFloat(debouncedUnwrapAmount || '0')
      return {
        sWRMBBurned,
        sRMBReceived,
        fee: feeAmount,
        feePercentage: inputAmount > 0 ? ((Number.parseFloat(feeAmount) / inputAmount) * 100).toFixed(2) : '0',
        exchangeRate: Number.parseFloat(sWRMBBurned) > 0 ? (inputAmount / Number.parseFloat(sWRMBBurned)).toFixed(6) : '0',
        waitTime: Number(preview[3])
      }
    }
  })

  const wrapConfig = wrapConfigQuery.data
  const wrapPreview = wrapPreviewQuery.data ?? emptyWrapPreview
  const unwrapPreview = unwrapPreviewQuery.data ?? emptyUnwrapPreview
  const sRMBBalance = balancesQuery.data?.sRMBBalance ?? '0'
  const sWRMBBalance = balancesQuery.data?.sWRMBBalance ?? '0'
  const userUnwrappableAmount = userWrapStatsQuery.data?.userUnwrappableAmount ?? '0'
  const userMaxUnwrappableAmount = userWrapStatsQuery.data?.userMaxUnwrappableAmount ?? '0'
  const selectedTokenSymbol = selectedTokenInfo?.symbol || 'RWA'
  const selectedUnwrapTokenSymbol = selectedUnwrapTokenInfo?.symbol || 'RWA'
  const canWrap = wrapPreview.waitTime === 0
  const canUnwrap = unwrapPreview.waitTime === 0

  const wrapValidationError = useMemo(() => {
    if (!wrapAmount || !wallet.isConnected) return ''
    if (!selectedSRMBToken) return t('wrap.selectTokenFirst')
    const amount = Number.parseFloat(wrapAmount)
    if (amount > Number.parseFloat(sRMBBalance)) return t('wrap.insufficientBalance')
    if (!wrapConfig) return ''
    if (Number.parseFloat(wrapConfig.minWrapAmount) > 0 && amount < Number.parseFloat(wrapConfig.minWrapAmount)) return t('wrap.belowMinAmount', { min: formatNumber(wrapConfig.minWrapAmount) })
    if (Number.parseFloat(wrapConfig.maxWrapAmount) > 0 && amount > Number.parseFloat(wrapConfig.maxWrapAmount)) return t('wrap.aboveMaxAmount', { max: formatNumber(wrapConfig.maxWrapAmount) })
    return ''
  }, [sRMBBalance, selectedSRMBToken, t, wallet.isConnected, wrapAmount, wrapConfig])

  const unwrapValidationError = useMemo(() => {
    if (!unwrapAmount || !wallet.isConnected) return ''
    if (!selectedUnwrapSRMBToken) return t('wrap.selectTokenFirst')
    const amount = Number.parseFloat(unwrapAmount)
    if (amount > Number.parseFloat(userMaxUnwrappableAmount)) return t('wrap.insufficientUnwrappableAmount')
    if (!wrapConfig) return ''
    if (Number.parseFloat(wrapConfig.minUnwrapAmount) > 0 && amount < Number.parseFloat(wrapConfig.minUnwrapAmount)) return t('wrap.belowMinUnwrapAmount', { min: formatNumber(wrapConfig.minUnwrapAmount) })
    if (Number.parseFloat(wrapConfig.maxUnwrapAmount) > 0 && amount > Number.parseFloat(wrapConfig.maxUnwrapAmount)) return t('wrap.aboveMaxUnwrapAmount', { max: formatNumber(wrapConfig.maxUnwrapAmount) })
    return ''
  }, [selectedUnwrapSRMBToken, t, unwrapAmount, userMaxUnwrappableAmount, wallet.isConnected, wrapConfig])

  const unwrapSWRMBBalanceError = useMemo(() => Number.parseFloat(unwrapPreview.sWRMBBurned) > Number.parseFloat(sWRMBBalance) ? `sWRMB ${t('wrap.insufficientBalance')}` : '', [sWRMBBalance, t, unwrapPreview.sWRMBBurned])
  const isWrapValid = useMemo(() => !wrapValidationError && Number.parseFloat(wrapAmount) > 0, [wrapAmount, wrapValidationError])
  const isUnwrapValid = useMemo(() => !unwrapValidationError && !unwrapSWRMBBalanceError && Number.parseFloat(unwrapAmount) > 0, [unwrapAmount, unwrapSWRMBBalanceError, unwrapValidationError])

  const transactionDetails = useMemo<TransactionDetail[]>(() => {
    if (mode === 'wrap' && wrapAmount) return [
      { label: t('pay'), values: [`-${formatNumber(wrapAmount, 6)} ${selectedTokenSymbol}`], highlight: true, type: 'debit' },
      { label: t('receive'), values: [`+${formatNumber(wrapPreview.outputAmount, 6)} sWRMB`], type: 'credit' }
    ]
    if (mode === 'unwrap' && unwrapAmount) return [
      { label: t('pay'), values: [`-${formatNumber(unwrapPreview.sWRMBBurned, 6)} sWRMB`], highlight: true, type: 'debit' },
      { label: t('receive'), values: [`+${formatNumber(unwrapPreview.sRMBReceived, 6)} ${selectedUnwrapTokenSymbol}`], type: 'credit' }
    ]
    return []
  }, [mode, selectedTokenSymbol, selectedUnwrapTokenSymbol, t, unwrapAmount, unwrapPreview.sRMBReceived, unwrapPreview.sWRMBBurned, wrapAmount, wrapPreview.outputAmount])

  const refreshData = async () => {
    await queryClient.invalidateQueries({ queryKey: ['wrap'] })
    await queryClient.invalidateQueries({ queryKey: ['savings'] })
  }

  const resetTransaction = () => {
    setTransactionVisible(false); setTransactionHash(''); setTransactionError(''); setTransactionStatus('pending'); setTransactionStep(0)
  }

  const handleWrap = async () => {
    if (!wallet.isConnected || !wallet.address || !isWrapValid) return
    const sRMBContract = contractService.getERC20Contract(selectedSRMBToken, true)
    const wrapManager = contractService.getWrapManagerContract(true)
    const wrapManagerAddress = contractService.getAddresses(chainId).WRAP_MANAGER
    if (!sRMBContract || !wrapManager || !wrapManagerAddress) return void feedback.error(t('wrap.wrapFailed'))
    setTransactionTitle(t('wrap.wrapTransaction')); setTransactionVisible(true); setTransactionStatus('pending'); setTransactionStep(0)
    try {
      const amountWei = parseUnits(wrapAmount, 6)
      if ((await sRMBContract.allowance(wallet.address, wrapManagerAddress)) < amountWei) {
        setTransactionStatus('loading'); await (await sRMBContract.approve(wrapManagerAddress, ethers.MaxUint256)).wait()
      }
      setTransactionStep(1); setTransactionStatus('loading')
      const receipt = await (await wrapManager.wrap(selectedSRMBToken, amountWei)).wait()
      setTransactionStep(2); setTransactionStatus('success'); setTransactionHash(receipt.hash); setWrapAmount(''); await refreshData(); feedback.success(t('wrap.wrapSuccess'))
    } catch (error) {
      setTransactionStatus('error'); setTransactionError(error instanceof Error ? error.message : t('wrap.wrapFailed'))
    }
  }

  const handleUnwrap = async () => {
    if (!wallet.isConnected || !wallet.address || !isUnwrapValid) return
    const savingsVault = contractService.getSavingsVaultContract(true)
    const wrapManager = contractService.getWrapManagerContract(true)
    const wrapManagerAddress = contractService.getAddresses(chainId).WRAP_MANAGER
    if (!savingsVault || !wrapManager || !wrapManagerAddress) return void feedback.error(t('wrap.unwrapFailed'))
    setTransactionTitle(t('wrap.unwrapTransaction')); setTransactionVisible(true); setTransactionStatus('pending'); setTransactionStep(0)
    try {
      const sRMBAmountWei = parseUnits(unwrapAmount, 6)
      const sWRMBRequiredWei = parseUnits(unwrapPreview.sWRMBBurned, 18)
      if ((await savingsVault.allowance(wallet.address, wrapManagerAddress)) < sWRMBRequiredWei) {
        setTransactionStatus('loading'); await (await savingsVault.approve(wrapManagerAddress, ethers.MaxUint256)).wait()
      }
      setTransactionStep(1); setTransactionStatus('loading')
      const receipt = await (await wrapManager.unwrap(selectedUnwrapSRMBToken, sRMBAmountWei)).wait()
      setTransactionStep(2); setTransactionStatus('success'); setTransactionHash(receipt.hash); setUnwrapAmount(''); await refreshData(); feedback.success(t('wrap.unwrapSuccess'))
    } catch (error) {
      setTransactionStatus('error'); setTransactionError(error instanceof Error ? error.message : t('wrap.unwrapFailed'))
    }
  }

  const wrapTitle = resolveText(t('wrap.title'), 'wrap.title', 'Wrap & Unwrap')
  const createRwaTitle = resolveText(t('wrapInfo.howToCreateSRMB'), 'wrapInfo.howToCreateSRMB', 'How to Create RWA')

  return (
    <PageScaffold title={wrapTitle}>
      <PullToRefresh isRefreshing={balancesQuery.isRefetching || userWrapStatsQuery.isRefetching}>
        {!wallet.isConnected ? (
          <div className="app-inline-note is-info mb-6">{resolveText(t('wallet.connectWallet'), 'wallet.connectWallet', 'Connect Wallet')}</div>
        ) : null}

        <PageSection>
          <div className="mb-8 flex items-center justify-center rounded-2xl bg-[var(--bg-secondary)] p-1">
            <button className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${mode === 'wrap' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} type="button" onClick={() => { setMode('wrap'); setWrapAmount(''); setUnwrapAmount('') }}>
              {resolveText(t('wrap.wrap'), 'wrap.wrap', 'Wrap')}
            </button>
            <button className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${mode === 'unwrap' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} type="button" onClick={() => { setMode('unwrap'); setWrapAmount(''); setUnwrapAmount('') }}>
              {resolveText(t('wrap.unwrap'), 'wrap.unwrap', 'Unwrap')}
            </button>
          </div>

          {mode === 'wrap' ? (
            <div className="space-y-6">
              <div>
                <div className="mb-3 flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-[var(--text-primary)]">{resolveText(t('wrap.from'), 'wrap.from', 'From')}</span>
                  <span className="text-[var(--text-secondary)]">{resolveText(t('wrap.balance'), 'wrap.balance', 'Balance')}: {formatNumberK(sRMBBalance)} {selectedTokenSymbol}</span>
                </div>
                <FormattedInput className="w-full" decimals={6} maxDecimals={6} modelValue={wrapAmount} placeholder={`${formatNumberK(sRMBBalance)} ${t('available')}`} size="large" useAbbreviation onChange={setWrapAmount}>
                  <SRMBTokenSelector value={selectedSRMBToken} onChange={setSelectedSRMBToken} onTokenChange={token => setSelectedTokenInfo(token)} />
                </FormattedInput>
                {wrapValidationError ? <div className="app-inline-note is-error mt-3">{wrapValidationError}</div> : null}
                <div className="mt-4">
                  <QuickAmounts maxLabel={t('common.max')} onSelectMax={() => setWrapAmount(sRMBBalance)} onSelectPercentage={percentage => setWrapAmount(calculatePercentageAmount(sRMBBalance, percentage, 6))} />
                </div>
              </div>

              <div className="flex justify-center">
                <button className="app-icon-button" type="button" onClick={() => setMode('unwrap')}>
                  <SwapOutlined />
                </button>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-[var(--text-primary)]">{resolveText(t('wrap.to'), 'wrap.to', 'To')}</span>
                  <span className="text-[var(--text-secondary)]">{resolveText(t('wrap.balance'), 'wrap.balance', 'Balance')}: {formatNumberK(sWRMBBalance)} sWRMB</span>
                </div>
                <FormattedInput className="w-full" decimals={6} maxDecimals={18} modelValue={wrapPreview.outputAmount} placeholder={t('wrap.estimatedAmount')} readOnly size="large" useAbbreviation onChange={() => undefined}>
                  <span className="flex items-center gap-2"><TokenIcon size="medium" symbol="sWRMB" /><span>sWRMB</span></span>
                </FormattedInput>
              </div>

              {wrapPreview.outputAmount !== '0' ? (
                <div className="rounded-2xl bg-[var(--bg-secondary)] p-5">
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">{resolveText(t('wrap.preview'), 'wrap.preview', 'Preview')}</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[var(--text-secondary)]">{resolveText(t('wrap.fee'), 'wrap.fee', 'Fee')} ({formatNumber(wrapPreview.feePercentage)}%)</span>
                      <span className="font-medium text-[var(--text-primary)]">{formatNumber(wrapPreview.fee)} {selectedTokenSymbol}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-[var(--border-color)] pt-3">
                      <span className="text-[var(--text-secondary)]">{resolveText(t('wrap.rate'), 'wrap.rate', 'Rate')}</span>
                      <span className="font-medium text-[var(--text-primary)]">1 {selectedTokenSymbol} ≈ {formatNumber(wrapPreview.exchangeRate, 6)} sWRMB</span>
                    </div>
                  </div>
                </div>
              ) : null}

              {wrapPreview.waitTime > 0 ? <div className="app-inline-note is-info"><ClockCircleOutlined className="mr-2" />{resolveText(t('wrap.availableAt'), 'wrap.availableAt', 'Available At')}: {getExecutableTime(wrapPreview.waitTime)}</div> : null}

              <button className="app-action-button is-primary w-full" disabled={!isWrapValid || !wallet.isConnected || !canWrap} type="button" onClick={() => void handleWrap()}>
                {!wallet.isConnected ? resolveText(t('wallet.connectWallet'), 'wallet.connectWallet', 'Connect Wallet') : !canWrap ? resolveText(t('wrap.waitingForCooldown'), 'wrap.waitingForCooldown', 'Waiting for cooldown') : resolveText(t('wrap.wrapTokens'), 'wrap.wrapTokens', 'Confirm')}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="mb-3 flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-[var(--text-primary)]">{resolveText(t('wrap.desiredAmount'), 'wrap.desiredAmount', 'Desired Amount')}</span>
                  <span className="text-[var(--text-secondary)]">{resolveText(t('wrap.balance'), 'wrap.balance', 'Balance')}: {formatNumberK(userUnwrappableAmount)} {selectedUnwrapTokenSymbol}</span>
                </div>
                <FormattedInput className="w-full" decimals={6} maxDecimals={6} modelValue={unwrapAmount} placeholder={`${formatNumberK(userMaxUnwrappableAmount)} ${t('available')}`} size="large" useAbbreviation onChange={setUnwrapAmount}>
                  <SRMBTokenSelector value={selectedUnwrapSRMBToken} onChange={setSelectedUnwrapSRMBToken} onTokenChange={token => setSelectedUnwrapTokenInfo(token)} />
                </FormattedInput>
                {unwrapValidationError ? <div className="app-inline-note is-error mt-3">{unwrapValidationError}</div> : null}
                <div className="mt-4">
                  <QuickAmounts maxLabel={t('common.max')} onSelectMax={() => setUnwrapAmount(userMaxUnwrappableAmount)} onSelectPercentage={percentage => setUnwrapAmount(calculatePercentageAmount(userMaxUnwrappableAmount, percentage, 6))} />
                </div>
              </div>

              <div className="flex justify-center">
                <button className="app-icon-button" type="button" onClick={() => setMode('wrap')}>
                  <SwapOutlined />
                </button>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-[var(--text-primary)]">{resolveText(t('wrap.requiredBurn'), 'wrap.requiredBurn', 'Required Burn')}</span>
                  <span className="text-[var(--text-secondary)]">{resolveText(t('wrap.balance'), 'wrap.balance', 'Balance')}: {formatNumberK(sWRMBBalance)} sWRMB</span>
                </div>
                <FormattedInput className="w-full" decimals={6} maxDecimals={18} modelValue={unwrapPreview.sWRMBBurned} placeholder={t('wrap.estimatedBurn')} readOnly size="large" useAbbreviation onChange={() => undefined}>
                  <span className="flex items-center gap-2"><TokenIcon size="medium" symbol="sWRMB" /><span>sWRMB</span></span>
                </FormattedInput>
              </div>

              {unwrapPreview.sWRMBBurned !== '0' && !unwrapValidationError && !unwrapSWRMBBalanceError ? (
                <div className="rounded-2xl bg-[var(--bg-secondary)] p-5">
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">{resolveText(t('wrap.preview'), 'wrap.preview', 'Preview')}</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[var(--text-secondary)]">{resolveText(t('savings.youWillReceive'), 'savings.youWillReceive', 'You Will Receive')}</span>
                      <span className="font-medium text-[var(--text-primary)]">{formatNumber(unwrapAmount)} {selectedUnwrapTokenSymbol}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[var(--text-secondary)]">{resolveText(t('wrap.fee'), 'wrap.fee', 'Fee')} ({formatNumber(unwrapPreview.feePercentage)}%)</span>
                      <span className="font-medium text-[var(--text-primary)]">{formatNumber(unwrapPreview.fee)} {selectedUnwrapTokenSymbol}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-[var(--border-color)] pt-3">
                      <span className="text-[var(--text-secondary)]">{resolveText(t('wrap.rate'), 'wrap.rate', 'Rate')}</span>
                      <span className="font-medium text-[var(--text-primary)]">1 sWRMB ≈ {formatNumber(unwrapPreview.exchangeRate, 6)} {selectedUnwrapTokenSymbol}</span>
                    </div>
                  </div>
                </div>
              ) : null}

              {unwrapSWRMBBalanceError ? <div className="app-inline-note is-error">{unwrapSWRMBBalanceError}</div> : null}
              {unwrapPreview.waitTime > 0 ? <div className="app-inline-note is-info"><ClockCircleOutlined className="mr-2" />{resolveText(t('wrap.availableAt'), 'wrap.availableAt', 'Available At')}: {getExecutableTime(unwrapPreview.waitTime)}</div> : null}

              <button className="app-action-button is-primary w-full" disabled={!isUnwrapValid || !wallet.isConnected || !canUnwrap} type="button" onClick={() => void handleUnwrap()}>
                {!wallet.isConnected ? resolveText(t('wallet.connectWallet'), 'wallet.connectWallet', 'Connect Wallet') : unwrapSWRMBBalanceError || !canUnwrap ? unwrapSWRMBBalanceError || resolveText(t('wrap.waitingForCooldown'), 'wrap.waitingForCooldown', 'Waiting for cooldown') : resolveText(t('wrap.unwrapTokens'), 'wrap.unwrapTokens', 'Confirm')}
              </button>
            </div>
          )}
        </PageSection>

        <PageSection>
          <div className="mb-4 flex items-center gap-3"><ShareAltOutlined className="text-xl text-[var(--primary-color)]" /><h2 className="page-section-title text-[1.35rem]">{createRwaTitle}</h2></div>
          <p className="text-[var(--text-secondary)]">{resolveText(t('wrapInfo.createSRMBDescription'), 'wrapInfo.createSRMBDescription', 'Visit the Digital Fund Visualization Platform to create and manage your RWA tokens')}</p>
          <a className="mt-4 inline-flex text-sm font-semibold text-[var(--primary-color)] hover:opacity-80" href="https://cina-fund.dev.isecsp.cn" rel="noreferrer" target="_blank">
            {resolveText(t('wrapInfo.visitPlatform'), 'wrapInfo.visitPlatform', 'Visit Digital Fund Visualization Platform')}
          </a>
          <div className="mt-6 rounded-2xl bg-[var(--bg-secondary)] p-5">
            <div className="text-sm font-semibold text-[var(--text-primary)]">{resolveText(t('wrapInfo.platformFeatures'), 'wrapInfo.platformFeatures', 'Platform features include:')}</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[t('wrapInfo.deployTokens'), t('wrapInfo.manageNAV'), t('wrapInfo.mintTokens'), t('wrapInfo.whitelistUsers'), t('wrapInfo.pauseContracts'), t('wrapInfo.transferOwnership')].map(item => (
                <div key={item} className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{item}</div>
              ))}
            </div>
          </div>
        </PageSection>

        <InfoCards cards={infoCards} />
      </PullToRefresh>

      <TransactionModal currentStep={transactionStep} errorMessage={transactionError} status={transactionStatus} steps={transactionSteps} title={transactionTitle} transactionDetails={transactionDetails} transactionHash={transactionHash} visible={transactionVisible} onClose={resetTransaction} onRetry={() => { if (mode === 'wrap') void handleWrap(); else void handleUnwrap() }} />
    </PageScaffold>
  )
}
