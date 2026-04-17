import { createAppKit } from '@reown/appkit/react'
import { bsc, hashkey, mainnet, sepolia, type AppKitNetwork, xLayer } from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

const projectIdFallback = 'd0418d3e7642d54c76d8aa62a1a22315'

export const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || projectIdFallback

const hardhat = {
  id: 31337,
  name: 'Hardhat',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH'
  },
  rpcUrls: {
    default: { http: ['https://evm-node.dev.isecsp.cn'] },
    public: { http: ['https://evm-node.dev.isecsp.cn'] }
  },
  blockExplorers: {
    default: { name: 'Hardhat', url: 'http://localhost:8545' }
  },
  testnet: true
} as const

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  sepolia,
  mainnet,
  bsc,
  xLayer,
  hashkey,
  hardhat
]

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks
})

const shouldInitializeAppKit = typeof window !== 'undefined' && import.meta.env.MODE !== 'test'

export const appKit = shouldInitializeAppKit
  ? createAppKit({
      adapters: [wagmiAdapter],
      networks,
      projectId,
      defaultNetwork: sepolia,
      enableWalletConnect: true,
      features: {
        analytics: false,
        swaps: false,
        send: false,
        onramp: false,
        email: false,
        socials: false,
        pay: false,
        receive: false,
        history: false
      },
      metadata: {
        name: 'CINA Protocol - Web3 DApp',
        description: 'CINA Protocol - Web3 DApp',
        url: 'https://cina-beta.dev.isecsp.cn',
        icons: ['https://cina-beta.dev.isecsp.cn/favicon.ico']
      },
      featuredWalletIds: [
        '1aedbcfc1f31aade56ca34c38b0a1607b41cccfa3de93c946ef3b4ba2dfab11c',
        'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
        '5d9f1395b3a8e848684848dc4147cbd05c8d54bb737eac78fe103901fe6b01a1',
        'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa',
        '8a0ee50d1f22f6651afcae7eb4253e52a3310b90af5daef78a8c4929a9bb99d4',
        'a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393',
        '20459438007b75f4f4acb98bf29aa3b800550309646d375da5fd4aac6c2a2c66',
        'c03dfee351b6fcc421b4494ea33b9d4b92a984f87aa76d1663bb28705e95034a'
      ],
      themeMode: 'light',
      themeVariables: {
        '--w3m-z-index': 1000
      }
    })
  : null
