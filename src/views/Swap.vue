<template>
  <div class="h-full">
    <PullToRefresh :is-pulling="isPulling" :is-refreshing="isRefreshing" :pull-distance="pullDistance"
      :can-refresh="canRefresh">
      <!-- Swap Overview -->
      <div class="swap-overview">
        <h2 class="section-title">
          {{ $t('swap.title') }}
        </h2>
      </div>

      <!-- Swap Interface -->
      <div class="swap-interface">
        <div class="interface-card">
          <!-- Settings Icon -->
          <el-popover placement="bottom-end" :width="300" trigger="click">
            <template #reference>
              <div class="settings-icon">
                <el-icon class="settings-btn">
                  <Setting />
                </el-icon>
              </div>
            </template>
            <div class="settings-content">
              <h4 class="settings-title">{{ $t('swap.settings') }}</h4>
              <div class="detail-item">
                <span>{{ $t('swap.slippage') }}</span>
                <div class="slippage-selector">
                  <button v-for="value in slippageOptions" :key="value" :class="{ active: slippage === value }"
                    @click="slippage = value">
                    {{ value }}%
                  </button>
                  <div class="custom-slippage">
                    <input type="number" v-model="customSlippage" @input="handleCustomSlippage" placeholder="Custom" />
                    <span>%</span>
                  </div>
                </div>
              </div>
            </div>
          </el-popover>
          <!-- Token Selection -->
          <div class="token-selection">
            <div class="token-input-container">
              <div class="token-input-header">
                <span class="input-label">{{ $t('swap.sell') }}</span>
              </div>
              <div class="input-section">
                <div class="input-group">
                  <div class="amount-input">
                    <div class="input-with-select">
                      <FormattedInput v-model="fromAmount"
                        :placeholder="formatNumberK(fromTokenBalance) + '  ' + $t('available')" size="large"
                        :decimals="6" :use-abbreviation="true" :max-decimals="fromToken?.decimals"
                        :disabled="isSwapping || isLoadingQuote" @input-change="handleFromAmountChange">
                        <TokenSelect v-model="fromToken" :tokens="availableTokens" placeholder="Select token"
                          :disabled="isSwapping" @token-change="fromTokenChange" />
                      </FormattedInput>
                    </div>
                  </div>
                </div>
                <!-- Quick Amount Buttons -->
                <QuickAmounts :max-label="$t('common.max')" @select-percentage="setDepositPercentage"
                  @select-max="setMaxFromAmount" :disabled="isSwapping" />
              </div>
            </div>

            <!-- Swap Direction Button -->
            <div class="swap-direction">
              <el-button circle @click="swapTokens" class="swap-direction-btn" :disabled="isSwapping || isLoadingQuote">
                <el-icon class="swap-icon" :style="{ transform: `rotate(${swapIconRotation}deg)` }">
                  <Sort />
                </el-icon>
              </el-button>
            </div>

            <div class="token-input-container">
              <div class="token-input-header">
                <span class="input-label">{{ $t('swap.buy') }}</span>
              </div>
              <div class="input-section">
                <div class="input-group">
                  <div class="amount-input">
                    <div class="input-with-select">
                      <FormattedInput v-model="toAmount"
                        :placeholder="formatNumberK(toTokenBalance) + '  ' + $t('available')" size="large" :decimals="6"
                        :use-abbreviation="true" :max-decimals="toToken?.decimals"
                        :disabled="isSwapping || isLoadingQuote" @input-change="handleToAmountChange">
                        <TokenSelect v-model="toToken" :tokens="availableTokens" placeholder="Select token"
                          :disabled="isSwapping" @token-change="toTokenChange" />
                      </FormattedInput>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Swap Preview -->
          <div class="swap-details">
            <h4 class="details-title">{{ $t('swap.details') }}</h4>
            <div class="details-content">
              <!-- Uniswap V4 Status -->
              <div class="detail-row" v-if="walletStore.isConnected">
                <span>{{ $t('swap.protocolStatus') }}</span>
                <span class="status-indicator">
                  <span v-if="isV4Supported" class="status-supported">{{
                    $t('swap.uniswapV4Available')
                    }}</span>
                  <span v-else class="status-unsupported">
                    {{ $t('swap.v4NotSupported') }}
                    <el-tooltip :content="$t('swap.switchToSupportedNetwork')" placement="top">
                      <el-icon class="info-icon">
                        <InfoFilled />
                      </el-icon>
                    </el-tooltip>
                  </span>
                </span>
              </div>

              <!-- Pool Status -->
              <div class="detail-row"
                v-if="isV4Supported && fromToken && toToken && fromToken.symbol !== toToken.symbol">
                <span>{{ $t('swap.poolStatus') }}</span>
                <span class="status-indicator">
                  <span v-if="poolExists" class="status-supported">{{ $t('swap.poolAvailable')
                    }}</span>
                  <span v-else class="status-warning">
                    {{ $t('swap.poolNotExists') }}
                    <el-tooltip :content="$t('swap.poolNotExistsTooltip')" placement="top">
                      <el-icon class="info-icon">
                        <InfoFilled />
                      </el-icon>
                    </el-tooltip>
                  </span>
                </span>
              </div>

              <div class="detail-row exchange-rate">
                <span>{{ $t('swap.rate') }}</span>
                <span v-if="exchangeRate > 0 && fromToken && toToken" class="detail-value rate-value">1 {{
                  fromToken.symbol }} ≈ {{
                    formatNumber(exchangeRate, 6) }} {{ toToken.symbol }}</span>
                <span v-else class="detail-value no-rate-text">{{ $t('swap.enterAmountForRate')
                  }}</span>
              </div>
            </div>
          </div>

          <!-- Action Button -->
          <div class="action-container">
            <el-button class="action-button" type="primary" size="large" :disabled="!canSwap" @click="executeSwap">
              {{ getSwapButtonText() }}
            </el-button>
          </div>
        </div>
      </div>

      <!-- Information Cards -->
      <InfoCards :cards="infoCards" />
    </PullToRefresh>

    <!-- Transaction Modal -->
    <TransactionModal v-model:visible="showTransactionModal" :title="$t('swap.swapTransaction')"
      :steps="transactionSteps" :current-step="currentTransactionStep" :status="transactionStatus"
      :transaction-details="transactionDetails" :gas-info="gasInfo" :transaction-hash="transactionHash"
      :error-message="transactionError" @close="handleTransactionModalClose" @retry="retryTransaction" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import { formatNumber, formatNumberK, calculatePercentageAmount } from '@/utils/format'
