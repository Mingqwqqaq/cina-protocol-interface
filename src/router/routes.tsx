import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'

const DashboardPage = lazy(() => import('@/pages/Dashboard'))
const SavingsPage = lazy(() => import('@/pages/Savings'))
const WrapPage = lazy(() => import('@/pages/Wrap'))
const SwapPage = lazy(() => import('@/pages/Swap'))
const BondsPage = lazy(() => import('@/pages/Bonds'))
const FarmPage = lazy(() => import('@/pages/Farm'))
const StakingPage = lazy(() => import('@/pages/Staking'))
const PortfolioPage = lazy(() => import('@/pages/Portfolio'))
const StatusPage = lazy(() => import('@/pages/Status'))
const NotFoundPage = lazy(() => import('@/pages/NotFound'))

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage />, handle: { title: 'Dashboard' } },
      { path: 'savings', element: <SavingsPage />, handle: { title: 'Savings Vault' } },
      { path: 'wrap', element: <WrapPage />, handle: { title: 'Wrap & Unwrap' } },
      { path: 'swap', element: <SwapPage />, handle: { title: 'Uniswap V4' } },
      { path: 'bonds', element: <BondsPage />, handle: { title: 'Bond Trading' } },
      { path: 'farm', element: <FarmPage />, handle: { title: 'Farm' } },
      { path: 'staking', element: <StakingPage />, handle: { title: 'Staking' } },
      { path: 'portfolio', element: <PortfolioPage />, handle: { title: 'My Portfolio' } },
      { path: 'status', element: <StatusPage />, handle: { title: 'Contract Status' } },
      { path: '*', element: <NotFoundPage />, handle: { title: 'Page Not Found' } }
    ]
  }
]
