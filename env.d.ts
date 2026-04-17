/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
  readonly VITE_APP_VERSION?: string
  readonly VITE_APP_DESCRIPTION?: string
  readonly VITE_DEFAULT_CHAIN_ID?: string
  readonly VITE_INFURA_PROJECT_ID?: string
  readonly VITE_ALCHEMY_API_KEY?: string
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string
  readonly VITE_ENABLE_ANALYTICS?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_MAINNET_WRMB_ADDRESS?: string
  readonly VITE_GOERLI_WRMB_ADDRESS?: string
  readonly VITE_SEPOLIA_WRMB_ADDRESS?: string
  readonly VITE_LOCALHOST_WRMB_ADDRESS?: string
  readonly VITE_MAINNET_SAVINGS_VAULT_ADDRESS?: string
  readonly VITE_GOERLI_SAVINGS_VAULT_ADDRESS?: string
  readonly VITE_SEPOLIA_SAVINGS_VAULT_ADDRESS?: string
  readonly VITE_LOCALHOST_SAVINGS_VAULT_ADDRESS?: string
  readonly VITE_MAINNET_WRAP_MANAGER_ADDRESS?: string
  readonly VITE_GOERLI_WRAP_MANAGER_ADDRESS?: string
  readonly VITE_SEPOLIA_WRAP_MANAGER_ADDRESS?: string
  readonly VITE_LOCALHOST_WRAP_MANAGER_ADDRESS?: string
  readonly VITE_MAINNET_ACTIVE_LIQUIDITY_AMO_ADDRESS?: string
  readonly VITE_GOERLI_ACTIVE_LIQUIDITY_AMO_ADDRESS?: string
  readonly VITE_SEPOLIA_ACTIVE_LIQUIDITY_AMO_ADDRESS?: string
  readonly VITE_LOCALHOST_ACTIVE_LIQUIDITY_AMO_ADDRESS?: string
  readonly VITE_MAINNET_WRMB_BOND_POOL_ADDRESS?: string
  readonly VITE_GOERLI_WRMB_BOND_POOL_ADDRESS?: string
  readonly VITE_SEPOLIA_WRMB_BOND_POOL_ADDRESS?: string
  readonly VITE_LOCALHOST_WRMB_BOND_POOL_ADDRESS?: string
  readonly VITE_MAINNET_BOND_LIQUIDITY_AMO_ADDRESS?: string
  readonly VITE_GOERLI_BOND_LIQUIDITY_AMO_ADDRESS?: string
  readonly VITE_SEPOLIA_BOND_LIQUIDITY_AMO_ADDRESS?: string
  readonly VITE_LOCALHOST_BOND_LIQUIDITY_AMO_ADDRESS?: string
  readonly VITE_MAINNET_ORACLE_STUB_ADDRESS?: string
  readonly VITE_GOERLI_ORACLE_STUB_ADDRESS?: string
  readonly VITE_SEPOLIA_ORACLE_STUB_ADDRESS?: string
  readonly VITE_LOCALHOST_ORACLE_STUB_ADDRESS?: string
  readonly VITE_MAINNET_CINA_ADDRESS?: string
  readonly VITE_GOERLI_CINA_ADDRESS?: string
  readonly VITE_SEPOLIA_CINA_ADDRESS?: string
  readonly VITE_LOCALHOST_CINA_ADDRESS?: string
  readonly VITE_MAINNET_USDT_ADDRESS?: string
  readonly VITE_GOERLI_USDT_ADDRESS?: string
  readonly VITE_SEPOLIA_USDT_ADDRESS?: string
  readonly VITE_LOCALHOST_USDT_ADDRESS?: string
  readonly VITE_MAINNET_STAKING_CINA_VAULT_ADDRESS?: string
  readonly VITE_GOERLI_STAKING_CINA_VAULT_ADDRESS?: string
  readonly VITE_SEPOLIA_STAKING_CINA_VAULT_ADDRESS?: string
  readonly VITE_LOCALHOST_STAKING_CINA_VAULT_ADDRESS?: string
  readonly VITE_MAINNET_FARM_VAULT_ADDRESS?: string
  readonly VITE_GOERLI_FARM_VAULT_ADDRESS?: string
  readonly VITE_SEPOLIA_FARM_VAULT_ADDRESS?: string
  readonly VITE_LOCALHOST_FARM_VAULT_ADDRESS?: string
  readonly VITE_MAINNET_SRMB_FACTORY_ADDRESS?: string
  readonly VITE_GOERLI_SRMB_FACTORY_ADDRESS?: string
  readonly VITE_SEPOLIA_SRMB_FACTORY_ADDRESS?: string
  readonly VITE_LOCALHOST_SRMB_FACTORY_ADDRESS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  interface Window {
    ethereum?: unknown
  }
}
