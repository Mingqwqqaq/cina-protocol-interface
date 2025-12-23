<template>
  <div class="farm-container">
    <PullToRefresh :is-pulling="isPulling" :is-refreshing="isRefreshing" :pull-distance="pullDistance"
      :can-refresh="canRefresh">
      <!-- Farm Overview -->
      <div class="farm-overview">
        <h2 class="section-title">
          {{ $t('farm.overview') }}
        </h2>

        <div class="overview-grid">
          <!-- Your CINA Mined -->
          <div class="overview-card">
            <div class="card-header">
              <h3 class="card-title">{{ $t('farm.yourMined') }}</h3>
              <div class="card-subtitle">
                {{ $t('farm.apy') }} {{ formatNumber(farmStore.farmAPY) }}%
              </div>
            </div>
            <div class="card-value">
              <img src="../assets/logo.png" alt="" class="token-icon">
              <AnimatedNumber class="animated-number" :value="farmStore.pendingCINA"
                :auto-increment="walletStore.isConnected" :increment-amount="parseFloat(farmStore.incrementAmount)"
                :increment-interval="1000" :cache-key="`totalCINAMined_${walletStore.address}`" :use-cache="false" />
            </div>
          </div>
        </div>
      </div>

      <!-- Farm Actions -->
      <div class="action-section">
        <el-tabs v-model="activeTab" class="farm-tabs">
          <!-- Deposit Token Tab -->
          <el-tab-pane :label="$t('farm.deposit')" name="deposit">
            <div class="tab-content">
              <div class="action-form">
                <div class="input-section">
                  <div class="input-group">
                    <div class="input-with-select">
                      <FormattedInput v-model="depositAmount"
                        :placeholder="formatNumberK(farmStore.usdtBalance) + '  ' + $t('available')" size="large"
                        class="amount-input" :decimals="6" :use-abbreviation="true">
                        <TokenSelect v-model="depositToken" :tokens="availableTokens" placeholder="Select token" />
                      </FormattedInput>
                    </div>
                  </div>

                  <!-- Quick Amount Buttons -->
                  <QuickAmounts :max-label="$t('common.max')" @select-percentage="setDepositPercentage"
                    @select-max="setMaxDeposit" />
                </div>

                <!-- Farm Preview -->
                <div v-if="depositPreview" class="preview-section">
                  <h4 class="preview-title">{{ $t('farm.preview') }}</h4>
                  <div class="preview-details">
                    <div class="preview-row">
                      <span>{{ $t('farm.dailyReward') }}</span>
                      <span class="preview-value">{{ formatNumber(depositPreview.dailyReward, 2) }} CINA</span>
                    </div>
                  </div>
                </div>

                <el-button type="primary" size="large" :loading="farmStore.depositInProgress"
                  :disabled="!isDepositValid" @click="handleDeposit" class="action-button">
                  {{ $t('farm.deposit') }}
                </el-button>
              </div>
            </div>
          </el-tab-pane>

          <!-- Withdraw Token Tab -->
          <el-tab-pane :label="$t('farm.withdraw')" name="withdraw">
            <div class="tab-content">
              <div class="action-form">
                <div class="input-section">
                  <div class="input-group">
                    <div class="input-with-select">
                      <FormattedInput v-model="withdrawAmount"
                        :placeholder="formatNumberK(farmStore.depositedAmount) + '  ' + $t('available')" size="large"
                        class="amount-input" :decimals="6" :use-abbreviation="true">
                        <TokenSelect v-model="withdrawToken" :tokens="availableTokens" placeholder="Select token" />
                      </FormattedInput>
                    </div>
                  </div>

                  <!-- Quick Amount Buttons -->
                  <QuickAmounts :max-label="$t('common.max')" @select-percentage="setWithdrawPercentage"
                    @select-max="setMaxWithdraw" />

                  <!-- Claim CINA -->
                  <div class="input-group">
                    <el-checkbox v-model="withdrawCINA" class="withdraw-cina-checkbox"
                      @change="handleWithdrawCINAChange">
                      {{ $t('farm.withdrawCINA') }}
                    </el-checkbox>
                  </div>
                </div>

                <!-- Withdraw Preview -->
                <div v-if="withdrawPreview || withdrawCINA" class="preview-section">
                  <h4 class="preview-title">{{ $t('farm.preview') }}</h4>
                  <div class="preview-details">
                    <div v-if="withdrawPreview" class="preview-row">
                      <span>Liquidity</span>
                      <span class="preview-value liquidity-value">{{ formatNumber(withdrawPreview.liquidityAmount, 2)
                      }} {{
                          withdrawToken?.symbol }}</span>
                    </div>
                    <div v-if="withdrawCINA" class="preview-row">
                      <span>Farm Reward</span>
                      <span class="preview-value">{{ formatNumber(farmStore.pendingCINA, 2) }} CINA</span>
                    </div>
                  </div>
                </div>

                <el-button type="primary" size="large"
                  :loading="farmStore.withdrawInProgress || farmStore.claimInProgress" :disabled="!isWithdrawValid"
                  @click="handleWithdraw" class="action-button">
                  {{ withdrawCINA && (!withdrawAmount || parseFloat(withdrawAmount) === 0) ? $t('farm.claim') :
                    $t('farm.withdraw') }}
                </el-button>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- Info Cards -->
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
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { parseUnits } from 'ethers'
import { InfoFilled, QuestionFilled, WarningFilled } from '@element-plus/icons-vue'

