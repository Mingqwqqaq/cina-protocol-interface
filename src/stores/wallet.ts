import { defineStore } from 'pinia'
import { ref, computed, markRaw, watch } from 'vue'
import { BrowserProvider, JsonRpcSigner, formatEther } from 'ethers'
import { useAppStore } from './app'
import { STORAGE_KEYS } from '../constants'
import { SUCCESS_MESSAGES, UI_CONSTANTS, NETWORKS, ENV } from '../constants'
import { useAppKitProvider, useAppKitAccount, useAppKitNetwork, useDisconnect } from '@reown/appkit/vue'

export interface NetworkConfig {
  chainId: number
  name: string
  rpcUrl: string
  blockExplorer: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
}

export const SUPPORTED_NETWORKS: Record<number, NetworkConfig> = {
  1: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: `${NETWORKS.ETHEREUM.rpcUrl}${ENV.VITE_INFURA_PROJECT_ID}`,
    blockExplorer: NETWORKS.ETHEREUM.blockExplorer,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    }
  },
  11155111: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: `${NETWORKS.SEPOLIA.rpcUrl}${ENV.VITE_INFURA_PROJECT_ID}`,
    blockExplorer: NETWORKS.SEPOLIA.blockExplorer,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    }
  },
  31337: {
    chainId: 31337,
    name: 'Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    blockExplorer: '',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    }
  }
}

export const useWalletStore = defineStore('wallet', () => {
  // State
  const isConnected = ref(false)
  const address = ref('')
  const chainId = ref(0)
  const provider = ref<BrowserProvider | null>(null)
  const signer = ref<JsonRpcSigner | null>(null)
  const balance = ref('0')
  const isConnecting = ref(false)

  const accountInfo = useAppKitAccount()
  const networkInfo = useAppKitNetwork()

  // watch account changes and reload balance when address becomes available
  watch(
    () => accountInfo.value?.address,
    (addr) => {
      console.log("addr", addr);
      if (addr) {
        connectWallet().then(() => {
          address.value = addr;
          updateBalance();
        });
      }
    }
  )

  watch(
    () => accountInfo.value?.isConnected,
    (connected) => {
      console.log("connected", connected);
      isConnected.value = connected
      if (!connected) {
        localStorage.setItem(STORAGE_KEYS.WALLET_CONNECTED, 'false')
      }
    }
  )

  watch(
    () => networkInfo.value?.chainId,
    (newChainId) => {
      console.log("newChainId", newChainId);
      if (newChainId) {
        connectWallet();
      }
    }
  )

  // Computed properties
  const currentNetwork = computed(() => {
    return SUPPORTED_NETWORKS[chainId.value] || null
  })

  const shortAddress = computed(() => {
    if (!address.value) return ''
    return `${address.value.slice(0, 6)}...${address.value.slice(-4)}`
  })

  const isNetworkSupported = computed(() => {
    return chainId.value in SUPPORTED_NETWORKS
  })

  // Actions
  const connectWallet = async () => {
    const appStore = useAppStore()

    if (isConnecting.value) return false

    try {
      isConnecting.value = true

      const { walletProvider } = useAppKitProvider('eip155') as { walletProvider?: any }
      if (!walletProvider) {
        return false
      }

      // Create timeout Promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Connection timeout, please check your network or try again later'))
        }, 30000) // 30 seconds timeout
      })

      // Create connection Promise
      const connectPromise = async () => {
        const web3Provider = new BrowserProvider(walletProvider)
        const web3Signer = await web3Provider.getSigner()
        provider.value = markRaw(web3Provider)
        signer.value = markRaw(web3Signer)
        chainId.value = Number(networkInfo.value?.chainId)
        isConnected.value = true
        return true
      }

      // Use Promise.race for timeout control
      await Promise.race([connectPromise(), timeoutPromise])

      appStore.addNotification({
        type: 'success',
        title: SUCCESS_MESSAGES.WALLET_CONNECTED,
        message: `Connected to ${shortAddress.value}`,
        duration: UI_CONSTANTS.NOTIFICATION_DURATION
      })

      localStorage.setItem(STORAGE_KEYS.WALLET_CONNECTED, 'true')
      return true
    } catch (error: any) {
      console.error('Failed to connect wallet:', error)
      appStore.addNotification({
        type: 'error',
        title: 'Connection Failed',
        message: `Failed to connect wallet: ${error.message}`,
        duration: UI_CONSTANTS.NOTIFICATION_DURATION
      })
      return false
    } finally {
      isConnecting.value = false
    }
  }

  // Disconnect wallet
  const disconnectWallet = () => {
    const appStore = useAppStore()

    provider.value = null
    signer.value = null
    address.value = ''
    chainId.value = 0
    isConnected.value = false
    balance.value = '0'

    const disconnect = useDisconnect()
    disconnect.disconnect()

    appStore.addNotification({
      type: 'info',
      title: 'Wallet Disconnected',
      message: 'Your wallet has been disconnected',
      duration: UI_CONSTANTS.NOTIFICATION_DURATION
    })

    localStorage.setItem(STORAGE_KEYS.WALLET_CONNECTED, 'false')
  }

  const updateBalance = async () => {
    if (!address.value) return

    try {
      if (provider.value) {
        const userBalance = await provider.value.getBalance(address.value)
        balance.value = formatEther(userBalance)
      }
    } catch (error) {
      console.error('Failed to update balance:', error)
      balance.value = '0'
    }
  }

  const initializeConnection = async () => {
    const wasConnected = localStorage.getItem(STORAGE_KEYS.WALLET_CONNECTED)

    if (wasConnected === 'true') {
      try {
        await connectWallet()
      } catch (error) {
        console.error('Failed to initialize connection:', error)
      }
    }
  }

  return {
    // State
    isConnected,
    address,
    chainId,
    provider,
    signer,
    balance,
    isConnecting,

    // Computed properties
    currentNetwork,
    shortAddress,
    isNetworkSupported,

    // Actions
    connectWallet,
    disconnectWallet,
    updateBalance,
    initializeConnection
  }
})