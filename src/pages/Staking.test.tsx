import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StakingPage from '@/pages/Staking'
import { contractService } from '@/services/contracts'
import { useWalletStore } from '@/stores/wallet'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

vi.mock('@/hooks/useDebouncedValue', () => ({
  useDebouncedValue: (value: string) => value
}))

const feedback = vi.hoisted(() => ({
  confirm: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
  warning: vi.fn()
}))

vi.mock('@/lib/feedback', () => ({
  feedback
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
      <StakingPage />
    </QueryClientProvider>
  )
}

describe('StakingPage', () => {
  beforeEach(() => {
    useWalletStore.getState().reset()
    feedback.confirm.mockReset()
    feedback.error.mockReset()
    feedback.info.mockReset()
    feedback.success.mockReset()
    feedback.warning.mockReset()
    vi.restoreAllMocks()
  })

  it('restores the original staking overview and action rhythm', async () => {
    vi.spyOn(contractService, 'getStakingVaultContract').mockReturnValue(null)
    vi.spyOn(contractService, 'getCINAContract').mockReturnValue(null)

    renderPage()

    expect(await screen.findByRole('heading', { name: /^overview$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^stake cina$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^unstake cina$/i })).toBeInTheDocument()
  })

  it('reuses the original Vue staking demo balances when contracts are unavailable locally', async () => {
    useWalletStore.getState().setSnapshot({
      address: '0x1234567890123456789012345678901234567890',
      chainId: 1,
      status: 'connected'
    })

    vi.spyOn(contractService, 'getStakingVaultContract').mockReturnValue(null)
    vi.spyOn(contractService, 'getCINAContract').mockReturnValue(null)

    renderPage()

    expect(await screen.findByText(/apy 12\.5%/i)).toBeInTheDocument()
    expect(screen.getByText(/balance: 500\.12 cina/i)).toBeInTheDocument()
  })
})
