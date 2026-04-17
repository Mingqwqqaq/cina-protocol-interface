import { Suspense } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, test, vi } from 'vitest'
import { AppProviders } from '@/app/AppProviders'
import { appRoutes } from '@/router/routes'

vi.mock('@reown/appkit/react', () => ({
  useAppKit: () => ({
    close: vi.fn(),
    open: vi.fn()
  }),
  useAppKitProvider: () => ({}),
  useAppKitTheme: () => ({
    themeMode: 'light',
    themeVariables: {},
    setThemeMode: vi.fn(),
    setThemeVariables: vi.fn()
  })
}))

function renderRoute(initialEntries: string[]) {
  const router = createMemoryRouter(appRoutes, { initialEntries })

  return render(
    <AppProviders>
      <Suspense fallback={<div>Loading…</div>}>
        <RouterProvider router={router} />
      </Suspense>
    </AppProviders>
  )
}

describe('App shell', () => {
  test('restores grouped navigation and mobile menu controls in the header', async () => {
    renderRoute(['/'])

    expect(await screen.findByRole('link', { name: /cina dollar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'WRMB' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'CINA' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /toggle navigation menu/i })).toBeInTheDocument()
  })

  test('renders the dashboard with section-based content instead of the generic hero scaffold', async () => {
    renderRoute(['/'])

    expect(await screen.findByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /portfolio/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /recent activity/i })).toBeInTheDocument()
    expect(screen.queryByText(/welcome to wrmb protocol/i)).not.toBeInTheDocument()
  })

  test('renders the status page on a deep link and updates the document title', async () => {
    renderRoute(['/status'])

    expect(await screen.findByRole('heading', { name: /contract status/i })).toBeInTheDocument()

    await waitFor(() => {
      expect(document.title).toBe('Contract Status - WRMB Protocol')
    })
  })

  test('renders the not found page for unknown paths', async () => {
    renderRoute(['/does-not-exist'])

    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument()
  })
})
