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

/** Inclusive ISO yyyy-MM-dd bounds matching `inAnalyticsRange` for cash KPI helpers. */
export function analyticsRangeToIsoBounds(
  range: AnalyticsDateRange,
  now: Date = new Date(),
): { fromDate?: string; toDate?: string } {
  if (range === "all") return {};
  const y = now.getFullYear();
  const m = now.getMonth();
  if (range === "month") {
    const last = new Date(y, m + 1, 0).getDate();
    const mm = String(m + 1).padStart(2, "0");
    return { fromDate: `${y}-${mm}-01`, toDate: `${y}-${mm}-${String(last).padStart(2, "0")}` };
  }
  if (range === "quarter") {
    const qStart = Math.floor(m / 3) * 3;
    const qEnd = qStart + 2;
    const last = new Date(y, qEnd + 1, 0).getDate();
    const fromMm = String(qStart + 1).padStart(2, "0");
    const toMm = String(qEnd + 1).padStart(2, "0");
    return {
      fromDate: `${y}-${fromMm}-01`,
      toDate: `${y}-${toMm}-${String(last).padStart(2, "0")}`,
    };
  }
  return { fromDate: `${y}-01-01`, toDate: `${y}-12-31` };
}
