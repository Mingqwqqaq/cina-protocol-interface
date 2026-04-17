import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAppKitProvider, useAppKitTheme } from '@reown/appkit/react'
import { useAccount, useBalance, useChainId, usePublicClient, useWalletClient } from 'wagmi'
import { SUCCESS_MESSAGES } from '@/constants'
import {
  getPublicClientIdentity,
  getWalletIdentity,
  publicClientToProvider,
  walletProviderToSigner
} from '@/lib/ethers'
import { contractService } from '@/services/contracts'
import { uniswapV4Service } from '@/services/uniswapV4'
import { useAppStore } from '@/stores/app'
import { SUPPORTED_NETWORKS, useWalletStore } from '@/stores/wallet'

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function WalletBridge() {
  const chainId = useChainId()
  const queryClient = useQueryClient()
  const { setThemeMode } = useAppKitTheme()
  const publicClient = usePublicClient({ chainId: chainId || undefined })
  const { data: walletClient } = useWalletClient()
  const { status, address } = useAccount()
  const { data: nativeBalance } = useBalance({
    address,
    chainId,
    query: {
      enabled: Boolean(address)
    }
  })
  const { walletProvider } = useAppKitProvider('eip155') as {
    walletProvider?: { request: (args: { method: string; params?: object | unknown[] }) => Promise<unknown> }
  }

  const theme = useAppStore(state => state.theme)
  const addNotification = useAppStore(state => state.addNotification)
  const setWalletSnapshot = useWalletStore(state => state.setSnapshot)
  const previousIdentityRef = useRef('')
  const notifiedAddressRef = useRef('')

  useEffect(() => {
    setThemeMode(theme)
  }, [setThemeMode, theme])

  useEffect(() => {
    setWalletSnapshot({
      status:
        status === 'connected'
          ? 'connected'
          : status === 'connecting' || status === 'reconnecting'
            ? 'connecting'
            : 'disconnected',
      address: address ?? '',
      balance: address ? nativeBalance?.formatted ?? '0' : '0',
      chainId,
      isConnecting: status === 'connecting' || status === 'reconnecting',
      isSupportedNetwork: chainId in SUPPORTED_NETWORKS
    })
  }, [address, chainId, nativeBalance?.formatted, setWalletSnapshot, status])

  useEffect(() => {
    let cancelled = false

    const syncContext = async () => {
      const provider = publicClientToProvider(publicClient)
      const signer = address
        ? await walletProviderToSigner(
            walletProvider ?? walletClient?.transport?.value,
            address,
            publicClient?.chain
          )
        : null

      if (cancelled) {
        return
      }

      contractService.setContext({
        address: address ?? '',
        chainId,
        provider,
        providerIdentity: getPublicClientIdentity(publicClient, chainId),
        signer,
        signerIdentity: getWalletIdentity(address ?? '', chainId)
      })
      uniswapV4Service.setContext({
        chainId,
        provider,
        signer
      })
    }

    void syncContext()

    return () => {
      cancelled = true
    }
  }, [address, chainId, publicClient, walletClient, walletProvider])

  useEffect(() => {
    const nextIdentity = `${status}:${address ?? ''}:${chainId}`

    if (previousIdentityRef.current && previousIdentityRef.current !== nextIdentity) {
      contractService.clearCache()
      void queryClient.invalidateQueries()
    }

    previousIdentityRef.current = nextIdentity
  }, [address, chainId, queryClient, status])

  useEffect(() => {
    if (status !== 'connected' || !address || notifiedAddressRef.current === address) {
      if (status !== 'connected') {
        notifiedAddressRef.current = ''
      }
      return
    }

    addNotification({
      type: 'success',
      title: SUCCESS_MESSAGES.WALLET_CONNECTED,
      message: `Connected to ${shortenAddress(address)}`,
      duration: 5_000
    })
    notifiedAddressRef.current = address
  }, [addNotification, address, status])

  return null
}
