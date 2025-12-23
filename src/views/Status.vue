<template>
  <div class="h-full">
    <PullToRefresh :is-pulling="isPulling" :is-refreshing="isRefreshing" :pull-distance="pullDistance"
      :can-refresh="canRefresh" class="h-full">
      <!-- Tokens Section -->
      <div class="mb-8">
        <h2 class="section-title">{{ t('status.tokenContracts') }}</h2>
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          <div v-for="(token, key) in TOKENS" :key="key" class="token-card">
            <div class="token-header">
              <h3 class="token-name">{{ token.name }}</h3>
              <span class="token-badge">{{ token.symbol }}</span>
            </div>
            <div class="token-details">
              <div class="detail-row">
                <span class="detail-label">{{ t('status.decimals') }}:</span>
                <span class="detail-value">{{ token.decimals }}</span>
              </div>

              <!-- Total Supply -->
              <div class="detail-row">
                <span class="detail-label">{{ t('status.totalSupply') }}:</span>
                <span v-if="tokenData[key]?.loading" class="loading-text">{{ t('common.loading') }}</span>
                <span v-else class="detail-value">
                  <el-tooltip :content="formatNumber(tokenData[key]?.totalSupply, token.decimals)" placement="top">
                    {{ formatLargeNumber(tokenData[key]?.totalSupply) }} {{ token.symbol }}
                  </el-tooltip>
                </span>
              </div>

              <!-- User Balance -->
              <div class="detail-row" v-if="walletStore.isConnected">
                <span class="detail-label">{{ t('status.myBalance') }}:</span>
                <span v-if="tokenData[key]?.loading" class="loading-text">{{ t('common.loading') }}</span>
                <span v-else class="balance-value">
                  <el-tooltip :content="formatNumber(tokenData[key]?.userBalance, token.decimals)" placement="top">
                    {{ formatLargeNumber(tokenData[key]?.userBalance) }} {{ token.symbol }}
                  </el-tooltip>
                </span>
              </div>

              <div class="detail-row">
                <span class="detail-label">{{ t('status.address') }}:</span>
                <div class="address-container">
                  <div class="address-actions" v-if="getTokenAddress(token, selectedNetwork)">
                    {{ formatAddress(getTokenAddress(token, selectedNetwork) || '') || t('status.notDeployed') }}
                    <button @click="copyToClipboard(getTokenAddress(token, selectedNetwork)!)"
                      class="action-icon copy-icon" :title="t('status.copyAddress')">
                      <el-icon>
                        <DocumentCopy />
                      </el-icon>
                    </button>
                    <button @click="openInExplorer(getTokenAddress(token, selectedNetwork)!)"
                      class="action-icon explorer-icon" :title="t('status.viewOnExplorer')">
                      <el-icon>
                        <Link />
                      </el-icon>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="token-actions" v-if="getTokenAddress(token, selectedNetwork)">
                <button @click="openTransferModal(key)" :disabled="!walletStore.isConnected"
                  class="action-button primary-button">
                  {{ t('status.quickTransfer') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Contracts Section -->
      <div class="mb-6">
        <h2 class="section-title">{{ t('status.smartContracts') }}</h2>
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          <div v-for="(contract, key) in CONTRACTS" :key="key" class="contract-card">
            <div class="contract-header">
              <h3 class="contract-name">{{ formatContractName(key) }}</h3>
              <span class="contract-badge">{{ t('status.contract') }}</span>
            </div>
            <div class="contract-details">
              <div class="detail-row">
                <span class="detail-label">{{ t('status.address') }}:</span>
                <div class="address-container">

                  <div class="address-actions" v-if="getContractAddress(contract, selectedNetwork)">
                    {{ formatAddress(getContractAddress(contract,
                      selectedNetwork) || '0x0000000000000000000000000000000000000000') || t('status.notDeployed') }}
                    <button @click="copyToClipboard(getContractAddress(contract, selectedNetwork)!)"
                      class="action-icon copy-icon" :title="t('status.copyAddress')">
                      <el-icon>
                        <DocumentCopy />
                      </el-icon>
                    </button>
                    <button @click="openInExplorer(getContractAddress(contract, selectedNetwork)!)"
                      class="action-icon explorer-icon" :title="t('status.viewOnExplorer')">
                      <el-icon>
                        <Link />
                      </el-icon>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <!-- Action Buttons -->
            <div class="contract-actions">
              <button @click="openQueryModal(key, false)" class="action-button secondary-button">
                {{ t('status.queryBalance') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </PullToRefresh>

    <!-- Query Balance Modal -->
    <div v-if="showQueryModal" class="modal-overlay">
      <div class="modal-content">
        <h3 class="modal-title">{{ t('status.queryBalanceModal.title') }}</h3>
        <div class="modal-body">
          <div>
            <label class="input-label">{{ t('status.queryBalanceModal.walletAddress') }}</label>
            <input v-model="queryAddress" type="text" :placeholder="t('status.queryBalanceModal.placeholder')"
              class="modal-input" />
          </div>
          <div class="modal-actions">
            <button @click="queryAddressBalance" :disabled="!queryAddress || isQuerying"
              class="modal-button primary-button">
              {{ isQuerying ? t('status.queryBalanceModal.querying') : t('status.queryBalanceModal.query') }}
            </button>
            <button @click="showQueryModal = false" class="modal-button secondary-button">
              {{ t('status.queryBalanceModal.cancel') }}
            </button>
          </div>

          <!-- Query Results -->
          <div v-if="Object.keys(queryResults).length > 0" class="query-results">
            <h4 class="results-title">{{ t('status.queryBalanceModal.results') }}</h4>
            <div v-for="(balance, tokenKey) in queryResults" :key="tokenKey" class="result-item">
              <span class="result-label">{{ TOKENS[tokenKey as keyof typeof TOKENS].symbol }}</span>
              <span class="result-value">{{ balance }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Transfer Modal -->
    <div v-if="showTransferModal" class="modal-overlay">
      <div class="modal-content">
        <h3 class="modal-title">{{ t('status.transferModal.title') }} - {{ TOKENS[transferData.tokenKey as keyof typeof
          TOKENS]?.symbol }}</h3>
        <div class="modal-body">
          <div>
            <label class="input-label">{{ t('status.transferModal.receiverAddress') }}</label>
            <input v-model="transferData.toAddress" type="text"
              :placeholder="t('status.transferModal.receiverPlaceholder')" class="modal-input" />
          </div>
          <div>
            <label class="input-label">{{ t('status.transferModal.transferAmount') }}</label>
            <input v-model="transferData.amount" type="number" step="0.000001"
              :placeholder="t('status.transferModal.amountPlaceholder')" class="modal-input" />
            <div class="balance-hint">
              {{ t('status.transferModal.availableBalance') }}: {{ tokenData[transferData.tokenKey]?.userBalance }} {{
                TOKENS[transferData.tokenKey as keyof typeof TOKENS]?.symbol }}
            </div>
          </div>
          <div class="modal-actions">
            <button @click="executeTransfer"
              :disabled="!transferData.toAddress || !transferData.amount || transferData.loading"
              class="modal-button primary-button">
              {{ transferData.loading ? t('status.transferModal.transferring') :
                t('status.transferModal.confirmTransfer') }}
            </button>
            <button @click="showTransferModal = false" :disabled="transferData.loading"
              class="modal-button secondary-button">
              {{ t('status.transferModal.cancel') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <div v-if="showToast" class="toast-notification">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { NETWORKS, TOKENS, CONTRACTS } from '@/constants'
import { useWalletStore } from '@/stores/wallet'
import { contractService } from '@/services/contracts'
import { formatEther, formatUnits, parseUnits } from 'ethers'
import { formatLargeNumber, formatNumber, formatAddress } from '@/utils/format'
import PullToRefresh from '@/components/common/PullToRefresh.vue'
import { usePullToRefresh } from '@/composables/usePullToRefresh'
import { DocumentCopy, Link } from '@element-plus/icons-vue'

const { t } = useI18n()

const { isRefreshing, isPulling, pullDistance, canRefresh } = usePullToRefresh({
  onRefresh: async () => {
    await loadTokenData()
  },
})

const walletStore = useWalletStore()
const selectedNetwork = ref(walletStore.chainId || 1) // Default to current wallet network or Ethereum mainnet
const showToast = ref(false)
const toastMessage = ref(t('status.toast.addressCopied'))

// Token data state
const tokenData = ref<Record<string, {
  totalSupply: string
  userBalance: string
  loading: boolean
}>>({})

// Query functionality state
const queryAddress = ref('')
const queryResults = ref<Record<string, string>>({})
const isQuerying = ref(false)
const showQueryModal = ref(false)

// Transfer functionality state
const showTransferModal = ref(false)
const transferData = ref({
  tokenKey: '',
  toAddress: '',
  amount: '',
  loading: false
})

// Watch for wallet network changes
watch(
  () => walletStore.chainId,
  (newChainId) => {
    if (newChainId && newChainId !== selectedNetwork.value) {
      selectedNetwork.value = newChainId
      loadTokenData()
    }
  },
  { immediate: true }
)

const availableNetworks = computed(() => {
  return Object.values(NETWORKS).filter(network => network.chainId !== undefined)
})

const currentNetwork = computed(() => {
  return Object.values(NETWORKS).find(network => network.chainId === selectedNetwork.value)
})

const getTokenAddress = (token: any, chainId: number): string | null => {
  return token.addresses[chainId] || null
}

const getContractAddress = (contract: any, chainId: number, isToken = false): string | null => {
  if (isToken) {
    return contract.addresses[chainId] || null
  }
  return contract[chainId] || null
}

const formatContractName = (key: string): string => {
  return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

const openInExplorer = (address: string) => {
  const network = currentNetwork.value
  if (network?.blockExplorer) {
    const url = `${network.blockExplorer}/address/${address}`
    window.open(url, '_blank')
  }
}

const showToastMessage = (message: string) => {
  toastMessage.value = message
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    showToastMessage(t('status.toast.addressCopied'))
  } catch (err) {
    console.error('复制失败:', err)
  }
}

// Load token data (total supply and user balance)
const loadTokenData = async () => {
  if (!walletStore.provider) return

  for (const [key, token] of Object.entries(TOKENS)) {
    tokenData.value[key] = {
      totalSupply: '0',
      userBalance: '0',
      loading: true
    }

    try {
      const tokenAddress = getTokenAddress(token, selectedNetwork.value)
      if (!tokenAddress) continue

      const contract = contractService.getERC20Contract(tokenAddress)
      if (!contract) continue

      const [totalSupply, userBalance] = await Promise.all([
        contract.totalSupply(),
        walletStore.address ? contract.balanceOf(walletStore.address) : Promise.resolve(0)
      ])

      tokenData.value[key] = {
        totalSupply: formatUnits(totalSupply, token.decimals),
        userBalance: formatUnits(userBalance, token.decimals),
        loading: false
      }
    } catch (error) {
      console.error(`Failed to load data for ${key}:`, error)
      tokenData.value[key].loading = false
    }
  }
}

// Watch for wallet connection changes
watch(
  () => walletStore.isConnected,
  () => {
    loadTokenData()
  },
  { immediate: true }
)

// Watch for selected network changes
watch(
  selectedNetwork,
  () => {
    loadTokenData()
  }
)

// Query address balance
const queryAddressBalance = async () => {
  if (!queryAddress.value || !walletStore.provider) return

  isQuerying.value = true
  queryResults.value = {}

  try {
    for (const [key, token] of Object.entries(TOKENS)) {
      const tokenAddress = getTokenAddress(token, selectedNetwork.value)
      if (!tokenAddress) continue

      const contract = contractService.getERC20Contract(tokenAddress)
      if (!contract) continue

      const balance = await contract.balanceOf(queryAddress.value)
      queryResults.value[key] = formatEther(balance)
    }
  } catch (error) {
    console.error('Failed to query address balance:', error)
    toastMessage.value = t('status.balanceModal.queryFailed')
    showToast.value = true
    setTimeout(() => {
      showToast.value = false
    }, 2000)
  } finally {
    isQuerying.value = false
  }
}

const openQueryModal = (key: string, isToken = true) => {
  const token = isToken ? TOKENS[key as keyof typeof TOKENS] : CONTRACTS[key as keyof typeof CONTRACTS]
  queryAddress.value = getContractAddress(token, selectedNetwork.value, isToken) || ''
  queryResults.value = {}
  showQueryModal.value = true
  queryAddressBalance();
}

// Open transfer modal
const openTransferModal = (tokenKey: string) => {
  transferData.value = {
    tokenKey,
    toAddress: '',
    amount: '',
    loading: false
  }
  showTransferModal.value = true
}

// Execute transfer
const executeTransfer = async () => {
  if (!transferData.value.toAddress || !transferData.value.amount || !walletStore.signer) {
    return
  }

  transferData.value.loading = true

  try {
    const token = TOKENS[transferData.value.tokenKey as keyof typeof TOKENS]
    const tokenAddress = getTokenAddress(token, selectedNetwork.value)
    if (!tokenAddress) throw new Error('Token not deployed on this network')

    const contract = contractService.getERC20Contract(tokenAddress, true)
    if (!contract) throw new Error('Failed to get contract')

    const amount = String(transferData.value.amount);
    const tx = await contract.transfer(transferData.value.toAddress, parseUnits(amount, token.decimals))

    toastMessage.value = t('status.toast.transferSubmitted')
    showToast.value = true
    setTimeout(() => {
      showToast.value = false
    }, 3000)

    await tx.wait()

    toastMessage.value = t('status.toast.transferSuccess')
    showToast.value = true
    setTimeout(() => {
      showToast.value = false
    }, 2000)

    showTransferModal.value = false
    loadTokenData() // Refresh balances
  } catch (error: any) {
    console.error('Transfer failed:', error)
    toastMessage.value = `${t('status.toast.transferFailed')}: ${error.message || t('status.toast.unknownError')}`
    showToast.value = true
    setTimeout(() => {
      showToast.value = false
    }, 3000)
  } finally {
    transferData.value.loading = false
  }
}

// Initialize data on mount
onMounted(() => {
  loadTokenData()
})
</script>

<style scoped>
/* Status Page Styles */
.page-title {
  font-size: 1.875rem;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 2rem;
}

.section-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 24px;
}

.token-card,
.contract-card {
  background-color: var(--card-bg);
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

/* .token-card:hover,
.contract-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
} */

.token-header,
.contract-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.token-name,
.contract-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.token-badge {
  padding: 0.25rem 0.5rem;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
}

.contract-badge {
  padding: 0.25rem 0.5rem;
  background-color: var(--success-color);
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
}

.token-details,
.contract-details {
  margin-bottom: 1rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
}

.detail-label {
  color: var(--text-secondary);
}

.detail-value {
  color: var(--text-secondary);
}

.loading-text {
  color: var(--text-secondary);
}

.balance-value {
  color: var(--text-secondary);
}

.address-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.address-actions {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  color: var(--text-secondary);
}

.action-icon {
  display: flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-icon:hover {
  color: var(--primary-color);
}

.explorer-icon {
  color: var(--text-secondary);
}

.copy-icon {
  color: var(--text-secondary);
}

.token-actions,
.contract-actions {
  display: flex;
  gap: 0.5rem;
}

.action-button {
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border-radius: 0.375rem;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.primary-button {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: var(--button-bg);
}

.primary-button:hover:not(:disabled) {
  background-color: var(--bg-primary);
  border-color: var(--button-primary-hover);
  color: var(--text-primary);
}

.secondary-button {
  background-color: var(--bg-secondary);
  border-color: var(--border-color);
  color: var(--text-secondary);
}

.secondary-button:hover:not(:disabled) {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal-content {
  background-color: var(--card-bg);
  border-radius: 0.5rem;
  padding: 1.5rem;
  width: 100%;
  max-width: 28rem;
  margin: 1rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.modal-body {
  margin-bottom: 1rem;
}

.input-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.modal-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  background-color: var(--card-bg);
  color: var(--text-primary);
  font-size: 0.875rem;
}

.modal-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color);
}

.modal-input::placeholder {
  color: var(--text-secondary);
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.modal-button {
  flex: 1;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.balance-hint {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.query-results {
  margin-top: 1rem;
}

.results-title {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background-color: var(--bg-secondary);
  border-radius: 0.375rem;
  margin-bottom: 0.25rem;
}

.result-label {
  font-weight: 500;
  color: var(--text-primary);
}

.result-value {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Toast Notification */
.toast-notification {
  position: fixed;
  top: 1rem;
  right: 1rem;
  background-color: var(--success-color);
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 0.375rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  z-index: 50;
  transition: all 0.3s ease;
}

code {
  word-break: break-all;
  max-width: 200px;
  display: inline-block;
}

/* Dark mode transitions */
* {
  transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
}

/* Custom scrollbar for dark mode */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  @apply bg-gray-100 dark:bg-gray-800;
}

::-webkit-scrollbar-thumb {
  @apply bg-gray-300 dark:bg-gray-600 rounded;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400 dark:bg-gray-500;
}

@media (max-width: 768px) {
  code {
    max-width: 220px;
  }
}
</style>