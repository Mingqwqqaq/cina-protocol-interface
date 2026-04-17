/**
 * Application constants
 */

// Network configurations
export const NETWORKS = {
  LOCAL: {
    chainId: 31337,
    name: 'Local Testnet',
    blockExplorer: 'https://localhost:8545',
  },
  ETHEREUM: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    }
  },
  GOERLI: {
    chainId: 5,
    name: 'Goerli Testnet',
    rpcUrl: 'https://goerli.infura.io/v3/',
    blockExplorer: 'https://goerli.etherscan.io',
    nativeCurrency: {
      name: 'Goerli Ether',
      symbol: 'ETH',
      decimals: 18
    }
  },
  SEPOLIA: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18
    }
  },
  POLYGON: {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    }
  },
  BSC: {
    chainId: 56,
    name: 'BNB Smart Chain',
    rpcUrl: 'https://bsc-dataseed1.binance.org',
    blockExplorer: 'https://bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    }
  }
} as const

// Default network (can be overridden by environment)
export const DEFAULT_CHAIN_ID = parseInt(import.meta.env.VITE_DEFAULT_CHAIN_ID || '1')

// Token configurations
export const TOKENS = {
  WRMB: {
    symbol: 'WRMB',
    name: 'Wrapped RMB',
    decimals: 18,
    addresses: {
      [NETWORKS.ETHEREUM.chainId]: import.meta.env.VITE_MAINNET_WRMB_ADDRESS || '',
      [NETWORKS.GOERLI.chainId]: import.meta.env.VITE_GOERLI_WRMB_ADDRESS || '',
      [NETWORKS.SEPOLIA.chainId]: import.meta.env.VITE_SEPOLIA_WRMB_ADDRESS || '',
      [NETWORKS.LOCAL.chainId]: import.meta.env.VITE_LOCALHOST_WRMB_ADDRESS || ''
    }
  },
  sWRMB: {
    symbol: 'sWRMB',
    name: 'Savings WRMB',
    decimals: 18,
    addresses: {
      [NETWORKS.ETHEREUM.chainId]: import.meta.env.VITE_MAINNET_SAVINGS_VAULT_ADDRESS || '',
      [NETWORKS.GOERLI.chainId]: import.meta.env.VITE_GOERLI_SAVINGS_VAULT_ADDRESS || '',
      [NETWORKS.SEPOLIA.chainId]: import.meta.env.VITE_SEPOLIA_SAVINGS_VAULT_ADDRESS || '',
      [NETWORKS.LOCAL.chainId]: import.meta.env.VITE_LOCALHOST_SAVINGS_VAULT_ADDRESS || ''
    }
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    addresses: {
      [NETWORKS.ETHEREUM.chainId]: import.meta.env.VITE_MAINNET_USDT_ADDRESS || '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      [NETWORKS.GOERLI.chainId]: import.meta.env.VITE_GOERLI_USDT_ADDRESS || '',
      [NETWORKS.SEPOLIA.chainId]: import.meta.env.VITE_SEPOLIA_USDT_ADDRESS || '',
      [NETWORKS.LOCAL.chainId]: import.meta.env.VITE_LOCALHOST_USDT_ADDRESS || ''
    }
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    addresses: {
      [NETWORKS.ETHEREUM.chainId]: import.meta.env.VITE_MAINNET_USDC_ADDRESS || '0xA0b86a33E6441b8C0b7b2e0b8b8b8b8b8b8b8b8b',
      [NETWORKS.GOERLI.chainId]: import.meta.env.VITE_GOERLI_USDC_ADDRESS || '',
      [NETWORKS.SEPOLIA.chainId]: import.meta.env.VITE_SEPOLIA_USDC_ADDRESS || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      [NETWORKS.LOCAL.chainId]: import.meta.env.VITE_LOCALHOST_USDC_ADDRESS || ''
    }
  },
  CINA: {
    symbol: 'CINA',
    name: 'CINA Protocol Token',
    decimals: 18,
    addresses: {
      [NETWORKS.ETHEREUM.chainId]: import.meta.env.VITE_MAINNET_CINA_ADDRESS || '',
      [NETWORKS.GOERLI.chainId]: import.meta.env.VITE_GOERLI_CINA_ADDRESS || '',
      [NETWORKS.SEPOLIA.chainId]: import.meta.env.VITE_SEPOLIA_CINA_ADDRESS || '',
      [NETWORKS.LOCAL.chainId]: import.meta.env.VITE_LOCALHOST_CINA_ADDRESS || ''
    }
  },
  stCINA: {
    symbol: 'stCINA',
    name: 'Staked CINA',
    decimals: 18,
    addresses: {
      [NETWORKS.ETHEREUM.chainId]: import.meta.env.VITE_MAINNET_STAKING_CINA_VAULT_ADDRESS || '',
      [NETWORKS.GOERLI.chainId]: import.meta.env.VITE_GOERLI_STAKING_CINA_VAULT_ADDRESS || '',
      [NETWORKS.SEPOLIA.chainId]: import.meta.env.VITE_SEPOLIA_STAKING_CINA_VAULT_ADDRESS || '',
      [NETWORKS.LOCAL.chainId]: import.meta.env.VITE_LOCALHOST_STAKING_CINA_VAULT_ADDRESS || ''
    }
  }
} as const

