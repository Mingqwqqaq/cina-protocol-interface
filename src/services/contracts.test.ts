import { describe, expect, it } from 'vitest'
import { contractService } from '@/services/contracts'

const addressA = '0x00000000000000000000000000000000000000AA'
const addressB = '0x00000000000000000000000000000000000000BB'
const contractAddress = '0x00000000000000000000000000000000000000CC'

describe('contractService cache', () => {
  it('creates a new cached contract when the wallet session identity changes', () => {
    contractService.clearCache()

    contractService.setContext({
      address: addressA,
      chainId: 11155111,
      provider: { id: 'provider-a' } as never,
      signer: { id: 'signer-a' } as never,
      providerIdentity: 'provider-a',
      signerIdentity: 'signer-a'
    })

    const firstContract = contractService.getERC20Contract(contractAddress)

    contractService.setContext({
      address: addressB,
      chainId: 11155111,
      provider: { id: 'provider-b' } as never,
      signer: { id: 'signer-b' } as never,
      providerIdentity: 'provider-b',
      signerIdentity: 'signer-b'
    })

    const secondContract = contractService.getERC20Contract(contractAddress)

    expect(firstContract).not.toBeNull()
    expect(secondContract).not.toBeNull()
    expect(firstContract).not.toBe(secondContract)
  })

  it('reuses the cached contract for the same wallet session identity', () => {
    contractService.clearCache()

    contractService.setContext({
      address: addressA,
      chainId: 11155111,
      provider: { id: 'provider-a' } as never,
      signer: { id: 'signer-a' } as never,
      providerIdentity: 'provider-a',
      signerIdentity: 'signer-a'
    })

    const firstContract = contractService.getERC20Contract(contractAddress)
    const secondContract = contractService.getERC20Contract(contractAddress)

    expect(firstContract).toBe(secondContract)
  })
})