import AnimatedNumber from '@/components/common/AnimatedNumber.vue'
import TokenSelect from '@/components/TokenSelect.vue'
import QuickAmounts from '@/components/common/QuickAmounts.vue'
import TransactionModal from '@/components/common/TransactionModal.vue'
import PullToRefresh from '@/components/common/PullToRefresh.vue'
import FormattedInput from '@/components/common/FormattedInput.vue'
import InfoCards from '@/components/common/InfoCards.vue'
import { usePullToRefresh } from '@/composables/usePullToRefresh'
import { useWalletStore } from '@/stores/wallet'
import { useFarmStore } from '@/stores/farm'
import { contractService } from '@/services/contracts'
import { formatNumber, formatNumberK } from '@/utils/format'
import { TOKENS } from '@/constants'

// Define types
interface Token {
  symbol: string
  name: string
  address: string
  decimals: number
}

const { t } = useI18n()
const walletStore = useWalletStore()
const farmStore = useFarmStore()

// Pull to refresh functionality
const { isRefreshing, pullDistance, isPulling, canRefresh, ...touchHandlers } = usePullToRefresh({
  onRefresh: async (): Promise<void> => {
    if (walletStore.isConnected) {
      await farmStore.fetchFarmData()
      await farmStore.fetchUserFarmData()
    }
  }
})

// Available tokens for farm
const availableTokens = computed<Token[]>(() => {
  const chainId = walletStore.chainId || 11155111

  return [
    {
      symbol: TOKENS.USDT.symbol,
      name: TOKENS.USDT.name,
      address: TOKENS.USDT.addresses[chainId as keyof typeof TOKENS.USDT.addresses] || TOKENS.USDT.addresses[11155111] || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      decimals: TOKENS.USDT.decimals
    },
    // {
    //   symbol: TOKENS.USDC.symbol,
    //   name: TOKENS.USDC.name,
    //   address: TOKENS.USDC.addresses[chainId as keyof typeof TOKENS.USDC.addresses] || TOKENS.USDC.addresses[11155111] || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    //   decimals: TOKENS.USDC.decimals
    // }
  ]
})

const activeTab = ref('deposit')
const depositAmount = ref('')
const withdrawAmount = ref('')
const withdrawCINA = ref(false) // 是否同时提取CINA的开关
const depositToken = ref<Token>()
const withdrawToken = ref<Token>()

// Info Cards data
const infoCards = computed(() => [
  {
    icon: InfoFilled,
    title: t('farm.whatIsFarming'),
    content: t('farm.farmingDescription')
  },
  {
    icon: QuestionFilled,
    title: t('farm.farmingFees'),
    content: t('farm.farmingFeesDescription')
  },
  {
    icon: WarningFilled,
    title: t('farm.farmingRisks'),
    content: t('farm.farmingRisksDescription')
  }
])

