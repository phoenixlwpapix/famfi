import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await res.json();

    return NextResponse.json({
      rates: data.rates,
      updatedAt: data.time_last_update_utc,
    });
  } catch {
    // Fallback rates
    return NextResponse.json({
      rates: { CNY: 7.24, USD: 1, EUR: 0.92, GBP: 0.79, JPY: 149.5, HKD: 7.82 },
      updatedAt: new Date().toISOString(),
    });
  }
}
