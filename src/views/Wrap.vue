<template>
  <div class="h-full">
    <PullToRefresh :is-pulling="isPulling" :is-refreshing="isRefreshing" :pull-distance="pullDistance"
      :can-refresh="canRefresh">
      <!-- Balance Overview -->
      <div class="balance-overview">
        <h2 class="section-title">
          {{ $t('wrap.title') }}
        </h2>
      </div>

      <!-- Wrap Interface -->
      <div class="wrap-interface">
        <div class="interface-card">
          <!-- Mode Toggle -->
          <div class="mode-toggle">
            <el-segmented v-model="mode" :options="modeOptions" size="large" @change="handleModeChange" />
          </div>

          <!-- Wrap Form -->
          <div v-if="mode === 'wrap'" class="wrap-form">
            <div class="form-section">
              <div class="token-input">
                <div class="input-header">
                  <span class="input-label">{{ $t('wrap.from') }}</span>
                  <span class="balance-info">
                    {{ $t('wrap.balance') }}: {{ formatNumberK(sRMBBalance) }} {{ selectedTokenSymbol }}
                  </span>
                </div>

                <div class="input-section">
                  <div class="input-group">
                    <FormattedInput v-model="wrapAmount"
                      :placeholder="formatNumberK(sRMBBalance) + '  ' + $t('available')" size="large"
                      class="amount-input" :decimals="6" :use-abbreviation="true" :max-decimals="6"
                      @input-change="handleWrapAmountChange">
                      <SRMBTokenSelector v-model="selectedSRMBToken" :disabled="wrapInProgress"
                        :show-inactive-tokens="false" @token-change="handleTokenChange" />
                    </FormattedInput>
                  </div>

                  <!-- Validation Error Message -->
                  <div v-if="wrapValidationError" class="validation-error">
                    <el-icon class="error-icon">
                      <WarningFilled />
                    </el-icon>
                    <span class="error-text">{{ wrapValidationError }}</span>
                  </div>

                  <!-- Quick Amount Buttons -->
                  <QuickAmounts :max-label="$t('common.max')" @select-percentage="setWrapPercentage"
                    @select-max="setMaxWrapAmount" />
                </div>
              </div>

              <!-- Swap Arrow -->
              <div class="swap-arrow">
                <el-button circle @click="switchMode" class="swap-button">
                  <el-icon class="swap-icon">
                    <Switch />
                  </el-icon>
                </el-button>
              </div>

              <div class="token-input">
                <div class="input-header">
                  <span class="input-label">{{ $t('wrap.to') }}</span>
                  <span class="balance-info">
                    {{ $t('wrap.balance') }}: {{ formatNumberK(sWRMBBalance) }} sWRMB
                  </span>
                </div>

                <div class="input-group">
                  <FormattedInput :model-value="wrapPreview?.outputAmount || '0'"
                    :placeholder="$t('wrap.estimatedAmount')" size="large" class="amount-input" readonly :decimals="6"
                    :use-abbreviation="true" :max-decimals="18">
                    <div class="token-symbol-selected">
                      <TokenIcon symbol="sWRMB" size="medium" />
                      <span class="token-symbol-text">sWRMB</span>
                    </div>
                  </FormattedInput>
                </div>
              </div>
            </div>

            <!-- Preview -->
            <div v-if="wrapPreview" class="preview-section">
              <h4 class="preview-title">{{ $t('wrap.preview') }}</h4>
              <div class="preview-details">
                <div class="preview-row">
                  <span>{{ $t('wrap.fee') }} ({{ formatNumber(wrapPreview.feePercentage) }}%)</span>
                  <span class="fee-value">{{ formatNumber(wrapPreview.fee) }} {{ selectedTokenSymbol }}</span>
                </div>
                <div class="preview-row exchange-rate">
                  <span>{{ $t('wrap.rate') }}</span>
                  <span class="preview-value">1 {{ selectedTokenSymbol }} ≈ {{ formatNumber(wrapPreview.exchangeRate, 6)
                  }}
                    sWRMB</span>
                </div>
              </div>
            </div>

            <!-- 等待时间提示 -->
            <div v-if="wrapWaitTime > 0" class="countdown-notice">
              <el-icon class="countdown-icon">
                <Clock />
              </el-icon>
              <span class="countdown-text">
                {{ $t('wrap.availableAt') }}: {{ getExecutableTime(wrapWaitTime) }}
              </span>
            </div>

            <el-button type="primary" size="large" :loading="wrapInProgress"
              :disabled="!isWrapValid || !walletStore.isConnected || !canWrap" @click="handleWrap"
              class="action-button">
              <template v-if="!walletStore.isConnected">
                {{ $t('wallet.connectWallet') }}
              </template>
              <template v-else-if="!canWrap">
                {{ $t('wrap.waitingForCooldown') }}
              </template>
              <template v-else>
                {{ $t('wrap.wrapTokens') }}
              </template>
            </el-button>
          </div>

          <!-- Unwrap Form -->
          <div v-else class="unwrap-form">
            <div class="form-section">
              <div class="token-input">
                <div class="input-header">
                  <span class="input-label">{{ $t('wrap.desiredAmount') }}</span>
                  <span class="balance-info">
                    {{ $t('wrap.balance') }}: {{ formatNumberK(userUnwrappableAmount) }} {{ selectedUnwrapTokenSymbol }}
                  </span>
                </div>

                <div class="input-section">
                  <div class="input-group">
                    <FormattedInput v-model="unwrapAmount"
                      :placeholder="formatNumberK(userMaxUnwrappableAmount) + '  ' + $t('available')" size="large"
                      class="amount-input" :decimals="6" :use-abbreviation="true" :max-decimals="6"
                      @input-change="handleUnwrapAmountChange">
                      <SRMBTokenSelector v-model="selectedUnwrapSRMBToken" :disabled="unwrapInProgress"
                        :show-inactive-tokens="false" @token-change="handleUnwrapTokenChange" />
                    </FormattedInput>
                  </div>

                  <!-- Validation Error Message -->
                  <div v-if="unwrapValidationError" class="validation-error">
                    <el-icon class="error-icon">
                      <WarningFilled />
                    </el-icon>
                    <span class="error-text">{{ unwrapValidationError }}</span>
                  </div>

                  <!-- Quick Amount Buttons -->
                  <QuickAmounts :max-label="$t('common.max')" @select-percentage="setUnwrapPercentage"
                    @select-max="setMaxUnwrapAmount" />
                </div>
              </div>

              <!-- Swap Arrow -->
              <div class="swap-arrow">
                <el-button circle @click="switchMode" class="swap-button">
                  <el-icon class="swap-icon">
                    <Switch />
                  </el-icon>
                </el-button>
              </div>

              <div class="token-input">
                <div class="input-header">
                  <span class="input-label">{{ $t('wrap.requiredBurn') }}</span>
                  <span class="balance-info">
                    {{ $t('wrap.balance') }}: {{ formatNumberK(sWRMBBalance) }} sWRMB
                  </span>
                </div>

                <div class="input-group">
                  <FormattedInput :model-value="unwrapPreview?.sWRMBBurned || '0'"
                    :placeholder="$t('wrap.estimatedBurn')" size="large" class="amount-input" readonly :decimals="6"
                    :use-abbreviation="true" :max-decimals="18">
                    <div class="token-symbol-selected">
                      <TokenIcon symbol="sWRMB" size="medium" />
                      <span class="token-symbol-text">sWRMB</span>
                    </div>
                  </FormattedInput>
                </div>
              </div>
            </div>

            <!-- Preview -->
            <div v-if="unwrapPreview && !unwrapValidationError && !unwrapSWRMBBalanceError" class="preview-section">
              <h4 class="preview-title">{{ $t('wrap.preview') }}</h4>
              <div class="preview-details">
                <div class="preview-row">
                  <span>{{ $t('savings.youWillReceive') }}</span>
                  <span class="preview-value">{{ formatNumber(unwrapAmount) }} {{ selectedUnwrapTokenSymbol }}</span>
                </div>
                <div class="preview-row">
                  <span>{{ $t('wrap.fee') }} ({{ formatNumber(unwrapPreview.feePercentage) }}%)</span>
                  <span class="fee-value">{{ formatNumber(unwrapPreview.fee) }} {{ selectedUnwrapTokenSymbol }}</span>
                </div>
                <div class="preview-row exchange-rate">
                  <span>{{ $t('wrap.rate') }}</span>
                  <span class="preview-value">1 sWRMB ≈ {{ formatNumber(unwrapPreview.exchangeRate, 6) }}
                    {{ selectedUnwrapTokenSymbol }}</span>
                </div>
              </div>
            </div>

            <!-- 等待时间提示 -->
            <div v-if="unwrapWaitTime > 0" class="countdown-notice">
              <el-icon class="countdown-icon">
                <Clock />
              </el-icon>
              <span class="countdown-text">
                {{ $t('wrap.availableAt') }}: {{ getExecutableTime(unwrapWaitTime) }}
              </span>
            </div>

            <el-button type="primary" size="large" :loading="unwrapInProgress"
              :disabled="!isUnwrapValid || !walletStore.isConnected || !canUnwrap" @click="handleUnwrap"
              class="action-button">
              <template v-if="!walletStore.isConnected">
                {{ $t('wallet.connectWallet') }}
              </template>
              <template v-else-if="unwrapSWRMBBalanceError">
                {{ unwrapSWRMBBalanceError }}
              </template>
              <template v-else-if="!canUnwrap">
                {{ $t('wrap.waitingForCooldown') }}
              </template>
              <template v-else>
                {{ $t('wrap.unwrapTokens') }}
              </template>
            </el-button>
          </div>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-card">
          <div class="info-header">
            <el-icon class="info-icon">
              <Share />
            </el-icon>
            <h3 class="info-title">{{ $t('wrapInfo.howToCreateSRMB') }}</h3>
          </div>
          <div class="info-content">
            <p>{{ $t('wrapInfo.createSRMBDescription') }}</p>
            <el-link type="warning" href="https://cina-fund.dev.isecsp.cn" class="platform-link">
              {{ $t('wrapInfo.visitPlatform') }}
            </el-link>
            <div class="platform-features">
              <p><strong>{{ $t('wrapInfo.platformFeatures') }}</strong></p>
              <ul>
                <li>{{ $t('wrapInfo.deployTokens') }}</li>
                <li>{{ $t('wrapInfo.manageNAV') }}</li>
                <li>{{ $t('wrapInfo.mintTokens') }}</li>
                <li>{{ $t('wrapInfo.whitelistUsers') }}</li>
                <li>{{ $t('wrapInfo.pauseContracts') }}</li>
                <li>{{ $t('wrapInfo.transferOwnership') }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Information Cards -->
      <InfoCards :cards="infoCards" />
    </PullToRefresh>

    <!-- Transaction Modal -->
    <TransactionModal v-model:visible="showTransactionModal" :title="transactionModalTitle" :steps="transactionSteps"
      :current-step="currentTransactionStep" :status="transactionStatus" :transaction-details="transactionDetails"
      :transaction-hash="transactionHash" :error-message="transactionError" @close="handleTransactionModalClose"
      @retry="handleTransactionRetry" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import {
  Switch,
  InfoFilled,
  QuestionFilled,
  WarningFilled,
  Clock,
  Share
} from '@element-plus/icons-vue'
import { formatUnits, parseUnits, ethers } from 'ethers'

import TransactionModal from '@/components/common/TransactionModal.vue'
import PullToRefresh from '@/components/common/PullToRefresh.vue'
import FormattedInput from '@/components/common/FormattedInput.vue'
import QuickAmounts from '@/components/common/QuickAmounts.vue'
import InfoCards from '@/components/common/InfoCards.vue'
import SRMBTokenSelector from '@/components/common/SRMBTokenSelector.vue'
import TokenIcon from '@/components/common/TokenIcon.vue'
import { useWalletStore } from '@/stores/wallet'
import { contractService } from '@/services/contracts'
import { formatNumber, formatNumberK, calculatePercentageAmount } from '@/utils/format'
import { debounce } from '@/utils/debounce'
import { usePullToRefresh } from '@/composables/usePullToRefresh'

// Type definitions
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

interface WrapConfig {
  minWrapAmount: string
  maxWrapAmount: string
  wrapFee: string
  minUnwrapAmount: string
  maxUnwrapAmount: string
  unwrapFee: string
}

interface UserWrapStats {
  totalWrapped: string
  availableToUnwrap: string
}

const { t } = useI18n()
const walletStore = useWalletStore()

// Pull to refresh
const { isRefreshing, pullDistance, isPulling, canRefresh } = usePullToRefresh({
  onRefresh: async (): Promise<void> => {
    try {
      if (walletStore.isConnected) {
        await Promise.all([
          loadBalances(),
          loadWrapConfig(),
          loadUserWrapStats(),
          loadTotalReserveTransferred()
        ])
      }
    } catch (error) {
      console.error('Failed to refresh wrap data:', error)
    }
  }
})

const loading = ref(false)
const mode = ref<'wrap' | 'unwrap'>('wrap')
const wrapAmount = ref('')
const unwrapAmount = ref('')
const wrapPreview = ref<WrapPreview | null>(null)
const unwrapPreview = ref<UnwrapPreview | null>(null)
const wrapInProgress = ref(false)
const unwrapInProgress = ref(false)

// RWA Token Selection
const selectedSRMBToken = ref('')
const selectedTokenInfo = ref<any>(null)

// Unwrap RWA Token Selection
const selectedUnwrapSRMBToken = ref('')
const selectedUnwrapTokenInfo = ref<any>(null)

// 等待时间相关状态
const wrapWaitTime = ref(0)
const unwrapWaitTime = ref(0)

// Real balances from contracts
const sRMBBalance = ref('0')
const sWRMBBalance = ref('0')
const wrapConfig = ref<WrapConfig | null>(null)
const userUnwrappableAmount = ref('0')
const userMaxUnwrappableAmount = ref('0')
const totalReserveTransferred = ref('0')

// Info Cards data
const infoCards = computed(() => [
  {
    icon: InfoFilled,
    title: t('wrap.whatIsWrapping'),
    content: t('wrap.wrappingDescription')
  },
  {
    icon: QuestionFilled,
    title: t('wrap.fees'),
    content: t('wrap.feesDescription')
  },
  {
    icon: WarningFilled,
    title: t('wrap.risks'),
    content: t('wrap.risksDescription')
  }
])

// Transaction Modal
const showTransactionModal = ref(false)
const transactionModalTitle = ref('')
const currentTransactionStep = ref(0)
const transactionStatus = ref<'pending' | 'loading' | 'success' | 'error'>('pending')
const transactionHash = ref('')
const transactionError = ref('')

const modeOptions = computed(() => [
  { label: t('wrap.wrap'), value: 'wrap' },
  { label: t('wrap.unwrap'), value: 'unwrap' }
])

const transactionSteps = ref([
  { label: t('transaction.approve'), description: t('transaction.approveDescription') },
  { label: t('transaction.confirm'), description: t('transaction.confirmDescription') },
  { label: t('transaction.complete'), description: t('transaction.completeDescription') }
])

const transactionDetails = computed(() => {
  const details: {
    label: string
    values: string[]
    highlight?: boolean
    type?: 'debit' | 'credit'
  }[] = []

  if (mode.value === 'wrap' && wrapAmount.value) {
    details.push(
      { label: t('pay'), values: [`-${formatNumber(wrapAmount.value, 6)} ${selectedTokenSymbol.value}`], highlight: true, type: 'debit' },
      { label: t('receive'), values: [`+${formatNumber(wrapPreview.value?.outputAmount || '0', 6)} sWRMB`], type: 'credit' },
    )
  } else if (mode.value === 'unwrap' && unwrapAmount.value) {
    details.push(
      { label: t('pay'), values: [`-${formatNumber(unwrapPreview.value?.sWRMBBurned || '0', 6)} sWRMB`], highlight: true, type: 'debit' },
      { label: t('receive'), values: [`+${formatNumber(unwrapPreview.value?.sRMBReceived || '0', 6)} ${selectedUnwrapTokenSymbol.value}`], type: 'credit' },
    )
  }

  return details
})

// Selected token computed properties
const selectedTokenSymbol = computed(() => {
  return selectedTokenInfo.value?.symbol || 'RWA'
})

const selectedUnwrapTokenSymbol = computed(() => {
  return selectedUnwrapTokenInfo.value?.symbol || 'RWA'
})

const isWrapValid = computed(() => {
  const amount = parseFloat(wrapAmount.value)
  if (!amount || amount <= 0) return false
  if (!selectedSRMBToken.value) return false
  if (amount > parseFloat(sRMBBalance.value)) return false

  // Check min/max amounts if config is loaded
  if (wrapConfig.value) {
    const minAmount = parseFloat(wrapConfig.value.minWrapAmount)
    const maxAmount = parseFloat(wrapConfig.value.maxWrapAmount)
    if (minAmount > 0 && amount < minAmount) return false
    if (maxAmount > 0 && amount > maxAmount) return false
  }

  return true
})

const wrapValidationError = computed(() => {
  if (!wrapAmount.value || !walletStore.isConnected) return ''
  if (!selectedSRMBToken.value) return t('wrap.selectTokenFirst')

  const amount = parseFloat(wrapAmount.value)
  if (!amount || amount <= 0) return ''//t('wrap.invalidAmount')
  if (amount > parseFloat(sRMBBalance.value)) return t('wrap.insufficientBalance')

  // Check min/max amounts if config is loaded
  if (wrapConfig.value) {
    const minAmount = parseFloat(wrapConfig.value.minWrapAmount)
    const maxAmount = parseFloat(wrapConfig.value.maxWrapAmount)
    if (minAmount > 0 && amount < minAmount) return t('wrap.belowMinAmount', { min: formatNumber(minAmount) })
    if (maxAmount > 0 && amount > maxAmount) return t('wrap.aboveMaxAmount', { max: formatNumber(maxAmount) })
  }

  return ''
})

const isUnwrapValid = computed(() => {
  const amount = parseFloat(unwrapAmount.value)
  if (!amount || amount <= 0) return false

  // Check if user has enough wrapped amount to unwrap
  const unwrappableAmount = parseFloat(userMaxUnwrappableAmount.value)
  if (amount > unwrappableAmount) return false

  // Check min/max amounts if config is loaded
  if (wrapConfig.value) {
    const minAmount = parseFloat(wrapConfig.value.minUnwrapAmount)
    const maxAmount = parseFloat(wrapConfig.value.maxUnwrapAmount)
    if (minAmount > 0 && amount < minAmount) return false
    if (maxAmount > 0 && amount > maxAmount) return false
  }

  return true
})

const unwrapValidationError = computed(() => {
  if (!unwrapAmount.value || !walletStore.isConnected) return ''
  if (!selectedUnwrapSRMBToken.value) return t('wrap.selectTokenFirst')

  const amount = parseFloat(unwrapAmount.value)
  if (!amount || amount <= 0) return ''

  // Check if user has enough wrapped amount to unwrap
  const unwrappableAmount = parseFloat(userUnwrappableAmount.value)
  if (amount > unwrappableAmount) return t('wrap.insufficientUnwrappableAmount')

  // Check min/max amounts if config is loaded
  if (wrapConfig.value) {
    const minAmount = parseFloat(wrapConfig.value.minUnwrapAmount)
    const maxAmount = parseFloat(wrapConfig.value.maxUnwrapAmount)
    if (minAmount > 0 && amount < minAmount) return t('wrap.belowMinUnwrapAmount', { min: formatNumber(minAmount) })
    if (maxAmount > 0 && amount > maxAmount) return t('wrap.aboveMaxUnwrapAmount', { max: formatNumber(maxAmount) })
  }

  return ''
})

const unwrapSWRMBBalanceError = computed(() => {
  if (!sWRMBBalance.value || parseFloat(sWRMBBalance.value) <= 0) return 'sWRMB ' + t('wrap.insufficientBalance');
  if (!unwrapAmount.value) return ''

  const amount = parseFloat(unwrapPreview.value?.sWRMBBurned || '0')
  if (!amount || amount <= 0 || parseFloat(userUnwrappableAmount.value) <= 0) return ''

  const unwrappableAmount = parseFloat(sWRMBBalance.value)
  if (amount > unwrappableAmount && parseFloat(unwrapAmount.value) <= parseFloat(userUnwrappableAmount.value)) return 'sWRMB ' + t('wrap.insufficientBalance')

  return ''
})

// Real contract preview functions
const generateWrapPreview = async (amount: string): Promise<WrapPreview | null> => {
  try {
    const inputAmount = parseFloat(amount)
    if (!inputAmount || inputAmount <= 0) return null

    const wrapManager = contractService.getWrapManagerContract()
    if (!wrapManager) return null

    const amountWei = parseUnits(amount, 6)
    const [sWRMBReceived, wrmBMinted, fee, waitTime, currentNAV] = await wrapManager.previewWrap(walletStore.address, selectedSRMBToken.value, amountWei)

    const outputAmount = formatUnits(sWRMBReceived, 18)
    const feeAmount = formatUnits(fee, 6)
    const feePercentage = (parseFloat(feeAmount) / inputAmount * 100)
    const exchangeRate = parseFloat(outputAmount) / inputAmount

    // 处理等待时间
    const waitTimeSeconds = Number(waitTime)
    wrapWaitTime.value = waitTimeSeconds

    return {
      outputAmount: outputAmount,
      fee: feeAmount,
      feePercentage: feePercentage.toFixed(2),
      exchangeRate: exchangeRate.toFixed(6),
      waitTime: waitTimeSeconds
    }
  } catch (error) {
    console.error('Failed to generate wrap preview:', error)
    return null
  }
}

const generateUnwrapPreview = async (amount: string): Promise<UnwrapPreview | null> => {
  try {
    const inputAmount = parseFloat(amount)
    if (!inputAmount || inputAmount <= 0) return null

    const wrapManager = contractService.getWrapManagerContract()
    if (!wrapManager) return null

    // Now passing RWA amount as input parameter
    const amountWei = parseUnits(amount, 6)
    const [sRMBReceived, sWRMBBurned, fee, waitTime, currentNAV] = await wrapManager.previewUnwrap(walletStore.address, selectedUnwrapSRMBToken.value, amountWei)

    const sWRMBBurnedAmount = formatUnits(sWRMBBurned, 18)
    const sRMBReceivedAmount = formatUnits(sRMBReceived, 6)
    const feeAmount = formatUnits(fee, 6)
    const feePercentage = (parseFloat(feeAmount) / inputAmount * 100)

    // 处理等待时间
    const waitTimeSeconds = Number(waitTime)
    unwrapWaitTime.value = waitTimeSeconds

    // 计算汇率：1 sWRMB = ? RWA
    const exchangeRate = parseFloat(sWRMBBurnedAmount) > 0 ? inputAmount / parseFloat(sWRMBBurnedAmount) : 0

    return {
      sWRMBBurned: sWRMBBurnedAmount,
      sRMBReceived: sRMBReceivedAmount,
      fee: feeAmount,
      feePercentage: feePercentage.toFixed(2),
      exchangeRate: exchangeRate.toFixed(6),
      waitTime: waitTimeSeconds
    }
  } catch (error) {
    console.error('Failed to generate unwrap preview:', error)
    return null
  }
}

// 计算最终可执行时间
const getExecutableTime = (waitTimeSeconds: number): string => {
  if (waitTimeSeconds <= 0) return ''

  const now = new Date()
  const executableTime = new Date(now.getTime() + waitTimeSeconds * 1000)

  return executableTime.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

// 检查是否可以执行操作
const canWrap = computed(() => wrapWaitTime.value === 0)
const canUnwrap = computed(() => unwrapWaitTime.value === 0)

// Debounced preview functions
const debouncedWrapPreview = debounce(async (amount: string) => {
  wrapPreview.value = await generateWrapPreview(amount)
}, 500)

const debouncedUnwrapPreview = debounce(async (amount: string) => {
  unwrapPreview.value = await generateUnwrapPreview(amount)
}, 500)

const handleWrapAmountChange = (value: string) => {
  debouncedWrapPreview(value)
}

const handleUnwrapAmountChange = (value: string) => {
  debouncedUnwrapPreview(value)
}

const handleTokenChange = (token: any) => {
  selectedTokenInfo.value = token
  // Clear amounts and previews when token changes
  wrapAmount.value = ''
  wrapPreview.value = null

  loadBalances();
}

const handleUnwrapTokenChange = (token: any) => {
  selectedUnwrapTokenInfo.value = token
  // Clear amounts and previews when token changes
  unwrapAmount.value = ''
  unwrapPreview.value = null

  loadBalances()
  loadUserWrapStats()
}

const handleModeChange = (newMode: 'wrap' | 'unwrap') => {
  mode.value = newMode
  // Clear amounts and previews when switching modes
  wrapAmount.value = ''
  unwrapAmount.value = ''
  wrapPreview.value = null
  unwrapPreview.value = null

  // 清理等待时间状态
  wrapWaitTime.value = 0
  unwrapWaitTime.value = 0

  loadBalances();
  loadUserWrapStats()
}

const switchMode = () => {
  mode.value = mode.value === 'wrap' ? 'unwrap' : 'wrap'
  handleModeChange(mode.value)
}

const setWrapPercentage = (percentage: number) => {
  const amount = calculatePercentageAmount(sRMBBalance.value, percentage, 6)
  wrapAmount.value = amount
  handleWrapAmountChange(amount)
}

const setMaxWrapAmount = () => {
  wrapAmount.value = sRMBBalance.value
  handleWrapAmountChange(sRMBBalance.value)
}

const setUnwrapPercentage = (percentage: number) => {
  const amount = calculatePercentageAmount(userMaxUnwrappableAmount.value, percentage, 6)
  unwrapAmount.value = amount
  handleUnwrapAmountChange(amount)
}

const setMaxUnwrapAmount = () => {
  unwrapAmount.value = userMaxUnwrappableAmount.value
  handleUnwrapAmountChange(userMaxUnwrappableAmount.value)
}

const handleWrap = async () => {
  if (!isWrapValid.value || !walletStore.isConnected) return

  transactionModalTitle.value = t('wrap.wrapTransaction')
  showTransactionModal.value = true
  currentTransactionStep.value = 0
  transactionStatus.value = 'pending'
  wrapInProgress.value = true

  try {
    const amountWei = parseUnits(wrapAmount.value, 6)

    // Step 1: Check and approve selected RWA token if needed
    const sRMBContract = contractService.getERC20Contract(selectedSRMBToken.value, true)
    const wrapManagerAddress = contractService.getAddresses().WRAP_MANAGER

    if (!sRMBContract || !wrapManagerAddress) {
      throw new Error('Contract not available')
    }

    const allowance = await sRMBContract.allowance(walletStore.address, wrapManagerAddress)

    if (allowance < amountWei) {
      transactionStatus.value = 'loading'
      const approveTx = await sRMBContract.approve(wrapManagerAddress, ethers.MaxUint256)
      await approveTx.wait()
    }

    currentTransactionStep.value = 1

    // Step 2: Execute wrap
    const wrapManager = contractService.getWrapManagerContract(true)
    if (!wrapManager) {
      throw new Error('Wrap manager contract not available')
    }

    transactionStatus.value = 'loading'
    const wrapTx = await wrapManager.wrap(selectedSRMBToken.value, amountWei)
    currentTransactionStep.value = 2
    const receipt = await wrapTx.wait()

    currentTransactionStep.value = 3
    transactionStatus.value = 'success'
    transactionHash.value = receipt.hash

    // Reset form and refresh balances
    wrapAmount.value = ''
    wrapPreview.value = null
    await Promise.all([loadBalances(), loadUserWrapStats()])

    ElMessage.success(t('wrap.wrapSuccess'))
  } catch (error: any) {
    transactionStatus.value = 'error'
    transactionError.value = error.message || t('wrap.wrapFailed')
    console.error('Wrap failed:', error)
  } finally {
    wrapInProgress.value = false
  }
}

const handleUnwrap = async () => {
  if (!isUnwrapValid.value || !walletStore.isConnected) return

  // Additional runtime check for unwrappable amount
  const amount = parseFloat(unwrapAmount.value)
  const unwrappableAmount = parseFloat(userMaxUnwrappableAmount.value)
  if (amount > unwrappableAmount) {
    ElMessage.error(t('wrap.insufficientUnwrappableAmount'))
    return
  }

  transactionModalTitle.value = t('wrap.unwrapTransaction')
  showTransactionModal.value = true
  currentTransactionStep.value = 0
  transactionStatus.value = 'pending'
  unwrapInProgress.value = true

  try {
    const sRMBAmountWei = parseUnits(unwrapAmount.value, 6)

    // Get required sWRMB amount from preview
    if (!unwrapPreview.value) {
      throw new Error('Unable to calculate required sWRMB amount')
    }

    const sWRMBRequiredWei = parseUnits(unwrapPreview.value.sWRMBBurned, 18)

    // Step 1: Check and approve sWRMB if needed
    const savingsVault = contractService.getSavingsVaultContract(true)
    const wrapManagerAddress = contractService.getAddresses().WRAP_MANAGER

    if (!savingsVault || !wrapManagerAddress) {
      throw new Error('Contract not available')
    }

    const allowance = await savingsVault.allowance(walletStore.address, wrapManagerAddress)

    if (allowance < sWRMBRequiredWei) {
      transactionStatus.value = 'loading'
      const approveTx = await savingsVault.approve(wrapManagerAddress, ethers.MaxUint256)
      await approveTx.wait()
    }

    currentTransactionStep.value = 1

    // Step 2: Execute unwrap with RWA amount
    const wrapManager = contractService.getWrapManagerContract(true)
    if (!wrapManager) {
      throw new Error('Wrap manager contract not available')
    }

    transactionStatus.value = 'loading'
    const unwrapTx = await wrapManager.unwrap(selectedUnwrapSRMBToken.value, sRMBAmountWei)
    currentTransactionStep.value = 2
    const receipt = await unwrapTx.wait()

    currentTransactionStep.value = 3
    transactionStatus.value = 'success'
    transactionHash.value = receipt.hash

    // Reset form and refresh balances
    unwrapAmount.value = ''
    unwrapPreview.value = null
    await Promise.all([loadBalances(), loadUserWrapStats(), loadTotalReserveTransferred()])

    ElMessage.success(t('wrap.unwrapSuccess'))
  } catch (error: any) {
    transactionStatus.value = 'error'
    transactionError.value = error.message || t('wrap.unwrapFailed')
    console.error('Unwrap failed:', error)
  } finally {
    unwrapInProgress.value = false
  }
}

const handleTransactionModalClose = () => {
  showTransactionModal.value = false
  transactionHash.value = ''
  transactionError.value = ''
}

const handleTransactionRetry = () => {
  if (mode.value === 'wrap') {
    handleWrap()
  } else {
    handleUnwrap()
  }
}

// Load user wrap statistics
const loadUserWrapStats = async () => {
  if (!walletStore.isConnected || !walletStore.address || !selectedUnwrapSRMBToken.value) {
    userMaxUnwrappableAmount.value = '0'
    return
  }

  try {
    const wrapManager = contractService.getWrapManagerContract()
    if (!wrapManager) return

    const [availableToUnwrap, userMaxUnwrappedAmount] = await wrapManager.getUserWrapStats(walletStore.address, selectedUnwrapSRMBToken.value)

    userUnwrappableAmount.value = formatUnits(availableToUnwrap, 6)
    userMaxUnwrappableAmount.value = formatUnits(userMaxUnwrappedAmount, 6)
  } catch (error) {
    console.error('Failed to load user wrap stats:', error)
    userMaxUnwrappableAmount.value = '0'
  }
}

// Load balances from contracts
const loadBalances = async () => {
  const curSRMBContractAddress = mode.value === 'wrap' ? selectedSRMBToken.value : selectedUnwrapSRMBToken.value

  if (!walletStore.isConnected || !walletStore.address || !curSRMBContractAddress) {
    sRMBBalance.value = '0'
    sWRMBBalance.value = '0'
    return
  }

  try {
    const [sRMBContract, savingsVault] = await Promise.all([
      contractService.getSRMBContract(curSRMBContractAddress),
      contractService.getSavingsVaultContract()
    ])

    if (sRMBContract && savingsVault) {
      const [sRMBBal, sWRMBBal] = await Promise.all([
        sRMBContract.balanceOf(walletStore.address),
        savingsVault.balanceOf(walletStore.address)
      ])

      sRMBBalance.value = formatUnits(sRMBBal, 6)
      sWRMBBalance.value = formatUnits(sWRMBBal, 18)
    }
  } catch (error) {
    console.error('Failed to load balances:', error)
    sRMBBalance.value = '0'
    sWRMBBalance.value = '0'
  }
}

// Load wrap configuration
const loadWrapConfig = async () => {
  try {
    const wrapManager = contractService.getWrapManagerContract()
    if (!wrapManager) return

    const config = await wrapManager.getConfiguration()

    wrapConfig.value = {
      minWrapAmount: formatUnits(config[2], 6),
      maxWrapAmount: formatUnits(config[3], 6),
      wrapFee: formatUnits(config[4], 6),
      minUnwrapAmount: formatUnits(config[5], 6),
      maxUnwrapAmount: formatUnits(config[6], 6),
      unwrapFee: formatUnits(config[7], 6)
    }
  } catch (error) {
    console.error('Failed to load wrap config:', error)
  }
}

// Load total reserve transferred
const loadTotalReserveTransferred = async () => {
  try {
    const wrapManager = contractService.getWrapManagerContract()
    if (!wrapManager) return

    const totalReserve = await wrapManager.totalReserveTransferred()
    totalReserveTransferred.value = formatUnits(totalReserve, 6)
  } catch (error) {
    console.error('Failed to load total reserve transferred:', error)
    totalReserveTransferred.value = '0'
  }
}

const refreshData = async () => {
  loading.value = true
  try {
    await Promise.all([
      loadBalances(),
      loadWrapConfig(),
      loadUserWrapStats(),
      loadTotalReserveTransferred()
    ])
  } catch (error) {
    console.error('Failed to refresh data:', error)
  } finally {
    loading.value = false
  }
}

// Watch for wallet connection changes
watch(() => walletStore.isConnected, (connected) => {
  if (connected) {
    refreshData()
  } else {
    sRMBBalance.value = '0'
    sWRMBBalance.value = '0'
    wrapConfig.value = null
    userMaxUnwrappableAmount.value = '0'
    totalReserveTransferred.value = '0'
    wrapPreview.value = null
    unwrapPreview.value = null
  }
})

watch(() => walletStore.address, () => {
  if (walletStore.isConnected) {
    refreshData()
  }
})

// Watch for chainId changes
watch(() => walletStore.chainId, (chainId) => {
  if (chainId) {
    refreshData()
  }
})

// Watch for mode changes to reset input fields
watch(mode, () => {
  wrapAmount.value = ''
  unwrapAmount.value = ''
  wrapPreview.value = null
  unwrapPreview.value = null
  wrapWaitTime.value = 0
  unwrapWaitTime.value = 0
})

onMounted(() => {
  // Initialize data on mount
  if (walletStore.isConnected) {
    refreshData()
  }
})
</script>

<style scoped>
.header-actions {
  @apply flex items-center space-x-4;
}

.section-title {
  @apply text-2xl font-bold mb-6;
  color: var(--text-primary);
}

.token-selector-section {
  margin-bottom: 20px;
}

.token-selector-section .input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.token-selector-section .input-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.balance-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6;
}

.balance-card {
  @apply rounded-xl shadow-sm p-6;
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
}

.card-header {
  @apply flex items-center justify-between mb-4;
}

.card-title {
  @apply text-sm font-medium;
  color: var(--text-secondary);
}

.card-icon {
  @apply text-xl;
  color: var(--text-secondary);
}

.card-value {
  @apply text-2xl font-bold;
  color: var(--text-primary);
}

.card-subtitle {
  @apply text-sm mt-1;
  color: var(--text-secondary);
}

.interface-card {
  @apply rounded-xl p-8;
  background-color: var(--card-bg);
}

.mode-toggle {
  @apply flex justify-center mb-8;
}

.form-section {
  @apply space-y-6 mb-8;
}

.token-input {
  @apply space-y-3;
}

.input-header {
  @apply flex items-center justify-between;
}

.input-label {
  @apply text-sm font-medium;
  color: var(--text-primary);
}

.balance-info {
  @apply text-sm;
  color: var(--text-secondary);
}

.input-section {
  @apply space-y-4 mb-6;
}

.input-group {
  @apply flex items-center space-x-3;
}

.amount-input {
  @apply flex-1;
}

.input-suffix {
  @apply font-medium;
  color: var(--text-secondary);
}

.quick-amounts {
  @apply flex space-x-2;
}

.max-button {
  color: var(--primary-color);
}

.max-button:hover {
  color: var(--accent-color);
}

.swap-arrow {
  @apply flex justify-center;
}

.swap-button {
  @apply border-primary-200 dark:border-primary-700;
  background-color: var(--bg-secondary);
}

.swap-icon {
  @apply transition-transform duration-200;
  color: var(--primary-color);
}

.swap-button:hover .swap-icon {
  @apply rotate-180;
}

.preview-section {
  @apply rounded-lg p-4 mb-6;
  background-color: var(--bg-secondary);
}

.preview-title {
  @apply text-sm font-medium mb-3;
  color: var(--text-primary);
}

.preview-details {
  @apply space-y-2;
}

.preview-row {
  @apply flex items-center justify-between text-sm;
}

.preview-row span:first-child {
  color: var(--text-secondary);
}

.preview-row.exchange-rate {
  @apply pt-2 mt-2;
  border-top: 1px solid var(--border-color);
}

.preview-row.exchange-rate .preview-value {
  @apply font-semibold;
  color: var(--primary-color);
}

.preview-value {
  @apply font-medium;
  color: var(--text-primary);
}

.fee-value {
  @apply font-medium;
  color: var(--warning-color);
}

.action-button {
  @apply w-full;
}



.validation-error {
  @apply flex items-center space-x-2 mt-2 p-3 rounded-lg;
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--error-color);
}