// Transaction Modal
const showTransactionModal = ref(false)
const transactionModalTitle = ref('')
const currentTransactionStep = ref(0)
const transactionStatus = ref<'pending' | 'loading' | 'success' | 'error'>('pending')
const transactionHash = ref('')
const transactionError = ref('')

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

  if (activeTab.value === 'deposit' && depositAmount.value && parseFloat(depositAmount.value) > 0) {
    details.push(
      { label: t('pay'), values: [`-${formatNumber(depositAmount.value, 6)} USDT`], highlight: true, type: 'debit' }
    )
  } else if (activeTab.value === 'withdraw') {
    const values = [];
    if (withdrawCINA.value && parseFloat(farmStore.pendingCINA) > 0) {
      values.push(`+${formatNumber(farmStore.pendingCINA, 6)} CINA`)
    }
    if (withdrawAmount.value && parseFloat(withdrawAmount.value) > 0) {
      values.push(`+${formatNumber(withdrawAmount.value, 6)} USDT`);
    }
    details.push(
      { label: t('receive'), values, type: 'credit' }
    )
  }

  return details
})

// Initialize tokens
watch(availableTokens, (tokens) => {
  if (tokens.length >= 1) {
    if (!depositToken.value || depositToken.value.symbol !== tokens[0].symbol) {
      depositToken.value = tokens[0]
    }
    if (!withdrawToken.value || withdrawToken.value.symbol !== tokens[0].symbol) {
      withdrawToken.value = tokens[0]
    }
  }
}, { immediate: true })

// Computed properties
const isDepositValid = computed(() => {
  const amount = parseFloat(depositAmount.value)
  return amount > 0 && amount <= parseFloat(farmStore.usdtBalance)
})

const isWithdrawValid = computed(() => {
  const amount = parseFloat(withdrawAmount.value)
  // 如果勾选了withdrawCINA但没有输入金额，只要有可claim的CINA就有效
  if (withdrawCINA.value && (!withdrawAmount.value || amount === 0)) {
    return parseFloat(farmStore.pendingCINA) > 0
  }
  // 如果有输入金额，检查金额是否有效
  return amount > 0 && amount <= parseFloat(farmStore.depositedAmount)
})

const depositPreview = computed(() => {
  const amount = parseFloat(depositAmount.value)
  if (!amount || amount <= 0) return null

  const exchangeRate = parseFloat(farmStore.exchangeRate)
  const estimatedCINA = amount * exchangeRate
  const dailyReward = estimatedCINA * parseFloat(farmStore.farmAPY) / 365 / 100

  return {
    estimatedCINA,
    dailyReward
  }
})

const withdrawPreview = computed(() => {
  const amount = parseFloat(withdrawAmount.value)
  if (!amount || amount <= 0) return null

  return {
    rewardAmount: farmStore.pendingCINA,
    liquidityAmount: farmStore.liquidityAmount
  }
})

const setDepositPercentage = (percentage: number) => {
  const balance = parseFloat(farmStore.usdtBalance)
  const amount = (balance * percentage / 100).toFixed(6)
  depositAmount.value = amount
}

const setMaxDeposit = () => {
  depositAmount.value = farmStore.usdtBalance
}

