import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { sepolia, mainnet, bsc, xLayer, hashkey, type AppKitNetwork } from '@reown/appkit/networks'


export const projectId = "d0418d3e7642d54c76d8aa62a1a22315"
if (!projectId) {
  throw new Error('VITE_PROJECT_ID is not set')
}

const hardhat = {
  id: 31337,
  name: 'Hardhat',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://evm-node.dev.isecsp.cn'] },
    public: { http: ['https://evm-node.dev.isecsp.cn'] },
  },
  blockExplorers: {
    default: { name: 'Hardhat', url: 'http://localhost:8545' },
  },
  testnet: true,
} as const

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [sepolia, mainnet, bsc, xLayer, hashkey, hardhat]

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
})
