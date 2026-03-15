import { create } from 'zustand';

interface MetalPrices {
  gold: number;  // USD per troy oz
  silver: number;
}

interface FamilyStore {
  activeMemberId: string | null;
  setActiveMember: (id: string | null) => void;
  rates: Record<string, number>;
  ratesUpdatedAt: string | null;
  setRates: (rates: Record<string, number>, updatedAt: string) => void;
  metalPrices: MetalPrices;
  metalPricesUpdatedAt: string | null;
  setMetalPrices: (prices: MetalPrices, updatedAt: string) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useFamilyStore = create<FamilyStore>((set) => ({
  activeMemberId: null,
  setActiveMember: (id) => set({ activeMemberId: id }),
  rates: {},
  ratesUpdatedAt: null,
  setRates: (rates, updatedAt) => set({ rates, ratesUpdatedAt: updatedAt }),
  metalPrices: { gold: 0, silver: 0 },
  metalPricesUpdatedAt: null,
  setMetalPrices: (prices, updatedAt) => set({ metalPrices: prices, metalPricesUpdatedAt: updatedAt }),
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
