import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { formatUnits, parseUnits } from 'ethers'
import { useWalletStore } from './wallet'
import { useAppStore } from './app'
import { contractService } from '@/services/contracts'
import BigNumber from 'bignumber.js'

export const useSavingsStore = defineStore('savings', () => {
  // State
  const userBalance = ref('0') // sWRMB balance
  const wrmbBalance = ref('0') // WRMB balance
  const totalAssets = ref('0') // Total assets in vault
  const currentNAV = ref('1.0') // Current NAV
  const currentPrice = ref('0.14') // Current WRMB price in USD
  const totalSupply = ref('0') // Total sWRMB supply
  const totalMMFSupply = ref('0') // Total MMF supply
  const apy = ref('0') // Annual percentage yield
  const dynamicAPY = ref('0') // Dynamic APY
  const dynamicWRMB = ref('0') // Dynamic WRMB
  const userAssetValue = ref('0') // User's asset value in maxWithdraw 
  const userIncrementAmount = ref('0') // User's increment amount
  const totalPendingAmount = ref('0') // Total pending amount
  const isLoading = ref(false)
  const lastUpdateTime = ref(0)
  const historicalNAV = ref<Array<{ timestamp: number, nav: number }>>([]) // Historical NAV data for APY calculation

  // Form state
  const depositAmount = ref('')
  const withdrawAmount = ref('')
  const isDepositing = ref(false)
  const isWithdrawing = ref(false)

  // Getters
  const userBalanceFormatted = computed(() => {
    return new BigNumber(formatUnits(userBalance.value, 18)).toFixed(6)
  })

  const wrmbBalanceFormatted = computed(() => {
    return new BigNumber(formatUnits(wrmbBalance.value, 18)).toFixed(6)
  })

  const totalAssetsFormatted = computed(() => {
    return new BigNumber(totalAssets.value).toFixed(2)
  })

  const userSharePercentage = computed(() => {
    if (totalSupply.value === '0' || userBalance.value === '0') return '0'
    return new BigNumber(userBalance.value)
      .dividedBy(totalSupply.value)
      .multipliedBy(100)
      .toFixed(4)
  })

  // Actions
  const fetchVaultData = async () => {
    const walletStore = useWalletStore()
    const appStore = useAppStore()

    if (!walletStore.isConnected) return

    try {
      isLoading.value = true

      const contract = await contractService.getSavingsVaultContract()
      if (!contract) throw new Error('Contract not available')

      // Fetch vault data
      const [vaultTotalAssets, vaultTotalSupply, mmfTotalSupply, nav, maxWithdraw, lastincAmount, incrementAmount, pendingAmount] = await Promise.all([
        contract.totalAssets(),
        contract.totalSupply(),
        contract.totalMMFSupply(),
        contract.getNAV_sWRMB(),
        contract.maxWithdraw(walletStore.address),
        contract.lastIncreaseAmount(),
        contract.getUserIncrementAmount(walletStore.address),
        contract.currentPendingIncreaseAmount(),
      ])

      totalAssets.value = formatUnits(vaultTotalAssets.toString(), 18)
      totalSupply.value = formatUnits(vaultTotalSupply.toString(), 18)
      totalMMFSupply.value = formatUnits(mmfTotalSupply.toString(), 18)
      userAssetValue.value = formatUnits(maxWithdraw.toString(), 18)
      userIncrementAmount.value = '0'//formatUnits(incrementAmount.toString(), 18)
      totalPendingAmount.value = formatUnits(pendingAmount.toString(), 18)

      currentNAV.value = formatUnits(nav, 18)
      apy.value = new BigNumber(formatUnits(lastincAmount, 16)).dividedBy(totalMMFSupply.value).multipliedBy(365).toString()
      const sWRMB_external_shares = new BigNumber(totalSupply.value).gt(0) ? totalSupply.value : '1'
      const B_Total_APY = new BigNumber(apy.value).multipliedBy(totalMMFSupply.value).dividedBy(sWRMB_external_shares);
      dynamicAPY.value = B_Total_APY.gt(0) ? B_Total_APY.toString() : '0';
      const baseWRMB = new BigNumber(apy.value).multipliedBy(totalMMFSupply.value);
      dynamicWRMB.value = baseWRMB.dividedBy(100).toString();

      // Fetch WRMB price (placeholder - in real implementation, this would come from an oracle or API)
      await fetchWRMBPrice()

      // Fetch user balances if connected
      if (walletStore.address) {
        await fetchUserBalances()
      }
    } catch (error: any) {
      console.error('Failed to fetch vault data:', error)
      // appStore.addNotification({
      //   type: 'error',
      //   title: 'Data Fetch Failed',
      //   message: error.message || 'Failed to fetch vault data'
      // })
    } finally {
      isLoading.value = false
    }
  }

  const fetchUserBalances = async () => {
    const walletStore = useWalletStore()
    if (!walletStore.address) return

    try {
      const [savingsContract, wrmbContract] = await Promise.all([
        contractService.getSavingsVaultContract(),
        contractService.getWRMBContract()
      ])

      if (!savingsContract || !wrmbContract) return

      const [sWRMBBalance, wrmbUserBalance] = await Promise.all([
        savingsContract.balanceOf(walletStore.address),
        wrmbContract.balanceOf(walletStore.address)
      ])

      userBalance.value = formatUnits(sWRMBBalance, 18)
      wrmbBalance.value = formatUnits(wrmbUserBalance, 18)
    } catch (error) {
      console.error('Failed to fetch user balances:', error)
    }
  }

  const previewDeposit = async (amount: string) => {
    if (!amount || amount === '0') return { shares: '0', fee: '0' }

    try {
      const contract = await contractService.getSavingsVaultContract()
      if (!contract) throw new Error('Contract not available')

      const amountWei = parseUnits(amount, 18)
      const shares = await contract.previewDeposit(amountWei)

      return {
        shares: formatUnits(shares, 18),
        fee: '0' // No fee for deposits in this implementation
      }
    } catch (error) {
      console.error('Failed to preview deposit:', error)
      return { shares: '0', fee: '0' }
    }
  }

  const previewWithdraw = async (amount: string) => {
    if (!amount || amount === '0') return { shares: '0', assets: '0', fee: '0' }

    try {
      const contract = await contractService.getSavingsVaultContract()
      if (!contract) throw new Error('Contract not available')

      const assetsWei = parseUnits(amount, 18)
      const shares = await contract.previewWithdrawOfFee(assetsWei)

      return {
        shares: formatUnits(shares[0], 18),
        assets: formatUnits(shares[1], 18),
        fee: formatUnits(shares[2], 18)
      }
    } catch (error) {
      console.error('Failed to preview withdraw:', error)
      return { shares: '0', assets: '0', fee: '0' }
    }
  }

  const fetchWRMBPrice = async () => {
    try {
      // In a real implementation, this would fetch from an oracle or price API
      // For now, we'll use a mock price with some variation
      const basePrice = 0.14
      const variation = (Math.random() - 0.5) * 0.02 // ±1% variation
      currentPrice.value = (basePrice + variation).toFixed(4)
    } catch (error) {
      console.error('Failed to fetch WRMB price:', error)
      // Fallback to default price
      currentPrice.value = '0.14'
    }
  }

  // Auto-refresh data
  let refreshInterval: NodeJS.Timeout | null = null

  const startAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
    }

    refreshInterval = setInterval(() => {
      if (Date.now() - lastUpdateTime.value > 6000) { // 6 seconds
        fetchVaultData()
      }
    }, 6000)
  }

  const stopAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
  }

  return {
    // State
    userBalance,
    wrmbBalance,
    totalAssets,
    currentNAV,
    currentPrice,
    totalSupply,
    apy,
    dynamicAPY,
    dynamicWRMB,
    userIncrementAmount,
    totalPendingAmount,
    isLoading,
    depositAmount,
    withdrawAmount,
    isDepositing,
    isWithdrawing,
    historicalNAV,

    // Getters
    userBalanceFormatted,
    wrmbBalanceFormatted,
    totalAssetsFormatted,
    userSharePercentage,
    userAssetValue,

    // Actions
    fetchVaultData,
    fetchUserBalances,
    fetchWRMBPrice,
    previewDeposit,
    previewWithdraw,
    startAutoRefresh,
    stopAutoRefresh,

    // Computed getters for reactive access
    get depositInProgress() { return isDepositing.value },
    get withdrawInProgress() { return isWithdrawing.value },
    get loading() { return isLoading.value }
  }
})