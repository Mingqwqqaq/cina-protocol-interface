<template>
  <div class="h-full">
    <PullToRefresh :is-pulling="isPulling" :is-refreshing="isRefreshing" :pull-distance="pullDistance"
      :can-refresh="canRefresh" class="h-full">
      <!-- Portfolio Overview -->
      <div class="portfolio-section">
        <h2 class="section-title">
          {{ $t('dashboard.title') }}
        </h2>

        <div class="stats-grid">
          <!-- Total Value -->
          <router-link to="/wrap" class="stat-card primary">
            <div class="stat-header">
              <h3 class="stat-title">{{ $t('dashboard.totalValue') }}</h3>
            </div>
            <div class="stat-content">
              <div class="stat-value">
                {{ formatNumber(totalSRMBValue) }}
              </div>
              <div class="stat-change" :class="portfolioChange >= 0 ? 'positive' : 'negative'">
                <el-icon>
                  <ArrowUp v-if="portfolioChange >= 0" />
                  <ArrowDown v-else />
                </el-icon>
                {{ Math.abs(portfolioChange).toFixed(2) }}%
              </div>
            </div>
          </router-link>

          <!-- Savings Balance -->
          <router-link to="/savings" class="stat-card">
            <div class="stat-header">
              <h3 class="stat-title">WRMB {{ $t('dashboard.savingsLiquidity') }}</h3>
            </div>
            <div class="stat-content">
              <div class="stat-value">
                {{ formatNumber(savingsStore.totalAssets) }}
              </div>
              <div class="stat-subtitle">
                ≈ ${{ formatNumber(parseFloat(savingsStore.totalAssets) * 0.14) }}
              </div>
            </div>
          </router-link>

          <!-- Current APY -->
          <router-link to="/savings" class="stat-card">
            <div class="stat-header">
              <h3 class="stat-title">{{ $t('dashboard.currentAPY') }}</h3>
            </div>
            <div class="stat-content">
              <div class="stat-value">
                {{ formatNumber(savingsStore.dynamicAPY) }}%
              </div>
              <div class="stat-subtitle">
                {{ $t('dashboard.todaysRemaining') }}
                <span class="text-sm text-green-600 dark:text-green-400">{{ formatNumber(savingsStore.totalPendingAmount) }}
                  WRMB</span>
              </div>
            </div>
          </router-link>

          <!-- staking -->
          <router-link to="/staking" class="stat-card">
            <div class="stat-header">
              <h3 class="stat-title">{{ $t('dashboard.totalPendingOfYear') }}</h3>
            </div>
            <div class="stat-content">
              <div class="stat-value">
                {{ formatNumber(stakingStore.totalPendingAmount) }} CINA
              </div>
              <div class="stat-subtitle">
              </div>
            </div>
          </router-link>
        </div>
      </div>

      <!-- Asset Allocation -->
      <div class="allocation-section">
        <div class="section-header">
          <h2 class="section-title">
            {{ $t('dashboard.portfolio') }}
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
            </el-radio-group>
          </div>
        </div>

        <div class="performance-chart">
          <!-- Line Chart Placeholder -->
          <div class="chart-placeholder">
            <svg viewBox="0 0 801 301" class="w-full h-full">
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

      <!-- Recent Activity -->
      <div class="activity-section">
        <div class="section-header">
          <h2 class="section-title">
            {{ $t('dashboard.recentActivity') }}
          </h2>
        </div>

        <div class="activity-list">
          <div v-if="recentActivities.length === 0" class="empty-state">
            <el-icon class="text-4xl text-gray-400 mb-2">
              <Document />
            </el-icon>
            <p class="text-gray-500 dark:text-gray-400">
              {{ $t('dashboard.noActivity') }}
            </p>
          </div>

          <div v-for="activity in recentActivities.slice(0, 5)" :key="activity.id" class="activity-item">
            <div class="activity-icon" :class="activity.type">
              <el-icon>
                <component :is="getActivityIcon(activity.type)" />
              </el-icon>
            </div>
            <div class="activity-content">
              <div class="activity-title">{{ activity.title }}</div>
              <div class="activity-description">{{ activity.description }}</div>
            </div>
            <div class="activity-meta">
              <div class="activity-amount" :class="activity.type">
                {{ activity.amount }}
              </div>
              <div class="activity-time">
                {{ formatTimeAgo(activity.timestamp) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PullToRefresh>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Wallet,
  TrendCharts,
  Document,
  ArrowUp,
  ArrowDown,
  Switch,
} from '@element-plus/icons-vue'

import { useWalletStore } from '@/stores/wallet'
import { useSavingsStore } from '@/stores/savings'
import { useStakingStore } from '@/stores/staking'
import { formatNumber, formatTimeAgo } from '@/utils/format'
import { contractService } from '@/services/contracts'
import { formatUnits } from 'ethers'
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

const { t } = useI18n()
const walletStore = useWalletStore()
const savingsStore = useSavingsStore()
const stakingStore = useStakingStore()

// const refreshing = ref(false) // Now handled by usePullToRefresh
const allocationView = ref('chart')
const performanceRange = ref('30d')

// Mock data for demonstration
const portfolioChange = ref(2.34)
const totalSRMBValue = ref('')

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

const recentActivities = ref([
  {
    id: 1,
    type: 'deposit',
    title: t('dashboard.depositSavings'),
    description: t('dashboard.depositDescription'),
    amount: '+1,000 WRMB',
    timestamp: Date.now() - 3600000
  },
  {
    id: 2,
    type: 'bond',
    title: t('dashboard.bondSubscription'),
    description: t('dashboard.bondDescription'),
    amount: '+500 USDT',
    timestamp: Date.now() - 7200000
  },
  {
    id: 3,
    type: 'wrap',
    title: t('dashboard.wrapTokens'),
    description: t('dashboard.wrapDescription'),
    amount: '200 sRMB → sWRMB',
    timestamp: Date.now() - 86400000
  }
])

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

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'deposit':
    case 'withdraw':
      return Wallet
    case 'bond':
      return TrendCharts
    case 'wrap':
    case 'unwrap':
      return Switch
    default:
      return Document
  }
}

