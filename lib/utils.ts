export function formatCNY(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number, decimals = 2): string {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function convertToCNY(
  amount: number,
  currency: string,
  rates: Record<string, number>
): number {
  if (currency === 'CNY') return amount;
  const rate = rates[currency];
  if (!rate) return amount;
  // rates are based on USD, so convert: amount in currency -> USD -> CNY
  const usdRate = rates['USD'] || 1;
  const cnyRate = rates['CNY'] || 7.2;
  const amountInUSD = amount / rate;
  return amountInUSD * cnyRate;
}

export function toCNYDirect(
  amount: number,
  currency: string,
  rates: Record<string, number>
): number {
  if (currency === 'CNY') return amount;
  // rates keys are like "USD", "EUR" etc with values as rate relative to USD
  const currencyToUSD = rates[currency];
  const cnyToUSD = rates['CNY'];
  if (!currencyToUSD || !cnyToUSD) return amount;
  // amount in currency / currencyToUSD = amount in USD
  // amount in USD * cnyToUSD = amount in CNY
  return (amount / currencyToUSD) * cnyToUSD;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export const TROY_OZ_TO_GRAMS = 31.1035;

/** Compute CNY value of a metal holding, using live price for gold/silver if available */
export function getMetalValueCNY(
  grams: number,
  metalType: string,
  storedPrice: number,
  storedCurrency: string,
  metalPrices: { gold: number; silver: number },
  rates: Record<string, number>
): number {
  const liveOzUSD =
    metalType === 'gold' ? metalPrices.gold :
    metalType === 'silver' ? metalPrices.silver : 0;

  if (liveOzUSD > 0) {
    const valueUSD = grams * (liveOzUSD / TROY_OZ_TO_GRAMS);
    return toCNYDirect(valueUSD, 'USD', rates);
  }
  return toCNYDirect(grams * storedPrice, storedCurrency, rates);
}

export function getLivePricePerGram(
  metalType: string,
  metalPrices: { gold: number; silver: number }
): number {
  const liveOzUSD =
    metalType === 'gold' ? metalPrices.gold :
    metalType === 'silver' ? metalPrices.silver : 0;
  return liveOzUSD > 0 ? liveOzUSD / TROY_OZ_TO_GRAMS : 0;
}

export function getInitials(name: string): string {
  return name.slice(0, 1);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
