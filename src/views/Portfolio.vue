<template>
  <PullToRefresh :is-pulling="isPulling" :is-refreshing="isRefreshing" :pull-distance="pullDistance"
    :can-refresh="canRefresh">
    <!-- Portfolio Overview -->
    <div class="overview-section">
      <h2 class="section-title">
        {{ $t('portfolio.overview') }}
      </h2>

      <div class="overview-grid">
        <div class="overview-card total-value">
          <div class="card-header">
            <h3 class="card-title">{{ $t('portfolio.totalValue') }}</h3>
            <el-icon class="card-icon">
              <Wallet />
            </el-icon>
          </div>
          <div class="card-value">
            ${{ formatNumber(portfolioStats.totalValue) }}
          </div>
          <div class="card-change"
            :class="{ positive: portfolioStats.totalChange >= 0, negative: portfolioStats.totalChange < 0 }">
            <el-icon>
              <component :is="portfolioStats.totalChange >= 0 ? 'ArrowUp' : 'ArrowDown'" />
            </el-icon>
            {{ formatNumber(Math.abs(portfolioStats.totalChange)) }}% (24h)
          </div>
        </div>

        <div class="overview-card">
          <div class="card-header">
            <h3 class="card-title">{{ $t('portfolio.totalInvested') }}</h3>
            <el-icon class="card-icon">
              <CreditCard />
            </el-icon>
          </div>
          <div class="card-value">
            ${{ formatNumber(portfolioStats.totalInvested) }}
          </div>
          <div class="card-subtitle">
            {{ $t('portfolio.principalAmount') }}
          </div>
        </div>

        <div class="overview-card">
          <div class="card-header">
            <h3 class="card-title">{{ $t('portfolio.totalReturns') }}</h3>
            <el-icon class="card-icon">
              <TrendCharts />
            </el-icon>
          </div>
          <div class="card-value"
            :class="{ positive: portfolioStats.totalReturns >= 0, negative: portfolioStats.totalReturns < 0 }">
            ${{ formatNumber(portfolioStats.totalReturns) }}
          </div>
          <div class="card-subtitle">
            {{ formatNumber(portfolioStats.returnPercentage) }}% {{ $t('portfolio.totalReturn') }}
          </div>
        </div>

        <div class="overview-card">
          <div class="card-header">
            <h3 class="card-title">{{ $t('portfolio.avgAPY') }}</h3>
            <el-icon class="card-icon">
              <DataAnalysis />
            </el-icon>
          </div>
          <div class="card-value">
            {{ formatNumber(portfolioStats.avgAPY) }}%
          </div>
          <div class="card-subtitle">
            {{ $t('portfolio.weightedAverage') }}
          </div>
        </div>
      </div>
    </div>

    <!-- Asset Allocation -->
    <div class="allocation-section">
      <div class="section-header">
        <h2 class="section-title">
          {{ $t('portfolio.assetAllocation') }}
        </h2>
        <div class="view-toggle">
          <el-radio-group v-model="allocationView" size="small">
            <el-radio-button label="chart">{{ $t('portfolio.chart') }}</el-radio-button>
            <el-radio-button label="table">{{ $t('portfolio.table') }}</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <div class="allocation-content">
        <div v-if="allocationView === 'chart'" class="chart-container">
          <div class="chart-wrapper">
            <!-- Pie Chart Placeholder -->
            <div class="pie-chart">
              <svg viewBox="0 0 200 200" class="w-full h-full">
                <circle v-for="(segment, index) in chartSegments" :key="index" cx="100" cy="100" r="80" fill="none"
                  :stroke="segment.color" stroke-width="20"
                  :stroke-dasharray="`${segment.length} ${314 - segment.length}`" :stroke-dashoffset="segment.offset"
                  class="transition-all duration-500" />
              </svg>
              <div class="chart-center">
                <div class="center-value">${{ formatNumber(portfolioStats.totalValue) }}</div>
                <div class="center-label">{{ $t('portfolio.totalValue') }}</div>
              </div>
            </div>
          </div>

          <div class="chart-legend">
            <div v-for="asset in assetAllocation" :key="asset.symbol" class="legend-item">
              <div class="legend-color" :style="{ backgroundColor: asset.color }"></div>
              <div class="legend-info">
                <div class="legend-name">{{ asset.name }}</div>
                <div class="legend-details">
                  <span class="legend-value">${{ formatNumber(asset.value) }}</span>
                  <span class="legend-percentage">({{ formatNumber(asset.percentage) }}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="allocation-table">
          <el-table :data="assetAllocation" style="width: 100%">
            <el-table-column prop="name" :label="$t('portfolio.asset')" min-width="120">
              <template #default="{ row }">
                <div class="asset-cell">
                  <div class="asset-color" :style="{ backgroundColor: row.color }"></div>
                  <div class="asset-info">
                    <div class="asset-name">{{ row.name }}</div>
                    <div class="asset-symbol">{{ row.symbol }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>

            <el-table-column prop="balance" :label="$t('portfolio.balance')" min-width="120">
              <template #default="{ row }">
                {{ formatNumber(row.balance) }} {{ row.symbol }}
              </template>
            </el-table-column>

            <el-table-column prop="value" :label="$t('portfolio.value')" min-width="120">
              <template #default="{ row }">
                ${{ formatNumber(row.value) }}
              </template>
            </el-table-column>

            <el-table-column prop="percentage" :label="$t('portfolio.allocation')" min-width="100">
              <template #default="{ row }">
                <div class="percentage-cell">
                  <div class="percentage-bar">
                    <div class="percentage-fill" :style="{ width: `${row.percentage}%`, backgroundColor: row.color }">
                    </div>
                  </div>
                  <span class="percentage-text">{{ formatNumber(row.percentage) }}%</span>
                </div>
              </template>
            </el-table-column>

            <el-table-column prop="change24h" :label="$t('portfolio.change24h')" min-width="100">
              <template #default="{ row }">
                <div class="change-cell" :class="{ positive: row.change24h >= 0, negative: row.change24h < 0 }">
                  <el-icon>
                    <component :is="row.change24h >= 0 ? 'ArrowUp' : 'ArrowDown'" />
                  </el-icon>
                  {{ formatNumber(Math.abs(row.change24h)) }}%
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>

    <!-- Performance Chart -->
    <div class="performance-section">
      <div class="section-header">
        <h2 class="section-title">
          {{ $t('portfolio.performance') }}
        </h2>
        <div class="time-range">
          <el-radio-group v-model="performanceRange" size="small">
            <el-radio-button label="7d">7D</el-radio-button>
            <el-radio-button label="30d">30D</el-radio-button>
            <el-radio-button label="90d">90D</el-radio-button>
            <el-radio-button label="1y">1Y</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <div class="performance-chart">
        <!-- Line Chart Placeholder -->
        <div class="chart-placeholder">
          <svg viewBox="0 0 800 300" class="w-full h-full">
            <!-- Grid lines -->
            <defs>
              <pattern id="grid" width="80" height="30" patternUnits="userSpaceOnUse">
                <path d="M 80 0 L 0 0 0 30" fill="none" stroke="#e5e7eb" stroke-width="1" opacity="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            <!-- Performance line -->
            <polyline :points="performancePoints" fill="none" stroke="#6366f1" stroke-width="3"
              class="transition-all duration-500" />

            <!-- Data points -->
            <circle v-for="(point, index) in performanceData" :key="index" :cx="point.x" :cy="point.y" r="4"
              fill="#6366f1" class="transition-all duration-300 hover:r-6" />
          </svg>
        </div>

        <div class="chart-stats">
          <div class="stat-item">
            <span class="stat-label">{{ $t('portfolio.highestValue') }}</span>
            <span class="stat-value">${{ formatNumber(performanceStats.highest) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ $t('portfolio.lowestValue') }}</span>
            <span class="stat-value">${{ formatNumber(performanceStats.lowest) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ $t('portfolio.volatility') }}</span>
            <span class="stat-value">{{ formatNumber(performanceStats.volatility) }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Holdings Details -->
    <div class="holdings-section">
      <div class="section-header">
        <h2 class="section-title">
          {{ $t('portfolio.holdings') }}
        </h2>
        <div class="holdings-filter">
          <el-select v-model="holdingsFilter" size="small">
            <el-option :label="$t('portfolio.allHoldings')" value="all" />
            <el-option :label="$t('portfolio.savingsOnly')" value="savings" />
            <el-option :label="$t('portfolio.bondsOnly')" value="bonds" />
            <el-option :label="$t('portfolio.wrappedOnly')" value="wrapped" />
          </el-select>
        </div>
      </div>

      <div class="holdings-list">
        <div v-for="holding in filteredHoldings" :key="holding.id" class="holding-card">
          <div class="holding-header">
            <div class="holding-info">
              <div class="holding-name">{{ holding.name }}</div>
              <div class="holding-type">
                <el-tag :type="getHoldingTypeColor(holding.type)" size="small">
                  {{ $t(`portfolio.${holding.type}`) }}
                </el-tag>
              </div>
            </div>
            <div class="holding-value">
              <div class="value-amount">${{ formatNumber(holding.value) }}</div>
              <div class="value-change" :class="{ positive: holding.change >= 0, negative: holding.change < 0 }">
                <el-icon>
                  <component :is="holding.change >= 0 ? 'ArrowUp' : 'ArrowDown'" />
                </el-icon>
                {{ formatNumber(Math.abs(holding.change)) }}%
              </div>
            </div>
          </div>

          <div class="holding-details">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">{{ $t('portfolio.balance') }}</span>
                <span class="detail-value">{{ formatNumber(holding.balance) }} {{ holding.symbol }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ $t('portfolio.avgPrice') }}</span>
                <span class="detail-value">${{ formatNumber(holding.avgPrice) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ $t('portfolio.currentPrice') }}</span>
                <span class="detail-value">${{ formatNumber(holding.currentPrice) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ $t('portfolio.pnl') }}</span>
                <span class="detail-value" :class="{ positive: holding.pnl >= 0, negative: holding.pnl < 0 }">
                  ${{ formatNumber(holding.pnl) }}
                </span>
              </div>
            </div>

            <div v-if="holding.type === 'savings'" class="holding-actions">
              <el-button size="small" @click="navigateToSavings">
                {{ $t('portfolio.manageSavings') }}
              </el-button>
            </div>

            <div v-else-if="holding.type === 'bonds'" class="holding-actions">
              <el-button size="small" @click="navigateToBonds">
                {{ $t('portfolio.manageBonds') }}
              </el-button>
            </div>

            <div v-else-if="holding.type === 'wrapped'" class="holding-actions">
              <el-button size="small" @click="navigateToWrap">
                {{ $t('portfolio.manageWrap') }}
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Transaction History -->
    <div class="history-section">
      <div class="section-header">
        <h2 class="section-title">
          {{ $t('portfolio.transactionHistory') }}
        </h2>
        <div class="history-filter">
          <el-select v-model="historyFilter" size="small">
            <el-option :label="$t('portfolio.allTransactions')" value="all" />
            <el-option :label="$t('portfolio.deposits')" value="deposit" />
            <el-option :label="$t('portfolio.withdrawals')" value="withdraw" />
            <el-option :label="$t('portfolio.swaps')" value="swap" />
          </el-select>
        </div>
      </div>

      <div class="history-table">
        <el-table :data="filteredTransactions" style="width: 100%">
          <el-table-column prop="type" :label="$t('portfolio.type')" width="100">
            <template #default="{ row }">
              <el-tag :type="getTransactionTypeColor(row.type)" size="small">
                {{ $t(`portfolio.${row.type}`) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="asset" :label="$t('portfolio.asset')" width="120">
            <template #default="{ row }">
              <div class="asset-cell">
                <div class="asset-name">{{ row.asset }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="amount" :label="$t('portfolio.amount')" width="150">
            <template #default="{ row }">
              {{ formatNumber(row.amount) }} {{ row.symbol }}
            </template>
          </el-table-column>

          <el-table-column prop="value" :label="$t('portfolio.value')" width="120">
            <template #default="{ row }">
              ${{ formatNumber(row.value) }}
            </template>
          </el-table-column>

          <el-table-column prop="timestamp" :label="$t('portfolio.date')" width="150">
            <template #default="{ row }">
              {{ formatDate(row.timestamp) }}
            </template>
          </el-table-column>

          <el-table-column prop="hash" :label="$t('portfolio.txHash')" min-width="150">
            <template #default="{ row }">
              <el-button text size="small" @click="viewTransaction(row.hash)">
                {{ row.hash.slice(0, 10) }}...{{ row.hash.slice(-8) }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="table-pagination">
          <el-pagination v-model:current-page="currentPage" :page-size="pageSize" :total="totalTransactions"
            layout="prev, pager, next" @current-change="handlePageChange" />
        </div>
      </div>
    </div>
  </PullToRefresh>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import {
  Refresh,
  Download,
  Wallet,
  CreditCard,
  TrendCharts,
  DataAnalysis,
  ArrowUp,
  ArrowDown
} from '@element-plus/icons-vue'

import { useWalletStore } from '@/stores/wallet'
import { formatNumber, formatDate } from '@/utils/format'
import PullToRefresh from '@/components/common/PullToRefresh.vue'
import { usePullToRefresh } from '@/composables/usePullToRefresh'

interface AssetAllocation {
  name: string
  symbol: string
  balance: number
  value: number
  percentage: number
  color: string
  change24h: number
}

interface Holding {
  id: string
  name: string
  symbol: string
  type: 'savings' | 'bonds' | 'wrapped'
  balance: number
  value: number
  avgPrice: number
  currentPrice: number
  pnl: number
  change: number
}

interface Transaction {
  id: string
  type: 'deposit' | 'withdraw' | 'swap'
  asset: string
  symbol: string
  amount: number
  value: number
  timestamp: number
  hash: string
}

const { t } = useI18n()
const router = useRouter()
const walletStore = useWalletStore()

const loading = ref(false)
const allocationView = ref('chart')
const performanceRange = ref('30d')
const holdingsFilter = ref('all')
const historyFilter = ref('all')
const currentPage = ref(1)
const pageSize = ref(10)

// Mock data
const portfolioStats = ref({
  totalValue: 25750.50,
  totalInvested: 24000.00,
  totalReturns: 1750.50,
  returnPercentage: 7.29,
  totalChange: 2.45,
  avgAPY: 8.2
})

const assetAllocation = ref<AssetAllocation[]>([
  {
    name: 'Savings Vault',
    symbol: 'sWRMB',
    balance: 12500,
    value: 15000,
    percentage: 58.3,
    color: '#6366f1',
    change24h: 1.2
  },
  {
    name: 'Bond Pool',
    symbol: 'WRMB',
    balance: 8000,
    value: 8500,
    percentage: 33.0,
    color: '#10b981',
    change24h: 0.8
  },
  {
    name: 'Wrapped Tokens',
    symbol: 'sWRMB',
    balance: 2000,
    value: 2250.50,
    percentage: 8.7,
    color: '#f59e0b',
    change24h: -0.5
  }
])

const holdings = ref<Holding[]>([
  {
    id: '1',
    name: 'Savings Vault Position',
    symbol: 'sWRMB',
    type: 'savings',
    balance: 12500,
    value: 15000,
    avgPrice: 1.15,
    currentPrice: 1.20,
    pnl: 625,
    change: 4.35
  },
  {
    id: '2',
    name: 'Active Bonds',
    symbol: 'WRMB',
    type: 'bonds',
    balance: 8000,
    value: 8500,
    avgPrice: 1.00,
    currentPrice: 1.06,
    pnl: 480,
    change: 6.25
  },
  {
    id: '3',
    name: 'Wrapped sRMB',
    symbol: 'sWRMB',
    type: 'wrapped',
    balance: 2000,
    value: 2250.50,
    avgPrice: 1.10,
    currentPrice: 1.125,
    pnl: 50,
    change: 2.27
  }
])

const transactions = ref<Transaction[]>([
  {
    id: '1',
    type: 'deposit',
    asset: 'Savings Vault',
    symbol: 'WRMB',
    amount: 5000,
    value: 5000,
    timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
    hash: '0x1234567890abcdef1234567890abcdef12345678'
  },
  {
    id: '2',
    type: 'swap',
    asset: 'Wrap Manager',
    symbol: 'sRMB',
    amount: 2000,
    value: 2000,
    timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
    hash: '0xabcdef1234567890abcdef1234567890abcdef12'
  },
  {
    id: '3',
    type: 'deposit',
    asset: 'Bond Pool',
    symbol: 'USDT',
    amount: 8000,
    value: 8000,
    timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
    hash: '0x567890abcdef1234567890abcdef1234567890ab'
  }
])

const performanceData = ref([
  { x: 50, y: 250 },
  { x: 150, y: 200 },
  { x: 250, y: 180 },
  { x: 350, y: 220 },
  { x: 450, y: 160 },
  { x: 550, y: 140 },
  { x: 650, y: 120 },
  { x: 750, y: 100 }
])

const performanceStats = ref({
  highest: 26500,
  lowest: 23800,
  volatility: 12.5
})

const totalTransactions = computed(() => transactions.value.length)

const { isRefreshing, pullDistance, isPulling, canRefresh } = usePullToRefresh({
  onRefresh: async (): Promise<void> => {
    try {
      // 在这里添加刷新数据的逻辑
      await refreshPortfolioData()
    } catch (error) {
      console.error('Failed to refresh portfolio data:', error)
    }
  }
})

const refreshPortfolioData = async () => {
  // 在这里添加刷新投资组合数据的逻辑
  // 例如重新获取资产分配、持仓、交易历史等
  ElMessage.success('Portfolio data refreshed')
}

const filteredHoldings = computed(() => {
  if (holdingsFilter.value === 'all') {
    return holdings.value
  }
  return holdings.value.filter(holding => holding.type === holdingsFilter.value)
})

const filteredTransactions = computed(() => {
  let filtered = transactions.value
  if (historyFilter.value !== 'all') {
    filtered = filtered.filter(tx => tx.type === historyFilter.value)
  }

  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filtered.slice(start, end)
})

const chartSegments = computed(() => {
  let offset = 0
  return assetAllocation.value.map(asset => {
    const length = (asset.percentage / 100) * 314 // 2π * 50 (radius)
    const segment = {
      length,
      offset: -offset,
      color: asset.color
    }
    offset += length
    return segment
  })
})

const performancePoints = computed(() => {
  return performanceData.value.map(point => `${point.x},${point.y}`).join(' ')
})

const getHoldingTypeColor = (type: string) => {
  switch (type) {
    case 'savings': return 'primary'
    case 'bonds': return 'success'
    case 'wrapped': return 'warning'
    default: return 'info'
  }
}

const getTransactionTypeColor = (type: string) => {
  switch (type) {
    case 'deposit': return 'success'
    case 'withdraw': return 'warning'
    case 'swap': return 'primary'
    default: return 'info'
  }
}

const navigateToSavings = () => {
  router.push('/savings')
}

const navigateToBonds = () => {
  router.push('/bonds')
}

const navigateToWrap = () => {
  router.push('/wrap')
}

const viewTransaction = (hash: string) => {
  const explorerUrl = `https://etherscan.io/tx/${hash}`
  window.open(explorerUrl, '_blank')
}

const handlePageChange = (page: number) => {
  currentPage.value = page
}

const refreshData = async () => {
  loading.value = true
  try {
    // Mock data refresh
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success(t('portfolio.dataRefreshed'))
  } catch (error) {
    console.error('Failed to refresh data:', error)
    ElMessage.error(t('portfolio.refreshFailed'))
  } finally {
    loading.value = false
  }
}

const exportData = () => {
  // Mock export functionality
  const data = {
    portfolio: portfolioStats.value,
    holdings: holdings.value,
    transactions: transactions.value
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `portfolio-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  ElMessage.success(t('portfolio.exportSuccess'))
}

onMounted(async () => {
  if (walletStore.isConnected) {
    await refreshData()
  }
})
</script>

<style scoped>
.header-actions {
  @apply flex items-center space-x-4;
}

.section-title {
  @apply text-2xl font-bold text-gray-900 dark:text-white mb-6;
}

.section-header {
  @apply flex items-center justify-between mb-6;
}

.overview-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6;
}

.overview-card {
  @apply bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all duration-200 hover:shadow-md;
}

.overview-card.total-value {
  @apply bg-gradient-to-br from-primary-500 to-primary-600 text-white border-primary-500;
}

.card-header {
  @apply flex items-center justify-between mb-4;
}

.card-title {
  @apply text-sm font-medium text-gray-600 dark:text-gray-400;
}

.overview-card.total-value .card-title {
  @apply text-primary-100;
}

.card-icon {
  @apply text-xl text-gray-400;
}

.overview-card.total-value .card-icon {
  @apply text-primary-200;
}

.card-value {
  @apply text-2xl font-bold text-gray-900 dark:text-white;
}

.overview-card.total-value .card-value {
  @apply text-white;
}

.card-value.positive {
  @apply text-green-600 dark:text-green-400;
}

.card-value.negative {
  @apply text-red-600 dark:text-red-400;
}

.card-change {
  @apply flex items-center text-sm mt-1;
}

.card-change.positive {
  @apply text-green-600 dark:text-green-400;
}

.card-change.negative {
  @apply text-red-600 dark:text-red-400;
}

.overview-card.total-value .card-change {
  @apply text-primary-100;
}

.card-subtitle {
  @apply text-sm text-gray-500 dark:text-gray-400 mt-1;
}

.allocation-content {
  @apply bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8;
}

.chart-container {
  @apply flex flex-col lg:flex-row items-center space-y-8 lg:space-y-0 lg:space-x-12;
}

.chart-wrapper {
  @apply flex-shrink-0;
}

.pie-chart {
  @apply relative w-64 h-64;
}

.chart-center {
  @apply absolute inset-0 flex flex-col items-center justify-center;
}

.center-value {
  @apply text-2xl font-bold text-gray-900 dark:text-white;
}

.center-label {
  @apply text-sm text-gray-600 dark:text-gray-400;
}

.chart-legend {
  @apply flex-1 space-y-4;
}

.legend-item {
  @apply flex items-center space-x-4;
}

.legend-color {
  @apply w-4 h-4 rounded-full;
}

.legend-info {
  @apply flex-1;
}

.legend-name {
  @apply font-medium text-gray-900 dark:text-white;
}

.legend-details {
  @apply text-sm text-gray-600 dark:text-gray-400 mt-1;
}

.legend-value {
  @apply font-medium;
}

.legend-percentage {
  @apply ml-2;
}

.allocation-table {
  @apply bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700;
}

.asset-cell {
  @apply flex items-center space-x-3;
}

.asset-color {
  @apply w-3 h-3 rounded-full;
}

.asset-info {
  @apply flex flex-col;
}

.asset-name {
  @apply font-medium text-gray-900 dark:text-white;
}

.asset-symbol {
  @apply text-sm text-gray-500 dark:text-gray-400;
}

.percentage-cell {
  @apply flex items-center space-x-3;
}

.percentage-bar {
  @apply w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden;
}

.percentage-fill {
  @apply h-full transition-all duration-300;
}

.percentage-text {
  @apply text-sm font-medium;
}

.change-cell {
  @apply flex items-center space-x-1;
}

.change-cell.positive {
  @apply text-green-600 dark:text-green-400;
}

.change-cell.negative {
  @apply text-red-600 dark:text-red-400;
}

.performance-chart {
  @apply bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8;
}

.chart-placeholder {
  @apply w-full h-64 mb-6;
}

.chart-stats {
  @apply grid grid-cols-1 md:grid-cols-3 gap-6;
}

.stat-item {
  @apply flex flex-col items-center text-center;
}

.stat-label {
  @apply text-sm text-gray-600 dark:text-gray-400;
}

.stat-value {
  @apply text-lg font-bold text-gray-900 dark:text-white mt-1;
}

.holdings-list {
  @apply space-y-6;
}

.holding-card {
  @apply bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all duration-200 hover:shadow-md;
}

.holding-header {
  @apply flex items-center justify-between mb-4;
}

.holding-info {
  @apply flex items-center space-x-3;
}

.holding-name {
  @apply font-medium text-gray-900 dark:text-white;
}

.holding-value {
  @apply text-right;
}

.value-amount {
  @apply text-lg font-bold text-gray-900 dark:text-white;
}

.value-change {
  @apply flex items-center justify-end space-x-1 text-sm mt-1;
}

.value-change.positive {
  @apply text-green-600 dark:text-green-400;
}

.value-change.negative {
  @apply text-red-600 dark:text-red-400;
}

.detail-grid {
  @apply grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4;
}

.detail-item {
  @apply flex flex-col;
}

.detail-label {
  @apply text-sm text-gray-600 dark:text-gray-400;
}

.detail-value {
  @apply font-medium text-gray-900 dark:text-white mt-1;
}

.detail-value.positive {
  @apply text-green-600 dark:text-green-400;
}

.detail-value.negative {
  @apply text-red-600 dark:text-red-400;
}

.holding-actions {
  @apply flex justify-end;
}

.history-table {
  @apply bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700;
}

.table-pagination {
  @apply flex justify-center py-4;
}

@media (max-width: 768px) {
  .overview-grid {
    @apply grid-cols-1 gap-4;
  }

  .chart-container {
    @apply flex-col space-y-6;
  }

  .chart-wrapper {
    @apply w-full flex justify-center;
  }

  .detail-grid {
    @apply grid-cols-1 gap-3;
  }

  .holding-header {
    @apply flex-col items-start space-y-3;
  }

  .holding-value {
    @apply text-left;
  }

  .value-change {
    @apply justify-start;
  }
}
</style>