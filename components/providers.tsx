'use client';

import { useEffect, type ReactNode } from 'react';
import { useFamilyStore } from '@/lib/store';

export function Providers({ children }: { children: ReactNode }) {
  const setRates = useFamilyStore((s) => s.setRates);
  const setMetalPrices = useFamilyStore((s) => s.setMetalPrices);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [ratesRes, metalsRes] = await Promise.all([
          fetch('/api/rates'),
          fetch('/api/metals'),
        ]);
        const ratesData = await ratesRes.json();
        setRates(ratesData.rates, ratesData.updatedAt);

        const metalsData = await metalsRes.json();
        if (metalsData.gold > 0 || metalsData.silver > 0) {
          setMetalPrices({ gold: metalsData.gold, silver: metalsData.silver }, metalsData.updatedAt);
        }
      } catch (e) {
        console.error('Failed to fetch rates/metals:', e);
      }
    }
    fetchAll();
    const interval = setInterval(fetchAll, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [setRates, setMetalPrices]);

  return <>{children}</>;
}