import { useI18n } from 'vue-i18n'
import { Sort, InfoFilled, Setting, QuestionFilled, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

import { TOKENS } from '@/constants'
import { uniswapV4Service, type SwapParams, type QuoteResult } from '@/services/uniswapV4'
import TransactionModal from '@/components/common/TransactionModal.vue'
import QuickAmounts from '@/components/common/QuickAmounts.vue'
import PullToRefresh from '@/components/common/PullToRefresh.vue'
import TokenSelect from '@/components/TokenSelect.vue'
import FormattedInput from '@/components/common/FormattedInput.vue'
import InfoCards from '@/components/common/InfoCards.vue'
import { ethers, parseUnits } from 'ethers'
import { usePullToRefresh } from '@/composables/usePullToRefresh'

// Stores and composables
const walletStore = useWalletStore()
const { t } = useI18n()

// Info Cards data
const infoCards = computed(() => [
  {
    icon: InfoFilled,
    title: t('swap.whatIsSwapping'),
    content: t('swap.swappingDescription')
  },
  {
    icon: QuestionFilled,
    title: t('swap.swappingFees'),
    content: t('swap.swappingFeesDescription')
  },
  {
    icon: WarningFilled,
    title: t('swap.swappingRisks'),
    content: t('swap.swappingRisksDescription')
  }
])

// Pull to refresh
const { isRefreshing, pullDistance, isPulling, canRefresh } = usePullToRefresh({
  onRefresh: async (): Promise<void> => {
    try {
      if (walletStore.isConnected) {
        await Promise.all([
          updateTokenBalances(),
          checkUniswapV4Support(),
          checkPoolInfo()
        ])
      }
    } catch (error) {
      console.error('Failed to refresh swap data:', error)
    }
  }
})

// Swap icon rotation state
const swapIconRotation = ref(0)

// Define types
interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  balance?: number;
}

// Available tokens for Uniswap V4
const availableTokens = computed<Token[]>(() => {
  const chainId = walletStore.chainId || 11155111

  return [
    {
      symbol: TOKENS.WRMB.symbol,
      name: TOKENS.WRMB.name,
      address: TOKENS.WRMB.addresses[chainId as keyof typeof TOKENS.WRMB.addresses] || TOKENS.WRMB.addresses[11155111] || '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      decimals: TOKENS.WRMB.decimals
    },
    {
      symbol: TOKENS.USDT.symbol,
      name: TOKENS.USDT.name,
      address: TOKENS.USDT.addresses[chainId as keyof typeof TOKENS.USDT.addresses] || TOKENS.USDT.addresses[11155111] || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      decimals: TOKENS.USDT.decimals
    },
    {
      symbol: TOKENS.USDC.symbol,
      name: TOKENS.USDC.name,
      address: TOKENS.USDC.addresses[chainId as keyof typeof TOKENS.USDC.addresses] || TOKENS.USDC.addresses[11155111] || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      decimals: TOKENS.USDC.decimals
    },
    {
      symbol: TOKENS.CINA.symbol,
      name: TOKENS.CINA.name,
      address: TOKENS.CINA.addresses[chainId as keyof typeof TOKENS.CINA.addresses] || TOKENS.CINA.addresses[11155111] || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      decimals: TOKENS.CINA.decimals
    },
  ]
})

// Token data
const fromToken = ref<Token>()
const toToken = ref<Token>()

// Initialize tokens
watch(availableTokens, (tokens) => {
  if (tokens.length >= 2) {
    if (!fromToken.value || fromToken.value.symbol !== tokens[0].symbol) {
      fromToken.value = tokens[0]
    }
    if (!toToken.value || toToken.value.symbol !== tokens[1].symbol) {
      toToken.value = tokens[1]
    }
  }
}, { immediate: true })

const fromTokenChange = (value: Token, oldValue: Token | undefined) => {
  if (value.symbol === toToken.value?.symbol && oldValue != undefined) {
    toToken.value = oldValue;
    changeFromToAmount();
  }

  // 取消当前请求并重新获取报价
  cancelCurrentQuoteRequest()
  currentQuote.value = null

  // fromToken切换时使用正向计算
  if (fromAmount.value && parseFloat(fromAmount.value) > 0) {
    isForwardSwap.value = true
    debouncedGetQuote()
  }
}

const changeFromToAmount = () => {
  const tempAmount = fromAmount.value
  fromAmount.value = toAmount.value
  toAmount.value = tempAmount
}

const toTokenChange = (value: Token, oldValue: Token | undefined) => {
  if (value.symbol == fromToken.value?.symbol && oldValue != undefined) {
    fromToken.value = oldValue
    changeFromToAmount();
  }

  // 取消当前请求并重新获取报价
  cancelCurrentQuoteRequest()
  currentQuote.value = null

  // toToken切换时使用反向计算
  if (toAmount.value && parseFloat(toAmount.value) > 0) {
    isForwardSwap.value = false
    debouncedGetReverseQuote()
  }
}