// Contract addresses
export const CONTRACTS = {
  WRMB_MINTER: {
    [NETWORKS.ETHEREUM.chainId]: import.meta.env.VITE_MAINNET_WRMB_MINTER_ADDRESS || '',
    [NETWORKS.GOERLI.chainId]: import.meta.env.VITE_GOERLI_WRMB_MINTER_ADDRESS || '',
    [NETWORKS.SEPOLIA.chainId]: import.meta.env.VITE_SEPOLIA_WRMB_MINTER_ADDRESS || '',
    [NETWORKS.LOCAL.chainId]: import.meta.env.VITE_LOCALHOST_WRMB_MINTER_ADDRESS || ''
  },
  SAVINGS_VAULT: {
    [NETWORKS.ETHEREUM.chainId]: import.meta.env.VITE_MAINNET_SAVINGS_VAULT_ADDRESS || '',
    [NETWORKS.GOERLI.chainId]: import.meta.env.VITE_GOERLI_SAVINGS_VAULT_ADDRESS || '',
    [NETWORKS.SEPOLIA.chainId]: import.meta.env.VITE_SEPOLIA_SAVINGS_VAULT_ADDRESS || '',
    [NETWORKS.LOCAL.chainId]: import.meta.env.VITE_LOCALHOST_SAVINGS_VAULT_ADDRESS || ''
  },
  WRAP_MANAGER: {
    [NETWORKS.ETHEREUM.chainId]: import.meta.env.VITE_MAINNET_WRAP_MANAGER_ADDRESS || '',
    [NETWORKS.GOERLI.chainId]: import.meta.env.VITE_GOERLI_WRAP_MANAGER_ADDRESS || '',
    [NETWORKS.SEPOLIA.chainId]: import.meta.env.VITE_SEPOLIA_WRAP_MANAGER_ADDRESS || '',
    [NETWORKS.LOCAL.chainId]: import.meta.env.VITE_LOCALHOST_WRAP_MANAGER_ADDRESS || ''
  },
  ACTIVE_LIQUIDITY_AMO: {
    [NETWORKS.ETHEREUM.chainId]: import.meta.env.VITE_MAINNET_ACTIVE_LIQUIDITY_AMO_ADDRESS || '',
    [NETWORKS.GOERLI.chainId]: import.meta.env.VITE_GOERLI_ACTIVE_LIQUIDITY_AMO_ADDRESS || '',
    [NETWORKS.SEPOLIA.chainId]: import.meta.env.VITE_SEPOLIA_ACTIVE_LIQUIDITY_AMO_ADDRESS || '',
    [NETWORKS.LOCAL.chainId]: import.meta.env.VITE_LOCALHOST_ACTIVE_LIQUIDITY_AMO_ADDRESS || ''
  },
  WRMB_BOND_POOL: {
    [NETWORKS.ETHEREUM.chainId]: import.meta.env.VITE_MAINNET_WRMB_BOND_POOL_ADDRESS || '',
    [NETWORKS.GOERLI.chainId]: import.meta.env.VITE_GOERLI_WRMB_BOND_POOL_ADDRESS || '',
    [NETWORKS.SEPOLIA.chainId]: import.meta.env.VITE_SEPOLIA_WRMB_BOND_POOL_ADDRESS || '',
    [NETWORKS.LOCAL.chainId]: import.meta.env.VITE_LOCALHOST_WRMB_BOND_POOL_ADDRESS || ''
  },
  BOND_LIQUIDITY_AMO: {
    [NETWORKS.ETHEREUM.chainId]: import.meta.env.VITE_MAINNET_BOND_LIQUIDITY_AMO_ADDRESS || '',
    [NETWORKS.GOERLI.chainId]: import.meta.env.VITE_GOERLI_BOND_LIQUIDITY_AMO_ADDRESS || '',
    [NETWORKS.SEPOLIA.chainId]: import.meta.env.VITE_SEPOLIA_BOND_LIQUIDITY_AMO_ADDRESS || '',
    [NETWORKS.LOCAL.chainId]: import.meta.env.VITE_LOCALHOST_BOND_LIQUIDITY_AMO_ADDRESS || ''
  },
  ORACLE_STUB: {
    [NETWORKS.ETHEREUM.chainId]: import.meta.env.VITE_MAINNET_ORACLE_STUB_ADDRESS || '',
    [NETWORKS.GOERLI.chainId]: import.meta.env.VITE_GOERLI_ORACLE_STUB_ADDRESS || '',
    [NETWORKS.SEPOLIA.chainId]: import.meta.env.VITE_SEPOLIA_ORACLE_STUB_ADDRESS || '',
    [NETWORKS.LOCAL.chainId]: import.meta.env.VITE_LOCALHOST_ORACLE_STUB_ADDRESS || ''
  },
  // Legacy BOND_POOL for backward compatibility
  BOND_POOL: {
    [NETWORKS.ETHEREUM.chainId]: import.meta.env.VITE_MAINNET_WRMB_BOND_POOL_ADDRESS || '',
    [NETWORKS.GOERLI.chainId]: import.meta.env.VITE_GOERLI_WRMB_BOND_POOL_ADDRESS || '',
    [NETWORKS.SEPOLIA.chainId]: import.meta.env.VITE_SEPOLIA_WRMB_BOND_POOL_ADDRESS || '',
    [NETWORKS.LOCAL.chainId]: import.meta.env.VITE_LOCALHOST_WRMB_BOND_POOL_ADDRESS || ''
  },
  STAKING_VAULT: {
    [NETWORKS.ETHEREUM.chainId]: import.meta.env.VITE_MAINNET_STAKING_CINA_VAULT_ADDRESS || '',
    [NETWORKS.GOERLI.chainId]: import.meta.env.VITE_GOERLI_STAKING_CINA_VAULT_ADDRESS || '',
    [NETWORKS.SEPOLIA.chainId]: import.meta.env.VITE_SEPOLIA_STAKING_CINA_VAULT_ADDRESS || '',
    [NETWORKS.LOCAL.chainId]: import.meta.env.VITE_LOCALHOST_STAKING_CINA_VAULT_ADDRESS || ''
  },
  FARM_VAULT: {
    [NETWORKS.ETHEREUM.chainId]: import.meta.env.VITE_MAINNET_FARM_VAULT_ADDRESS || '',
    [NETWORKS.GOERLI.chainId]: import.meta.env.VITE_GOERLI_FARM_VAULT_ADDRESS || '',
    [NETWORKS.SEPOLIA.chainId]: import.meta.env.VITE_SEPOLIA_FARM_VAULT_ADDRESS || '',
    [NETWORKS.LOCAL.chainId]: import.meta.env.VITE_LOCALHOST_FARM_VAULT_ADDRESS || ''
  },
  SRMB_FACTORY: {
    [NETWORKS.ETHEREUM.chainId]: import.meta.env.VITE_MAINNET_SRMB_FACTORY_ADDRESS || '',
    [NETWORKS.GOERLI.chainId]: import.meta.env.VITE_GOERLI_SRMB_FACTORY_ADDRESS || '',
    [NETWORKS.SEPOLIA.chainId]: import.meta.env.VITE_SEPOLIA_SRMB_FACTORY_ADDRESS || '',
    [NETWORKS.LOCAL.chainId]: import.meta.env.VITE_LOCALHOST_SRMB_FACTORY_ADDRESS || ''
  },
} as const

