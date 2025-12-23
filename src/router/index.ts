import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: {
      title: 'Dashboard',
      requiresAuth: false
    }
  },
  {
    path: '/savings',
    name: 'Savings',
    component: () => import('@/views/Savings.vue'),
    meta: {
      title: 'Savings Vault',
      requiresAuth: true
    }
  },
  {
    path: '/wrap',
    name: 'Wrap',
    component: () => import('@/views/Wrap.vue'),
    meta: {
      title: 'Wrap & Unwrap',
      requiresAuth: true
    }
  },
  {
    path: '/swap',
    name: 'Swap',
    component: () => import('@/views/Swap.vue'),
    meta: {
      title: 'Uniswap V4',
      requiresAuth: true
    }
  },
  {
    path: '/bonds',
    name: 'Bonds',
    component: () => import('@/views/Bonds.vue'),
    meta: {
      title: 'Bond Trading',
      requiresAuth: true
    }
  },
  {
    path: '/farm',
    name: 'Farm',
    component: () => import('@/views/Farm.vue'),
    meta: {
      title: 'Farm',
      requiresAuth: true
    }
  },
  {
    path: '/staking',
    name: 'Staking',
    component: () => import('@/views/Staking.vue'),
    meta: {
      title: 'Staking',
      requiresAuth: true
    }
  },
  {
    path: '/portfolio',
    name: 'Portfolio',
    component: () => import('@/views/Portfolio.vue'),
    meta: {
      title: 'My Portfolio',
      requiresAuth: true
    }
  },
  {
    path: '/status',
    name: 'Status',
    component: () => import('@/views/Status.vue'),
    meta: {
      title: 'Contract Status',
      requiresAuth: false
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: {
      title: 'Page Not Found'
    }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Navigation guards
router.beforeEach((to, from, next) => {
  // const walletStore = useWalletStore()
  
  // Check if route requires authentication
  // if (to.meta.requiresAuth && !walletStore.isConnected) {
  //   // Redirect to dashboard with a message to connect wallet
  //   next({ name: 'Dashboard', query: { connectWallet: 'true' } })
  //   return
  // }
  
  // Update document title
  if (to.meta.title) {
    document.title = `${to.meta.title} - WRMB Protocol`
  }
  
  next()
})

export default router