watch(() => walletStore.chainId, (newChainId) => {
  if (newChainId) {
    uniswapV4Service.reinitialize()

    const tokens = availableTokens.value
    if (tokens.length >= 2) {
      fromToken.value = tokens[0]
      toToken.value = tokens[1]
    }

    checkUniswapV4Support()
    checkPoolInfo()

    currentQuote.value = null
    fromAmount.value = ''
    toAmount.value = ''
  }
})

// Amounts
const fromAmount = ref('')
const toAmount = ref('')
const fromTokenBalance = ref('0')
const toTokenBalance = ref('0')

// Swap settings
const slippageOptions = [1.0, 5.0]
const slippage = ref(1.0)
const customSlippage = ref('')
const exchangeRate = ref(6.5)
const swapFee = ref(0.3)

// Uniswap V4 state
const isLoadingQuote = ref(false)
const isSwapping = ref(false)
const currentQuote = ref<QuoteResult | null>(null)
const poolExists = ref(false)
const priceImpact = ref('0')
const isV4Supported = ref(false)
// 跟踪交换方向：true表示正向(fromAmount->toAmount)，false表示反向(toAmount->fromAmount)
const isForwardSwap = ref(true)

// 请求管理状态
const currentQuoteController = ref<AbortController | null>(null)
const quoteRequestId = ref(0)
const isUserInputting = ref(false)
const lastQuoteTime = ref(0)


// Transaction Modal state
const showTransactionModal = ref(false)
const currentTransactionStep = ref(0)
const transactionStatus = ref<'pending' | 'loading' | 'success' | 'error'>('pending')
const transactionHash = ref('')
const transactionError = ref('')
const gasInfo = ref<{
  gasLimit: string
  gasPrice: string
  estimatedFee: string
  maxFee: string
} | undefined>(undefined)

// Transaction steps
const transactionSteps = computed(() => [
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
])

// Transaction details
const transactionDetails = computed(() => {
  const details: {
    label: string
    values: string[]
    highlight?: boolean
    type?: 'debit' | 'credit'
  }[] =
    [
      {
        label: t('swap.sell'),
        values: [`-${formatNumber(fromAmount.value, 6)} ${fromToken.value?.symbol || ''}`],
        highlight: true,
        type: 'debit'
      },
      {
        label: t('swap.buy'),
        values: [`+${formatNumber(toAmount.value, 6)} ${toToken.value?.symbol || ''}`],
        highlight: true,
        type: 'credit'
      },
    ]
  return details
})

function updateExchangeRate() {
  if (currentQuote.value && fromAmount.value && parseFloat(fromAmount.value) > 0) {
    const fromAmountNum = parseFloat(fromAmount.value)
    const toAmountNum = parseFloat(currentQuote.value.amountOut)
    exchangeRate.value = toAmountNum / fromAmountNum
  } else if (fromToken.value?.symbol === toToken.value?.symbol) {
    exchangeRate.value = 1
  } else {
    exchangeRate.value = 0
  }
}

const canSwap = computed(() => {
  return walletStore.isConnected &&
    isV4Supported.value &&
    poolExists.value &&
    fromAmount.value &&
    parseFloat(fromAmount.value) > 0 &&
    parseFloat(fromAmount.value) <= parseFloat(fromTokenBalance.value) &&
    !isSwapping.value &&
    !isLoadingQuote.value &&
    !isUserInputting.value &&
    fromToken.value?.symbol !== toToken.value?.symbol
})

// 验证和格式化输入金额，确保不超过token的小数位数
function validateAndFormatAmount(amount: string, decimals: number): string {
  if (!amount) return ''

  // 移除非数字和小数点的字符
  const cleanAmount = amount.replace(/[^0-9.]/g, '')

  // 确保只有一个小数点
  const parts = cleanAmount.split('.')
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('')
  }

  // 限制小数位数
  if (parts.length === 2 && parts[1].length > decimals) {
    return parts[0] + '.' + parts[1].substring(0, decimals)
  }

  return cleanAmount
}

// 防抖函数
function debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

// 取消当前报价请求
function cancelCurrentQuoteRequest() {
  if (currentQuoteController.value) {
    currentQuoteController.value.abort()
    currentQuoteController.value = null
  }
}

// 检查请求是否应该被忽略
function shouldIgnoreQuoteRequest(requestId: number): boolean {
  return requestId !== quoteRequestId.value
}

function handleFromAmountChange() {
  // 标记用户正在输入
  isUserInputting.value = true
  if (fromToken.value) {
    const validatedAmount = validateAndFormatAmount(fromAmount.value, fromToken.value.decimals)
    if (validatedAmount !== fromAmount.value) {
      fromAmount.value = validatedAmount
      return
    }
  }

  // 设置为正向交换
  isForwardSwap.value = true

  if (fromAmount.value && parseFloat(fromAmount.value) > 0) {
    debouncedGetQuote()
  } else {
    cancelCurrentQuoteRequest()
    toAmount.value = ''
    currentQuote.value = null
    updateExchangeRate()
    isUserInputting.value = false
  }
}

