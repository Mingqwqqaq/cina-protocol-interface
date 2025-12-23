<template>
  <div class="srmb-token-selector">
    <!-- 触发按钮：展示当前选择或占位 -->
    <div class="token-symbol-btn" @click="openDialog">
      <span v-if="selectedTokenInfo" class="token-symbol-selected">
        <TokenIcon :symbol="selectedTokenInfo.symbol" size="medium" />
        <span class="token-symbol-text">{{ selectedTokenInfo.symbol }}</span>
      </span>
      <span v-else>
        {{ $t('wrap.selectToken') }}
      </span>
      <el-icon><arrow-down /></el-icon>
    </div>

    <!-- 选择模态框 -->
    <el-dialog v-model="dialogVisible" :title="$t('wrap.selectToken')" :width="dialogWidth" :append-to-body="true"
      destroy-on-close>
      <div class="selector-dialog-body">
        <!-- 合约地址直输区 -->
        <div class="address-input-section">
          <el-input v-model="addressInput" :placeholder="$t('tokenSelector.enterContractAddress')" clearable
            :disabled="loadingAddress || disabled" @keyup.enter="handleAddressSelect">
            <template #append>
              <el-button type="primary" :loading="loadingAddress" :disabled="disabled" @click="handleAddressSelect">
                {{ $t('common.select') }}
              </el-button>
            </template>
          </el-input>
          <div class="address-input-tips">
            {{ $t('tokenSelector.onlyActiveContracts') }}
          </div>
        </div>

        <!-- 快捷选择：最近选择 -->
        <div class="quick-section" v-if="recentTokensResolved.length">
          <div class="section-title">{{ $t('tokenSelector.recentlySelected') }}</div>
          <div class="quick-tokens-grid">
            <div v-for="t in recentTokensResolved" :key="t.address" class="quick-token-card" @click="selectToken(t.address)">
              <TokenIcon :symbol="t.symbol" size="large" />
              <div class="quick-token-details">
                <div class="quick-token-symbol">{{ t.symbol }}</div>
                <div class="quick-token-balance">{{ t.balance }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 全量列表 -->
        <div class="list-section" v-loading="loadingDialog">
          <div class="section-title">{{ $t('tokenSelector.allTokens') }}</div>
          <el-empty v-if="!availableTokens.length && !loading" :description="$t('tokenSelector.noAvailableTokens')" />
          <el-scrollbar v-else height="260px">
            <div v-for="token in availableTokens" :key="token.address" class="token-row"
              @click="selectToken(token.address)">
              <div class="token-main">
                <TokenIcon :symbol="token.symbol" size="large" />
                <div class="token-info">
                  <div class="token-symbol">{{ token.symbol }}</div>
                  <div class="token-name">{{ token.name }}</div>
                </div>
              </div>
              <div class="token-extra">
                <div class="token-balance">{{ token.balance }}</div>
                <el-tag size="small" v-if="!token.active" type="warning">{{ $t('common.inactive') }}</el-tag>
              </div>
            </div>
          </el-scrollbar>
        </div>
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ $t('common.cancel') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { formatUnits, isAddress } from 'ethers'
import { ArrowDown } from '@element-plus/icons-vue'
import { useWalletStore } from '@/stores/wallet'
import { contractService } from '@/services/contracts'
import TokenIcon from '@/components/common/TokenIcon.vue'

// Types
interface SRMBToken {
  address: string
  symbol: string
  name: string
  balance: string
  active: boolean
  displayName: string
  wrappedAmount: string
}

interface SRMBContractInfo {
  sRMBContract: string
  wrappedAmount: bigint
  wrappedShares: bigint
  active: boolean
}

// Props
interface Props {
  modelValue?: string
  disabled?: boolean
  showInactiveTokens?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  disabled: false,
  showInactiveTokens: false
})

// Emits
interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'token-change', token: SRMBToken | null): void
}

const emit = defineEmits<Emits>()

const { t } = useI18n()
const walletStore = useWalletStore()

// State
const loading = ref(false) // 加载工厂数据
const availableTokens = ref<SRMBToken[]>([])
const selectedToken = ref(props.modelValue)

// 新增：模态框与地址直输相关状态
const dialogVisible = ref(false)
const loadingDialog = ref(false) // 模态框内的大 loading
const addressInput = ref('')
const loadingAddress = ref(false)

const isMobile = ref(false)
const windowWidth = ref(window.innerWidth)

