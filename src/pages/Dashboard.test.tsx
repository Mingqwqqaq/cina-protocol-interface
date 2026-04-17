import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from '@/pages/Dashboard'
import { contractService } from '@/services/contracts'
import { useWalletStore } from '@/stores/wallet'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
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
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>
    </MemoryRouter>
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    useWalletStore.getState().reset()
    vi.restoreAllMocks()
  })

  it('reuses the original Vue dashboard demo data when contracts are unavailable locally', async () => {
    vi.spyOn(contractService, 'getWrapManagerContract').mockReturnValue(null)
    vi.spyOn(contractService, 'getSavingsVaultContract').mockReturnValue(null)
    vi.spyOn(contractService, 'getStakingVaultContract').mockReturnValue(null)
    vi.spyOn(contractService, 'getBondPoolContract').mockReturnValue(null)

    renderPage()

    expect(await screen.findByRole('heading', { name: /portfolio/i })).toBeInTheDocument()
    expect(screen.getAllByText(/\$25,750\.5/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/deposit savings/i)).toBeInTheDocument()
  })
})