function handleToAmountChange() {
  // 标记用户正在输入
  isUserInputting.value = true
  if (toToken.value) {
    const validatedAmount = validateAndFormatAmount(toAmount.value, toToken.value.decimals)
    if (validatedAmount !== toAmount.value) {
      toAmount.value = validatedAmount
      return
    }
  }

  // 设置为反向交换
  isForwardSwap.value = false

  if (toAmount.value && parseFloat(toAmount.value) > 0) {
    debouncedGetReverseQuote()
  } else {
    cancelCurrentQuoteRequest()
    fromAmount.value = ''
    currentQuote.value = null
    updateExchangeRate()
    isUserInputting.value = false
  }
}

// 防抖的报价获取函数
const debouncedGetQuote = debounce(() => {
  if (!isSwapping.value) {
    getUniswapV4Quote()
  }
}, 1000)

const debouncedGetReverseQuote = debounce(() => {
  if (!isSwapping.value) {
    getReverseUniswapV4Quote()
  }
}, 1000)

const setDepositPercentage = (percentage: number) => {
  isForwardSwap.value = true
  if (parseFloat(fromTokenBalance.value) > 0) {
    fromAmount.value = calculatePercentageAmount(fromTokenBalance.value, percentage, fromToken.value?.decimals)
    handleFromAmountChange()
  }
}

function setMaxFromAmount() {
  isForwardSwap.value = true
  if (parseFloat(fromTokenBalance.value) > 0) {
    fromAmount.value = fromTokenBalance.value
    handleFromAmountChange()
  }
}

function handleCustomSlippage() {
  if (customSlippage.value) {
    slippage.value = parseFloat(customSlippage.value)
  }
}

function swapTokens() {
  // 防止在交换过程中或加载报价时切换代币
  if (isSwapping.value || isLoadingQuote.value) {
    return
  }

  // 取消当前的报价请求
  cancelCurrentQuoteRequest()

  const temp = fromToken.value
  fromToken.value = toToken.value
  toToken.value = temp

  const tempAmount = fromAmount.value
  fromAmount.value = toAmount.value
  toAmount.value = tempAmount

  const tempBalance = fromTokenBalance.value
  fromTokenBalance.value = toTokenBalance.value
  toTokenBalance.value = tempBalance

  exchangeRate.value = 1 / exchangeRate.value

  // Rotate icon by 180 degrees each time
  swapIconRotation.value += 180

  // 重新获取报价
  if (fromAmount.value && parseFloat(fromAmount.value) > 0) {
    isForwardSwap.value = true
    debouncedGetQuote()
  }
}

function getSwapButtonText() {
  if (!walletStore.isConnected) {
    return t('common.connected')
  }

  if (isSwapping.value) {
    return t('swap.swapping')
  }

  if (isLoadingQuote.value) {
    return t('swap.fetchingQuote')
  }

  if (!isV4Supported.value) {
    const supportedNetworks = uniswapV4Service.getSupportedNetworks()
    const networkNames = supportedNetworks.map(id => {
      if (id === 1) return t('swap.mainnet')
      if (id === 11155111) return t('swap.sepoliaTestnet')
      return t('swap.network', { id })
    }).join('、')
    return t('swap.unsupportedNetwork', { networks: networkNames })
  }

  // if (!fromAmount.value || parseFloat(fromAmount.value) <= 0) {
  //     return t('swap.enterAmount')
  // }

  // if (parseFloat(fromAmount.value) > parseFloat(fromTokenBalance.value)) {
  //     return t('swap.insufficientBalance')
  // }

  return t('swap.swap')
}

function executeSwap() {
  if (!canSwap.value) return

  resetTransactionState()

  showTransactionModal.value = true
  transactionStatus.value = 'loading'
  currentTransactionStep.value = 0

  if (isV4Supported.value && poolExists.value) {
    executeUniswapV4Swap()
  } else {
    transactionStatus.value = 'error'
    transactionError.value = t('swap.networkNotSupportedError')
  }
}

async function getUniswapV4Quote() {
  if (!fromAmount.value || !fromToken.value || !toToken.value || fromToken.value.symbol === toToken.value.symbol) {
    currentQuote.value = null
    toAmount.value = ''
    return
  }

  if (!isV4Supported.value) {
    return
  }

  // 取消之前的请求
  cancelCurrentQuoteRequest()

  // 生成新的请求ID
  const requestId = ++quoteRequestId.value

  // 创建新的AbortController
  currentQuoteController.value = new AbortController()
  const controller = currentQuoteController.value

  isLoadingQuote.value = true
  lastQuoteTime.value = Date.now()

  try {
    const swapParams: SwapParams = {
      tokenIn: fromToken.value!.address,
      tokenOut: toToken.value!.address,
      amountIn: fromAmount.value,
      swapType: 'exactInput',
      slippage: slippage.value
    }

    const quote = await uniswapV4Service.getQuote(swapParams)

    // 检查请求是否已被取消或过期
    if (controller.signal.aborted || shouldIgnoreQuoteRequest(requestId)) {
      return
    }

    if (quote) {
      currentQuote.value = quote
      toAmount.value = quote.amountOut
      priceImpact.value = quote.priceImpact
      swapFee.value = parseFloat(quote.fee)
      poolExists.value = true
      updateExchangeRate()
    } else {
      currentQuote.value = null
      toAmount.value = ''
      poolExists.value = false
      updateExchangeRate()
    }
  } catch (error) {
    // 如果是取消错误，不显示错误消息
    if (controller.signal.aborted || shouldIgnoreQuoteRequest(requestId)) {
      return
    }

    currentQuote.value = null
    toAmount.value = ''
    poolExists.value = false
    updateExchangeRate()

    ElMessage.error(t('swap.getQuoteFailed', { error: (error as Error).message }))
  } finally {
    // 只有当前请求才更新加载状态
    if (!shouldIgnoreQuoteRequest(requestId)) {
      isLoadingQuote.value = false
      isUserInputting.value = false
    }

    // 清理controller
    if (currentQuoteController.value === controller) {
      currentQuoteController.value = null
    }
  }
}

