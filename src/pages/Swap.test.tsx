import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SwapPage from '@/pages/Swap'
import { uniswapV4Service } from '@/services/uniswapV4'
import { useWalletStore } from '@/stores/wallet'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

vi.mock('@/hooks/useDebouncedValue', () => ({
  useDebouncedValue: (value: string) => value
}))

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 0,
        retry: false
      }
    }
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <SwapPage />
    </QueryClientProvider>
  )
}

describe('SwapPage', () => {
  beforeEach(() => {
    useWalletStore.getState().reset()
    vi.restoreAllMocks()
  })

  it('restores the original swap layout headings and action labels', async () => {
    vi.spyOn(uniswapV4Service, 'isNetworkSupported').mockReturnValue(false)
    vi.spyOn(uniswapV4Service, 'getSupportedNetworks').mockReturnValue([1, 11155111])

    renderPage()

    expect(await screen.findByRole('heading', { name: /^swap$/i })).toBeInTheDocument()
    expect(screen.getByText(/^details$/i)).toBeInTheDocument()
    expect(screen.getByText(/^sell$/i)).toBeInTheDocument()
    expect(screen.getByText(/^buy$/i)).toBeInTheDocument()
  })
})
