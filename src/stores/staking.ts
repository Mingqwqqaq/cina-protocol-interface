import { defineStore } from 'pinia'
import { ref } from 'vue'
import { formatUnits, parseUnits } from 'ethers'
import { useWalletStore } from './wallet'
import { contractService } from '../services/contracts'

export const useStakingStore = defineStore('staking', () => {
  // State
  const yourStaked = ref('0') // Your staked amount (maxWithdraw)
  const totalSupply = ref('0') // Total stCINA supply
  const cinaBalance = ref('0') // User's CINA balance
  const stCINABalance = ref('0') // User's stCINA balance
  const stakedAmount = ref('0') // User's staked CINA amount (stCINA balance)
  const currentAPY = ref('0') // Current staking APY
  const minStakeAmount = ref('0.01') // Minimum stake amount
  const navCina = ref('1.0') // NAV per CINA
  const incrementAmount = ref('0') // Current increment amount
  const userIncrementAmount = ref('0') // User's increment amount
  const isLoading = ref(false)
  const lastUpdateTime = ref(0)
  const totalPendingAmount = ref('0')

  // Actions
  const fetchStakingData = async () => {
    const walletStore = useWalletStore()

    if (!walletStore.isConnected) return

    try {
      isLoading.value = true

      // Get staking contract
      const stakingContract = contractService.getStakingVaultContract()
      if (!stakingContract) {
        console.warn('Staking contract not available, using mock data')
        // Fallback to mock data
        yourStaked.value = '1250000.5678'
        totalSupply.value = '1200000.0000'
        currentAPY.value = '12.5'
        navCina.value = '1.025'
        minStakeAmount.value = '1.0'
        incrementAmount.value = '0.0005'
        totalPendingAmount.value = '0'
        
        if (walletStore.address) {
          await fetchUserStakingData()
        }
        return
      }

      // Fetch contract data using correct method calls
      const [
        totalSupplyResult,
        navCinaResult,
        minStakeAmountResult,
        incrementAmountResult,
        yourStakedResult,
        lastDayRewardAmountResult,
        totalPendingAmountResult
      ] = await Promise.all([
        stakingContract.totalSupply().catch(() => '0'),
        stakingContract.getNAV_CINA().catch(() => '1000000000000000000'), // 1.0 in wei
        stakingContract.minStakeAmount().catch(() => '1000000000000000000'), // 1 CINA
        stakingContract.getUserIncrementAmount(walletStore.address).catch(() => '0'),
        stakingContract.maxWithdraw(walletStore.address).catch(() => '0'),
        stakingContract.lastDayRewardAmount().catch(() => '0'),
        stakingContract.getTotalPendingAmount().catch(() => '0'),
      ])

      // Convert from wei to readable format
      totalSupply.value = formatUnits(totalSupplyResult, 18)
      navCina.value = formatUnits(navCinaResult, 18)
      minStakeAmount.value = formatUnits(minStakeAmountResult, 18)
      incrementAmount.value = '0'// formatUnits(incrementAmountResult, 18)
      yourStaked.value = formatUnits(yourStakedResult, 18)
      totalPendingAmount.value = formatUnits(totalPendingAmountResult, 18)
      
      // Calculate APY based on increment amount
      const rewardFloat = parseFloat(formatUnits(lastDayRewardAmountResult, 18))
      const totalSupplyFloat = parseFloat(totalSupply.value) > 0 ? parseFloat(totalSupply.value) : 1

      if (rewardFloat > 0) {
        // Simple APY calculation based on increment
        currentAPY.value = (rewardFloat/totalSupplyFloat * 365 * 100).toFixed(2)
      } else {
        currentAPY.value = '0'
      }

      // Fetch user-specific data if connected
      if (walletStore.address) {
        await fetchUserStakingData()
      }

      lastUpdateTime.value = Date.now()
    } catch (error: any) {
      console.error('Failed to fetch staking data:', error)
      // appStore.addNotification({
      //   type: 'error',
      //   title: 'Data Fetch Failed',
      //   message: error.message || 'Failed to fetch staking data'
      // })
    } finally {
      isLoading.value = false
    }
  }

  const fetchUserStakingData = async () => {
    const walletStore = useWalletStore()
    if (!walletStore.address) return

    try {
      // Get contracts
      const stakingContract = contractService.getStakingVaultContract()
      const cinaContract = contractService.getCINAContract()
      
      if (!stakingContract || !cinaContract) {
        console.warn('Contracts not available, using mock user data')
        // Fallback to mock data
        cinaBalance.value = '500.123456'
        stakedAmount.value = '250.789012'

        return
      }

      // Fetch user data from contracts
      const [
        cinaBalanceResult,
        stCINABalanceResult,
        userStakedAmountResult
      ] = await Promise.all([
        cinaContract.balanceOf(walletStore.address).catch(() => '0'),
        stakingContract.balanceOf(walletStore.address).catch(() => '0'), // User's stCINA balance
        stakingContract.maxWithdraw(walletStore.address).catch(() => '0'), // User's stCINA balance
      ])

      // Convert from wei to readable format
      cinaBalance.value = formatUnits(cinaBalanceResult, 18)
      stakedAmount.value = formatUnits(userStakedAmountResult, 18)
      stCINABalance.value = formatUnits(stCINABalanceResult, 18)
    } catch (error) {
      console.error('Failed to fetch user staking data:', error)
    }
  }

    const previewDeposit = async (amount: string) => {
    if (!amount || amount === '0') return { shares: '0', fee: '0' }

    try {
      const contract = await contractService.getStakingVaultContract()
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
      const contract = await contractService.getStakingVaultContract()
      if (!contract) throw new Error('Contract not available')

      const assetsWei = parseUnits(amount, 18)
      const shares = await contract.previewWithdraw(assetsWei)

      return {
        shares: formatUnits(shares, 18)
      }
    } catch (error) {
      console.error('Failed to preview withdraw:', error)
      return { shares: '0', assets: '0', fee: '0' }
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
        fetchStakingData()
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
    yourStaked,
    totalSupply,
    cinaBalance,
    stCINABalance,
    stakedAmount,
    currentAPY,
    navCina,
    minStakeAmount,
    incrementAmount,
    userIncrementAmount,
    totalPendingAmount,
    isLoading,

    // Actions
    fetchStakingData,
    fetchUserStakingData,
    startAutoRefresh,
    stopAutoRefresh,
    previewDeposit,
    previewWithdraw,

    // Computed getters for reactive access
    get loading() { return isLoading.value }
  }
})