<template>
  <div class="h-full">
    <PullToRefresh :is-pulling="isPulling" :is-refreshing="isRefreshing" :pull-distance="pullDistance"
      :can-refresh="canRefresh">
      <!-- Staking Overview -->
      <div class="staking-overview">
        <h2 class="section-title">
          {{ $t('staking.overview') }}
        </h2>

        <div class="overview-grid">
          <!-- Your Staked -->
          <div class="overview-card">
            <div class="card-header">
              <h3 class="card-title">{{ $t('staking.yourStaked') }}</h3>
              <div class="card-subtitle">
                {{ $t('staking.apy') }} {{ formatNumber(stakingStore.currentAPY) }}%
              </div>
            </div>
            <div class="card-value">
              <img src="../assets/logo.png" alt="" class="token-icon">
              <AnimatedNumber class="animated-number" :value="stakingStore.yourStaked"
                :auto-increment="walletStore.isConnected && parseFloat(stakingStore.yourStaked) > 0"
                :increment-amount="parseFloat(stakingStore.incrementAmount)" :increment-interval="1000"
                :cache-key="`yourStaked_${walletStore.address}`" :use-cache="false" />
            </div>
          </div>
        </div>
      </div>

      <!-- Staking Actions -->
      <div class="action-section">
        <el-tabs v-model="activeTab" class="staking-tabs">
          <!-- Stake CINA Tab -->
          <el-tab-pane :label="$t('staking.stakeCINA')" name="stake">
            <div class="tab-content">
              <div class="action-form">
                <div class="input-section">
                  <div class="input-group">
                    <FormattedInput v-model="stakeAmount"
                      :placeholder="formatNumberK(stakingStore.cinaBalance, 6) + '  available'" size="large"
                      class="amount-input" :decimals="6" :use-abbreviation="true" :max-decimals="18"
                      @input-change="handleStakeAmountChange">
                      <div class="token-symbol-selected">
                        <TokenIcon symbol="CINA" size="medium" />
                        <span class="token-symbol-text">CINA</span>
                      </div>
                    </FormattedInput>
                  </div>

                  <!-- Quick Amount Buttons -->
                  <QuickAmounts :max-label="$t('common.max')" @select-percentage="setStakePercentage"
                    @select-max="setMaxStake" />

                  <!-- Minimum Stake Warning -->
                  <div v-if="showMinStakeWarning" class="warning-info">
                    <el-icon>
                      <Warning />
                    </el-icon>
                    <span>{{ $t('staking.minStakeWarning', { amount: formatNumber(stakingStore.minStakeAmount) })
                    }}</span>
                  </div>
                </div>

                <!-- Staking Preview -->
                <div v-if="stakePreviewData?.shares" class="preview-section">
                  <h4 class="preview-title">{{ $t('staking.preview') }}</h4>
                  <div class="preview-details">
                    <div class="preview-row">
                      <span>{{ $t('staking.youWillReceive') }}</span>
                      <span class="preview-value">{{ formatNumber(stakePreviewData.shares, 2) }} stCINA</span>
                    </div>
                    <div class="preview-row exchange-rate">
                      <span>{{ $t('staking.exchangeRate') }}</span>
                      <span class="preview-value">1 CINA ≈ {{ formatNumber((1 / parseFloat(stakingStore.navCina)),
                        6)
                      }} stCINA</span>
                    </div>
                  </div>
                </div>

                <el-button type="primary" size="large"
                  :loading="transactionStatus === 'loading' && activeTab === 'stake'" :disabled="!isStakeValid"
                  @click="handleStake" class="action-button">
                  {{ $t('staking.stakeCINA') }}
                </el-button>
              </div>
            </div>
          </el-tab-pane>

          <!-- Unstake CINA Tab -->
          <el-tab-pane :label="$t('staking.unstakeCINA')" name="unstake">
            <div class="tab-content">
              <div class="action-form">
                <div class="input-section">
                  <div class="input-group">
                    <FormattedInput v-model="unstakeAmount"
                      :placeholder="formatNumberK(stakingStore.stakedAmount, 6) + '  available'" size="large"
                      class="amount-input" :decimals="6" :use-abbreviation="true" :max-decimals="18"
                      @input-change="handleUnstakeAmountChange">
                      <div class="token-symbol-selected">
                        <TokenIcon symbol="CINA" size="medium" />
                        <span class="token-symbol-text">CINA</span>
                      </div>
                    </FormattedInput>
                  </div>

                  <!-- Quick Amount Buttons -->
                  <QuickAmounts :max-label="$t('common.max')" @select-percentage="setUnstakePercentage"
                    @select-max="setMaxUnstake" />

                  <!-- Note: Early unstake penalty not available in current contract -->
                  <div v-if="false" class="warning-info early-unstake">
                    <el-icon>
                      <Warning />
                    </el-icon>
                    <span>{{ $t('staking.earlyUnstakeWarning', { penalty: 0 }) }}</span>
                  </div>
                </div>

                <!-- Unstaking Preview -->
                <div v-if="unstakePreviewData?.shares" class="preview-section">
                  <h4 class="preview-title">{{ $t('staking.preview') }}</h4>
                  <div class="preview-details">
                    <div class="preview-row">
                      <span>{{ $t('staking.required') }}</span>
                      <span class="preview-value">{{ formatNumber(unstakePreviewData.shares, 2) }} stCINA</span>
                    </div>
                    <div class="preview-row exchange-rate">
                      <span>{{ $t('staking.exchangeRate') }}</span>
                      <span class="preview-value">1 stCINA ≈ {{ formatNumber(stakingStore.navCina, 6) }} CINA</span>
                    </div>
                  </div>
                </div>

                <el-button type="primary" size="large"
                  :loading="transactionStatus === 'loading' && activeTab === 'unstake'" :disabled="!isUnstakeValid"
                  @click="handleUnstake" class="action-button">
                  {{ $t('staking.unstakeCINA') }}
                </el-button>
              </div>
            </div>
          </el-tab-pane>

        </el-tabs>
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
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import {
  Warning
} from '@element-plus/icons-vue'
import { parseUnits } from 'ethers'
import { InfoFilled, QuestionFilled, WarningFilled } from '@element-plus/icons-vue'

