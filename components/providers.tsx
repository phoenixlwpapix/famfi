'use client';

import { useEffect, type ReactNode } from 'react';
import { useFamilyStore } from '@/lib/store';

export function Providers({ children }: { children: ReactNode }) {
  const setRates = useFamilyStore((s) => s.setRates);

  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await fetch('/api/rates');
        const data = await res.json();
        setRates(data.rates, data.updatedAt);
      } catch (e) {
        console.error('Failed to fetch rates:', e);
      }
    }
    fetchRates();
    const interval = setInterval(fetchRates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [setRates]);

  return <>{children}</>;
}
