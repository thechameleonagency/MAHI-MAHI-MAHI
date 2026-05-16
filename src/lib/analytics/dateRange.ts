import type { AnalyticsDateRange } from "./types";

export function inAnalyticsRange(
  dateStr: string | undefined,
  range: AnalyticsDateRange,
  now: Date = new Date(),
): boolean {
  if (range === "all") return true;
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  if (range === "month") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (range === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return d.getFullYear() === now.getFullYear() && Math.floor(d.getMonth() / 3) === q;
  }
  if (range === "year") {
    return d.getFullYear() === now.getFullYear();
  }
  return true;
}

export function daysBetween(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
