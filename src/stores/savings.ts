import { create } from 'zustand'

interface SavingsState {
  activeTab: 'deposit' | 'withdraw'
  setActiveTab: (activeTab: SavingsState['activeTab']) => void
}

export const useSavingsStore = create<SavingsState>(set => ({
  activeTab: 'deposit',
  setActiveTab: activeTab => set({ activeTab })
}))
