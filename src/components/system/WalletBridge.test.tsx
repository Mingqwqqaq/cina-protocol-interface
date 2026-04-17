import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WalletBridge } from '@/components/system/WalletBridge'
import { contractService } from '@/services/contracts'
import { useAppStore } from '@/stores/app'
import { useWalletStore } from '@/stores/wallet'

const mockedSetThemeMode = vi.fn()

const accountState = {
  address: '0x00000000000000000000000000000000000000AA',
  status: 'connected' as const
}

const chainIdState = {
  value: 11155111
}

const balanceState = {
  data: {
    formatted: '1.2345'
  }
}

const publicClientState = {
  chain: {
    id: 11155111,
    name: 'Sepolia'
  },
  transport: {
    type: 'http',
    url: 'https://rpc.example.test'
  }
}

const walletClientState = {
  account: {
    address: accountState.address
  },
  chain: {
    id: 11155111,
    name: 'Sepolia'
  },
  transport: {
    type: 'custom',
    value: {
      request: vi.fn(async ({ method }: { method: string }) => {
        if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
          return [walletClientState.account.address]
        }

        if (method === 'eth_chainId') {
          return '0xaa36a7'
        }

        return null
      })
    }
  }
}

vi.mock('@reown/appkit/react', () => ({
  useAppKitProvider: () => ({ walletProvider: walletClientState.transport.value }),
  useAppKitTheme: () => ({ setThemeMode: mockedSetThemeMode })
}))

vi.mock('wagmi', () => ({
  useAccount: () => accountState,
  useBalance: () => balanceState,
  useChainId: () => chainIdState.value,
  usePublicClient: () => publicClientState,
  useWalletClient: () => ({ data: walletClientState })
}))

describe('WalletBridge', () => {
  beforeEach(() => {
    useAppStore.setState({ notifications: [], theme: 'light' })
    useWalletStore.getState().reset()
    contractService.clearCache()
    mockedSetThemeMode.mockClear()
    vi.restoreAllMocks()
  })

  it('stores the wallet snapshot and registers contract context before showing the success notification', async () => {
    const setContextSpy = vi.spyOn(contractService, 'setContext')
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <WalletBridge />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(useWalletStore.getState().address).toBe(accountState.address)
    })

    await waitFor(() => {
      expect(setContextSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          address: accountState.address,
          chainId: chainIdState.value,
          providerIdentity: 'public:11155111:https://rpc.example.test',
          signerIdentity: `wallet:${accountState.address}:11155111`
        })
      )
    })

    expect(useAppStore.getState().notifications).toHaveLength(1)
    expect(useAppStore.getState().notifications[0]?.message).toContain('0x0000...00AA')
  })

  it('clears cached contracts and invalidates queries when the wallet identity changes', async () => {
    const clearCacheSpy = vi.spyOn(contractService, 'clearCache')
    const queryClient = new QueryClient()
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const view = render(
      <QueryClientProvider client={queryClient}>
        <WalletBridge />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(useWalletStore.getState().address).toBe(accountState.address)
    })

    accountState.address = '0x00000000000000000000000000000000000000BB'
    walletClientState.account.address = accountState.address
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <WalletBridge />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(clearCacheSpy).toHaveBeenCalled()
    })

    expect(invalidateQueriesSpy).toHaveBeenCalled()
  })
})