const updateWindowWidth = () => {
  windowWidth.value = window.innerWidth
  isMobile.value = windowWidth.value < 640
}

onMounted(() => {
  updateWindowWidth()
  window.addEventListener('resize', updateWindowWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWindowWidth)
})

const dialogWidth = computed(() => {
  return isMobile.value ? '95%' : '500px'
})

// Computed
const selectedTokenInfo = computed(() => {
  return availableTokens.value.find(token => token.address === selectedToken.value) || null
})

// 最近选择缓存
const RECENT_KEY_PREFIX = 'srmb_recent_selected'
const MAX_RECENT = 5
const getRecentKey = () => {
  return `${RECENT_KEY_PREFIX}_${walletStore.chainId}_${walletStore.address}`
}
const getRecentList = (): string[] => {
  try {
    const raw = localStorage.getItem(getRecentKey())
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) return arr
    return []
  } catch {
    return []
  }
}
const setRecentList = (list: string[]) => {
  try {
    localStorage.setItem(getRecentKey(), JSON.stringify(list.slice(0, MAX_RECENT)))
  } catch {
    // ignore
  }
}
const pushRecent = (addr: string) => {
  if (!addr) return
  const list = getRecentList().filter(a => a.toLowerCase() !== addr.toLowerCase())
  list.unshift(addr)
  setRecentList(list)
}
const recentTokensResolved = computed(() => {
  const list = getRecentList()
  const lowerMap = new Map(availableTokens.value.map(t => [t.address.toLowerCase(), t]))
  return list
    .map(a => lowerMap.get(a.toLowerCase()))
    .filter(Boolean) as SRMBToken[]
})

// Watch for prop changes
watch(() => props.modelValue, (newValue) => {
  selectedToken.value = newValue
})

// Watch for wallet connection changes
watch(() => walletStore.isConnected, (connected) => {
  if (connected) {
    loadSRMBTokens()
  } else {
    availableTokens.value = []
    selectedToken.value = ''
  }
})

// Watch for chain changes
watch(() => walletStore.chainId, () => {
  if (walletStore.isConnected) {
    loadSRMBTokens(true) // 切链时强制刷新
  }
})

// Cache configuration
const CACHE_KEY_PREFIX = 'srmb_tokens_cache'
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

// Cache utilities
const getCacheKey = () => {
  return `${CACHE_KEY_PREFIX}_${walletStore.chainId}_${walletStore.address}`
}

const getCachedTokens = (): { tokens: SRMBToken[], timestamp: number } | null => {
  try {
    const cached = localStorage.getItem(getCacheKey())
    if (!cached) return null

    const data = JSON.parse(cached)
    const now = Date.now()

    // Check if cache is still valid
    if (now - data.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(getCacheKey())
      return null
    }

    return data
  } catch (error) {
    console.warn('Failed to read token cache:', error)
    return null
  }
}

const setCachedTokens = (tokens: SRMBToken[]) => {
  try {
    const data = {
      tokens,
      timestamp: Date.now()
    }
    localStorage.setItem(getCacheKey(), JSON.stringify(data))
  } catch (error) {
    console.warn('Failed to cache tokens:', error)
  }
}

// Methods
const generateTokenIconStyle = (symbol: string) => {
  // 根据symbol生成一致的背景色和文字色
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#10AC84', '#EE5A24', '#009432', '#0652DD', '#9980FA'
  ]
  
  // 使用symbol的字符编码之和作为种子
  let hash = 0
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const backgroundColor = colors[Math.abs(hash) % colors.length]
  
  // 计算对比色以确保文字可读性
  const hex = backgroundColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  const textColor = brightness > 128 ? '#000000' : '#FFFFFF'
  
  return {
    backgroundColor,
    color: textColor
  }
}

const loadSRMBTokens = async (forceRefresh = false) => {
  if (!walletStore.isConnected || !walletStore.address) {
    return
  }

  // Try to load from cache first
  if (!forceRefresh) {
    const cached = getCachedTokens()
    if (cached && cached.tokens.length > 0) {
      availableTokens.value = cached.tokens

      // Auto-select first active token with balance if none selected
      if (!selectedToken.value && cached.tokens.length > 0) {
        selectedToken.value = cached.tokens[0].address
        handleTokenChange(cached.tokens[0].address)
      }

      // Load fresh data in background without showing loading state
      loadFreshTokenData()
      return
    }
  }

  // No cache or force refresh - show loading and fetch data
  loading.value = true
  await loadFreshTokenData()
  loading.value = false
}