// Transaction settings
export const TRANSACTION_SETTINGS = {
  DEFAULT_GAS_LIMIT: 300000,
  DEFAULT_GAS_PRICE: 20, // Gwei
  DEFAULT_SLIPPAGE: 0.5, // 0.5%
  DEFAULT_DEADLINE: 20, // 20 minutes
  MAX_APPROVAL_AMOUNT: '115792089237316195423570985008687907853269984665640564039457584007913129639935', // 2^256 - 1
  CONFIRMATION_BLOCKS: 1
} as const

// UI constants
export const UI_CONSTANTS = {
  SIDEBAR_WIDTH: 240,
  HEADER_HEIGHT: 64,
  MOBILE_BREAKPOINT: 768,
  TABLET_BREAKPOINT: 1024,
  DESKTOP_BREAKPOINT: 1280,
  MAX_CONTENT_WIDTH: 1200,
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 500,
  POLLING_INTERVAL: 30000, // 30 seconds
  NOTIFICATION_DURATION: 5000
} as const

// Storage keys
export const STORAGE_KEYS = {
  THEME: 'wrmb-dapp-theme',
  LANGUAGE: 'wrmb-dapp-language',
  WALLET_CONNECTED: 'wrmb-dapp-wallet-connected',
  LAST_CONNECTED_WALLET: 'wrmb-dapp-last-wallet',
  SIDEBAR_COLLAPSED: 'wrmb-dapp-sidebar-collapsed',
  SLIPPAGE_TOLERANCE: 'wrmb-dapp-slippage',
  TRANSACTION_DEADLINE: 'wrmb-dapp-deadline',
  NOTIFICATIONS_ENABLED: 'wrmb-dapp-notifications'
} as const

