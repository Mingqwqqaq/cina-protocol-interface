export const USE_LOCAL_DEMO_DATA = import.meta.env.DEV || import.meta.env.MODE === 'test'

export const ORIGINAL_PORTFOLIO_STATS = {
  averageApy: '8.2',
  returnPercentage: '7.29',
  totalChange: '2.45',
  totalInvested: '24000',
  totalReturns: '1750.50',
  totalValue: '25750.50'
} as const

export const ORIGINAL_ASSET_ALLOCATION = [
  {
    balance: '12500',
    color: '#6366f1',
    href: '/savings',
    key: 'savings',
    name: 'Savings Vault',
    percentage: 58.3,
    symbol: 'sWRMB',
    value: '15000'
  },
  {
    balance: '8000',
    color: '#10b981',
    href: '/bonds',
    key: 'bonds',
    name: 'Bond Pool',
    percentage: 33.0,
    symbol: 'WRMB',
    value: '8500'
  },
  {
    balance: '2000',
    color: '#f59e0b',
    href: '/wrap',
    key: 'wrapped',
    name: 'Wrapped Tokens',
    percentage: 8.7,
    symbol: 'sWRMB',
    value: '2250.50'
  }
] as const

export const ORIGINAL_DASHBOARD_ACTIVITIES = [
  {
    amount: '+1,000 WRMB',
    descriptionFallback: 'Deposited into the savings vault',
    descriptionKey: 'dashboard.depositDescription',
    href: '/savings',
    key: 'savings',
    timestampOffsetMs: 60 * 60 * 1000,
    titleFallback: 'Deposit Savings',
    titleKey: 'dashboard.depositSavings'
  },
  {
    amount: '+500 USDT',
    descriptionFallback: 'Subscribed to the bond pool',
    descriptionKey: 'dashboard.bondDescription',
    href: '/bonds',
    key: 'bonds',
    timestampOffsetMs: 2 * 60 * 60 * 1000,
    titleFallback: 'Bond Subscription',
    titleKey: 'dashboard.bondSubscription'
  },
  {
    amount: '200 sRMB to sWRMB',
    descriptionFallback: 'Converted RWA into sWRMB',
    descriptionKey: 'dashboard.wrapDescription',
    href: '/wrap',
    key: 'wrap',
    timestampOffsetMs: 24 * 60 * 60 * 1000,
    titleFallback: 'Wrap Tokens',
    titleKey: 'dashboard.wrapTokens'
  }
] as const

export const ORIGINAL_PORTFOLIO_HOLDINGS = [
  {
    allocation: 58.3,
    apy: '8.2',
    balance: '12500',
    href: '/savings',
    key: 'savings',
    name: 'Savings Vault Position',
    symbol: 'sWRMB',
    type: 'savings',
    value: '15000'
  },
  {
    allocation: 33.0,
    apy: '6.25',
    balance: '8000',
    href: '/bonds',
    key: 'bonds',
    name: 'Active Bonds',
    symbol: 'WRMB',
    type: 'bonds',
    value: '8500'
  },
  {
    allocation: 8.7,
    apy: '0',
    balance: '2000',
    href: '/wrap',
    key: 'wrapped',
    name: 'Wrapped sRMB',
    symbol: 'sWRMB',
    type: 'wrapped',
    value: '2250.50'
  }
] as const

export const ORIGINAL_PORTFOLIO_TRANSACTIONS = [
  {
    amount: '5000',
    asset: 'Savings Vault',
    hash: '0x1234567890abcdef1234567890abcdef12345678',
    key: 'tx-savings-deposit',
    timestampOffsetMs: 2 * 24 * 60 * 60 * 1000,
    type: 'deposit',
    value: '5000'
  },
  {
    amount: '2000',
    asset: 'Wrap Manager',
    hash: '0xabcdef1234567890abcdef1234567890abcdef12',
    key: 'tx-wrap-swap',
    timestampOffsetMs: 5 * 24 * 60 * 60 * 1000,
    type: 'swap',
    value: '2000'
  },
  {
    amount: '8000',
    asset: 'Bond Pool',
    hash: '0x567890abcdef1234567890abcdef1234567890ab',
    key: 'tx-bonds-deposit',
    timestampOffsetMs: 7 * 24 * 60 * 60 * 1000,
    type: 'deposit',
    value: '8000'
  }
] as const

export const ORIGINAL_STAKING_OVERVIEW = {
  currentAPY: '12.5',
  minStakeAmount: '1.0',
  navCina: '1.025',
  stCINABalance: '0',
  stakedAmount: '0',
  totalPendingAmount: '0',
  totalSupply: '1200000.0000',
  yourStaked: '1250000.5678'
} as const

export const ORIGINAL_STAKING_BALANCES = {
  cinaBalance: '500.123456',
  stCINABalance: '250.789012',
  stakedAmount: '250.789012'
} as const