const loadFreshTokenData = async () => {
  try {
    const factoryContract = contractService.getSRMBFactoryContract()
    if (!factoryContract) {
      console.warn('SRMB Factory contract not available for current network')
      return
    }

    // Get all SRMB contracts from factory
    const contractInfos: SRMBContractInfo[] = await factoryContract.getAllSRMBContracts()
    // Process each contract to get token info
    const tokens: SRMBToken[] = []

    for (const info of contractInfos) {
      // Skip inactive tokens if not showing them
      if (!props.showInactiveTokens && !info.active) {
        continue
      }

      try {
        // Get token contract to fetch name, symbol, and balance
        const tokenContract = contractService.getERC20Contract(info.sRMBContract)
        if (!tokenContract) continue
        const wrapManagerContract = contractService.getWrapManagerContract()
        if (!wrapManagerContract) continue
        const isActive = await wrapManagerContract.checkSRMBWrapActive(info.sRMBContract)
        if (!isActive) continue;

        const [name, symbol, balance, paused] = await Promise.all([
          tokenContract.name(),
          tokenContract.symbol(),
          tokenContract.balanceOf(walletStore.address),
          tokenContract.paused()
        ])

        if (paused) continue;

        const formattedBalance = formatUnits(balance, 6) // sRMB has 6 decimals
        const wrappedAmount = formatUnits(info.wrappedAmount, 6)

        tokens.push({
          address: info.sRMBContract,
          symbol,
          name,
          balance: formattedBalance,
          active: info.active,
          displayName: `${symbol} (${name})`,
          wrappedAmount,
        })
      } catch (error) {
        console.error(`Failed to load token info for ${info.sRMBContract}:`, error)
      }
    }

    // Sort tokens: active first, then by balance (descending)
    tokens.sort((a, b) => {
      if (a.active !== b.active) {
        return a.active ? -1 : 1
      }
      return parseFloat(b.balance) - parseFloat(a.balance)
    })
    // Update UI and cache
    availableTokens.value = tokens
    setCachedTokens(tokens)

    // Auto-select first active token with balance if none selected
    if (!selectedToken.value && tokens.length > 0) {
      selectedToken.value = tokens[0].address
      handleTokenChange(tokens[0].address)
    }

  } catch (error) {
    console.error('Failed to load SRMB tokens:', error)
    ElMessage.error(t('wrap.failedToLoadTokens'))
  }
}

const handleTokenChange = (address: string) => {
  emit('update:modelValue', address)
  const token = availableTokens.value.find(t => t.address === address) || null
  emit('token-change', token)
}

// 新增：选择逻辑（按钮/模态中统一走这里）
const selectToken = (address: string) => {
  selectedToken.value = address
  handleTokenChange(address)
  pushRecent(address)
  dialogVisible.value = false
}

// 新增：模态框打开时，如果没有数据则加载
const openDialog = () => {
  if (props.disabled) return
  dialogVisible.value = true
  if (!availableTokens.value.length && walletStore.isConnected) {
    // 模态框打开时的轻量loading（与初次缓存加载不冲突）
    loadingDialog.value = true
    loadSRMBTokens().finally(() => {
      loadingDialog.value = false
    })
  }
}

// 新增：通过合约地址直接选择
const handleAddressSelect = async () => {
  const addr = addressInput.value.trim()
  if (!addr) {
    ElMessage.warning(t('tokenSelector.enterContractAddress'))
    return
  }
  if (!isAddress(addr)) {
    ElMessage.error(t('tokenSelector.invalidContractAddress'))
    return
  }
  loadingAddress.value = true
  try {
    const token = await resolveSRMBTokenByAddress(addr)
    if (!token) return
    // 如果列表中不存在则追加
    const exists = availableTokens.value.some(t => t.address.toLowerCase() === token.address.toLowerCase())
    if (!exists) {
      availableTokens.value = [token, ...availableTokens.value]
      setCachedTokens(availableTokens.value)
    }
    // 选择它
    selectToken(token.address)
  } catch (e) {
    console.error('Address select error:', e)
    ElMessage.error(t('tokenSelector.selectFailed'))
  } finally {
    loadingAddress.value = false
  }
}