.error-icon {
  @apply text-sm;
  color: var(--error-color);
}

.error-text {
  @apply text-sm font-medium;
  color: var(--error-color);
}

.countdown-notice {
  @apply flex items-center justify-center space-x-2 p-4 rounded-lg mb-4;
  background-color: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.4);
}

.countdown-icon {
  @apply text-lg;
  color: var(--primary-color);
}

.countdown-text {
  @apply font-medium;
  color: var(--primary-color);
}

:deep(.el-segmented) {
  background-color: var(--bg-secondary);
}

:deep(.el-segmented__item) {
  color: var(--text-secondary);
}

:deep(.el-segmented__item.is-selected) {
  background-color: var(--primary-color);
  color: white;
}

@media (max-width: 768px) {
  .balance-grid {
    @apply grid-cols-1 gap-4;
  }

  .interface-card {
    @apply p-6;
  }
}

.info-grid {
  @apply grid grid-cols-1 gap-6 mb-6 mt-6;
}

.info-card {
  @apply rounded-xl p-6;
  background-color: var(--card-bg);
}

.info-header {
  @apply flex items-center space-x-3 mb-4;
}

.info-icon {
  @apply text-2xl;
  color: var(--primary-color);
}

.info-title {
  @apply text-lg font-semibold;
  color: var(--text-primary);
}

.info-content {
  @apply text-sm leading-relaxed;
  color: var(--text-secondary);
}

.platform-link {
  margin: 12px 0;
  display: inline-block;
  font-weight: 500;
}

.platform-features {
  margin-top: 16px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.platform-features p {
  margin-bottom: 8px;
  color: var(--text-primary);
}

.platform-features ul {
  margin: 0;
  padding-left: 20px;
}

.platform-features li {
  margin-bottom: 4px;
  font-size: 13px;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .info-grid {
    @apply grid-cols-1 gap-4 mb-6;
  }
}
</style>