<template>
  <div class="h-full">
    <PullToRefresh :is-pulling="isPulling" :is-refreshing="isRefreshing" :pull-distance="pullDistance"
      :can-refresh="canRefresh">
      <!-- Vault Overview -->
      <div class="vault-overview">
        <h2 class="section-title">
          {{ $t('savings.vaultOverview') }}
        </h2>

        <div class="overview-grid">
          <!-- Total Assets -->
          <div class="overview-card">
            <div class="card-header">
              <h3 class="card-title">{{ $t('savings.assetValue') }}</h3>
              <div class="card-subtitle">
                {{ $t('savings.apy') }} {{ formatNumber(savingsStore.dynamicAPY) }}%
              </div>
            </div>
            <div class="card-value">
              <img src="../assets/wrmb.png" alt="" class="wrmb-icon">
              <AnimatedNumber class="animated-number" :value="savingsStore.userAssetValue"
                :auto-increment="walletStore.isConnected && parseFloat(savingsStore.userAssetValue) > 0"
                :increment-amount="parseFloat(savingsStore.userIncrementAmount)" :increment-interval="1000"
                :cache-key="`userAssetValue_${walletStore.address}`" :use-cache="false" />
            </div>
          </div>
        </div>
      </div>

      <!-- Action Tabs -->
      <div class="action-section">
        <el-tabs v-model="activeTab" class="savings-tabs">
          <!-- Deposit Tab -->
          <el-tab-pane :label="$t('savings.deposit')" name="deposit">
            <div class="tab-content">
              <div class="action-form">
                <div class="input-section">
                  <div class="input-group">
                    <FormattedInput v-model="depositAmount"
                      :placeholder="formatNumberK(savingsStore.wrmbBalance) + '  ' + $t('available')" size="large"
                      class="amount-input" :decimals="6" :use-abbreviation="true" :max-decimals="18"
                      @input-change="handleDepositAmountChange">
                      <div class="token-symbol-selected">
                        <TokenIcon symbol="WRMB" size="medium" />
                        <span class="token-symbol-text">WRMB</span>
                      </div>
                    </FormattedInput>
                  </div>

                  <!-- Quick Amount Buttons -->
                  <QuickAmounts :max-label="$t('common.max')" @select-percentage="setDepositPercentage"
                    @select-max="setMaxDeposit" />
                </div>

                <!-- Preview -->
                <div v-if="depositPreview.shares" class="preview-section">
                  <h4 class="preview-title">{{ $t('savings.preview') }}</h4>
                  <div class="preview-details">
                    <div class="preview-row">
                      <span>{{ $t('savings.youWillReceive') }}</span>
                      <span class="preview-value">{{ formatNumber(depositPreview.shares, 2) }} sWRMB</span>
                    </div>
                    <div class="preview-row exchange-rate">
                      <span>{{ $t('savings.currentExchangeRate') }}</span>
                      <span class="preview-value">1 WRMB ≈ {{ formatNumber((1 / parseFloat(savingsStore.currentNAV ||
                        '1')), 6) }}
                        sWRMB</span>
                    </div>
                  </div>
                </div>

                <el-button type="primary" size="large" :loading="savingsStore.depositInProgress"
                  :disabled="!isDepositValid" @click="handleDeposit" class="action-button">
                  {{ $t('savings.deposit') }}
                </el-button>
              </div>
            </div>
          </el-tab-pane>

          <!-- Withdraw Tab -->
          <el-tab-pane :label="$t('savings.withdraw')" name="withdraw">
            <div class="tab-content">
              <div class="action-form">
                <div class="input-section">
                  <div class="input-group">
                    <FormattedInput v-model="withdrawAmount"
                      :placeholder="formatNumberK(savingsStore.userAssetValue) + '  ' + $t('available')" size="large"
                      class="amount-input" :decimals="6" :use-abbreviation="true" :max-decimals="18"
                      @input-change="handleWithdrawAmountChange">
                      <div class="token-symbol-selected">
                        <TokenIcon symbol="WRMB" size="medium" />
                        <span class="token-symbol-text">WRMB</span>
                      </div>
                    </FormattedInput>
                  </div>

                  <!-- Quick Amount Buttons -->
                  <QuickAmounts :max-label="$t('common.max')" @select-percentage="setWithdrawPercentage"
                    @select-max="setMaxWithdraw" />
                </div>

                <!-- Preview -->
                <div v-if="withdrawPreview.shares" class="preview-section">
                  <h4 class="preview-title">{{ $t('savings.preview') }}</h4>
                  <div class="preview-details">
                    <div class="preview-row">
                      <span>{{ $t('savings.youWillReceive') }}</span>
                      <span class="preview-value">{{ formatNumber(withdrawPreview.assets, 2) }} WRMB</span>
                    </div>
                    <div class="preview-row">
                      <span>{{ $t('savings.fee') }} ({{ formatNumber((parseFloat(withdrawPreview.fee) *
                        100).toString())
                        }}%)</span>
                      <span class="fee-value">{{ formatNumber(withdrawPreviewFee, 2) }} WRMB</span>
                    </div>

                    <div class="preview-row exchange-rate">
                      <span>{{ $t('savings.currentExchangeRate') }}</span>
                      <span class="preview-value">1 sWRMB ≈ {{ formatNumber(savingsStore.currentNAV, 6) }} WRMB</span>
                    </div>
                  </div>
                </div>

                <el-button type="primary" size="large" :loading="savingsStore.withdrawInProgress"
                  :disabled="!isWithdrawValid" @click="handleWithdraw" class="action-button">
                  {{ $t('savings.withdraw') }}
                </el-button>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- Statistics -->
      <div class="statistics-section">
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-label">{{ $t('savings.totalSupply') }}</div>
            <div class="stat-value">{{ formatNumberK(savingsStore.totalAssets) }}</div>
          </div>

          <div class="stat-item">
            <div class="stat-label">{{ $t('savings.yourShare') }}</div>
            <div class="stat-value">{{ formatNumberK(savingsStore.userSharePercentage) }}%</div>
          </div>

          <div class="stat-item">
            <div class="stat-label">{{ $t('savings.totalValue') }}</div>
            <div class="stat-value">${{ formatNumberK(parseFloat(savingsStore.totalAssets) * 0.14, 2) }}</div>
          </div>

          <div class="stat-item">
            <div class="stat-label">{{ $t('savings.yourValue') }}</div>
            <div class="stat-value">${{ formatNumberK(parseFloat(savingsStore.userAssetValue) * 0.14, 2) }}</div>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { parseUnits } from 'ethers'
