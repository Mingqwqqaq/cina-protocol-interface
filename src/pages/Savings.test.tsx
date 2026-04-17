import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SavingsPage from '@/pages/Savings'
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
      <SavingsPage />
    </QueryClientProvider>
  )
}

describe('SavingsPage', () => {
  beforeEach(() => {
    useWalletStore.getState().reset()
    feedback.confirm.mockReset()
    feedback.error.mockReset()
    feedback.info.mockReset()
    feedback.success.mockReset()
    feedback.warning.mockReset()
    vi.restoreAllMocks()
  })

  it('restores the original vault overview and statistics structure', async () => {
    vi.spyOn(contractService, 'getSavingsVaultContract').mockReturnValue(null)
    vi.spyOn(contractService, 'getWRMBContract').mockReturnValue(null)

    renderPage()

    expect(await screen.findByRole('heading', { name: /vault overview/i })).toBeInTheDocument()
    expect(screen.getByText(/total supply/i)).toBeInTheDocument()
    expect(screen.getByText(/your share/i)).toBeInTheDocument()
  })
})
