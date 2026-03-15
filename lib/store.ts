import { create } from 'zustand';

interface FamilyStore {
  activeMemberId: string | null;
  setActiveMember: (id: string | null) => void;
  rates: Record<string, number>;
  ratesUpdatedAt: string | null;
  setRates: (rates: Record<string, number>, updatedAt: string) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useFamilyStore = create<FamilyStore>((set) => ({
  activeMemberId: null,
  setActiveMember: (id) => set({ activeMemberId: id }),
  rates: {},
  ratesUpdatedAt: null,
  setRates: (rates, updatedAt) => set({ rates, ratesUpdatedAt: updatedAt }),
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