import TransactionModal from '@/components/common/TransactionModal.vue'
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'
import PullToRefresh from '@/components/common/PullToRefresh.vue'
import FormattedInput from '@/components/common/FormattedInput.vue'
import QuickAmounts from '@/components/common/QuickAmounts.vue'
import InfoCards from '@/components/common/InfoCards.vue'
import { useWalletStore } from '@/stores/wallet'
import { useStakingStore } from '@/stores/staking'
import { contractService } from '@/services/contracts'
import { formatNumber, formatNumberK, calculatePercentageAmount } from '@/utils/format'
import { debounce } from '@/utils/debounce'
import { usePullToRefresh } from '@/composables/usePullToRefresh'

const { t } = useI18n()
const walletStore = useWalletStore()
const stakingStore = useStakingStore()

const activeTab = ref('stake')
const stakeAmount = ref('')
const unstakeAmount = ref('')
const stakePreviewData = ref({
  shares: '',
  fee: '0'
})
const unstakePreviewData = ref({
  shares: ''
})

// Info Cards data
const infoCards = computed(() => [
  {
    icon: InfoFilled,
    title: t('staking.whatIsStaking'),
    content: t('staking.stakingDescription')
  },
  {
    icon: QuestionFilled,
    title: t('staking.stakingRewards'),
    content: t('staking.stakingRewardsDescription')
  },
  {
    icon: WarningFilled,
    title: t('staking.stakingRisks'),
    content: t('staking.stakingRisksDescription')
  }
])

const isQuickAmountModeOfStake = ref(false)
const isQuickAmountModeOfUnstake = ref(false)

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

  if (activeTab.value === 'stake' && stakeAmount.value) {
    details.push(
      { label: t('pay'), values: [`-${formatNumber(stakeAmount.value, 6)} CINA`], highlight: true, type: 'debit' },
      { label: t('receive'), values: [`+${formatNumber(stakePreviewData.value?.shares || '0', 6)} stCINA`], type: 'credit' }
    )
  } else if (activeTab.value === 'unstake' && unstakeAmount.value) {
    details.push(
      { label: t('pay'), values: [`-${formatNumber(unstakePreviewData.value?.shares || '0', 6)} stCINA`], type: 'debit' },
      { label: t('receive'), values: [`+${formatNumber(unstakeAmount.value, 6)} CINA`], highlight: true, type: 'credit' },
    )
  }

  return details
})

// Computed properties
const isStakeValid = computed(() => {
  const amount = parseFloat(stakeAmount.value)
  return amount > 0 &&
    amount <= parseFloat(stakingStore.cinaBalance) &&
    amount >= parseFloat(stakingStore.minStakeAmount)
})

const isUnstakeValid = computed(() => {
  const amount = parseFloat(unstakeAmount.value)
  return amount > 0 && amount <= parseFloat(stakingStore.stakedAmount)
})