import { InfoFilled, QuestionFilled, WarningFilled } from '@element-plus/icons-vue'

import PullToRefresh from '@/components/common/PullToRefresh.vue'
import TransactionModal from '@/components/common/TransactionModal.vue'
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'
import FormattedInput from '@/components/common/FormattedInput.vue'
import QuickAmounts from '@/components/common/QuickAmounts.vue'
import InfoCards from '@/components/common/InfoCards.vue'
import { useSavingsStore } from '@/stores/savings'
import { useWalletStore } from '@/stores/wallet'
import { contractService } from '@/services/contracts'
import { formatNumber, formatNumberK, calculatePercentageAmount } from '@/utils/format'
import { debounce } from '@/utils/debounce'
import { usePullToRefresh } from '@/composables/usePullToRefresh'

const { t } = useI18n()
const savingsStore = useSavingsStore()
const walletStore = useWalletStore()

const activeTab = ref('deposit')
const depositAmount = ref('')
const withdrawAmount = ref('')
const depositPreview = ref({
  shares: '',
  fee: '0'
})
const withdrawPreview = ref({
  shares: '',
  assets: '',
  fee: '0'
})

// Info Cards data
const infoCards = computed(() => [
  {
    icon: InfoFilled,
    title: t('savings.whatIsSavings'),
    content: t('savings.savingsDescription')
  },
  {
    icon: QuestionFilled,
    title: t('savings.savingsFees'),
    content: t('savings.savingsFeesDescription')
  },
  {
    icon: WarningFilled,
    title: t('savings.savingsRisks'),
    content: t('savings.savingsRisksDescription')
  }
])

