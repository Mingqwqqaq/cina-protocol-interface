import { ethers, Contract, parseUnits, formatUnits } from 'ethers'
import { useWalletStore } from '@/stores/wallet'
import { NETWORKS } from '@/constants'
import { ElMessage } from 'element-plus'

const UNISWAP_V4_ADDRESSES = {
  [1]: {
    POOL_MANAGER: '0x0000000000000000000000000000000000000000',
    UNIVERSAL_ROUTER: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    QUOTER: '0x0000000000000000000000000000000000000000',
    STATE_VIEW: '0x0000000000000000000000000000000000000000',
    PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3'
  },
  [11155111]: {
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
}

const POOL_MANAGER_ABI = [
  'function swap(bytes32 poolId, (bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96), bytes calldata hookData) external returns (int256 amount0, int256 amount1)',
  'function modifyLiquidity(bytes32 poolId, (int24 tickLower, int24 tickUpper, int256 liquidityDelta), bytes calldata hookData) external returns (int256 amount0, int256 amount1)',
  'function initialize(bytes32 poolId, uint160 sqrtPriceX96, bytes calldata hookData) external returns (int24 tick)',
  'function donate(bytes32 poolId, uint256 amount0, uint256 amount1, bytes calldata hookData) external returns (int256 amount0Delta, int256 amount1Delta)',
  'function take(address currency, address to, uint256 amount) external',
  'function settle(address currency) external payable returns (uint256 paid)'
]

const STATE_VIEW_ABI = [
  'function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint16 protocolFee, uint16 lpFee)',
  'function getLiquidity(bytes32 poolId) external view returns (uint128)',
  'function getTickInfo(bytes32 poolId, int24 tick) external view returns (uint128 liquidityGross, int128 liquidityNet, uint256 feeGrowthOutside0X128, uint256 feeGrowthOutside1X128)',
  'function getTickBitmap(bytes32 poolId, int16 wordPosition) external view returns (uint256)',
  'function getPosition(bytes32 poolId, address owner, int24 tickLower, int24 tickUpper) external view returns (uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
  'function getFeeGrowthGlobal0X128(bytes32 poolId) external view returns (uint256)',
  'function getFeeGrowthGlobal1X128(bytes32 poolId) external view returns (uint256)',
  'function getProtocolFees(bytes32 poolId) external view returns (uint256 token0, uint256 token1)'
]

const UNIVERSAL_ROUTER_ABI = [
  {
    inputs: [
      { internalType: "bytes", name: "commands", type: "bytes" },
      { internalType: "bytes[]", name: "inputs", type: "bytes[]" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "execute",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
]

const QUOTER_ABI = [
  'function quoteExactInputSingle(((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) poolKey, bool zeroForOne, uint128 exactAmount, bytes hookData)) external returns (uint256 amountOut, uint256 gasEstimate)',
  'function quoteExactOutputSingle(((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) poolKey, bool zeroForOne, uint128 exactAmount, bytes hookData)) external returns (uint256 amountIn, uint256 gasEstimate)'
]

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address, address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function transfer(address, uint256) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
]

interface SwapParams {
  tokenIn: string
  tokenOut: string
  amountIn?: string
  amountOut?: string
  swapType: 'exactInput' | 'exactOutput'
  slippage: number
  recipient?: string
}

interface QuoteResult {
  amountOut: string
  amountIn?: string
  priceImpact: string
  fee: string
  route: string[]
}

interface PoolInfo {
  poolId: string
  token0: string
  token1: string
  fee: number
  sqrtPriceX96: string
  tick: number
  liquidity: string
}

class UniswapV4Service {
  private poolManagerContract: Contract | null = null
  public swapRouterContract: Contract | null = null
  private quoterContract: Contract | null = null
  private stateViewContract: Contract | null = null
  public provider: ethers.Provider | null = null
  public signer: ethers.Signer | null = null

  constructor() {
    this.initializeContracts()
  }

  private async initializeContracts() {
    const walletStore = useWalletStore()

    if (!walletStore.provider || !walletStore.chainId) {
      return
    }

    this.provider = walletStore.provider
    this.signer = walletStore.signer

    const addresses = UNISWAP_V4_ADDRESSES[walletStore.chainId as keyof typeof UNISWAP_V4_ADDRESSES]

    if (!addresses) {
      const networkNames: { [key: number]: string } = {
        1: '以太坊主网',
        5: 'Goerli 测试网',
        11155111: 'Sepolia 测试网',
        31337: '本地测试网'
      }
      const currentNetworkName = networkNames[walletStore.chainId] || `网络 ${walletStore.chainId}`

      ElMessage.warning({
        message: `Uniswap V4 暂不支持 ${currentNetworkName}。目前仅支持以太坊主网和本地测试网络。`,
        duration: 5000
      })
      return
    }

    try {
      this.poolManagerContract = new Contract(addresses.POOL_MANAGER, POOL_MANAGER_ABI, this.provider)
      this.swapRouterContract = new Contract(addresses.UNIVERSAL_ROUTER, UNIVERSAL_ROUTER_ABI, this.signer)
      this.quoterContract = new Contract(addresses.QUOTER, QUOTER_ABI, this.provider)
      this.stateViewContract = new Contract(addresses.STATE_VIEW, STATE_VIEW_ABI, this.provider)
    } catch (error) {
      this.poolManagerContract = null
      this.swapRouterContract = null
      this.quoterContract = null
      this.stateViewContract = null
    }
  }

  async reinitialize() {
    await this.initializeContracts()
  }

  public getTokenContract(address: string, withSigner = false): Contract {
    const providerOrSigner = withSigner ? this.signer : this.provider
    return new Contract(address, ERC20_ABI, providerOrSigner)
  }

  private generatePoolId(token0: string, token1: string, fee: number, tickSpacing: number = 10): string {
    const [currency0, currency1] = token0.toLowerCase() < token1.toLowerCase() ? [token0, token1] : [token1, token0]
    let hooks = '0x0000000000000000000000000000000000000000'

    const poolKey = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint24', 'int24', 'address'],
        [currency0, currency1, fee, tickSpacing, hooks]
      )
    )
    return poolKey
  }

  async getPoolInfo(token0: string, token1: string, fee: number = 500, tickSpacing: number = 10): Promise<PoolInfo | null> {
    if (!this.stateViewContract) {
      await this.initializeContracts()
    }

    if (!this.stateViewContract) {
      throw new Error('StateView contract not initialized')
    }

    try {
      if (token0 == '0xAD87E2353a23fefC6156aA9FC1d1C4258e00E193' || token1 == '0xAD87E2353a23fefC6156aA9FC1d1C4258e00E193') {
        fee = 3000;
        tickSpacing = 60;
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
    } catch (error) {
      if ((error as any).code === 'CALL_EXCEPTION') {
        return null
      }
      return null
    }
  }

  private async calculatePriceImpact(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    amountOut: string,
    poolId: string
  ): Promise<number> {
    try {
      if (!this.stateViewContract) {
        return 0.1
      }

      const slot0 = await this.stateViewContract.getSlot0(poolId)
      const currentSqrtPriceX96 = slot0.sqrtPriceX96

      const amountInNum = parseFloat(amountIn)
      const amountOutNum = parseFloat(amountOut)

      if (amountInNum === 0 || amountOutNum === 0) {
        return 0
      }

      const tradeSize = amountInNum
      if (tradeSize < 1000) {
        return 0.01
      } else if (tradeSize < 10000) {
        return 0.05
      } else if (tradeSize < 100000) {
        return 0.1
      } else {
        return 0.5
      }
    } catch (error) {
      return 0.1
    }
  }

  async getQuote(params: SwapParams): Promise<QuoteResult | null> {
    const walletStore = useWalletStore()

    if (!this.isNetworkSupported(walletStore.chainId)) {
      ElMessage.error('当前网络不支持 Uniswap V4，请切换到以太坊主网或本地测试网络')
      return null
    }

    if (!this.quoterContract) {
      await this.initializeContracts()
    }

    if (!this.quoterContract) {
      throw new Error('Quoter contract not initialized')
    }

    try {
      const tokenInContract = this.getTokenContract(params.tokenIn)
      const tokenOutContract = this.getTokenContract(params.tokenOut)

      const [tokenInDecimals, tokenOutDecimals] = await Promise.all([
        tokenInContract.decimals(),
        tokenOutContract.decimals()
      ])

      const poolId = this.generatePoolId(params.tokenIn, params.tokenOut, 500)
      const token0 = params.tokenIn.toLowerCase() < params.tokenOut.toLowerCase() ? params.tokenIn : params.tokenOut
      const token1 = params.tokenIn.toLowerCase() < params.tokenOut.toLowerCase() ? params.tokenOut : params.tokenIn
      const zeroForOne = params.tokenIn.toLowerCase() === token0.toLowerCase()

      const quoteParams = {
        poolKey: {
          currency0: token0,
          currency1: token1,
          fee: 500,
          tickSpacing: 10,
          hooks: '0x0000000000000000000000000000000000000000'
        },
        zeroForOne: zeroForOne,
        exactAmount: BigInt(0), // 将在下面设置
        hookData: '0x'
      }

      if (token0 == '0xAD87E2353a23fefC6156aA9FC1d1C4258e00E193' || token1 == '0xAD87E2353a23fefC6156aA9FC1d1C4258e00E193') {
        quoteParams.poolKey.fee = 3000;
        quoteParams.poolKey.tickSpacing = 60;
      }

      let result: any
      let amountOut: string
      let amountIn: string
      let inputAmount: string
      let outputAmount: string

      if (params.swapType === 'exactInput') {
        if (!params.amountIn) throw new Error('amountIn is required for exactInput')
        const exactAmountIn = parseUnits(params.amountIn, tokenInDecimals)
        quoteParams.exactAmount = exactAmountIn
        result = await this.quoterContract.quoteExactInputSingle.staticCall(quoteParams)
        amountOut = formatUnits(result.amountOut, tokenOutDecimals)
        amountIn = params.amountIn
        inputAmount = params.amountIn
        outputAmount = amountOut
      } else {
        if (!params.amountOut) throw new Error('amountOut is required for exactOutput')
        const exactAmountOut = parseUnits(params.amountOut, tokenOutDecimals)
        quoteParams.exactAmount = exactAmountOut
        result = await this.quoterContract.quoteExactOutputSingle.staticCall(quoteParams)
        amountIn = formatUnits(result.amountIn, tokenInDecimals)
        amountOut = params.amountOut
        inputAmount = amountIn
        outputAmount = params.amountOut
      }

      const priceImpact = await this.calculatePriceImpact(
        params.tokenIn,
        params.tokenOut,
        inputAmount,
        outputAmount,
        poolId
      )

      const fee = '0.05'

      return {
        amountOut,
        amountIn,
        priceImpact: priceImpact.toString(),
        fee,
        route: [params.tokenIn, params.tokenOut]
      }
    } catch (error) {
      return null
    }
  }

  async checkAllowance(tokenAddress: string, spenderAddress: string, userAddress: string): Promise<string> {
    const tokenContract = this.getTokenContract(tokenAddress)
    try {
      const allowance = await tokenContract.allowance(userAddress, spenderAddress)
      return allowance.toString()
    } catch (error) {
      return '0'
    }
  }

  async approveToken(tokenAddress: string, spenderAddress: string, amount: string): Promise<boolean> {
    const tokenContract = this.getTokenContract(tokenAddress, true)

    try {
      const amountToApprove = ethers.MaxUint256
      const tx = await tokenContract.approve(spenderAddress, amountToApprove)

      ElMessage.info('授权交易已提交，等待确认...')
      await tx.wait()

      ElMessage.success('代币授权成功')
      return true
    } catch (error) {
      ElMessage.error('代币授权失败')
      return false
    }
  }

  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<string> {
    const tokenContract = this.getTokenContract(tokenAddress)

    try {
      const [balance, decimals] = await Promise.all([
        tokenContract.balanceOf(userAddress),
        tokenContract.decimals()
      ])

      return formatUnits(balance, decimals)
    } catch (error) {
      return '0'
    }
  }

  getSupportedNetworks(): number[] {
    return Object.keys(UNISWAP_V4_ADDRESSES).map(Number)
  }

  isNetworkSupported(chainId: number): boolean {
    return chainId in UNISWAP_V4_ADDRESSES
  }

  getContractAddresses(chainId: number) {
    return UNISWAP_V4_ADDRESSES[chainId as keyof typeof UNISWAP_V4_ADDRESSES] || null
  }
}

// 导出单例实例
export const uniswapV4Service = new UniswapV4Service()
export type { SwapParams, QuoteResult, PoolInfo }