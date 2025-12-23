import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { formatUnits } from 'ethers'
import { useWalletStore } from './wallet'
import { contractService } from '../services/contracts'
import BigNumber from 'bignumber.js'

export const useFarmStore = defineStore('farm', () => {
  // State
  const liquidityAmount = ref('0') // Total USDT deposited in AMO
  const incrementAmount = ref('0') // Increment amount
  const usdtBalance = ref('0') // User's USDT balance
  const depositedAmount = ref('0') // User's deposited USDT amount
  const pendingCINA = ref('0') // User's pending CINA rewards
  const farmAPY = ref('0') // Current farm APY
  const farmRate = ref('0') // CINA farm rate per USDT per second
  const exchangeRate = ref('1.0') // USDT to CINA exchange rate
  const minDepositAmount = ref('10.0') // Minimum deposit amount
  const depositFee = ref('0.001') // Deposit fee (0.1%)
  const withdrawalFee = ref('0.002') // Withdrawal fee (0.2%)
  const lastClaimTime = ref(0) // Last claim timestamp
  const depositTime = ref(0) // User's deposit timestamp
  const isLoading = ref(false)
  const lastUpdateTime = ref(0)


  // Form state
  const depositInProgress = ref(false)
  const claimInProgress = ref(false)
  const withdrawInProgress = ref(false)

  // Getters
  const usdtBalanceFormatted = computed(() => {
    return new BigNumber(formatUnits(usdtBalance.value, 6)).toFixed(2) // USDT has 6 decimals
  })

  const depositedAmountFormatted = computed(() => {
    return new BigNumber(formatUnits(depositedAmount.value, 6)).toFixed(2)
  })

  // Actions
  const fetchFarmData = async () => {
    const walletStore = useWalletStore()

    if (!walletStore.isConnected) return

    try {
      isLoading.value = true

      // Get Farm Vault contract
      const farmVaultContract = contractService.getFarmVaultContract()
      const usdtCantoContract = contractService.getUSDTContract()
      if (!farmVaultContract || !usdtCantoContract) throw new Error('Farm Vault contract not available')

      // Fetch farm data from contract
      const [totalSupply, rewardRate, rewardForDuration, remainingTime, earnedAmount, userBalance, usdtLiquidityAmount] = await Promise.all([
        farmVaultContract.totalSupply(),
        farmVaultContract.rewardRate(),
        farmVaultContract.getRewardForDuration(),
        farmVaultContract.getRemainingTime(),
        farmVaultContract.earned(walletStore.address),
        farmVaultContract.balanceOf(walletStore.address),
        usdtCantoContract.balanceOf(farmVaultContract.getAddress()),
      ])

      // Update farm data
      liquidityAmount.value = formatUnits(usdtLiquidityAmount, 6) // Assuming USDT (6 decimals)
      farmRate.value = formatUnits(rewardRate, 18) // CINA rewards per second
      pendingCINA.value = formatUnits(earnedAmount, 18)
      incrementAmount.value = '0';//new BigNumber(farmRate.value).multipliedBy(userBalance).dividedBy(totalSupply).toFixed(18)

      // Calculate APY based on reward rate and total supply
      if (totalSupply > 0) {
        const annualRewards = parseFloat(farmRate.value) * 365 * 24 * 60 * 60
        const totalSupplyFormatted = parseFloat(formatUnits(totalSupply, 6))
        farmAPY.value = ((annualRewards / totalSupplyFormatted) * 100).toFixed(2)
      } else {
        farmAPY.value = '0'
      }

      // Fetch user-specific data if connected
      if (walletStore.address) {
        await fetchUserFarmData()
      }

      lastUpdateTime.value = Date.now()
    } catch (error: any) {
      console.error('Failed to fetch farm data:', error)
      // appStore.addNotification({
      //   type: 'error',
      //   title: 'Data Fetch Failed',
      //   message: error.message || 'Failed to fetch farm data'
      // })
    } finally {
      isLoading.value = false
    }
  }

  const fetchUserFarmData = async () => {
    const walletStore = useWalletStore()
    if (!walletStore.address) return

    try {
      const usdtCantoContract = contractService.getUSDTContract()
      if (!usdtCantoContract) throw new Error('USDT contract not available')

      const [userBalance, userDeposit] = await Promise.all([
        usdtCantoContract.balanceOf(walletStore.address),
        contractService.getFarmVaultContract()?.balanceOf(walletStore.address)
      ])

      usdtBalance.value = formatUnits(userBalance, 6)
      depositedAmount.value = formatUnits(userDeposit, 6)
    } catch (error) {
      console.error('Failed to fetch user farm data:', error)
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
        fetchFarmData()
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
    liquidityAmount,
    incrementAmount,
    usdtBalance,
    depositedAmount,
    pendingCINA,
    farmAPY,
    farmRate,
    exchangeRate,
    minDepositAmount,
    depositFee,
    withdrawalFee,
    lastClaimTime,
    depositTime,
    isLoading,

    depositInProgress,
    claimInProgress,
    withdrawInProgress,

    // Getters
    usdtBalanceFormatted,
    depositedAmountFormatted,

    // Actions
    fetchFarmData,
    fetchUserFarmData,
    startAutoRefresh,
    stopAutoRefresh,

    // Computed getters for reactive access
    get loading() { return isLoading.value }
  }
})