import { Contract, ethers, formatUnits, parseUnits, type Provider, type Signer } from 'ethers'
import { NETWORKS } from '@/constants'

const UNISWAP_V4_ADDRESSES = {
  1: {
    POOL_MANAGER: '0x0000000000000000000000000000000000000000',
    UNIVERSAL_ROUTER: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    QUOTER: '0x0000000000000000000000000000000000000000',
    STATE_VIEW: '0x0000000000000000000000000000000000000000',
    PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3'
  },
  11155111: {
    POOL_MANAGER: '0x8C4BcBE6b9eF47855f97E675296FA3F6fafa5F1A',
    UNIVERSAL_ROUTER: '0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b',
    QUOTER: '0x61b3f2011a92d183c7dbadbda940a7555ccf9227',
    STATE_VIEW: '0xe1dd9c3fa50edb962e442f60dfbc432e24537e4c',
    POSITION_MANAGER: '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4',
    PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3'
  },
  [NETWORKS.LOCAL.chainId]: {
    POOL_MANAGER: '0x8C4BcBE6b9eF47855f97E675296FA3F6fafa5F1A',
    UNIVERSAL_ROUTER: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4',
    QUOTER: '0xC195976fEF0985886E37036E2DF62bF371E12Df0',
    STATE_VIEW: '0x1234567890123456789012345678901234567890',
    PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3'
  }
} as const

const STATE_VIEW_ABI = [
  'function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint16 protocolFee, uint16 lpFee)',
  'function getLiquidity(bytes32 poolId) external view returns (uint128)'
]

const UNIVERSAL_ROUTER_ABI = [
  {
    inputs: [
      { internalType: 'bytes', name: 'commands', type: 'bytes' },
      { internalType: 'bytes[]', name: 'inputs', type: 'bytes[]' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' }
    ],
    name: 'execute',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  }
]

const QUOTER_ABI = [
  'function quoteExactInputSingle(((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) poolKey, bool zeroForOne, uint128 exactAmount, bytes hookData)) external returns (uint256 amountOut, uint256 gasEstimate)',
  'function quoteExactOutputSingle(((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) poolKey, bool zeroForOne, uint128 exactAmount, bytes hookData)) external returns (uint256 amountIn, uint256 gasEstimate)'
]

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address, address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
]

export interface SwapParams {
  tokenIn: string
  tokenOut: string
  amountIn?: string
  amountOut?: string
  swapType: 'exactInput' | 'exactOutput'
  slippage: number
}

export interface QuoteResult {
  amountOut: string
  amountIn?: string
  priceImpact: string
  fee: string
  route: string[]
}

export interface PoolInfo {
  poolId: string
  token0: string
  token1: string
  fee: number
  sqrtPriceX96: string
  tick: number
  liquidity: string
}

interface UniswapV4Context {
  chainId: number
  provider: Provider | null
  signer: Signer | null
}

class UniswapV4Service {
  private context: UniswapV4Context = {
    chainId: 0,
    provider: null,
    signer: null
  }

  private poolManagerContract: Contract | null = null
  public swapRouterContract: Contract | null = null
  private quoterContract: Contract | null = null
  private stateViewContract: Contract | null = null
  public provider: Provider | null = null
  public signer: Signer | null = null

  setContext(context: Partial<UniswapV4Context>) {
    this.context = {
      ...this.context,
      ...context
    }
    void this.reinitialize()
  }

  async reinitialize() {
    const addresses = this.getContractAddresses(this.context.chainId)
    this.provider = this.context.provider
    this.signer = this.context.signer

    if (!addresses || !this.provider) {
      this.poolManagerContract = null
      this.swapRouterContract = null
      this.quoterContract = null
      this.stateViewContract = null
      return
    }

    this.poolManagerContract = new Contract(addresses.POOL_MANAGER, [], this.provider)
    this.swapRouterContract = this.signer
      ? new Contract(addresses.UNIVERSAL_ROUTER, UNIVERSAL_ROUTER_ABI, this.signer)
      : null
    this.quoterContract = new Contract(addresses.QUOTER, QUOTER_ABI, this.provider)
    this.stateViewContract = new Contract(addresses.STATE_VIEW, STATE_VIEW_ABI, this.provider)
  }

  getSupportedNetworks() {
    return Object.keys(UNISWAP_V4_ADDRESSES).map(Number)
  }

  isNetworkSupported(chainId: number) {
    return chainId in UNISWAP_V4_ADDRESSES
  }

  getContractAddresses(chainId: number) {
    return UNISWAP_V4_ADDRESSES[chainId as keyof typeof UNISWAP_V4_ADDRESSES] || null
  }

  getTokenContract(address: string, withSigner = false) {
    const runner = withSigner ? this.signer : this.signer || this.provider
    if (!runner) {
      throw new Error('Provider not initialized')
    }
    return new Contract(address, ERC20_ABI, runner)
  }

