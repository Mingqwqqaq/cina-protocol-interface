import {
  InfoCircleOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  SortAscendingOutlined,
  WarningOutlined
} from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Contract, ethers, parseUnits } from 'ethers'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormattedInput } from '@/components/common/FormattedInput'
import { InfoCards } from '@/components/common/InfoCards'
import { PullToRefresh } from '@/components/common/PullToRefresh'
import { QuickAmounts } from '@/components/common/QuickAmounts'
import { TransactionModal, type TransactionDetail, type TransactionStep } from '@/components/common/TransactionModal'
import { TokenSelect, type SelectableToken } from '@/components/TokenSelect'
import { DEFAULT_CHAIN_ID, TOKENS } from '@/constants'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { PageScaffold, PageSection } from '@/pages/PageScaffold'
import { uniswapV4Service } from '@/services/uniswapV4'
import { useWalletStore } from '@/stores/wallet'
import { calculatePercentageAmount, formatNumber, formatNumberK } from '@/utils/format'
import { resolveText } from '@/utils/i18n'

const PERMIT2_APPROVE_ABI = [
  'function approve(address token, address spender, uint160 amount, uint48 expiration) external',
  'function allowance(address owner, address token, address spender) external view returns (uint160 amount, uint48 expiration, uint48 nonce)'
]

const DEFAULT_SLIPPAGE_OPTIONS = [1, 5]

function getAvailableTokens(chainId: number): SelectableToken[] {
  return [
    {
      symbol: TOKENS.WRMB.symbol,
      name: TOKENS.WRMB.name,
      address:
        TOKENS.WRMB.addresses[chainId as keyof typeof TOKENS.WRMB.addresses] ||
        TOKENS.WRMB.addresses[11155111] ||
        '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      decimals: TOKENS.WRMB.decimals
    },
    {
      symbol: TOKENS.USDT.symbol,
      name: TOKENS.USDT.name,
      address:
        TOKENS.USDT.addresses[chainId as keyof typeof TOKENS.USDT.addresses] ||
        TOKENS.USDT.addresses[11155111] ||
        '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      decimals: TOKENS.USDT.decimals
    },
    {
      symbol: TOKENS.USDC.symbol,
      name: TOKENS.USDC.name,
      address:
        TOKENS.USDC.addresses[chainId as keyof typeof TOKENS.USDC.addresses] ||
        TOKENS.USDC.addresses[11155111] ||
        '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      decimals: TOKENS.USDC.decimals
    },
    {
      symbol: TOKENS.CINA.symbol,
      name: TOKENS.CINA.name,
      address:
        TOKENS.CINA.addresses[chainId as keyof typeof TOKENS.CINA.addresses] ||
        TOKENS.CINA.addresses[11155111] ||
        '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      decimals: TOKENS.CINA.decimals
    }
  ]
}