async function getReverseUniswapV4Quote() {
  if (!toAmount.value || !fromToken.value || !toToken.value || fromToken.value.symbol === toToken.value.symbol) {
    currentQuote.value = null
    fromAmount.value = ''
    return
  }

  if (!isV4Supported.value) {
    return
  }

  // 取消之前的请求
  cancelCurrentQuoteRequest()

  // 生成新的请求ID
  const requestId = ++quoteRequestId.value

  // 创建新的AbortController
  currentQuoteController.value = new AbortController()
  const controller = currentQuoteController.value

  isLoadingQuote.value = true
  lastQuoteTime.value = Date.now()

  try {
    // 反向报价：使用exactOutput模式，指定期望的输出数量
    const swapParams: SwapParams = {
      tokenIn: fromToken.value!.address,
      tokenOut: toToken.value!.address,
      amountOut: toAmount.value,
      swapType: 'exactOutput',
      slippage: slippage.value
    }

    const quote = await uniswapV4Service.getQuote(swapParams)

    // 检查请求是否已被取消或过期
    if (controller.signal.aborted || shouldIgnoreQuoteRequest(requestId)) {
      return
    }

    if (quote) {
      // 反向报价的结果：quote.amountIn是需要的输入数量，quote.amountOut是期望的输出数量
      fromAmount.value = quote.amountIn!
      currentQuote.value = quote
      priceImpact.value = quote.priceImpact
      swapFee.value = parseFloat(quote.fee)
      poolExists.value = true
      updateExchangeRate()
    } else {
      currentQuote.value = null
      fromAmount.value = ''
      poolExists.value = false
      updateExchangeRate()
    }
  } catch (error) {
    // 如果是取消错误，不显示错误消息
    if (controller.signal.aborted || shouldIgnoreQuoteRequest(requestId)) {
      return
    }

    currentQuote.value = null
    fromAmount.value = ''
    poolExists.value = false
    updateExchangeRate()

    ElMessage.error(t('swap.getReverseQuoteFailed', { error: (error as Error).message }))
  } finally {
    // 只有当前请求才更新加载状态
    if (!shouldIgnoreQuoteRequest(requestId)) {
      isLoadingQuote.value = false
      isUserInputting.value = false
    }

    // 清理controller
    if (currentQuoteController.value === controller) {
      currentQuoteController.value = null
    }
  }
}

