import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { parseUnits } from 'ethers'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BondsPage from '@/pages/Bonds'
import { contractService } from '@/services/contracts'
import { useWalletStore } from '@/stores/wallet'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

vi.mock('@/hooks/useDebouncedValue', () => ({
  useDebouncedValue: (value: string) => value
}))

const feedback = vi.hoisted(() => ({
  confirm: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
  warning: vi.fn()
}))

vi.mock('@/lib/feedback', () => ({
  feedback
}))

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 0,
        retry: false
      }
    }
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BondsPage />
    </QueryClientProvider>
  )
}

function makeTransaction(hash: string) {
  return {
    hash,
    wait: vi.fn().mockResolvedValue({ hash })
  }
}

describe('BondsPage', () => {
  beforeEach(() => {
    useWalletStore.getState().reset()
    feedback.confirm.mockReset()
    feedback.error.mockReset()
    feedback.info.mockReset()
    feedback.success.mockReset()
    feedback.warning.mockReset()
    vi.restoreAllMocks()
  })

  it('restores the original bond page section headings and removes the generic scaffold subtitle', async () => {
    vi.spyOn(contractService, 'getBondPoolContract').mockReturnValue(null)
    vi.spyOn(contractService, 'getUSDTContract').mockReturnValue(null)

    renderPage()

    expect(await screen.findByRole('heading', { name: /pool overview/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /your bonds/i })).toBeInTheDocument()
    expect(screen.queryByText(/invest in bonds to earn stable returns/i)).not.toBeInTheDocument()
  })

  it('shows the wallet gating alert when the user is disconnected', async () => {
    vi.spyOn(contractService, 'getBondPoolContract').mockReturnValue(null)
    vi.spyOn(contractService, 'getUSDTContract').mockReturnValue(null)

    renderPage()

    expect((await screen.findAllByText(/wallet\.connectWallet|connect wallet/i)).length).toBeGreaterThan(0)
  })

  it('approves USDT before subscribing and refreshes the bond data', async () => {
    useWalletStore.getState().setSnapshot({
      address: '0x00000000000000000000000000000000000000AA',
      balance: '1.25',
      chainId: 11155111,
      status: 'connected'
    })

    const now = Math.floor(Date.now() / 1000)
    const approveTx = makeTransaction('0xapprove')
    const subscribeTx = makeTransaction('0xsubscribe')

    const bondPoolRead = {
      getPoolStats: vi.fn().mockResolvedValue([parseUnits('1000', 6), 4n, parseUnits('250', 6)]),
      getUserBonds: vi.fn().mockResolvedValue([
        [1n],
        [
          {
            interestRate: 750n,
            isActive: true,
            isMatured: false,
            maturityTime: BigInt(now + 10 * 24 * 60 * 60),
            principal: parseUnits('100', 6),
            subscribeTime: BigInt(now - 20 * 24 * 60 * 60),
            wrmbAmount: parseUnits('720', 18)
          }
        ]
      ]),
      poolConfig: vi.fn().mockResolvedValue({
        bondDuration: BigInt(30 * 24 * 60 * 60),
        interestRate: 750n,
        maxPoolSize: parseUnits('1000', 6),
        maxSubscription: parseUnits('500', 6),
        minSubscription: parseUnits('10', 6),
        subscriptionOpen: true
      }),
      previewSubscription: vi.fn().mockResolvedValue([
        parseUnits('180', 18),
        BigInt(now + 30 * 24 * 60 * 60),
        parseUnits('190', 18)
      ])
    }

    const bondPoolWrite = {
      subscribeBond: vi.fn().mockResolvedValue(subscribeTx)
    }

    const usdtRead = {
      allowance: vi
        .fn()
        .mockResolvedValueOnce(0n)
        .mockResolvedValue(parseUnits('1000', 6)),
      balanceOf: vi.fn().mockResolvedValue(parseUnits('250', 6))
    }

    const usdtWrite = {
      approve: vi.fn().mockResolvedValue(approveTx)
    }

    vi.spyOn(contractService, 'getBondPoolContract').mockImplementation(withSigner =>
      withSigner ? (bondPoolWrite as never) : (bondPoolRead as never)
    )
    vi.spyOn(contractService, 'getUSDTContract').mockImplementation(withSigner =>
      withSigner ? (usdtWrite as never) : (usdtRead as never)
    )
    vi.spyOn(contractService, 'getAddresses').mockReturnValue({
      BOND_POOL: '0x00000000000000000000000000000000000000BB',
      CINA: '',
      FARM_VAULT: '',
      SAVINGS_VAULT: '',
      SRMB_FACTORY: '',
      STAKING_VAULT: '',
      USDT: '0x00000000000000000000000000000000000000CC',
      WRAP_MANAGER: '',
      WRMB: ''
    })

    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText(/bonds\.poolOverview|pool overview/i)).toBeInTheDocument()

    const amountInput = screen.getByRole('textbox')
    await user.click(amountInput)
    await user.type(amountInput, '25')

    await waitFor(() => {
      expect(bondPoolRead.previewSubscription).toHaveBeenCalledWith(parseUnits('25', 6))
    })

    await user.click(screen.getByRole('button', { name: /bonds\.subscribeBond|subscribe bond/i }))

    await waitFor(() => {
      expect(usdtWrite.approve).toHaveBeenCalledWith(
        '0x00000000000000000000000000000000000000BB',
        expect.anything()
      )
    })

    await waitFor(() => {
      expect(bondPoolWrite.subscribeBond).toHaveBeenCalledWith(parseUnits('25', 6))
    })

    expect(feedback.success).toHaveBeenCalledWith('bonds.subscriptionSuccess')
    expect(usdtRead.balanceOf).toHaveBeenCalledWith('0x00000000000000000000000000000000000000AA')
    expect(bondPoolRead.getUserBonds).toHaveBeenCalledWith('0x00000000000000000000000000000000000000AA')
  })

  it('redeems matured bonds from the holdings list', async () => {
    useWalletStore.getState().setSnapshot({
      address: '0x00000000000000000000000000000000000000AA',
      balance: '1.25',
      chainId: 11155111,
      status: 'connected'
    })

    const now = Math.floor(Date.now() / 1000)
    const redeemTx = makeTransaction('0xredeem')

    const bondPoolRead = {
      getPoolStats: vi.fn().mockResolvedValue([parseUnits('1000', 6), 4n, parseUnits('250', 6)]),
      getUserBonds: vi.fn().mockResolvedValue([
        [7n],
        [
          {
            interestRate: 750n,
            isActive: false,
            isMatured: true,
            maturityTime: BigInt(now - 24 * 60 * 60),
            principal: parseUnits('100', 6),
            subscribeTime: BigInt(now - 40 * 24 * 60 * 60),
            wrmbAmount: parseUnits('720', 18)
          }
        ]
      ]),
      poolConfig: vi.fn().mockResolvedValue({
        bondDuration: BigInt(30 * 24 * 60 * 60),
        interestRate: 750n,
        maxPoolSize: parseUnits('1000', 6),
        maxSubscription: parseUnits('500', 6),
        minSubscription: parseUnits('10', 6),
        subscriptionOpen: true
      }),
      previewSubscription: vi.fn().mockResolvedValue([
        parseUnits('180', 18),
        BigInt(now + 30 * 24 * 60 * 60),
        parseUnits('190', 18)
      ])
    }

    const bondPoolWrite = {
      matureBond: vi.fn().mockResolvedValue(redeemTx)
    }

    const usdtRead = {
      allowance: vi.fn().mockResolvedValue(parseUnits('1000', 6)),
      balanceOf: vi.fn().mockResolvedValue(parseUnits('250', 6))
    }

    vi.spyOn(contractService, 'getBondPoolContract').mockImplementation(withSigner =>
      withSigner ? (bondPoolWrite as never) : (bondPoolRead as never)
    )
    vi.spyOn(contractService, 'getUSDTContract').mockImplementation(() => usdtRead as never)
    vi.spyOn(contractService, 'getAddresses').mockReturnValue({
      BOND_POOL: '0x00000000000000000000000000000000000000BB',
      CINA: '',
      FARM_VAULT: '',
      SAVINGS_VAULT: '',
      SRMB_FACTORY: '',
      STAKING_VAULT: '',
      USDT: '0x00000000000000000000000000000000000000CC',
      WRAP_MANAGER: '',
      WRMB: ''
    })

    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /bonds\.redeem|redeem/i }))

    await waitFor(() => {
      expect(bondPoolWrite.matureBond).toHaveBeenCalledWith(7)
    })

    expect(feedback.success).toHaveBeenCalledWith('bonds.redeemSuccess')
  })
})
