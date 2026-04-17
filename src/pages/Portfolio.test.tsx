import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PortfolioPage from '@/pages/Portfolio'
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
        <PortfolioPage />
      </QueryClientProvider>
    </MemoryRouter>
  )
}

describe('PortfolioPage', () => {
  beforeEach(() => {
    useWalletStore.getState().reset()
    vi.restoreAllMocks()
  })

  it('restores the original portfolio section hierarchy', async () => {
    vi.spyOn(contractService, 'getSavingsVaultContract').mockReturnValue(null)
    vi.spyOn(contractService, 'getWRMBContract').mockReturnValue(null)
    vi.spyOn(contractService, 'getBondPoolContract').mockReturnValue(null)

    renderPage()

    expect(await screen.findByRole('heading', { name: /asset allocation/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /performance/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /holdings/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /transaction history/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /^transactions$/i })).not.toBeInTheDocument()
  })

  it('reuses the original Vue portfolio demo data when contracts are unavailable locally', async () => {
    vi.spyOn(contractService, 'getSavingsVaultContract').mockReturnValue(null)
    vi.spyOn(contractService, 'getWRMBContract').mockReturnValue(null)
    vi.spyOn(contractService, 'getBondPoolContract').mockReturnValue(null)

    renderPage()

    expect((await screen.findAllByText(/savings vault position/i)).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/active bonds/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/wrapped srmb/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/\$25,750\.5/i).length).toBeGreaterThan(0)
  })
})