async function executeUniswapV4Swap() {
  if (!currentQuote.value || isSwapping.value) return

  // 取消所有正在进行的报价请求
  cancelCurrentQuoteRequest()

  // 设置交易状态，防止其他操作干扰
  isSwapping.value = true
  isUserInputting.value = false

  try {
    // 交换方向始终是从fromToken到toToken
    // 区别在于：正向交换指定输入数量，反向交换指定输出数量
    const swapParams: SwapParams = {
      tokenIn: fromToken.value!.address,
      tokenOut: toToken.value!.address,
      amountIn: isForwardSwap.value ? fromAmount.value : (currentQuote.value.amountIn || fromAmount.value),
      amountOut: isForwardSwap.value ? undefined : toAmount.value,
      swapType: isForwardSwap.value ? 'exactInput' : 'exactOutput',
      slippage: slippage.value
    }

    if (!uniswapV4Service.isNetworkSupported(walletStore.chainId)) {
      transactionStatus.value = 'error'
      transactionError.value = t('swap.networkNotSupportedV4')
      return
    }

    await uniswapV4Service.reinitialize()

    const userAddress = walletStore.address
    if (!userAddress) {
      transactionStatus.value = 'error'
      transactionError.value = t('swap.connectWalletFirst')
      return
    }

    const quote = await uniswapV4Service.getQuote(swapParams)
    if (!quote) {
      transactionStatus.value = 'error'
      transactionError.value = t('swap.cannotGetQuoteError')
      return
    }

    currentTransactionStep.value = 0
    transactionStatus.value = 'loading'

    const addresses = uniswapV4Service.getContractAddresses(walletStore.chainId)
    const PERMIT2_ADDRESS = addresses.PERMIT2

    const permit2Allowance = await uniswapV4Service.checkAllowance(
      swapParams.tokenIn,
      PERMIT2_ADDRESS,
      userAddress
    )

    const tokenInContract = uniswapV4Service.getTokenContract(swapParams.tokenIn, true)
    const tokenInDecimals = await tokenInContract.decimals()
    const amountInFrom = parseUnits(fromAmount.value, tokenInDecimals)

    const slippageMultiplierOut = BigInt(Math.floor((100 + swapParams.slippage) * 100))
    const maxAmountInBigInt = amountInFrom * slippageMultiplierOut / BigInt(10000)
    const amountIn = isForwardSwap.value ? amountInFrom : maxAmountInBigInt

    if (BigInt(permit2Allowance) < BigInt(amountIn)) {
      currentTransactionStep.value = 1
      transactionStatus.value = 'pending'

      const approveSuccess = await uniswapV4Service.approveToken(
        swapParams.tokenIn,
        PERMIT2_ADDRESS,
        ethers.MaxUint256.toString()
      )

      if (!approveSuccess) {
        transactionStatus.value = 'error'
        transactionError.value = t('swap.permit2AuthFailed')
        return
      }
    }

    currentTransactionStep.value = 1
    transactionStatus.value = 'pending'

    const permit2Contract = new ethers.Contract(
      PERMIT2_ADDRESS,
      [
        'function allowance(address owner, address token, address spender) external view returns (uint160 amount, uint48 expiration, uint48 nonce)'
      ],
      uniswapV4Service.provider
    )

    const permit2AllowanceData = await permit2Contract.allowance(
      userAddress,
      swapParams.tokenIn,
      addresses.UNIVERSAL_ROUTER
    )

    if (BigInt(permit2AllowanceData.amount) < BigInt(amountIn) || permit2AllowanceData.expiration < Math.floor(Date.now() / 1000)) {
      currentTransactionStep.value = 1
      transactionStatus.value = 'pending'

      const deadline = Math.floor(Date.now() / 1000) + (30 * 24 * 3600)
      const permit2ContractWithSigner = new ethers.Contract(
        PERMIT2_ADDRESS,
        [
          'function approve(address token, address spender, uint160 amount, uint48 expiration) external'
        ],
        uniswapV4Service.signer
      )

      const permit2ApproveTx = await permit2ContractWithSigner.approve(
        swapParams.tokenIn,
        addresses.UNIVERSAL_ROUTER,
        "1461501637330902918203684832716283019655932542975",
        deadline
      )
      await permit2ApproveTx.wait()
    }

    currentTransactionStep.value = 2
    transactionStatus.value = 'loading'


    const tokenOutContract = uniswapV4Service.getTokenContract(swapParams.tokenOut)
    const tokenOutDecimals = await tokenOutContract.decimals()
    const slippageMultiplier = BigInt(Math.floor((100 - swapParams.slippage) * 100))
    const amountOutBigInt = parseUnits(quote.amountOut, tokenOutDecimals)
    const minAmountOut = amountOutBigInt * slippageMultiplier / BigInt(10000)
    const amountOutTo = parseUnits(toAmount.value, tokenOutDecimals)

    const poolKey = {
      currency0: swapParams.tokenIn < swapParams.tokenOut ? swapParams.tokenIn : swapParams.tokenOut,
      currency1: swapParams.tokenIn < swapParams.tokenOut ? swapParams.tokenOut : swapParams.tokenIn,
      fee: 500,
      tickSpacing: 10,
      hooks: ethers.ZeroAddress
    }

    if (swapParams.tokenIn == '0xAD87E2353a23fefC6156aA9FC1d1C4258e00E193' || swapParams.tokenOut == '0xAD87E2353a23fefC6156aA9FC1d1C4258e00E193') {
      poolKey.fee = 3000;
      poolKey.tickSpacing = 60;
    }

    const zeroForOne = poolKey.currency0 === swapParams.tokenIn
    const deadline = Math.floor(Date.now() / 1000) + 3600

    const Actions = {
      SWAP_EXACT_IN_SINGLE: 0x06,
      SWAP_EXACT_OUT_SINGLE: 0x08,
      SETTLE_ALL: 0x0c,
      TAKE_ALL: 0x0f
    }

    const CommandType = {
      V4_SWAP: 0x10
    }

    const POOL_KEY_STRUCT = '(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks)'
    const SWAP_EXACT_IN_SINGLE_STRUCT = '(' + POOL_KEY_STRUCT + ' poolKey,bool zeroForOne,uint128 amountIn,uint128 amountOutMinimum,bytes hookData)'
    const SWAP_EXACT_OUT_SINGLE_STRUCT = '(' + POOL_KEY_STRUCT + ' poolKey,bool zeroForOne,uint128 amountOut,uint128 amountInMaximum,bytes hookData)'

    let v4Actions = '0x'
    const v4Params: string[] = []


    if (isForwardSwap.value) {
      const swapParamsForTx = {
        poolKey: poolKey,
        zeroForOne: zeroForOne,
        amountIn: amountIn,
        amountOutMinimum: minAmountOut,
        hookData: '0x'
      }
      const swapEncodedParam = ethers.AbiCoder.defaultAbiCoder().encode(
        [SWAP_EXACT_IN_SINGLE_STRUCT],
        [swapParamsForTx]
      )
      v4Params.push(swapEncodedParam)
      v4Actions = v4Actions + Actions.SWAP_EXACT_IN_SINGLE.toString(16).padStart(2, '0')

      const settleEncodedParam = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256'],
        [swapParams.tokenIn, amountIn]
      )
      v4Params.push(settleEncodedParam)
      v4Actions = v4Actions + Actions.SETTLE_ALL.toString(16).padStart(2, '0')

      const takeEncodedParam = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256'],
        [swapParams.tokenOut, minAmountOut]
      )
      v4Params.push(takeEncodedParam)
      v4Actions = v4Actions + Actions.TAKE_ALL.toString(16).padStart(2, '0')
    } else {
      const swapParamsForTxOut = {
        poolKey: poolKey,
        zeroForOne: zeroForOne,
        amountOut: amountOutTo,
        amountInMaximum: maxAmountInBigInt,
        hookData: '0x'
      }
      const swapEncodedParam = ethers.AbiCoder.defaultAbiCoder().encode(
        [SWAP_EXACT_OUT_SINGLE_STRUCT],
        [swapParamsForTxOut]
      )
      v4Params.push(swapEncodedParam)
      v4Actions = v4Actions + Actions.SWAP_EXACT_OUT_SINGLE.toString(16).padStart(2, '0')

      const settleEncodedParam = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256'],
        [swapParams.tokenIn, maxAmountInBigInt]
      )
      v4Params.push(settleEncodedParam)
      v4Actions = v4Actions + Actions.SETTLE_ALL.toString(16).padStart(2, '0')

      const takeEncodedParam = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256'],
        [swapParams.tokenOut, amountOutTo]
      )
      v4Params.push(takeEncodedParam)
      v4Actions = v4Actions + Actions.TAKE_ALL.toString(16).padStart(2, '0')
    }

    const encodedV4Actions = ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes', 'bytes[]'],
      [v4Actions, v4Params]
    )

    let commands = '0x'
    const inputs: string[] = []

    inputs.push(encodedV4Actions)
    commands = commands + CommandType.V4_SWAP.toString(16).padStart(2, '0')

    const txOptions: any = {
      value: swapParams.tokenIn === ethers.ZeroAddress ? amountIn : 0
    }
    const swapRouterContract = uniswapV4Service.swapRouterContract

    const tx = await swapRouterContract!.execute(
      commands,
      inputs,
      deadline,
      txOptions
    )

    currentTransactionStep.value = 3
    transactionStatus.value = 'loading'

    const receipt = await tx.wait()
    currentTransactionStep.value = 4
    transactionStatus.value = 'success'
    transactionHash.value = receipt.hash
    setTimeout(() => {
      fromAmount.value = ''
      toAmount.value = ''
      currentQuote.value = null
      priceImpact.value = '0'
      swapFee.value = 0.3
    }, 2000)

    await updateTokenBalances()

    await checkPoolInfo()
  } catch (error) {
    const errorMessage = (error as Error).message

    transactionStatus.value = 'error'

    if (errorMessage.includes('insufficient funds')) {
      transactionError.value = t('swap.insufficientFundsError')
    } else if (errorMessage.includes('allowance')) {
      transactionError.value = t('swap.allowanceError')
    } else if (errorMessage.includes('slippage')) {
      transactionError.value = t('swap.slippageError')
    } else if (errorMessage.includes('pool')) {
      transactionError.value = t('swap.poolError')
    } else {
      transactionError.value = t('swap.swapFailedError', { error: errorMessage })
    }
  } finally {
    isSwapping.value = false
  }
}

