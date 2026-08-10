/** Format integer minor units (see split.ts) as a currency string. */
export function formatMoney(minor: number, currency = 'INR', decimals = 2): string {
  const value = minor / 10 ** decimals;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(decimals)}`;
  }
}