const isQuickAmountModeOfDeposit = ref(false)
const isQuickAmountModeOfWithdraw = ref(false)

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

  if (activeTab.value === 'deposit' && depositAmount.value) {
    details.push(
      { label: t('pay'), values: [`-${formatNumber(depositAmount.value, 6)} WRMB`], highlight: true, type: 'debit' },
      { label: t('receive'), values: [`+${formatNumber(depositPreview.value?.shares || '0', 6)} sWRMB`], type: 'credit' }
    )
  } else if (activeTab.value === 'withdraw' && withdrawAmount.value) {
    details.push(
      { label: t('pay'), values: [`-${formatNumber(withdrawPreview.value?.shares || '0', 6)} sWRMB`], type: 'debit' },
      { label: t('receive'), values: [`+${formatNumber(withdrawPreview.value?.assets || '0', 6)} WRMB`], highlight: true, type: 'credit' },
    )
    // if (parseFloat(withdrawPreviewFee.value) > 0) {
    //   details.push({ label: t('savings.fee'), value: `-${formatNumber(withdrawPreviewFee.value, 6)} WRMB`, type: 'debit' })
    // }
  }

  return details
})

const isDepositValid = computed(() => {
  const amount = parseFloat(depositAmount.value)
  return amount > 0 && amount <= parseFloat(savingsStore.wrmbBalance)
})

const isWithdrawValid = computed(() => {
  const amount = parseFloat(withdrawAmount.value)
  const maxWithdrawable = parseFloat(savingsStore.userAssetValue)
  return amount > 0 && amount <= maxWithdrawable
})

const withdrawPreviewFee = computed(() => {
  const amount = parseFloat(withdrawAmount.value)
  const fee = parseFloat(withdrawPreview.value.fee)
  return (amount * fee).toString()
})

// Debounced preview functions
const debouncedDepositPreview = debounce(async (amount: string) => {
  if (amount && parseFloat(amount) > 0) {
    try {
      depositPreview.value = await savingsStore.previewDeposit(amount)
    } catch (error) {
      console.error('Failed to preview deposit:', error)
    }
  } else {
    depositPreview.value = { shares: '', fee: '0' }
  }
}, 500)

const debouncedWithdrawPreview = debounce(async (amount: string) => {
  if (amount && parseFloat(amount) > 0) {
    try {
      withdrawPreview.value = await savingsStore.previewWithdraw(amount)
    } catch (error) {
      console.error('Failed to preview withdraw:', error)
    }
  } else {
    withdrawPreview.value = { shares: '', assets: '', fee: '0' }
  }
}, 500)

const handleDepositAmountChange = (value: string) => {
  isQuickAmountModeOfDeposit.value = false
  debouncedDepositPreview(value)
}

const handleWithdrawAmountChange = (value: string) => {
  isQuickAmountModeOfWithdraw.value = false
  debouncedWithdrawPreview(value)
}

const setMaxDeposit = () => {
  isQuickAmountModeOfDeposit.value = true;
  depositAmount.value = savingsStore.wrmbBalance
  debouncedDepositPreview(depositAmount.value)
}

const setMaxWithdraw = () => {
  isQuickAmountModeOfWithdraw.value = true
  withdrawAmount.value = savingsStore.userAssetValue
  debouncedWithdrawPreview(withdrawAmount.value)
}

const setDepositPercentage = (percentage: number) => {
  isQuickAmountModeOfDeposit.value = true
  const amount = calculatePercentageAmount(savingsStore.wrmbBalance, percentage)
  depositAmount.value = amount
  debouncedDepositPreview(amount)
}

const setWithdrawPercentage = (percentage: number) => {
  isQuickAmountModeOfWithdraw.value = true
  const amount = calculatePercentageAmount(savingsStore.userAssetValue, percentage)
  withdrawAmount.value = amount
  debouncedWithdrawPreview(amount)
}

