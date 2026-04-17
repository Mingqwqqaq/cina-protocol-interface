import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StatusPage from '@/pages/Status'
import { useWalletStore } from '@/stores/wallet'

const feedback = vi.hoisted(() => ({
  confirm: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
  warning: vi.fn()
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
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
      <StatusPage />
    </QueryClientProvider>
  )
}

describe('StatusPage', () => {
  beforeEach(() => {
    useWalletStore.getState().reset()
    feedback.confirm.mockReset()
    feedback.error.mockReset()
    feedback.info.mockReset()
    feedback.success.mockReset()
    feedback.warning.mockReset()
    vi.restoreAllMocks()
  })

  it('restores the original token and contract sections', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: /^token contracts$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^smart contracts$/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /query balance/i }).length).toBeGreaterThan(0)
  })
})
