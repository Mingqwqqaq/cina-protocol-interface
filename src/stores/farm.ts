import { create } from 'zustand'

interface FarmState {
  activeTab: 'deposit' | 'withdraw'
  setActiveTab: (activeTab: FarmState['activeTab']) => void
}

export const useFarmStore = create<FarmState>(set => ({
  activeTab: 'deposit',
  setActiveTab: activeTab => set({ activeTab })
}))