const handleDeposit = async () => {
  if (!isDepositValid.value || !walletStore.isConnected) return

  transactionModalTitle.value = t('savings.depositTransaction')
  showTransactionModal.value = true
  currentTransactionStep.value = 0
  transactionStatus.value = 'pending'
  try {
    const amountWei = parseUnits(depositAmount.value, 18)

    // Step 1: Check and approve WRMB if needed
    const wrmbContract = contractService.getWRMBContract(true)
    const savingsContract = contractService.getSavingsVaultContract(true)

    if (!wrmbContract || !savingsContract) {
      throw new Error('Contract not available')
    }

    const savingsAddress = await savingsContract.getAddress()
    const allowance = await wrmbContract.allowance(walletStore.address, savingsAddress)

    if (allowance < amountWei) {
      transactionStatus.value = 'loading'
      const approveTx = await wrmbContract.approve(savingsAddress, amountWei)
      await approveTx.wait()
    }

    currentTransactionStep.value = 1

    // Step 2: Execute deposit
    transactionStatus.value = 'loading'
    const depositTx = await savingsContract.deposit(amountWei, walletStore.address)
    currentTransactionStep.value = 2
    isQuickAmountModeOfDeposit.value = false
    const receipt = await depositTx.wait()

    currentTransactionStep.value = 3
    transactionStatus.value = 'success'
    transactionHash.value = receipt.hash

    // Reset form and refresh data
    depositAmount.value = ''
    depositPreview.value = { shares: '', fee: '0' }
    await savingsStore.fetchVaultData()
    ElMessage.success(t('savings.depositSuccess'))
  } catch (error: any) {
    transactionStatus.value = 'error'
    transactionError.value = error.message || t('savings.depositFailed')
    console.error('Deposit failed:', error)
  }
}

const handleWithdraw = async () => {
  if (!isWithdrawValid.value || !walletStore.isConnected) return

  // 检查手续费是否超过10%，需要二次确认
  const feePercentage = parseFloat(withdrawPreview.value.fee) * 100
  if (feePercentage > 10) {
    const confirmed = await ElMessageBox.confirm(
      `${t('savings.highFeeWarning')} ${formatNumber(feePercentage.toString(), 2)}%。${t('savings.confirmHighFeeWithdraw')}`,
      t('savings.highFeeTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
        dangerouslyUseHTMLString: false
      }
    ).catch(() => false)

    if (!confirmed) {
      return
    }
  }

  transactionModalTitle.value = t('savings.withdrawTransaction')
  showTransactionModal.value = true
  currentTransactionStep.value = 1
  transactionStatus.value = 'loading'

  try {
    const amountWei = parseUnits(withdrawAmount.value, 18)

    // Execute withdraw
    const savingsContract = contractService.getSavingsVaultContract(true)
    if (!savingsContract) {
      throw new Error('Contract not available')
    }

    if (withdrawAmount.value === savingsStore.userAssetValue) {
      const withdrawTx = await savingsContract.redeem(
        parseUnits(savingsStore.userBalance, 18),
        walletStore.address,
        walletStore.address
      )
      currentTransactionStep.value = 2
      isQuickAmountModeOfWithdraw.value = false
      const receipt = await withdrawTx.wait()

      currentTransactionStep.value = 3
      transactionStatus.value = 'success'
      transactionHash.value = receipt.hash
    } else {
      const withdrawTx = await savingsContract.withdraw(
        amountWei,
        walletStore.address,
        walletStore.address
      )
      currentTransactionStep.value = 2
      isQuickAmountModeOfWithdraw.value = false
      const receipt = await withdrawTx.wait()

      currentTransactionStep.value = 3
      transactionStatus.value = 'success'
      transactionHash.value = receipt.hash
    }


    // Reset form and refresh data
    withdrawAmount.value = ''
    withdrawPreview.value = { shares: '', assets: '', fee: '0' }
    await savingsStore.fetchVaultData()
    ElMessage.success(t('savings.withdrawSuccess'))
  } catch (error: any) {
    transactionStatus.value = 'error'
    transactionError.value = error.message || t('savings.withdrawFailed')
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

const refreshData = async () => {
  await Promise.all([
    savingsStore.fetchVaultData(),
    savingsStore.fetchUserBalances(),
    savingsStore.fetchWRMBPrice()
  ])
}

// Pull to refresh functionality
const { isRefreshing, pullDistance, isPulling, canRefresh } = usePullToRefresh({
  onRefresh: refreshData,
  enabled: true
})

onMounted(async () => {
  if (walletStore.isConnected) {
    await refreshData()
    savingsStore.startAutoRefresh()
  } else {
    // Even if wallet is not connected, fetch basic vault data and price
    await savingsStore.fetchVaultData()
  }
})

watch(
  () => savingsStore.wrmbBalance,
  (newBalance) => {
    if (isQuickAmountModeOfDeposit.value) {
      depositAmount.value = newBalance
      debouncedDepositPreview(newBalance)
    }
  }
)

watch(
  () => savingsStore.userAssetValue,
  (newValue) => {
    if (isQuickAmountModeOfWithdraw.value) {
      withdrawAmount.value = newValue
      debouncedWithdrawPreview(newValue)
    }
  }
)

// Watch for wallet connection changes
watch(
  () => walletStore.isConnected,
  async (connected) => {
    if (connected) {
      await refreshData()
      savingsStore.startAutoRefresh()
    } else {
      savingsStore.stopAutoRefresh()
    }
  }
)

// Watch for chainId changes
watch(
  () => walletStore.chainId,
  async (chainId) => {
    if (chainId) {
      await refreshData()
    }
  }
)

// Watch for tab changes and reset input fields
watch(activeTab, (newTab) => {
  // Reset input amounts and previews when switching tabs
  depositAmount.value = ''
  withdrawAmount.value = ''
  depositPreview.value = { shares: '', fee: '0' }
  withdrawPreview.value = { shares: '', assets: '', fee: '0' }
})
</script>

<style scoped>
.section {
  margin-left: 4rem;
  padding-top: 2rem;
}

.section-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 24px;
}

.overview-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

.overview-card {
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 24px;
  transition: all 0.2s ease;
}

.overview-card.highlight {
  background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
  color: white;
  border-color: var(--primary-color);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.overview-card.highlight .card-title {
  color: rgba(255, 255, 255, 0.8);
}

.card-icon {
  font-size: 20px;
  color: var(--text-secondary);
}

.overview-card.highlight .card-icon {
  color: rgba(255, 255, 255, 0.6);
}

.card-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--number-color);
  display: flex;
  align-items: center;
  gap: 8px;
}