const handleDeposit = async () => {
  if (!isDepositValid.value || !walletStore.isConnected) return

  transactionModalTitle.value = t('savings.depositTransaction')
  showTransactionModal.value = true
  currentTransactionStep.value = 0
  transactionStatus.value = 'pending'

  try {
    const amount = parseFloat(depositAmount.value)
    const amountWei = parseUnits(amount.toString(), 6) // USDT has 6 decimals

    // Step 1: Check and approve USDT if needed
    transactionStatus.value = 'loading'

    const usdtContract = contractService.getUSDTContract(true)
    const farmContract = contractService.getFarmVaultContract(true)

    if (!usdtContract || !farmContract) {
      throw new Error('Contract not available')
    }

    const farmAddress = await farmContract.getAddress()
    const allowance = await usdtContract.allowance(walletStore.address, farmAddress)

    // Check and approve USDT if needed
    if (allowance < amountWei) {
      const approveTx = await usdtContract.approve(farmAddress, amountWei)
      await approveTx.wait()
    }

    currentTransactionStep.value = 1

    // Step 2: Execute deposit
    const depositTx = await farmContract.deposit(amountWei)
    currentTransactionStep.value = 2
    const receipt = await depositTx.wait()

    currentTransactionStep.value = 3
    transactionStatus.value = 'success'
    transactionHash.value = receipt.hash

    // Reset form and refresh data
    depositAmount.value = ''
    await farmStore.fetchFarmData()
    await farmStore.fetchUserFarmData()
    ElMessage.success(t('farm.depositSuccess'))
  } catch (error: any) {
    transactionStatus.value = 'error'
    transactionError.value = error.message || t('farm.depositFailed')
    console.error('Deposit failed:', error)
  }
}

const setWithdrawPercentage = (percentage: number) => {
  const balance = parseFloat(farmStore.depositedAmount)
  const amount = (balance * percentage / 100).toFixed(6)
  withdrawAmount.value = amount
}

const setMaxWithdraw = () => {
  withdrawAmount.value = farmStore.depositedAmount
}

const handleWithdraw = async () => {
  if (!walletStore.isConnected) return

  transactionModalTitle.value = t('savings.withdrawTransaction')
  showTransactionModal.value = true
  currentTransactionStep.value = 1
  transactionStatus.value = 'pending'

  try {
    const amount = parseFloat(withdrawAmount.value)
    transactionStatus.value = 'loading'

    const farmContract = contractService.getFarmVaultContract(true)
    if (!farmContract) {
      throw new Error('Farm contract not available')
    }

    // 如果勾选了withdrawCINA但没有输入金额，只执行claim
    if (withdrawCINA.value && (!withdrawAmount.value || amount === 0)) {
      if (parseFloat(farmStore.pendingCINA) > 0) {
        // Execute getReward to claim CINA rewards
        const claimTx = await farmContract.getReward()
        currentTransactionStep.value = 2
        const receipt = await claimTx.wait()

        currentTransactionStep.value = 3
        transactionStatus.value = 'success'
        transactionHash.value = receipt.hash
        ElMessage.success(t('farm.claimSuccess'))
      }
    } else {
      // 执行USDT提现
      const amountWei = parseUnits(amount.toString(), 6) // USDT has 6 decimals
      // Execute withdraw with isClaim=false (only withdraw, don't claim rewards)
      const withdrawTx = await farmContract.withdraw(amountWei, withdrawCINA.value ? 1 : 0)
      currentTransactionStep.value = 2
      const receipt = await withdrawTx.wait()

      currentTransactionStep.value = 3
      transactionStatus.value = 'success'
      transactionHash.value = receipt.hash
      ElMessage.success(t('farm.withdrawSuccess'))
    }

    withdrawAmount.value = ''
    withdrawCINA.value = false // 重置开关状态

    // Refresh data
    await farmStore.fetchFarmData()
    await farmStore.fetchUserFarmData()
  } catch (error: any) {
    transactionStatus.value = 'error'
    transactionError.value = error.message || t('farm.withdrawFailed')
    console.error('Withdraw failed:', error)
  }
}

const handleTransactionModalClose = () => {
  showTransactionModal.value = false
  transactionHash.value = ''
  transactionError.value = ''
}

const handleTransactionRetry = () => {
  if (activeTab.value === 'deposit') {
    handleDeposit()
  } else {
    handleWithdraw()
  }
}

const handleWithdrawCINAChange = async () => {
  if (walletStore.isConnected) {
    await farmStore.fetchFarmData()
  }
}

// Lifecycle
onMounted(async () => {
  if (walletStore.isConnected) {
    await farmStore.fetchFarmData()
    await farmStore.startAutoRefresh();
  }
})

// Watch for wallet connection changes
watch(
  () => walletStore.isConnected,
  async (connected) => {
    if (connected) {
      await farmStore.fetchFarmData()
      await farmStore.startAutoRefresh()
    }
  }
)