// 新增：解析地址为 SRMBToken，校验活跃/暂停状态
const resolveSRMBTokenByAddress = async (address: string): Promise<SRMBToken | null> => {
  if (!walletStore.isConnected || !walletStore.address) {
    ElMessage.warning(t('wallet.connectWallet'))
    return null
  }
  try {
    const tokenContract = contractService.getERC20Contract(address)
    const wrapManagerContract = contractService.getWrapManagerContract()
    if (!tokenContract || !wrapManagerContract) {
      ElMessage.error(t('tokenSelector.networkNotSupported'))
      return null
    }
    const isActive = await wrapManagerContract.checkSRMBWrapActive(address)
    if (!isActive) {
      ElMessage.warning(t('tokenSelector.tokenNotActive'))
      return null
    }
    const [name, symbol, balance, paused] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.balanceOf(walletStore.address),
      tokenContract.paused()
    ])
    if (paused) {
      ElMessage.warning(t('tokenSelector.tokenPaused'))
      return null
    }
    const formattedBalance = formatUnits(balance, 6)
    // 尝试从已缓存/已加载的数据中读取 wrappedAmount，否则默认 0
    let wrappedAmount = '0'
    const inList = availableTokens.value.find(t => t.address.toLowerCase() === address.toLowerCase())
    if (inList) wrappedAmount = inList.wrappedAmount

    return {
      address,
      name,
      symbol,
      balance: formattedBalance,
      active: true,
      displayName: `${symbol} (${name})`,
      wrappedAmount
    }
  } catch (error) {
    console.error('Failed to resolve token by address:', error)
    ElMessage.error(t('tokenSelector.invalidSRMBContract'))
    return null
  }
}

// Lifecycle
onMounted(() => {
  if (walletStore.isConnected) {
    loadSRMBTokens()
  }
})

// Expose methods for parent component
defineExpose({
  refresh: loadSRMBTokens,
  forceRefresh: (force = true) => loadSRMBTokens(force),
  selectedTokenInfo
})
</script>

<style scoped>
.srmb-token-selector {
  width: 100%;
  max-width: 12rem;
}

.selector-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
  padding: 8px 12px;
  font-size: 14px;
}

@media (max-width: 768px) {
  .srmb-token-selector {
    max-width: 100%;
  }

  .selector-trigger {
    font-size: 13px;
    padding: 6px 10px;
    min-height: 36px;
  }
}

@media (max-width: 480px) {
  .selector-trigger {
    font-size: 12px;
    padding: 4px 8px;
    min-height: 32px;
  }
}

/* Dialog responsive styles */
:deep(.el-dialog) {
  width: 520px !important;
  max-width: 95vw !important;
  margin: 20px auto !important;
  border-radius: 16px;
  overflow: hidden;
}