async function checkUniswapV4Support() {
  if (!walletStore.isConnected || !walletStore.chainId) {
    isV4Supported.value = false
    return
  }

  isV4Supported.value = uniswapV4Service.isNetworkSupported(walletStore.chainId)
}

async function checkPoolInfo() {
  if (!fromToken.value || !toToken.value || fromToken.value.symbol === toToken.value.symbol) {
    poolExists.value = false
    return
  }

  if (!walletStore.isConnected || !walletStore.chainId) {
    poolExists.value = false
    return
  }

  if (!isV4Supported.value) {
    poolExists.value = false
    return
  }

  try {
    const poolInfo = await uniswapV4Service.getPoolInfo(
      fromToken.value.address,
      toToken.value.address,
      500
    )

    poolExists.value = poolInfo !== null
  } catch (error) {
    poolExists.value = false
  }
}

watch([fromToken, toToken], async () => {
  if (walletStore.isConnected) {
    currentQuote.value = null
    updateExchangeRate()
    await updateTokenBalances()
    await checkPoolInfo()
  }
})

watch(() => walletStore.isConnected, async (connected) => {
  if (connected) {
    await uniswapV4Service.reinitialize()
    await checkUniswapV4Support()
    await updateTokenBalances()
    await checkPoolInfo()
  } else {
    isV4Supported.value = false
    poolExists.value = false
    currentQuote.value = null
  }
})

watch(() => walletStore.chainId, async (newChainId) => {
  if (newChainId && walletStore.isConnected) {
    await uniswapV4Service.reinitialize()
    await checkUniswapV4Support()
    availableTokens.value.forEach(token => {
      if (token.symbol === 'WRMB') {
        token.address = TOKENS.WRMB.addresses[newChainId as keyof typeof TOKENS.WRMB.addresses] || token.address
      } else if (token.symbol === 'USDC') {
        token.address = TOKENS.USDC.addresses[newChainId as keyof typeof TOKENS.USDC.addresses] || token.address
      }
    })
    await checkPoolInfo()
  }
})

async function updateTokenBalances() {
  if (!walletStore.isConnected || !walletStore.address) {
    fromTokenBalance.value = '0'
    toTokenBalance.value = '0'
    return
  }

  try {
    const [fromBalance, toBalance] = await Promise.all([
      uniswapV4Service.getTokenBalance(fromToken.value!.address, walletStore.address),
      uniswapV4Service.getTokenBalance(toToken.value!.address, walletStore.address)
    ])

    fromTokenBalance.value = fromBalance
    toTokenBalance.value = toBalance
  } catch (error) {
    fromTokenBalance.value = '1000'
    toTokenBalance.value = '500'
  }
}

function resetTransactionState() {
  currentTransactionStep.value = 0
  transactionStatus.value = 'pending'
  transactionHash.value = ''
  transactionError.value = ''
  gasInfo.value = undefined
}

function handleTransactionModalClose() {
  showTransactionModal.value = false
  resetTransactionState()
}

function retryTransaction() {
  resetTransactionState()
  executeSwap()
}

onMounted(async () => {
  await checkUniswapV4Support()
  await updateTokenBalances()
  updateExchangeRate()
  await checkPoolInfo()
})

// 组件卸载时清理资源
onUnmounted(() => {
  // 取消所有正在进行的请求
  cancelCurrentQuoteRequest()

  // 重置状态
  isSwapping.value = false
  isLoadingQuote.value = false
  isUserInputting.value = false
})
</script>

<style scoped>
.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 24px;
}

.swap-interface {
  margin-bottom: 2rem;
}

.interface-card {
  background-color: var(--card-bg);
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: all 0.2s ease-in-out;
  position: relative;
}

.settings-icon {
  position: absolute;
  top: 1rem;
  right: 1rem;
  cursor: pointer;
}