.wrmb-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.animated-number {
  display: flex;
  align-items: center;
}

.overview-card.highlight .card-value {
  color: white;
}

.card-subtitle {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.overview-card.highlight .card-subtitle {
  color: rgba(255, 255, 255, 0.8);
}

.action-section {
  background-color: var(--card-bg);
  border-radius: 12px;
  margin-top: 24px;
}

.savings-tabs {
  padding: 24px;
}

.tab-content {
  margin-top: 24px;
}

.action-form {
  max-width: 448px;
  margin: 0 auto;
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.form-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.balance-info {
  font-size: 14px;
}

.balance-label {
  color: var(--text-secondary);
}

.balance-value {
  font-weight: 500;
  color: var(--text-primary);
  margin-left: 4px;
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.amount-input {
  flex: 1;
}

.input-suffix {
  color: var(--text-secondary);
  font-weight: 500;
}

.preview-section {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.preview-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.preview-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
}

.preview-row span:first-child {
  color: var(--text-secondary);
}

.preview-row.exchange-rate {
  border-top: 1px solid var(--border-color);
  padding-top: 8px;
  margin-top: 8px;
}

.preview-row.exchange-rate .preview-value {
  color: var(--accent-color);
  font-weight: 600;
}

.preview-value {
  font-weight: 500;
  color: var(--text-primary);
}

.fee-value {
  color: var(--warning-color);
  font-weight: 500;
}

.action-button {
  width: 100%;
}

.statistics-section {
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 24px;
  margin-top: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  max-width: 480px;
  margin: 0 auto;
  justify-items: center;
}

@media (min-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-item {
  text-align: center;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--number-color);
}

:deep(.el-tabs__header) {
  margin-bottom: 0;
}

:deep(.el-tabs__nav-wrap::after) {
  background-color: var(--border-color);
}

:deep(.el-tabs__active-bar) {
  background-color: var(--primary-color);
  font-weight: 600;
}

:deep(.el-tabs__item) {
  color: var(--text-secondary);
}

:deep(.el-tabs__item.is-active) {
  color: var(--primary-color);
  font-weight: 600;
}

@media (max-width: 768px) {
  .section {
    margin-left: 1rem;
  }

  .overview-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .action-form {
    max-width: 100%;
  }
}
</style>