:deep(.el-dialog__header) {
  margin-right: 0;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

:deep(.el-dialog__body) {
  padding: 24px;
  max-height: 70vh;
  overflow-y: auto;
}

:deep(.el-dialog__footer) {
  padding: 16px 24px 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}

@media (max-width: 768px) {
  :deep(.el-dialog) {
    width: 90vw !important;
    margin: 40px auto !important;
    border-radius: 12px;
  }

  :deep(.el-dialog__header) {
    padding: 16px 20px 12px;
  }

  :deep(.el-dialog__title) {
    font-size: 16px;
  }

  :deep(.el-dialog__body) {
    padding: 20px;
    max-height: 65vh;
  }

  :deep(.el-dialog__footer) {
    padding: 12px 20px 16px;
  }
}

@media (max-width: 480px) {
  :deep(.el-dialog) {
    width: 100vw !important;
    margin: 0 !important;
    border-radius: 0;
    max-height: 100vh;
    height: 100vh;
  }

  :deep(.el-dialog__header) {
    padding: 16px 16px 12px;
  }

  :deep(.el-dialog__body) {
    padding: 16px;
    max-height: calc(100vh - 120px);
  }

  :deep(.el-dialog__footer) {
    padding: 12px 16px 16px;
  }
}

/* Dialog body layout */
.selector-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (max-width: 480px) {
  .selector-dialog-body {
    gap: 16px;
  }
}

.address-input-section {
  padding: 12px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
}

.address-input-section .address-input-tips {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

@media (max-width: 480px) {
  .address-input-section {
    padding: 10px;
  }
  
  .address-input-section .address-input-tips {
    font-size: 11px;
  }
}

.section-title {
  font-size: 13px;
  color: var(--el-text-color-primary);
  margin-bottom: 6px;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.section-title::before {
  content: '';
  width: 3px;
  height: 14px;
  background-color: var(--el-color-primary);
  margin-right: 8px;
  border-radius: 2px;
}

@media (max-width: 480px) {
  .section-title {
    font-size: 13px;
    margin-bottom: 6px;
  }
  
  .section-title::before {
    height: 12px;
    margin-right: 6px;
  }
  
  .quick-tokens-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 6px;
  }
  
  .quick-token-card {
    padding: 6px 8px;
    border-radius: 6px;
    gap: 4px;
  }
  
  .quick-token-icon-large {
    width: 20px;
    height: 20px;
    font-size: 9px;
  }
  
  .quick-token-symbol {
    font-size: 11px;
  }
  
  .quick-token-balance {
    font-size: 9px;
  }
}

.quick-section {
  padding: 4px 0;
}

.quick-section .el-space {
  gap: 8px !important;
}

.quick-tokens-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 6px;
}

.quick-token-card {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  background: var(--bg-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 4px;
}

.quick-token-card:hover {
  background: var(--el-fill-color-light);
  border-color: var(--el-color-primary);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.quick-token-card.recommended {
  background: linear-gradient(135deg, var(--el-color-success-light-9), var(--el-color-success-light-8));
  border-color: var(--el-color-success-light-5);
}

.quick-token-card.recommended:hover {
  background: linear-gradient(135deg, var(--el-color-success-light-8), var(--el-color-success-light-7));
  border-color: var(--el-color-success);
}

.quick-token-icon-large {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
}

.quick-token-details {
  flex: 1;
  min-width: 0;
}

.quick-token-symbol {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.2;
}

.quick-token-balance {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  line-height: 1.2;
  margin-top: 2px;
}

.quick-token {
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  flex-direction: row;
  gap: 6px;
  padding: 6px 12px;
  height: auto;
  line-height: 1.2;
  border-radius: 20px;
  font-size: 13px;
}

.quick-token:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.quick-token-icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  flex-shrink: 0;
}

@media (max-width: 480px) {
  .quick-token {
    padding: 5px 10px;
    font-size: 12px;
    gap: 4px;
  }
  
  .quick-token-icon {
    width: 16px;
    height: 16px;
    font-size: 8px;
  }
}

.token-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 10px;
  transition: all 0.2s ease;
  cursor: pointer;
  border: 1px solid transparent;
  margin-bottom: 4px;
}

@media (max-width: 480px) {
  .token-row {
    padding: 10px 12px;
    border-radius: 8px;
    margin-bottom: 2px;
  }
}

.token-row:hover {
  background-color: var(--el-fill-color-lighter);
  border-color: var(--el-border-color-light);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.token-row:active {
  background-color: var(--el-fill-color-light);
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.token-main {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.token-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.token-symbol {
  font-weight: 600;
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.token-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

@media (max-width: 480px) {
  .token-symbol {
    font-size: 14px;
    gap: 8px;
  }
  
  .token-icon {
    width: 24px;
    height: 24px;
    font-size: 10px;
  }
}

.token-name {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 400;
}

@media (max-width: 480px) {
  .token-name {
    font-size: 12px;
  }
}

.token-extra {
  text-align: right;
  flex-shrink: 0;
  margin-left: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.token-balance {
  font-size: 13px;
  color: var(--el-text-color-primary);
  font-weight: 500;
}

@media (max-width: 480px) {
  .token-extra {
    margin-left: 8px;
    gap: 2px;
  }
  
  .token-balance {
    font-size: 12px;
  }
}

/* Touch-friendly improvements */
@media (hover: none) and (pointer: coarse) {
  .token-row {
    min-height: 44px;
    padding: 12px 8px;
  }

  .quick-token {
    min-height: 32px;
    padding: 6px 12px;
  }
}

/* Ensure proper scrolling on mobile */
:deep(.el-scrollbar__wrap) {
  -webkit-overflow-scrolling: touch;
}

:deep(.el-scrollbar) {
  border-radius: 8px;
}

/* Empty state styling */
:deep(.el-empty) {
  padding: 40px 0;
}

:deep(.el-empty__description) {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

@media (max-width: 480px) {
  :deep(.el-empty) {
    padding: 30px 0;
  }
  
  :deep(.el-empty__description) {
    font-size: 13px;
  }
}
</style>