// API endpoints
export const API_ENDPOINTS = {
  COINGECKO: 'https://api.coingecko.com/api/v3',
  ETHERSCAN: 'https://api.etherscan.io/api',
  INFURA: 'https://mainnet.infura.io/v3',
  ALCHEMY: 'https://eth-mainnet.alchemyapi.io/v2'
} as const

// Supported wallets
export const SUPPORTED_WALLETS = {
  METAMASK: {
    name: 'MetaMask',
    icon: '/icons/metamask.svg',
    connector: 'injected',
    downloadUrl: 'https://metamask.io/download/'
  },
  WALLET_CONNECT: {
    name: 'WalletConnect',
    icon: '/icons/walletconnect.svg',
    connector: 'walletconnect',
    downloadUrl: 'https://walletconnect.com/'
  },
  COINBASE: {
    name: 'Coinbase Wallet',
    icon: '/icons/coinbase.svg',
    connector: 'coinbase',
    downloadUrl: 'https://wallet.coinbase.com/'
  }
} as const

// Error messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet first',
  WRONG_NETWORK: 'Please switch to the correct network',
  INSUFFICIENT_BALANCE: 'Insufficient balance for this transaction',
  INSUFFICIENT_ALLOWANCE: 'Insufficient token allowance',
  TRANSACTION_REJECTED: 'Transaction was rejected by user',
  TRANSACTION_FAILED: 'Transaction failed to execute',
  CONTRACT_ERROR: 'Contract execution failed',
  NETWORK_ERROR: 'Network connection failed',
  UNKNOWN_ERROR: 'An unexpected error occurred'
} as const

// Success messages
export const SUCCESS_MESSAGES = {
  WALLET_CONNECTED: 'Wallet connected successfully',
  TRANSACTION_SUBMITTED: 'Transaction submitted successfully',
  TRANSACTION_CONFIRMED: 'Transaction confirmed',
  APPROVAL_SUCCESS: 'Token approval successful',
  DEPOSIT_SUCCESS: 'Deposit completed successfully',
  WITHDRAWAL_SUCCESS: 'Withdrawal completed successfully',
  WRAP_SUCCESS: 'Wrap completed successfully',
  UNWRAP_SUCCESS: 'Unwrap completed successfully',
  BOND_SUBSCRIPTION_SUCCESS: 'Bond subscription successful',
  BOND_REDEMPTION_SUCCESS: 'Bond redemption successful'
} as const

// Chart colors
export const CHART_COLORS = {
  PRIMARY: '#6366f1',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  INFO: '#3b82f6',
  GRADIENT: {
    PRIMARY: ['#6366f1', '#8b5cf6'],
    SUCCESS: ['#10b981', '#34d399'],
    WARNING: ['#f59e0b', '#fbbf24'],
    ERROR: ['#ef4444', '#f87171']
  }
} as const

