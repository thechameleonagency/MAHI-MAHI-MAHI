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
 * Compact axis label for charts (e.g. audit dashboards). Uses Indian grouping via {@link formatINRCompact}
 * for large values; sub-thousand values use full {@link formatINR}.
 */
export function formatINRChartAxis(value: number): string {
  if (isNaN(value) || value == null) return "₹0";
  const abs = Math.abs(value);
  if (abs >= 1000) return formatINRCompact(value);
  return formatINR(value);
}

/**
 * @deprecated Import {@link formatINR} instead — same behaviour; alias kept for legacy imports only.
 */
export const formatCurrency = formatINR;

/**
 * Renders a system-capacity value as `"<n> kW"`, stripping any trailing `kw`/`kW`/`kwp`/`kWp`
 * already present in the stored string. This avoids the historic "10 kW kW" duplication that
 * appeared when the capacity input auto-appended `kW` to values that already had it.
 */
export function formatCapacityKW(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  const stripped = raw.replace(/\s*k\s*w\s*p?\s*$/i, "").trim();
  return stripped ? `${stripped} kW` : "";
}

export function formatINRCompact(amount: number): string {
  if (isNaN(amount) || amount == null) return "₹0";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 10_000_000) return `${sign}₹${(abs / 10_000_000).toFixed(2)} Cr`;
  if (abs >= 100_000) return `${sign}₹${(abs / 100_000).toFixed(2)} L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
  return `${sign}₹${abs}`;
}