// Watch for tab changes and reset input fields
watch(activeTab, (newTab) => {
  // Reset input amounts when switching tabs
  depositAmount.value = ''
  withdrawAmount.value = ''
})
</script>

<style scoped>
.farm-container {
  @apply h-full;
}

.section-title {
  @apply text-2xl font-bold mb-6;
  color: var(--text-primary);
}

.overview-grid {
  @apply grid grid-cols-1 gap-6 mb-8;
}

.overview-card {
  @apply rounded-xl p-6;
  background-color: var(--card-bg);
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
  color: var(--primary-color);
}

.card-value {
  @apply text-2xl font-bold mb-2 flex items-center justify-between gap-2;
  color: var(--number-color);
}

.token-icon {
  @apply w-8 h-8 rounded-full object-cover;
}

.animated-number {
  @apply flex items-center;
}

.card-value .animated-number {
  @apply flex-1;
}

.card-actions {
  @apply mt-4;
}

.token-symbol {
  @apply text-lg font-medium;
  color: var(--text-secondary);
}

.card-subtitle {
  @apply text-sm font-medium;
  color: var(--text-secondary);
}

.action-section {
  @apply rounded-xl mb-8;
  background-color: var(--card-bg);
}

.farm-tabs {
  @apply p-6;
}

.tab-content {
  @apply mt-6;
}

.action-form {
  @apply space-y-6;
}

.input-section {
  @apply space-y-4;
}

.input-group {
  @apply space-y-2;
}

.amount-input {
  @apply w-full;
}

.input-suffix {
  @apply font-medium;
  color: var(--text-secondary);
}

.max-button {
  @apply hover:opacity-80;
  color: var(--primary-color);
}

.quick-amounts {
  @apply flex space-x-2;
}

.balance-info {
  @apply flex justify-between items-center text-sm;
}

.balance-label {
  color: var(--text-secondary);
}

.balance-value {
  @apply font-medium;
  color: var(--text-primary);
}

.preview-section {
  @apply rounded-lg p-4;
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
  @apply flex justify-between items-center text-sm;
}

.preview-row span:first-child {
  color: var(--text-secondary);
}

.preview-value {
  @apply font-medium;
  color: var(--text-primary);
}

.preview-row.fee .preview-value {
  color: var(--error-color);
}

.liquidity-value {
  @apply font-medium;
  color: var(--warning-color);
}

.fee-amount {
  color: var(--error-color);
}

.action-button {
  @apply w-full h-12 text-base font-medium;
}

.claim-section {
  @apply space-y-6;
}

.claim-info {
  @apply rounded-lg p-6;
  background: linear-gradient(135deg, var(--card-bg) 0%, var(--bg-primary) 100%);
}

.claim-amount {
  @apply text-center mb-4;
}

.claim-amount h3 {
  @apply text-lg font-medium mb-2;
  color: var(--text-primary);
}

.amount-display {
  @apply text-3xl font-bold flex items-center justify-center gap-2;
  color: var(--primary-color);
}

.claim-details {
  @apply space-y-2;
}

.input-with-select {
  @apply flex w-full;
}

.input-with-select .el-input {
  @apply flex-1;
}

.token-select {
  @apply ml-2 w-32;
}

.token-option {
  @apply flex items-center gap-2;
}

.detail-row {
  @apply flex justify-between items-center text-sm;
}

.detail-row span:first-child {
  color: var(--text-secondary);
}

.detail-row span:last-child {
  @apply font-medium;
  color: var(--text-primary);
}

.claim-button {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
}

.claim-button:hover {
  opacity: 0.9;
}

.card-value {
  @apply relative flex items-start justify-between;
}

.value-content {
  @apply flex items-baseline gap-2;
}

.claim-button-corner {
  @apply absolute bottom-0 right-0 text-xs px-2 py-1;
  @apply border-0 rounded-md shadow-sm;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
}

.claim-button-corner:hover {
  opacity: 0.9;
}

:deep(.el-tabs__header) {
  @apply mb-0;
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

@media (max-width: 768px) {
  .overview-grid {
    @apply grid-cols-1 gap-4;
  }
}
</style>