// Date formats
export const DATE_FORMATS = {
  SHORT: 'MMM DD',
  MEDIUM: 'MMM DD, YYYY',
  LONG: 'MMMM DD, YYYY',
  FULL: 'dddd, MMMM DD, YYYY',
  TIME: 'HH:mm:ss',
  DATETIME: 'MMM DD, YYYY HH:mm',
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
} as const

// Number formats
export const NUMBER_FORMATS = {
  CURRENCY: {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  },
  TOKEN: {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6
  },
  PERCENTAGE: {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  },
  LARGE_NUMBER: {
    notation: 'compact' as const,
    maximumFractionDigits: 2
  }
} as const

// Validation rules
export const VALIDATION_RULES = {
  MIN_DEPOSIT_AMOUNT: 0.001,
  MAX_DEPOSIT_AMOUNT: 1000000,
  MIN_WITHDRAWAL_AMOUNT: 0.001,
  MAX_WITHDRAWAL_AMOUNT: 1000000,
  MIN_WRAP_AMOUNT: 0.001,
  MAX_WRAP_AMOUNT: 1000000,
  MIN_BOND_AMOUNT: 100, // USDT
  MAX_BOND_AMOUNT: 100000, // USDT
  MIN_SLIPPAGE: 0.1,
  MAX_SLIPPAGE: 50,
  MIN_DEADLINE: 1, // minutes
  MAX_DEADLINE: 1440, // 24 hours
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128
} as const

// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_DARK_MODE: true,
  ENABLE_MULTI_LANGUAGE: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_ANALYTICS: false,
  ENABLE_DEBUG_MODE: import.meta.env.DEV,
  ENABLE_TESTNET: import.meta.env.DEV,
  ENABLE_WALLET_CONNECT: true,
  ENABLE_MOBILE_APP: false
} as const

// Social links
export const SOCIAL_LINKS = {
  WEBSITE: 'https://wrmb.finance',
  TWITTER: 'https://twitter.com/wrmb_finance',
  DISCORD: 'https://discord.gg/wrmb',
  TELEGRAM: 'https://t.me/wrmb_finance',
  GITHUB: 'https://github.com/wrmb-finance',
  DOCS: 'https://docs.wrmb.finance',
  BLOG: 'https://blog.wrmb.finance'
} as const

// External links
export const EXTERNAL_LINKS = {
  ETHERSCAN: (address: string, chainId: number = 1) => {
    const baseUrl = chainId === 5 ? 'https://goerli.etherscan.io' : 
                   chainId === 11155111 ? 'https://sepolia.etherscan.io' : 
                   'https://etherscan.io'
    return `${baseUrl}/address/${address}`
  },
  TRANSACTION: (hash: string, chainId: number = 1) => {
    const baseUrl = chainId === 5 ? 'https://goerli.etherscan.io' : 
                   chainId === 11155111 ? 'https://sepolia.etherscan.io' : 
                   'https://etherscan.io'
    return `${baseUrl}/tx/${hash}`
  },
  TOKEN: (address: string, chainId: number = 1) => {
    const baseUrl = chainId === 5 ? 'https://goerli.etherscan.io' : 
                   chainId === 11155111 ? 'https://sepolia.etherscan.io' : 
                   'https://etherscan.io'
    return `${baseUrl}/token/${address}`
  }
} as const

// Regular expressions
export const REGEX_PATTERNS = {
  ETHEREUM_ADDRESS: /^0x[a-fA-F0-9]{40}$/,
  TRANSACTION_HASH: /^0x[a-fA-F0-9]{64}$/,
  PRIVATE_KEY: /^0x[a-fA-F0-9]{64}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
  DECIMAL_NUMBER: /^\d*\.?\d+$/,
  INTEGER: /^\d+$/,
  HEX: /^0x[a-fA-F0-9]+$/
} as const

// Environment variables with defaults
export const ENV = {
  NODE_ENV: import.meta.env.NODE_ENV || 'development',
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME || 'WRMB DApp',
  VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  VITE_APP_DESCRIPTION: import.meta.env.VITE_APP_DESCRIPTION || 'WRMB Finance DApp',
  VITE_INFURA_PROJECT_ID: import.meta.env.VITE_INFURA_PROJECT_ID || '',
  VITE_ALCHEMY_API_KEY: import.meta.env.VITE_ALCHEMY_API_KEY || '',
  VITE_WALLETCONNECT_PROJECT_ID: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '',
  VITE_ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN || ''
} as const
