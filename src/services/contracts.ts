import { Contract, Interface, type ContractRunner } from 'ethers'
import { CONTRACTS, TOKENS } from '@/constants'

export interface Web3Context {
  address: string
  chainId: number
  provider: ContractRunner | null
  providerIdentity: string
  signer: ContractRunner | null
  signerIdentity: string
}

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address, address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function transfer(address, uint256) returns (bool)',
  'function transferFrom(address, address, uint256) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function paused() view returns (bool)'
]

const SAVINGS_VAULT_ABI = [
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address, address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function getNAV_sWRMB() view returns (uint256)',
  'function lastIncreaseAmount() view returns (uint256)',
  'function currentPendingIncreaseAmount() view returns (uint256)',
  'function totalMMFSupply() view returns (uint256)',
  'function previewDeposit(uint256) view returns (uint256)',
  'function previewRedeem(uint256) view returns (uint256)',
  'function previewMint(uint256) view returns (uint256)',
  'function previewWithdrawOfFee(uint256) view returns (uint256, uint256, uint256)',
  'function maxWithdraw(address) view returns (uint256)',
  'function getUserIncrementAmount(address) view returns (uint256)',
  'function getIncrementAmount() view returns (uint256)',
  'function deposit(uint256, address) returns (uint256)',
  'function redeem(uint256, address, address) returns (uint256)',
  'function withdraw(uint256, address, address) returns (uint256)',
  'function asset() view returns (address)'
]

const WRAP_MANAGER_ABI = [
  'function wrap(address, uint256) returns (uint256, uint256)',
  'function unwrap(address, uint256) returns (uint256, uint256)',
  'function previewWrap(address, address, uint256) view returns (uint256, uint256, uint256, uint256, uint256)',
  'function previewUnwrap(address, address, uint256) view returns (uint256, uint256, uint256, uint256, uint256)',
  'function getConfiguration() view returns (address, address, uint256, uint256, uint256, uint256, uint256, uint256)',
  'function minWrapAmount() view returns (uint256)',
  'function maxWrapAmount() view returns (uint256)',
  'function minUnwrapAmount() view returns (uint256)',
  'function maxUnwrapAmount() view returns (uint256)',
  'function wrapFee() view returns (uint256)',
  'function unwrapFee() view returns (uint256)',
  'function totalWrapped() view returns (uint256)',
  'function getSRMBLiquidity() view returns (uint256)'
  ,
  'function wrapAndUnwrapInterval() view returns (uint256)',
  'function totalReserveTransferred() view returns (uint256)',
  'function checkSRMBWrapActive(address) view returns (bool)',
  'function getUserWrapStats(address, address) view returns (uint256 availableToUnwrap, uint256 userMaxUnwrappedAmount)'
]

const BOND_POOL_ABI = [
  'function subscribeBond(uint256)',
  'function matureBond(uint256)',
  'function getUserBonds(address) view returns (uint256[], tuple(uint256 principal, uint256 wrmbAmount, uint256 subscribeTime, uint256 maturityTime, uint256 interestRate, bool isActive, bool isMatured)[])',
  'function previewSubscription(uint256) view returns (uint256, uint256, uint256)',
  'function getPoolStats() view returns (uint256, uint256, uint256)',
  'function poolConfig() view returns (tuple(uint256 minSubscription, uint256 maxSubscription, uint256 bondDuration, uint256 interestRate, uint256 maxPoolSize, bool subscriptionOpen))'
]

const STAKING_VAULT_ABI = [
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function maxWithdraw(address) view returns (uint256)',
  'function getNAV_CINA() view returns (uint256)',
  'function minStakeAmount() view returns (uint256)',
  'function lastDayRewardAmount() view returns (uint256)',
  'function getIncrementAmount() view returns (uint256)',
  'function getUserIncrementAmount(address) view returns (uint256)',
  'function getTotalPendingAmount() view returns (uint256)',
  'function previewDeposit(uint256) view returns (uint256)',
  'function previewWithdraw(uint256) view returns (uint256)',
  'function previewMint(uint256) view returns (uint256)',
  'function previewRedeem(uint256) view returns (uint256)',
  'function deposit(uint256, address) returns (uint256)',
  'function withdraw(uint256, address, address) returns (uint256)',
  'function mint(uint256, address) returns (uint256)',
  'function redeem(uint256, address, address) returns (uint256)'
]

const FARM_VAULT_ABI = [
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function earned(address) view returns (uint256)',
  'function getRewardForDuration() view returns (uint256)',
  'function getRemainingTime() view returns (uint256)',
  'function rewardRate() view returns (uint256)',
  'function deposit(uint256)',
  'function withdraw(uint256, bool)',
  'function getReward()'
]

const SRMB_FACTORY_ABI = [
  'function getAllSRMBContracts() view returns (tuple(address sRMBContract, uint256 wrappedAmount, uint256 wrappedShares, bool active)[])',
  'function getSRMBContractsCount() view returns (uint256)',
  'function getSRMBContractInfo(address) view returns (tuple(address sRMBContract, uint256 wrappedAmount, uint256 wrappedShares, bool active))',
  'function isValidSRMBContract(address) view returns (bool)'
]

