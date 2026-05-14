/**
 * Re-export of {@link formatINR} for legacy / generic callsites that import `formatCurrency`.
 * Keep behaviour identical — currency in this prototype is always INR.
 */
export function formatINR(amount: number): string {
  if (isNaN(amount) || amount == null) return "₹0";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  // Indian number formatting: last 3 digits then groups of 2
  const str = Math.round(abs).toString();
  if (str.length <= 3) return `${sign}₹${str}`;
  const last3 = str.slice(-3);
  const rest = str.slice(0, -3);
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
  return `${sign}₹${formatted}`;
}

/**
 * Generic alias for {@link formatINR}. Prefer importing `formatINR` directly; this re-export
 * exists so legacy callsites that did `import { formatCurrency } ...` keep compiling.
 */
export const formatCurrency = formatINR;

export function formatINRCompact(amount: number): string {
  if (isNaN(amount) || amount == null) return "₹0";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 10_000_000) return `${sign}₹${(abs / 10_000_000).toFixed(2)} Cr`;
  if (abs >= 100_000) return `${sign}₹${(abs / 100_000).toFixed(2)} L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
  return `${sign}₹${abs}`;
}
