import { create } from 'zustand'

interface StakingState {
  activeTab: 'stake' | 'unstake'
  setActiveTab: (activeTab: StakingState['activeTab']) => void
}

export const useStakingStore = create<StakingState>(set => ({
  activeTab: 'stake',
  setActiveTab: activeTab => set({ activeTab })
}))
