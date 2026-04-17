import { Suspense } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/router'

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="app-loading-overlay">
          <div className="app-loading-panel">
            <div className="app-spinner" />
            <div className="text-sm font-semibold text-[var(--text-primary)]">Loading interface...</div>
          </div>
        </div>
      }
    >
      <RouterProvider router={router} />
    </Suspense>
  )
}