const onRefresh = async (): Promise<void> => {
  try {
    const wrapManager = contractService.getWrapManagerContract()
    if (!wrapManager) return
    const sRMBTVL = await wrapManager.totalWrapped();
    totalSRMBValue.value = formatUnits(sRMBTVL.toString(), 6).toString()

    Promise.all([
      savingsStore.fetchVaultData(),
      savingsStore.fetchUserBalances(),
      stakingStore.fetchStakingData(),
    ])
  } catch (error) {
    console.error('Failed to refresh data:', error)
  }
}

const { isRefreshing, isPulling, pullDistance, canRefresh } = usePullToRefresh({
  onRefresh,
})

const refreshData = async () => {
  await onRefresh()
}

onMounted(async () => {
  if (walletStore.isConnected) {
    await refreshData()
  }
})

// Watch for wallet connection changes
watch(
  () => walletStore.isConnected,
  async (connected) => {
    if (connected) {
      await refreshData()
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
</script>

<style scoped>
.portfolio-section {
  @apply space-y-6;
}

.connection-prompt {
  @apply flex items-center justify-center min-h-96 px-6;
}

.prompt-card {
  background-color: var(--card-bg);
  @apply rounded-2xl shadow-lg p-8 text-center max-w-md;
}

.activity-section {
  @apply mt-8 mb-10;
}

.section-title {
  color: var(--text-primary);
  @apply text-2xl font-bold;
}

.section-header {
  @apply flex items-center justify-between mb-6;
}

.view-all-link {
  color: var(--primary-color);
  @apply flex items-center hover:opacity-80 font-medium transition-colors;
}

.stats-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6;
}

.stat-card {
  background-color: var(--card-bg);
  @apply rounded-xl p-6 transition-all duration-200;
}

.stat-card.primary {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
  color: white;
  border-color: var(--primary-color);
}

.stat-header {
  @apply flex items-center justify-between mb-4;
}

.stat-title {
  color: var(--text-secondary);
  @apply text-sm font-medium;
}

.stat-card.primary .stat-title {
  color: rgba(255, 255, 255, 0.8);
}

.stat-icon {
  color: var(--text-secondary);
  @apply text-xl;
}

.stat-card.primary .stat-icon {
  color: rgba(255, 255, 255, 0.7);
}

.stat-value {
  color: var(--number-color);
  @apply text-2xl font-bold;
}

.stat-card.primary .stat-value {
  color: white;
}

.stat-subtitle {
  color: var(--text-secondary);
  @apply text-sm mt-1;
}

.stat-card.primary .stat-subtitle {
  color: rgba(255, 255, 255, 0.8);
}

.stat-change {
  @apply flex items-center text-sm font-medium mt-2;
}

.stat-change.positive {
  color: var(--success-color);
}

.stat-change.negative {
  color: var(--error-color);
}

.stat-card.primary .stat-change {
  color: rgba(255, 255, 255, 0.8);
}

.allocation-section {
  @apply space-y-6 mt-8;
}

.view-toggle {
  @apply flex items-center;
}

.allocation-content {
  background-color: var(--card-bg);
  @apply rounded-xl p-2;
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
  color: var(--number-color);
  @apply text-2xl font-bold;
}

.center-label {
  color: var(--text-secondary);
  @apply text-sm;
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
  color: var(--text-primary);
  @apply font-medium;
}

.legend-details {
  color: var(--text-secondary);
  @apply text-sm mt-1;
}

.legend-value {
  @apply font-medium;
}

.legend-percentage {
  @apply ml-2;
}

.allocation-table {
  @apply overflow-auto rounded-lg shadow-sm;
}

.allocation-table :deep(.el-table) {
  background-color: var(--card-bg);
  @apply border-0 rounded-lg;
}

.allocation-table :deep(.el-table__header) {
  background-color: var(--card-bg);
}

.allocation-table :deep(.el-table__body) {
  background-color: var(--card-bg);
}

.allocation-table :deep(.el-table__cell) {
  border-bottom: 1px solid var(--border-color);
  @apply px-3 py-4 text-sm;
}

.allocation-table :deep(.el-table__header .el-table__cell) {
  background-color: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
  @apply font-semibold text-xs uppercase tracking-wider p-3;
}

.allocation-table :deep(.el-table__header-wrapper) {
  background-color: var(--card-bg);
  @apply rounded-t-lg;
}

.allocation-table :deep(.el-table__header th) {
  background-color: var(--card-bg);
  color: var(--text-secondary);
}

.allocation-table :deep(.el-table__row) {
  @apply transition-colors duration-200 ease-in-out;
}

.allocation-table :deep(.el-table__row:hover) {
  background-color: var(--bg-primary);
}

.allocation-table :deep(.el-table__row:last-child .el-table__cell) {
  @apply border-b-0;
}

.asset-cell {
  @apply flex items-center space-x-3;
}

.asset-color {
  @apply w-4 h-4 rounded-full shadow-md;
}

.asset-info {
  @apply flex flex-col;
}

.asset-name {
  color: var(--text-primary);
  @apply font-semibold text-sm leading-snug;
}

.asset-symbol {
  color: var(--text-secondary);
  @apply text-xs font-medium mt-0.5;
}

.percentage-cell {
  @apply flex items-center space-x-3;
}

.percentage-bar {
  background-color: var(--bg-primary);
  @apply w-20 h-2.5 rounded-full overflow-hidden shadow-inner;
}

.percentage-fill {
  @apply h-full transition-all duration-500 ease-out rounded-full;
}

.percentage-text {
  color: var(--text-primary);
  @apply text-sm font-semibold min-w-11 text-right;
}

.change-cell {
  @apply flex items-center space-x-1.5 font-semibold text-xs;
}

.change-cell.positive {
  color: var(--success-color);
}

.change-cell.negative {
  color: var(--error-color);
}

.change-cell .el-icon {
  @apply text-sm font-bold;
}

.performance-section {
  @apply space-y-6 mt-8;
}

.time-range {
  @apply flex items-center;
}

.performance-chart {
  background-color: var(--card-bg);
  @apply rounded-xl p-6;
}

.chart-placeholder {
  @apply w-full h-64 mb-6;
}

.chart-stats {
  @apply grid grid-cols-1 md:grid-cols-3 gap-6 mb-20;
}

.stat-item {
  @apply flex flex-col items-center text-center;
}

.stat-label {
  color: var(--text-secondary);
  @apply text-sm;
}

.stat-value {
  color: var(--text-primary);
  @apply text-lg font-semibold mt-1;
}

.activity-list {
  background-color: var(--card-bg);
  @apply rounded-xl divide-y;
}

.activity-list>*:not(:last-child) {
  border-bottom: 1px solid var(--border-color);
}

.empty-state {
  @apply flex flex-col items-center justify-center py-12 text-center;
}

.activity-item {
  @apply flex items-center p-6 hover:opacity-90 transition-colors;
}

.activity-icon {
  @apply w-10 h-10 rounded-lg flex items-center justify-center text-white mr-4;
}

.activity-icon.deposit {
  background-color: var(--success-color);
}

.activity-icon.withdraw {
  background-color: var(--error-color);
}

.activity-icon.bond {
  background-color: #3b82f6;
}

.activity-icon.wrap,
.activity-icon.unwrap {
  background-color: #8b5cf6;
}

.activity-content {
  @apply flex-1;
}

.activity-title {
  color: var(--text-primary);
  @apply font-medium;
}

.activity-description {
  color: var(--text-secondary);
  @apply text-sm mt-1;
}

.activity-meta {
  @apply text-right;
}

.activity-amount {
  @apply font-medium;
}

.activity-amount.deposit {
  color: var(--success-color);
}

.activity-amount.withdraw {
  color: var(--error-color);
}

.activity-amount.bond,
.activity-amount.wrap,
.activity-amount.unwrap {
  color: var(--text-primary);
}

.activity-time {
  color: var(--text-secondary);
  @apply text-xs mt-1;
}

@media (max-width: 768px) {
  .stats-grid {
    @apply grid-cols-1 gap-4;
  }

  .activity-item {
    @apply p-4;
  }

  .performance-chart {
    @apply p-1;
  }

  .chart-placeholder {
    @apply mb-0 h-40;
  }
}
</style>