const showMinStakeWarning = computed(() => {
  const amount = parseFloat(stakeAmount.value)
  return amount > 0 && amount < parseFloat(stakingStore.minStakeAmount)
})

// Debounced preview functions
const debouncedStakePreview = debounce(async (amount: string) => {
  if (amount && parseFloat(amount) > 0) {
    try {
      stakePreviewData.value = await stakingStore.previewDeposit(amount)
      console.log(stakePreviewData.value);
    } catch (error) {
      console.error('Failed to preview stake:', error)
    }
  } else {
    stakePreviewData.value = { shares: '', fee: '0' }
  }
}, 500)

const debouncedUnstakePreview = debounce(async (amount: string) => {
  if (amount && parseFloat(amount) > 0) {
    try {
      unstakePreviewData.value = await stakingStore.previewWithdraw(amount)
    } catch (error) {
      console.error('Failed to preview unstake:', error)
    }
  } else {
    unstakePreviewData.value = { shares: '' }
  }
}, 500)

// Methods
const handleStakeAmountChange = (value: string) => {
  isQuickAmountModeOfStake.value = false
  const cleanValue = value.replace(/[^0-9.]/g, '')
  stakeAmount.value = cleanValue
  debouncedStakePreview(cleanValue)
}

const handleUnstakeAmountChange = (value: string) => {
  isQuickAmountModeOfUnstake.value = false
  const cleanValue = value.replace(/[^0-9.]/g, '')
  unstakeAmount.value = cleanValue
  debouncedUnstakePreview(cleanValue)
}

const setStakePercentage = (percentage: number) => {
  isQuickAmountModeOfStake.value = true
  const amount = calculatePercentageAmount(stakingStore.cinaBalance, percentage)
  stakeAmount.value = amount
  debouncedStakePreview(amount)
}

const setMaxStake = () => {
  isQuickAmountModeOfStake.value = true
  stakeAmount.value = stakingStore.cinaBalance
  debouncedStakePreview(stakingStore.cinaBalance)
}

const setUnstakePercentage = (percentage: number) => {
  isQuickAmountModeOfUnstake.value = true
  const amount = calculatePercentageAmount(stakingStore.stakedAmount, percentage)
  unstakeAmount.value = amount
  debouncedUnstakePreview(amount)
}

const setMaxUnstake = () => {
  isQuickAmountModeOfUnstake.value = true
  unstakeAmount.value = stakingStore.stakedAmount
  debouncedUnstakePreview(stakingStore.stakedAmount)
}

const handleStake = async () => {
  if (!isStakeValid.value || !walletStore.isConnected) return

  transactionModalTitle.value = t('staking.stakeTransaction')
  showTransactionModal.value = true
  currentTransactionStep.value = 0
  transactionStatus.value = 'pending'

  try {
    const amountWei = parseUnits(stakeAmount.value, 18)

    // Step 1: Check and approve CINA if needed
    const stakingContract = contractService.getStakingVaultContract(true)
    const cinaContract = contractService.getCINAContract(true)

    if (!stakingContract || !cinaContract) {
      throw new Error('Contract not available')
    }

    const stakingAddress = await stakingContract.getAddress()
    const allowance = await cinaContract.allowance(walletStore.address, stakingAddress)

    if (allowance < amountWei) {
      transactionStatus.value = 'loading'
      const approveTx = await cinaContract.approve(stakingAddress, amountWei)
      await approveTx.wait()
    }

    currentTransactionStep.value = 1

    // Step 2: Execute staking
    transactionStatus.value = 'loading'
    const depositTx = await stakingContract.deposit(amountWei, walletStore.address)
    currentTransactionStep.value = 2
    isQuickAmountModeOfStake.value = false
    const receipt = await depositTx.wait()

    currentTransactionStep.value = 3
    transactionStatus.value = 'success'
    transactionHash.value = receipt.hash

    // Reset form and refresh data
    stakeAmount.value = ''
    await stakingStore.fetchStakingData()
    ElMessage.success(t('staking.stakeSuccess'))
  } catch (error: any) {
    transactionStatus.value = 'error'
    transactionError.value = error.message || t('staking.stakeFailed')
    console.error('Stake failed:', error)
  }
}

