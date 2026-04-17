import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WrapPage from '@/pages/Wrap'
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
      <WrapPage />
    </QueryClientProvider>
  )
}

describe('WrapPage', () => {
  beforeEach(() => {
    useWalletStore.getState().reset()
    feedback.confirm.mockReset()
    feedback.error.mockReset()
    feedback.info.mockReset()
    feedback.success.mockReset()
    feedback.warning.mockReset()
  })

  it('restores the original wrap page title and removes the generic scaffold subtitle', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: /wrap & unwrap/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /how to create rwa/i })).toBeInTheDocument()
    expect(screen.queryByText(/convert between rwa and swrmb tokens/i)).not.toBeInTheDocument()
  })
})