export function getContractAddresses(chainId: number) {
  return {
    SAVINGS_VAULT: CONTRACTS.SAVINGS_VAULT[chainId as keyof typeof CONTRACTS.SAVINGS_VAULT] || '',
    WRAP_MANAGER: CONTRACTS.WRAP_MANAGER[chainId as keyof typeof CONTRACTS.WRAP_MANAGER] || '',
    BOND_POOL: CONTRACTS.BOND_POOL[chainId as keyof typeof CONTRACTS.BOND_POOL] || '',
    STAKING_VAULT: CONTRACTS.STAKING_VAULT[chainId as keyof typeof CONTRACTS.STAKING_VAULT] || '',
    FARM_VAULT: CONTRACTS.FARM_VAULT[chainId as keyof typeof CONTRACTS.FARM_VAULT] || '',
    SRMB_FACTORY: CONTRACTS.SRMB_FACTORY[chainId as keyof typeof CONTRACTS.SRMB_FACTORY] || '',
    WRMB: TOKENS.WRMB.addresses[chainId as keyof typeof TOKENS.WRMB.addresses] || '',
    CINA: TOKENS.CINA.addresses[chainId as keyof typeof TOKENS.CINA.addresses] || '',
    USDT: TOKENS.USDT.addresses[chainId as keyof typeof TOKENS.USDT.addresses] || ''
  }
}

class ContractService {
  private contracts = new Map<string, Contract>()
  private context: Web3Context = {
    address: '',
    chainId: 0,
    provider: null,
    providerIdentity: '',
    signer: null,
    signerIdentity: ''
  }

  setContext(context: Partial<Web3Context>) {
    this.context = {
      ...this.context,
      ...context
    }
  }

  clearCache() {
    this.contracts.clear()
  }

  getAddresses(chainId = this.context.chainId) {
    return getContractAddresses(chainId)
  }

  getAddressesForChain(chainId: number) {
    return getContractAddresses(chainId)
  }

  isValidAddress(address: string) {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  private getRunner(withSigner: boolean) {
    return withSigner ? this.context.signer : this.context.signer || this.context.provider
  }

  private getContract(address: string, abi: string[], withSigner = false) {
    if (!address) {
      return null
    }

    const runner = this.getRunner(withSigner)
    if (!runner) {
      return null
    }

    const runnerIdentity = withSigner
      ? this.context.signerIdentity || this.context.address || 'signer'
      : this.context.providerIdentity || this.context.signerIdentity || this.context.address || 'provider'
    const key = `${address}_${this.context.chainId}_${this.context.address}_${withSigner ? 'signer' : 'provider'}_${runnerIdentity}_${abi.length}`
    const cached = this.contracts.get(key)
    if (cached) {
      return cached
    }

    const contract = new Contract(address, abi, runner)
    this.contracts.set(key, contract)
    return contract
  }

  getSavingsVaultContract(withSigner = false) {
    return this.getContract(this.getAddresses().SAVINGS_VAULT, SAVINGS_VAULT_ABI, withSigner)
  }

  getWrapManagerContract(withSigner = false) {
    return this.getContract(this.getAddresses().WRAP_MANAGER, WRAP_MANAGER_ABI, withSigner)
  }

  getBondPoolContract(withSigner = false) {
    return this.getContract(this.getAddresses().BOND_POOL, BOND_POOL_ABI, withSigner)
  }

  getWRMBContract(withSigner = false) {
    return this.getContract(this.getAddresses().WRMB, ERC20_ABI, withSigner)
  }

  getSRMBContract(contractAddress: string, withSigner = false) {
    return this.getContract(contractAddress, ERC20_ABI, withSigner)
  }

  getUSDTContract(withSigner = false) {
    return this.getContract(this.getAddresses().USDT, ERC20_ABI, withSigner)
  }

  getCINAContract(withSigner = false) {
    return this.getContract(this.getAddresses().CINA, ERC20_ABI, withSigner)
  }

  getStakingVaultContract(withSigner = false) {
    return this.getContract(this.getAddresses().STAKING_VAULT, STAKING_VAULT_ABI, withSigner)
  }

  getFarmVaultContract(withSigner = false) {
    return this.getContract(this.getAddresses().FARM_VAULT, FARM_VAULT_ABI, withSigner)
  }

  getSRMBFactoryContract(withSigner = false) {
    return this.getContract(this.getAddresses().SRMB_FACTORY, SRMB_FACTORY_ABI, withSigner)
  }

  getERC20Contract(address: string, withSigner = false) {
    return this.getContract(address, ERC20_ABI, withSigner)
  }

  getSavingsVaultInterface() {
    return new Interface(SAVINGS_VAULT_ABI)
  }

  getWrapManagerInterface() {
    return new Interface(WRAP_MANAGER_ABI)
  }

  getBondPoolInterface() {
    return new Interface(BOND_POOL_ABI)
  }

  getERC20Interface() {
    return new Interface(ERC20_ABI)
  }

  getStakingVaultInterface() {
    return new Interface(STAKING_VAULT_ABI)
  }

  getFarmVaultInterface() {
    return new Interface(FARM_VAULT_ABI)
  }

  getSRMBFactoryInterface() {
    return new Interface(SRMB_FACTORY_ABI)
  }
}

export const contractService = new ContractService()