export default function SwapPage() {
  const { t } = useTranslation()
  const wallet = useWalletStore()
  const queryClient = useQueryClient()
  const chainId = wallet.chainId || DEFAULT_CHAIN_ID

  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [slippage, setSlippage] = useState(1)
  const [customSlippage, setCustomSlippage] = useState('')
  const [fromToken, setFromToken] = useState<SelectableToken>()
  const [toToken, setToToken] = useState<SelectableToken>()
  const [lastEdited, setLastEdited] = useState<'from' | 'to'>('from')
  const [transactionVisible, setTransactionVisible] = useState(false)
  const [transactionStep, setTransactionStep] = useState(0)
  const [transactionStatus, setTransactionStatus] = useState<'pending' | 'loading' | 'success' | 'error'>('pending')
  const [transactionHash, setTransactionHash] = useState('')
  const [transactionError, setTransactionError] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const availableTokens = useMemo(() => getAvailableTokens(chainId), [chainId])
  const isV4Supported = uniswapV4Service.isNetworkSupported(chainId)
  const debouncedFromAmount = useDebouncedValue(fromAmount, 1_000)
  const debouncedToAmount = useDebouncedValue(toAmount, 1_000)

  useEffect(() => {
    if (!availableTokens.length) {
      return
    }

    setFromToken(current => current ?? availableTokens[0])
    setToToken(current => current ?? availableTokens[1])
  }, [availableTokens])

  useEffect(() => {
    setFromToken(availableTokens[0])
    setToToken(availableTokens[1])
    setFromAmount('')
    setToAmount('')
  }, [availableTokens])

  const balancesQuery = useQuery({
    enabled: Boolean(wallet.address && fromToken && toToken),
    queryKey: ['swap', 'balances', chainId, wallet.address, fromToken?.address, toToken?.address],
    queryFn: async () => {
      if (!wallet.address || !fromToken || !toToken) {
        return { fromBalance: '0', toBalance: '0' }
      }

      const [fromBalance, toBalance] = await Promise.all([
        uniswapV4Service.getTokenBalance(fromToken.address, wallet.address),
        uniswapV4Service.getTokenBalance(toToken.address, wallet.address)
      ])

      return { fromBalance, toBalance }
    }
  })

  const poolQuery = useQuery({
    enabled: Boolean(fromToken && toToken && fromToken.symbol !== toToken.symbol && isV4Supported),
    queryKey: ['swap', 'pool', chainId, fromToken?.address, toToken?.address],
    queryFn: async () => {
      if (!fromToken || !toToken) {
        return null
      }
      return uniswapV4Service.getPoolInfo(fromToken.address, toToken.address, 500)
    }
  })

  const quoteQuery = useQuery({
    enabled: Boolean(
      fromToken &&
        toToken &&
        fromToken.symbol !== toToken.symbol &&
        isV4Supported &&
        ((lastEdited === 'from' && Number.parseFloat(debouncedFromAmount) > 0) ||
          (lastEdited === 'to' && Number.parseFloat(debouncedToAmount) > 0))
    ),
    queryKey: [
      'swap',
      'quote',
      chainId,
      fromToken?.address,
      toToken?.address,
      lastEdited,
      lastEdited === 'from' ? debouncedFromAmount : debouncedToAmount,
      slippage
    ],
    queryFn: async () => {
      if (!fromToken || !toToken) {
        return null
      }

      return uniswapV4Service.getQuote({
        tokenIn: fromToken.address,
        tokenOut: toToken.address,
        amountIn: lastEdited === 'from' ? debouncedFromAmount : undefined,
        amountOut: lastEdited === 'to' ? debouncedToAmount : undefined,
        swapType: lastEdited === 'from' ? 'exactInput' : 'exactOutput',
        slippage
      })
    }
  })

  useEffect(() => {
    if (!quoteQuery.data) {
      if (lastEdited === 'from' && !debouncedFromAmount) {
        setToAmount('')
      }
      if (lastEdited === 'to' && !debouncedToAmount) {
        setFromAmount('')
      }
      return
    }

    if (lastEdited === 'from') {
      setToAmount(quoteQuery.data.amountOut)
    } else if (quoteQuery.data.amountIn) {
      setFromAmount(quoteQuery.data.amountIn)
    }
  }, [debouncedFromAmount, debouncedToAmount, lastEdited, quoteQuery.data])

  const fromTokenBalance = balancesQuery.data?.fromBalance ?? '0'
  const toTokenBalance = balancesQuery.data?.toBalance ?? '0'
  const poolExists = Boolean(poolQuery.data)
  const currentQuote = quoteQuery.data
  const exchangeRate =
    currentQuote && Number.parseFloat(fromAmount) > 0
      ? Number.parseFloat(currentQuote.amountOut) / Number.parseFloat(fromAmount)
      : fromToken?.symbol === toToken?.symbol
        ? 1
        : 0

  const infoCards = useMemo(
    () => [
      {
        icon: <InfoCircleOutlined />,
        title: t('swap.whatIsSwapping'),
        content: t('swap.swappingDescription')
      },
      {
        icon: <QuestionCircleOutlined />,
        title: t('swap.swappingFees'),
        content: t('swap.swappingFeesDescription')
      },
      {
        icon: <WarningOutlined />,
        title: t('swap.swappingRisks'),
        content: t('swap.swappingRisksDescription')
      }
    ],
    [t]
  )

  const transactionSteps: TransactionStep[] = useMemo(
    () => [
      {
        label: t('swap.steps.checkAllowance'),
        description: t('swap.steps.checkAllowanceDesc')
      },
      {
        label: t('swap.steps.approve'),
        description: t('swap.steps.approveDesc')
      },
      {
        label: t('swap.steps.swap'),
        description: t('swap.steps.swapDesc')
      },
      {
        label: t('swap.steps.confirm'),
        description: t('swap.steps.confirmDesc')
      }
    ],
    [t]
  )

  const transactionDetails = useMemo<TransactionDetail[]>(
    () => [
      {
        label: t('swap.sell'),
        values: [`-${formatNumber(fromAmount, 6)} ${fromToken?.symbol || ''}`],
        highlight: true,
        type: 'debit'
      },
      {
        label: t('swap.buy'),
        values: [`+${formatNumber(toAmount, 6)} ${toToken?.symbol || ''}`],
        highlight: true,
        type: 'credit'
      }
    ],
    [fromAmount, fromToken?.symbol, t, toAmount, toToken?.symbol]
  )

  const canSwap =
    wallet.isConnected &&
    Boolean(fromToken && toToken) &&
    Boolean(fromAmount) &&
    Number.parseFloat(fromAmount) > 0 &&
    Number.parseFloat(fromAmount) <= Number.parseFloat(fromTokenBalance) &&
    !quoteQuery.isFetching &&
    transactionStatus !== 'loading' &&
    isV4Supported &&
    poolExists &&
    fromToken?.symbol !== toToken?.symbol

  const pageTitle = resolveText(t('navigation.swap'), 'navigation.swap', 'Swap')
  const connectWalletLabel = resolveText(t('wallet.connectWallet'), 'wallet.connectWallet', 'Connect Wallet')
  const settingsLabel = resolveText(t('swap.settings'), 'swap.settings', 'Settings')
  const sellLabel = resolveText(t('swap.sell'), 'swap.sell', 'Sell')
  const buyLabel = resolveText(t('swap.buy'), 'swap.buy', 'Buy')
  const detailsLabel = resolveText(t('swap.details'), 'swap.details', 'Details')
  const slippageLabel = resolveText(t('swap.slippage'), 'swap.slippage', 'Slippage')
  const protocolStatusLabel = resolveText(t('swap.protocolStatus'), 'swap.protocolStatus', 'Protocol Status')
  const poolStatusLabel = resolveText(t('swap.poolStatus'), 'swap.poolStatus', 'Pool Status')
  const rateLabel = resolveText(t('swap.rate'), 'swap.rate', 'Rate')
  const protocolReadyLabel = resolveText(t('swap.uniswapV4Available'), 'swap.uniswapV4Available', 'Uniswap v4 Available')
  const protocolUnavailableLabel = resolveText(t('swap.v4NotSupported'), 'swap.v4NotSupported', 'Uniswap v4 Not Supported')
  const poolReadyLabel = resolveText(t('swap.poolAvailable'), 'swap.poolAvailable', 'Pool Available')
  const poolMissingLabel = resolveText(t('swap.poolNotExists'), 'swap.poolNotExists', 'Pool Not Available')
  const noRateLabel = resolveText(t('swap.enterAmountForRate'), 'swap.enterAmountForRate', 'Enter amount for rate')
  const swapLabel = resolveText(t('swap.swap'), 'swap.swap', 'Swap')
  const swappingLabel = resolveText(t('swap.swapping'), 'swap.swapping', 'Swapping')
  const fetchingQuoteLabel = resolveText(t('swap.fetchingQuote'), 'swap.fetchingQuote', 'Fetching Quote')

  const getSwapButtonText = () => {
    if (!wallet.isConnected) {
      return connectWalletLabel
    }
    if (transactionStatus === 'loading') {
      return swappingLabel
    }
    if (quoteQuery.isFetching) {
      return fetchingQuoteLabel
    }
    if (!isV4Supported) {
      const networkNames = uniswapV4Service
        .getSupportedNetworks()
        .map(id => (id === 1 ? 'Ethereum Mainnet' : id === 11155111 ? 'Sepolia Testnet' : `Network ${id}`))
        .join(', ')
      return resolveText(
        t('swap.unsupportedNetwork', { networks: networkNames }),
        'swap.unsupportedNetwork',
        `Supported on ${networkNames}`
      )
    }
    return swapLabel
  }

  const swapTokens = () => {
    if (!fromToken || !toToken) {
      return
    }

    setFromToken(toToken)
    setToToken(fromToken)
    setFromAmount(toAmount)
    setToAmount(fromAmount)
    setLastEdited('from')
  }

  const resetTransaction = () => {
    setTransactionVisible(false)
    setTransactionStep(0)
    setTransactionStatus('pending')
    setTransactionHash('')
    setTransactionError('')
  }

  const executeSwap = async () => {
    if (!canSwap || !fromToken || !toToken || !wallet.address || !currentQuote) {
      return
    }

    setTransactionVisible(true)
    setTransactionStatus('loading')
    setTransactionStep(0)

    try {
      const swapParams = {
        tokenIn: fromToken.address,
        tokenOut: toToken.address,
        amountIn: lastEdited === 'from' ? fromAmount : currentQuote.amountIn || fromAmount,
        amountOut: lastEdited === 'to' ? toAmount : undefined,
        swapType: (lastEdited === 'from' ? 'exactInput' : 'exactOutput') as 'exactInput' | 'exactOutput',
        slippage
      }

      await uniswapV4Service.reinitialize()

      if (!uniswapV4Service.isNetworkSupported(chainId)) {
        throw new Error(t('swap.networkNotSupportedV4'))
      }

      const addresses = uniswapV4Service.getContractAddresses(chainId)
      if (!addresses || !uniswapV4Service.provider || !uniswapV4Service.signer) {
        throw new Error(t('swap.connectWalletFirst'))
      }

      const permit2Address = addresses.PERMIT2
      const permit2Allowance = await uniswapV4Service.checkAllowance(swapParams.tokenIn, permit2Address, wallet.address)
      const tokenInContract = uniswapV4Service.getTokenContract(swapParams.tokenIn, true)
      const tokenInDecimals = await tokenInContract.decimals()
      const amountInFrom = parseUnits(fromAmount, tokenInDecimals)
      const slippageMultiplierOut = BigInt(Math.floor((100 + swapParams.slippage) * 100))
      const maxAmountInBigInt = (amountInFrom * slippageMultiplierOut) / BigInt(10_000)
      const amountIn = lastEdited === 'from' ? amountInFrom : maxAmountInBigInt

      if (BigInt(permit2Allowance) < BigInt(amountIn)) {
        setTransactionStep(1)
        const approveSuccess = await uniswapV4Service.approveToken(
          swapParams.tokenIn,
          permit2Address,
          ethers.MaxUint256.toString()
        )
        if (!approveSuccess) {
          throw new Error(t('swap.permit2AuthFailed'))
        }
      }

      const permit2Contract = new Contract(permit2Address, PERMIT2_APPROVE_ABI, uniswapV4Service.provider)
      const permit2AllowanceData = await permit2Contract.allowance(wallet.address, swapParams.tokenIn, addresses.UNIVERSAL_ROUTER)

      if (
        BigInt(permit2AllowanceData.amount) < BigInt(amountIn) ||
        Number(permit2AllowanceData.expiration) < Math.floor(Date.now() / 1000)
      ) {
        setTransactionStep(1)
        const deadline = Math.floor(Date.now() / 1000) + 30 * 24 * 3600
        const permit2ContractWithSigner = new Contract(permit2Address, PERMIT2_APPROVE_ABI, uniswapV4Service.signer)
        const permit2ApproveTx = await permit2ContractWithSigner.approve(
          swapParams.tokenIn,
          addresses.UNIVERSAL_ROUTER,
          '1461501637330902918203684832716283019655932542975',
          deadline
        )
        await permit2ApproveTx.wait()
      }

      setTransactionStep(2)
      const tokenOutContract = uniswapV4Service.getTokenContract(swapParams.tokenOut)
      const tokenOutDecimals = await tokenOutContract.decimals()
      const slippageMultiplier = BigInt(Math.floor((100 - swapParams.slippage) * 100))
      const amountOutBigInt = parseUnits(currentQuote.amountOut, tokenOutDecimals)
      const minAmountOut = (amountOutBigInt * slippageMultiplier) / BigInt(10_000)
      const amountOutTo = parseUnits(toAmount, tokenOutDecimals)

      const poolKey = {
        currency0: swapParams.tokenIn < swapParams.tokenOut ? swapParams.tokenIn : swapParams.tokenOut,
        currency1: swapParams.tokenIn < swapParams.tokenOut ? swapParams.tokenOut : swapParams.tokenIn,
        fee: 500,
        tickSpacing: 10,
        hooks: ethers.ZeroAddress
      }

      if (
        swapParams.tokenIn === '0xAD87E2353a23fefC6156aA9FC1d1C4258e00E193' ||
        swapParams.tokenOut === '0xAD87E2353a23fefC6156aA9FC1d1C4258e00E193'
      ) {
        poolKey.fee = 3000
        poolKey.tickSpacing = 60
      }

      const zeroForOne = poolKey.currency0 === swapParams.tokenIn
      const deadline = Math.floor(Date.now() / 1000) + 3600
      const actions = {
        SWAP_EXACT_IN_SINGLE: 0x06,
        SWAP_EXACT_OUT_SINGLE: 0x08,
        SETTLE_ALL: 0x0c,
        TAKE_ALL: 0x0f
      }
      const commandType = {
        V4_SWAP: 0x10
      }

      const poolKeyStruct = '(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks)'
      const swapExactInSingleStruct = `(${poolKeyStruct} poolKey,bool zeroForOne,uint128 amountIn,uint128 amountOutMinimum,bytes hookData)`
      const swapExactOutSingleStruct = `(${poolKeyStruct} poolKey,bool zeroForOne,uint128 amountOut,uint128 amountInMaximum,bytes hookData)`

      let v4Actions = '0x'
      const v4Params: string[] = []

      if (lastEdited === 'from') {
        const swapParamsForTx = {
          poolKey,
          zeroForOne,
          amountIn,
          amountOutMinimum: minAmountOut,
          hookData: '0x'
        }
        v4Params.push(ethers.AbiCoder.defaultAbiCoder().encode([swapExactInSingleStruct], [swapParamsForTx]))
        v4Actions += actions.SWAP_EXACT_IN_SINGLE.toString(16).padStart(2, '0')
        v4Params.push(ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [swapParams.tokenIn, amountIn]))
        v4Actions += actions.SETTLE_ALL.toString(16).padStart(2, '0')
        v4Params.push(ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [swapParams.tokenOut, minAmountOut]))
        v4Actions += actions.TAKE_ALL.toString(16).padStart(2, '0')
      } else {
        const swapParamsForTxOut = {
          poolKey,
          zeroForOne,
          amountOut: amountOutTo,
          amountInMaximum: maxAmountInBigInt,
          hookData: '0x'
        }
        v4Params.push(ethers.AbiCoder.defaultAbiCoder().encode([swapExactOutSingleStruct], [swapParamsForTxOut]))
        v4Actions += actions.SWAP_EXACT_OUT_SINGLE.toString(16).padStart(2, '0')
        v4Params.push(
          ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [swapParams.tokenIn, maxAmountInBigInt])
        )
        v4Actions += actions.SETTLE_ALL.toString(16).padStart(2, '0')
        v4Params.push(ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [swapParams.tokenOut, amountOutTo]))
        v4Actions += actions.TAKE_ALL.toString(16).padStart(2, '0')
      }

      const encodedV4Actions = ethers.AbiCoder.defaultAbiCoder().encode(['bytes', 'bytes[]'], [v4Actions, v4Params])
      const commands = `0x${commandType.V4_SWAP.toString(16).padStart(2, '0')}`
      const inputs = [encodedV4Actions]
      const txOptions = {
        value: swapParams.tokenIn === ethers.ZeroAddress ? amountIn : 0
      }

      const tx = await uniswapV4Service.swapRouterContract?.execute(commands, inputs, deadline, txOptions)
      if (!tx) {
        throw new Error(t('swap.swapFailedError', { error: 'Router unavailable' }))
      }

      setTransactionStep(3)
      const receipt = await tx.wait()
      setTransactionStatus('success')
      setTransactionHash(receipt.hash)
      setFromAmount('')
      setToAmount('')
      await queryClient.invalidateQueries({ queryKey: ['swap'] })
    } catch (error) {
      setTransactionStatus('error')
      setTransactionError(error instanceof Error ? error.message : t('swap.swapFailedError', { error: 'Unknown error' }))
    }
  }

  return (
    <PageScaffold title={pageTitle}>
      <PullToRefresh isRefreshing={balancesQuery.isRefetching || quoteQuery.isRefetching}>
        {!wallet.isConnected ? <div className="app-inline-note is-info mb-6">{connectWalletLabel}</div> : null}

        <PageSection>
          <div className="space-y-6">
            <div className="relative flex justify-end">
              <button
                aria-label={settingsLabel}
                className="app-icon-button"
                type="button"
                onClick={() => setSettingsOpen(open => !open)}
              >
                <SettingOutlined />
              </button>
              {settingsOpen ? (
                <div className="app-dropdown-menu w-full max-w-xs">
                  <div className="mb-4 text-sm font-semibold text-[var(--text-primary)]">{settingsLabel}</div>
                  <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">{slippageLabel}</div>
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_SLIPPAGE_OPTIONS.map(value => (
                        <button
                          key={value}
                          className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                            slippage === value && !customSlippage
                              ? 'border-[var(--primary-color)] bg-[var(--primary-color)] text-white'
                              : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                          }`}
                          type="button"
                          onClick={() => {
                            setSlippage(value)
                            setCustomSlippage('')
                          }}
                        >
                          {value}%
                        </button>
                      ))}
                      <label className="flex min-w-[8rem] items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                        <input
                          className="w-full bg-transparent text-right text-[var(--text-primary)] outline-none"
                          max="50"
                          min="0.1"
                          placeholder="Custom"
                          step="0.1"
                          type="number"
                          value={customSlippage}
                          onChange={event => {
                            const nextValue = event.target.value
                            setCustomSlippage(nextValue)
                            if (nextValue) {
                              setSlippage(Number(nextValue))
                            }
                          }}
                        />
                        <span>%</span>
                      </label>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="text-sm font-semibold text-[var(--text-primary)]">{sellLabel}</div>
                <FormattedInput
                  className="w-full"
                  decimals={6}
                  maxDecimals={fromToken?.decimals || 6}
                  modelValue={fromAmount}
                  placeholder={`${formatNumberK(fromTokenBalance)} ${t('available')}`}
                  size="large"
                  useAbbreviation
                  onChange={value => {
                    setLastEdited('from')
                    setFromAmount(value)
                  }}
                >
                  <TokenSelect
                    tokens={availableTokens}
                    value={fromToken}
                    onChange={token => {
                      setFromToken(token)
                      if (token.symbol === toToken?.symbol && fromToken) {
                        setToToken(fromToken)
                      }
                    }}
                  />
                </FormattedInput>
                <QuickAmounts
                  maxLabel={t('common.max')}
                  onSelectMax={() => {
                    setLastEdited('from')
                    setFromAmount(fromTokenBalance)
                  }}
                  onSelectPercentage={percentage => {
                    setLastEdited('from')
                    setFromAmount(calculatePercentageAmount(fromTokenBalance, percentage, fromToken?.decimals))
                  }}
                />
              </div>

              <div className="flex justify-center">
                <button className="app-icon-button" type="button" onClick={swapTokens}>
                  <SortAscendingOutlined />
                </button>
              </div>

              <div className="space-y-4">
                <div className="text-sm font-semibold text-[var(--text-primary)]">{buyLabel}</div>
                <FormattedInput
                  className="w-full"
                  decimals={6}
                  maxDecimals={toToken?.decimals || 6}
                  modelValue={toAmount}
                  placeholder={`${formatNumberK(toTokenBalance)} ${t('available')}`}
                  size="large"
                  useAbbreviation
                  onChange={value => {
                    setLastEdited('to')
                    setToAmount(value)
                  }}
                >
                  <TokenSelect
                    tokens={availableTokens}
                    value={toToken}
                    onChange={token => {
                      setToToken(token)
                      if (token.symbol === fromToken?.symbol && toToken) {
                        setFromToken(toToken)
                      }
                    }}
                  />
                </FormattedInput>
              </div>
            </div>

            <div className="rounded-2xl bg-[var(--bg-secondary)] p-5">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">{detailsLabel}</h2>
              <div className="mt-4 space-y-3 text-sm">
                {wallet.isConnected ? (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[var(--text-secondary)]">{protocolStatusLabel}</span>
                    <span className={isV4Supported ? 'text-[var(--success-color)]' : 'text-[var(--error-color)]'}>
                      {isV4Supported ? protocolReadyLabel : protocolUnavailableLabel}
                    </span>
                  </div>
                ) : null}

                {isV4Supported && fromToken && toToken && fromToken.symbol !== toToken.symbol ? (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[var(--text-secondary)]">{poolStatusLabel}</span>
                    <span className={poolExists ? 'text-[var(--success-color)]' : 'text-[var(--warning-color)]'}>
                      {poolExists ? poolReadyLabel : poolMissingLabel}
                    </span>
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-4 border-t border-[var(--border-color)] pt-3">
                  <span className="text-[var(--text-secondary)]">{rateLabel}</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {exchangeRate > 0 && fromToken && toToken
                      ? `1 ${fromToken.symbol} to ${formatNumber(exchangeRate, 6)} ${toToken.symbol}`
                      : noRateLabel}
                  </span>
                </div>
              </div>
            </div>

            <button
              className="app-action-button is-primary w-full"
              disabled={!canSwap}
              type="button"
              onClick={() => void executeSwap()}
            >
              {getSwapButtonText()}
            </button>
          </div>
        </PageSection>

        <InfoCards cards={infoCards} />
      </PullToRefresh>

      <TransactionModal
        currentStep={transactionStep}
        errorMessage={transactionError}
        status={transactionStatus}
        steps={transactionSteps}
        title={t('swap.swapTransaction')}
        transactionDetails={transactionDetails}
        transactionHash={transactionHash}
        visible={transactionVisible}
        onClose={resetTransaction}
        onRetry={() => void executeSwap()}
      />
    </PageScaffold>
  )
}