const handleUnstake = async () => {
  if (!isUnstakeValid.value || !walletStore.isConnected) return

  transactionModalTitle.value = t('staking.unstakeTransaction')
  showTransactionModal.value = true
  currentTransactionStep.value = 1
  transactionStatus.value = 'loading'

  try {
    const amountWei = parseUnits(unstakeAmount.value, 18)

    // Execute unstaking
    const stakingContract = contractService.getStakingVaultContract(true)
    if (!stakingContract) {
      throw new Error('Contract not available')
    }

    if (unstakeAmount.value == stakingStore.stakedAmount) {
      const withdrawTx = await stakingContract.redeem(
        parseUnits(stakingStore.stCINABalance, 18),
        walletStore.address,
        walletStore.address
      )
      currentTransactionStep.value = 2
      isQuickAmountModeOfUnstake.value = false
      const receipt = await withdrawTx.wait()

      currentTransactionStep.value = 3
      transactionStatus.value = 'success'
      transactionHash.value = receipt.hash
    } else {
      const withdrawTx = await stakingContract.withdraw(amountWei, walletStore.address, walletStore.address)
      currentTransactionStep.value = 2
      isQuickAmountModeOfUnstake.value = false
      const receipt = await withdrawTx.wait()

      currentTransactionStep.value = 3
      transactionStatus.value = 'success'
      transactionHash.value = receipt.hash
    }


    // Reset form and refresh data
    unstakeAmount.value = ''
    await stakingStore.fetchStakingData()
    ElMessage.success(t('staking.unstakeSuccess'))
  } catch (error: any) {
    transactionStatus.value = 'error'
    transactionError.value = error.message || t('staking.unstakeFailed')
    console.error('Unstake failed:', error)
  }
}

// Pull to refresh functionality
const refreshData = async () => {
  if (walletStore.isConnected) {
    await stakingStore.fetchStakingData()
  }
}

const { isRefreshing, pullDistance, isPulling, canRefresh } = usePullToRefresh({
  onRefresh: refreshData,
  enabled: true
})

// Lifecycle
onMounted(async () => {
  if (walletStore.isConnected) {
    await stakingStore.fetchStakingData()
    await stakingStore.startAutoRefresh()
  }
})

watch(
  () => stakingStore.cinaBalance,
  (newBalance) => {
    if (isQuickAmountModeOfStake.value) {
      stakeAmount.value = newBalance
      debouncedStakePreview(newBalance)
    }
  }
)

watch(
  () => stakingStore.stakedAmount,
  (newValue) => {
    if (isQuickAmountModeOfUnstake.value) {
      unstakeAmount.value = newValue
      debouncedUnstakePreview(newValue)
    }
  }
)

// Watch for wallet connection changes
watch(
  () => walletStore.isConnected,
  async (connected) => {
    if (connected) {
      await stakingStore.fetchStakingData()
      await stakingStore.startAutoRefresh();
    }
  }
)

// Watch for tab changes and reset input fields
watch(activeTab, (newTab) => {
  // Reset input amounts when switching tabs
  stakeAmount.value = ''
  stakePreviewData.value.shares = ''
  unstakeAmount.value = ''
  unstakePreviewData.value.shares = ''
})

const handleTransactionModalClose = () => {
  showTransactionModal.value = false
  transactionHash.value = ''
  transactionError.value = ''
}

const handleTransactionRetry = () => {
  if (activeTab.value === 'stake') {
    handleStake()
  } else {
    handleUnstake()
  }
}
</script>

<style scoped>
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
  @apply text-2xl font-bold mb-2 flex items-center gap-2;
  color: var(--number-color);
}

.token-icon {
  @apply w-8 h-8 rounded-full object-cover;
}

.animated-number {
  @apply flex items-center;
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

.staking-tabs {
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

.quick-amounts {
  @apply flex space-x-2;
}

.max-button {
  @apply hover:opacity-80;
  color: var(--primary-color);
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

.warning-info {
  @apply flex items-center gap-2 p-3 rounded-lg text-sm;
  background-color: color-mix(in oklab, var(--warning-color) 15%, transparent);
  border: 1px solid color-mix(in oklab, var(--warning-color) 30%, var(--border-color));
  color: var(--warning-color);
}

.warning-info.early-unstake {
  background-color: color-mix(in oklab, var(--error-color) 15%, transparent);
  border-color: color-mix(in oklab, var(--error-color) 30%, var(--border-color));
  color: var(--error-color);
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

.preview-row.penalty .preview-value {
  color: var(--error-color);
}

.exchange-rate {
  @apply pt-2 border-t;
  border-color: var(--border-color);
}

.preview-row.exchange-rate .preview-value {
  @apply font-semibold;
  color: var(--accent-color);
}

.action-button {
  @apply w-full h-12 text-base font-medium;
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