  private generatePoolId(token0: string, token1: string, fee: number, tickSpacing = 10) {
    const [currency0, currency1] =
      token0.toLowerCase() < token1.toLowerCase() ? [token0, token1] : [token1, token0]

    return ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint24', 'int24', 'address'],
        [currency0, currency1, fee, tickSpacing, ethers.ZeroAddress]
      )
    )
  }

  async getPoolInfo(token0: string, token1: string, fee = 500, tickSpacing = 10): Promise<PoolInfo | null> {
    if (!this.stateViewContract) {
      await this.reinitialize()
    }

    if (!this.stateViewContract) {
      return null
    }

    try {
      if (
        token0 === '0xAD87E2353a23fefC6156aA9FC1d1C4258e00E193' ||
        token1 === '0xAD87E2353a23fefC6156aA9FC1d1C4258e00E193'
      ) {
        fee = 3000
        tickSpacing = 60
      }

      const poolId = this.generatePoolId(token0, token1, fee, tickSpacing)
      const liquidity = await this.stateViewContract.getLiquidity(poolId)
      if (liquidity.toString() === '0') {
        return null
      }

      const slot0 = await this.stateViewContract.getSlot0(poolId)
      return {
        poolId,
        token0: token0.toLowerCase() < token1.toLowerCase() ? token0 : token1,
        token1: token0.toLowerCase() < token1.toLowerCase() ? token1 : token0,
        fee,
        sqrtPriceX96: slot0.sqrtPriceX96.toString(),
        tick: slot0.tick,
        liquidity: liquidity.toString()
      }
    } catch {
      return null
    }
  }

  private async calculatePriceImpact(amountIn: string) {
    const tradeSize = Number.parseFloat(amountIn)
    if (!tradeSize || tradeSize <= 0) {
      return 0
    }
    if (tradeSize < 1000) return 0.01
    if (tradeSize < 10000) return 0.05
    if (tradeSize < 100000) return 0.1
    return 0.5
  }

  async getQuote(params: SwapParams): Promise<QuoteResult | null> {
    if (!this.isNetworkSupported(this.context.chainId)) {
      return null
    }

    if (!this.quoterContract) {
      await this.reinitialize()
    }

    if (!this.quoterContract) {
      return null
    }

    try {
      const tokenInContract = this.getTokenContract(params.tokenIn)
      const tokenOutContract = this.getTokenContract(params.tokenOut)

      const [tokenInDecimals, tokenOutDecimals] = await Promise.all([
        tokenInContract.decimals(),
        tokenOutContract.decimals()
      ])

      const token0 = params.tokenIn.toLowerCase() < params.tokenOut.toLowerCase() ? params.tokenIn : params.tokenOut
      const token1 = params.tokenIn.toLowerCase() < params.tokenOut.toLowerCase() ? params.tokenOut : params.tokenIn
      const zeroForOne = params.tokenIn.toLowerCase() === token0.toLowerCase()

      const quoteParams = {
        poolKey: {
          currency0: token0,
          currency1: token1,
          fee: 500,
          tickSpacing: 10,
          hooks: ethers.ZeroAddress
        },
        zeroForOne,
        exactAmount: BigInt(0),
        hookData: '0x'
      }

      if (token0 === '0xAD87E2353a23fefC6156aA9FC1d1C4258e00E193' || token1 === '0xAD87E2353a23fefC6156aA9FC1d1C4258e00E193') {
        quoteParams.poolKey.fee = 3000
        quoteParams.poolKey.tickSpacing = 60
      }

      let amountOut = ''
      let amountIn = ''

      if (params.swapType === 'exactInput') {
        if (!params.amountIn) {
          return null
        }
        const result = await this.quoterContract.quoteExactInputSingle.staticCall({
          ...quoteParams,
          exactAmount: parseUnits(params.amountIn, tokenInDecimals)
        })
        amountOut = formatUnits(result.amountOut, tokenOutDecimals)
        amountIn = params.amountIn
      } else {
        if (!params.amountOut) {
          return null
        }
        const result = await this.quoterContract.quoteExactOutputSingle.staticCall({
          ...quoteParams,
          exactAmount: parseUnits(params.amountOut, tokenOutDecimals)
        })
        amountIn = formatUnits(result.amountIn, tokenInDecimals)
        amountOut = params.amountOut
      }

      return {
        amountOut,
        amountIn,
        priceImpact: (await this.calculatePriceImpact(amountIn || params.amountIn || '0')).toString(),
        fee: '0.05',
        route: [params.tokenIn, params.tokenOut]
      }
    } catch {
      return null
    }
  }

  async checkAllowance(tokenAddress: string, spenderAddress: string, userAddress: string) {
    try {
      const tokenContract = this.getTokenContract(tokenAddress)
      const allowance = await tokenContract.allowance(userAddress, spenderAddress)
      return allowance.toString()
    } catch {
      return '0'
    }
  }

  async approveToken(tokenAddress: string, spenderAddress: string, amount: string) {
    try {
      const tokenContract = this.getTokenContract(tokenAddress, true)
      const tx = await tokenContract.approve(spenderAddress, amount)
      await tx.wait()
      return true
    } catch {
      return false
    }
  }

  async getTokenBalance(tokenAddress: string, userAddress: string) {
    try {
      const tokenContract = this.getTokenContract(tokenAddress)
      const [balance, decimals] = await Promise.all([tokenContract.balanceOf(userAddress), tokenContract.decimals()])
      return formatUnits(balance, decimals)
    } catch {
      return '0'
    }
  }
}

export const uniswapV4Service = new UniswapV4Service()