.settings-btn {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--text-secondary);
  transition: color 0.2s ease-in-out;
}

.settings-btn:hover {
  color: var(--text-primary);
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.settings-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
}

.token-selection {
  display: flex;
  flex-direction: column;
}

.token-input-container {
  width: 100%;
}

.token-input-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.input-label {
  margin-left: 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.amount-input {
  flex: 1;
}

.token-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
}

.quick-amounts {
  display: flex;
  gap: 0.5rem;
}

.max-button {
  color: var(--primary-color);
  cursor: pointer;
  transition: color 0.2s ease-in-out;
}

.max-button:hover {
  color: var(--accent-color);
}

.input-with-select {
  display: flex;
  width: 100%;
}

.input-with-select .el-input {
  flex: 1;
}

.token-select {
  margin-left: 0.5rem;
  width: 8rem;
}

.swap-direction {
  display: flex;
  justify-content: center;
}

.swap-direction-btn {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  transition: background-color 0.2s ease-in-out;
}

.swap-direction-btn:hover {
  background-color: var(--bg-secondary);
}

.swap-icon {
  color: var(--primary-color);
  transition: transform 0.2s ease-in-out;
}

.swap-details {
  border-radius: 0.5rem;
  padding: 1rem;
  margin-top: 1.5rem;
  background-color: var(--bg-secondary);
}

.details-title {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}

.details-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
}

.detail-row span:first-child:not(.status-supported):not(.status-unsupported):not(.status-warning):not(.network-mainnet) {
  color: var(--text-secondary);
}

.detail-row.exchange-rate {
  padding-top: 0.5rem;
  margin-top: 0.5rem;
  border-top: 1px solid var(--border-color);
}

.detail-value {
  font-weight: 500;
  color: var(--text-primary);
}

.fee-value {
  font-weight: 500;
  color: var(--warning-color);
}

.rate-value {
  font-weight: 600;
  color: var(--primary-color);
}

.no-rate-text {
  color: var(--text-secondary);
}

/* Status indicators */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.status-supported {
  font-weight: 500;
  color: var(--success-color);
}

.status-unsupported {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--error-color);
}

.status-warning {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--warning-color);
}

.network-mainnet {
  font-weight: 500;
  color: var(--success-color);
}

.network-testnet {
  font-weight: 500;
  color: var(--warning-color);
}

.network-unknown {
  font-weight: 500;
  color: var(--error-color);
}

.info-icon {
  width: 1rem;
  height: 1rem;
  cursor: help;
}

.loading-text {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  color: var(--primary-color);
}

/* Price impact colors */
.price-impact-low {
  color: var(--success-color);
}

.price-impact-medium {
  color: var(--warning-color);
}

.price-impact-high {
  font-weight: 600;
  color: var(--error-color);
}

.slippage-selector {
  display: flex;
  gap: 0.5rem;
}

.slippage-selector button {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 0.75rem;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  transition: all 0.2s ease-in-out;
}

.detail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.slippage-selector button.active {
  color: var(--primary-color);
  background-color: var(--bg-secondary);
  border-color: var(--primary-color);
}

.custom-slippage {
  display: flex;
  align-items: center;
  border-radius: 0.25rem;
  padding: 0 0.5rem;
  background-color: var(--bg-secondary);
}

.custom-slippage input {
  width: 3.5rem;
  background: transparent;
  border: none;
  padding: 0.25rem 0;
  font-size: 0.75rem;
  outline: none;
  color: var(--text-primary);
}

.action-container {
  margin-top: 1.5rem;
}

.action-button {
  width: 100%;
}

.swap-button:hover {
  background-color: var(--accent-color);
}

.swap-button:disabled {
  cursor: not-allowed;
  background-color: var(--text-secondary);
}

/* Liquidity Pools Section */
.liquidity-section {
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  padding: 1.5rem;
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
}

.pools-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .pools-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .pools-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.pool-card {
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  background-color: var(--bg-primary);
}

.pool-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.pool-tokens {
  display: flex;
  align-items: center;
}

.token-icon-overlap {
  margin-left: -0.5rem;
}

.pool-fee {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.pool-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.stat-value {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-primary);
}

.pool-actions {
  display: flex;
  gap: 0.75rem;
}

.action-btn {
  flex: 1;
  padding: 0.75rem 0;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  text-align: center;
  color: white;
  border: none;
  background-color: var(--primary-color);
  transition: background-color 0.2s ease-in-out;
}

.action-btn:hover {
  background-color: var(--accent-color);
}

.action-btn.outline {
  background: transparent;
  border: 1px solid var(--primary-color);
  color: var(--primary-color);
}

.action-btn.outline:hover {
  background-color: var(--primary-color);
  color: white;
}

/* Uniswap V4 specific styles */
.v4-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  background-color: var(--accent-color);
  color: var(--text-primary);
}

.pool-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pool-status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
}

.pool-status-dot.active {
  background-color: var(--success-color);
}

.pool-status-dot.inactive {
  background-color: var(--error-color);
}

.pool-status-dot.warning {
  background-color: var(--warning-color);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .status-indicator {
    font-size: 0.875rem;
  }

  .detail-item {
    font-size: 0.875rem;
  }

  .pools-grid {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }

  .pool-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Animation keyframes */
@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

:deep(.el-tabs__header) {
  margin-bottom: 0;
}

:deep(.el-tabs__nav-wrap::after) {
  background-color: var(--border-color);
}

:deep(.el-tabs__active-bar) {
  background-color: var(--primary-color);
}

:deep(.el-tabs__item) {
  color: var(--text-secondary);
}

:deep(.el-tabs__item.is-active) {
  color: var(--primary-color);
}
</style>