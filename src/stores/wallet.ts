import { create } from 'zustand'
import { SUCCESS_MESSAGES } from '@/constants'
import type { WalletSnapshot, WalletStatus } from '@/types/app'

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
    rpcUrl: 'https://mainnet.infura.io/v3/',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    }
  },
  11155111: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    blockExplorer: 'https://sepolia.etherscan.io',
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

interface WalletState extends WalletSnapshot {
  connectMessage: string
  isConnected: boolean
  shortAddress: string
  setSnapshot: (snapshot: Partial<WalletSnapshot>) => void
  reset: () => void
}

function getShortAddress(address: string) {
  if (!address) {
    return ''
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function getConnectMessage(address: string) {
  if (!address) {
    return ''
  }

  return `${SUCCESS_MESSAGES.WALLET_CONNECTED}: ${getShortAddress(address)}`
}

function makeSnapshot(
  status: WalletStatus = 'disconnected',
  address = '',
  chainId = 0,
  balance = '0'
): WalletSnapshot {
  return {
    status,
    address,
    chainId,
    balance,
    isConnecting: status === 'connecting',
    isSupportedNetwork: chainId in SUPPORTED_NETWORKS
  }
}

export const useWalletStore = create<WalletState>((set, get) => ({
  ...makeSnapshot(),
  connectMessage: '',
  isConnected: false,
  shortAddress: '',
  setSnapshot: snapshot => {
    const nextStatus = snapshot.status ?? get().status
    const nextAddress = snapshot.address ?? get().address
    const nextChainId = snapshot.chainId ?? get().chainId
    const nextBalance = snapshot.balance ?? get().balance
    const nextSnapshot = makeSnapshot(nextStatus, nextAddress, nextChainId, nextBalance)

    set({
      ...nextSnapshot,
      connectMessage: getConnectMessage(nextAddress),
      isConnected: nextStatus === 'connected' && Boolean(nextAddress),
      shortAddress: getShortAddress(nextAddress)
    })
  },
  reset: () =>
    set({
      ...makeSnapshot(),
      connectMessage: '',
      isConnected: false,
      shortAddress: ''
    })
}))
