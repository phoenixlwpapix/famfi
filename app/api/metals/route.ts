import { NextResponse } from 'next/server';

// gold-api.com — free, no API key required, returns USD/troy-oz
export async function GET() {
  try {
    const [goldRes, silverRes] = await Promise.all([
      fetch('https://api.gold-api.com/price/XAU', { cache: 'no-store' }),
      fetch('https://api.gold-api.com/price/XAG', { cache: 'no-store' }),
    ]);

    if (!goldRes.ok || !silverRes.ok) throw new Error('gold-api fetch failed');

    const [goldData, silverData] = await Promise.all([
      goldRes.json() as Promise<{ price: number }>,
      silverRes.json() as Promise<{ price: number }>,
    ]);

    return NextResponse.json({
      gold: goldData.price ?? 0,
      silver: silverData.price ?? 0,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ gold: 0, silver: 0, updatedAt: new Date().toISOString() });
  }
}
