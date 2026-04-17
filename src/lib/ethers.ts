import { BrowserProvider, FallbackProvider, JsonRpcProvider } from 'ethers'

interface TransportWithUrl {
  type?: string
  url?: string
  urls?: string[]
  value?: Eip1193Provider
  transports?: TransportWithUrl[]
}

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>
}

interface ChainLike {
  id: number
  name: string
}

interface PublicClientLike {
  chain?: ChainLike
  transport?: TransportWithUrl
}

function toNetwork(chain?: ChainLike) {
  if (!chain) {
    return undefined
  }

  return {
    chainId: chain.id,
    name: chain.name
  }
}

function transportToProvider(
  transport?: TransportWithUrl,
  chain?: ChainLike
): JsonRpcProvider | FallbackProvider | null {
  if (!transport) {
    return null
  }

  if (transport.type === 'fallback' && transport.transports?.length) {
    const providers: JsonRpcProvider[] = transport.transports
      .map(item => transportToProvider(item, chain))
      .filter((provider): provider is JsonRpcProvider => provider instanceof JsonRpcProvider)

    return providers.length ? new FallbackProvider(providers) : null
  }

  const url = transport.url ?? transport.urls?.[0]
  if (!url) {
    return null
  }

  return new JsonRpcProvider(url, toNetwork(chain), {
    staticNetwork: true
  })
}

export function publicClientToProvider(client?: PublicClientLike | null) {
  return transportToProvider(client?.transport, client?.chain)
}

export async function walletProviderToSigner(
  walletProvider: Eip1193Provider | null | undefined,
  address: string,
  chain?: ChainLike
) {
  if (!walletProvider || !address) {
    return null
  }

  const provider = new BrowserProvider(walletProvider, toNetwork(chain))
  try {
    return await provider.getSigner(address)
  } catch {
    return null
  }
}

export function getPublicClientIdentity(client?: PublicClientLike | null, chainId = 0) {
  const url = client?.transport?.url ?? client?.transport?.urls?.[0] ?? 'unknown'
  return `public:${chainId}:${url}`
}

export function getWalletIdentity(address: string, chainId: number) {
  return address ? `wallet:${address}:${chainId}` : ''
}
