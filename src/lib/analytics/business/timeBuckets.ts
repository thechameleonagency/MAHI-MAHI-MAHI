/**
 * Time bucketing for Business Analytics — turns any dated records into
 * zero-filled daily / weekly / monthly series for charting.
 */
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type BusinessGranularity = "daily" | "weekly" | "monthly";

export interface BusinessWindow {
  from: Date;
  to: Date;
}

export interface SeriesPoint {
  key: string;
  label: string;
  value: number;
}

const MAX_BUCKETS = 800;

export function parseIsoDate(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const d = parseISO(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return isValid(d) ? d : null;
}

export function inWindow(iso: string | undefined | null, window: BusinessWindow): boolean {
  const d = parseIsoDate(iso);
  if (!d) return false;
  return d >= window.from && d <= window.to;
}

export function bucketKey(date: Date, granularity: BusinessGranularity): string {
  if (granularity === "monthly") return format(startOfMonth(date), "yyyy-MM");
  if (granularity === "weekly") return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
  return format(startOfDay(date), "yyyy-MM-dd");
}

export function bucketLabel(key: string, granularity: BusinessGranularity): string {
  const d = parseIsoDate(granularity === "monthly" ? `${key}-01` : key);
  if (!d) return key;
  if (granularity === "monthly") return format(d, "MMM yy");
  return format(d, "d MMM");
}

/** Ordered bucket keys covering the window (capped at {@link MAX_BUCKETS}). */
export function listBucketKeys(
  window: BusinessWindow,
  granularity: BusinessGranularity,
): string[] {
  const keys: string[] = [];
  let cursor =
    granularity === "monthly"
      ? startOfMonth(window.from)
      : granularity === "weekly"
        ? startOfWeek(window.from, { weekStartsOn: 1 })
        : startOfDay(window.from);
  while (cursor <= window.to && keys.length < MAX_BUCKETS) {
    keys.push(bucketKey(cursor, granularity));
    cursor =
      granularity === "monthly"
        ? addMonths(cursor, 1)
        : granularity === "weekly"
          ? addWeeks(cursor, 1)
          : addDays(cursor, 1);
  }
  return keys;
}

/**
 * Zero-filled series over the window. `getValue` defaults to counting records.
 */
export function buildTimeSeries<T>(
  items: T[],
  getDateIso: (item: T) => string | undefined | null,
  window: BusinessWindow,
  granularity: BusinessGranularity,
  getValue: (item: T) => number = () => 1,
): SeriesPoint[] {
  const sums = new Map<string, number>();
  for (const item of items) {
    const d = parseIsoDate(getDateIso(item));
    if (!d || d < window.from || d > window.to) continue;
    const key = bucketKey(d, granularity);
    sums.set(key, (sums.get(key) ?? 0) + getValue(item));
  }
  return listBucketKeys(window, granularity).map((key) => ({
    key,
    label: bucketLabel(key, granularity),
    value: Math.round((sums.get(key) ?? 0) * 100) / 100,
  }));
}

/**
 * % change of the last bucket vs the previous one (null when not computable).
 * Positive = increasing.
 */
export function trendPct(series: SeriesPoint[]): number | null {
  if (series.length < 2) return null;
  const prev = series[series.length - 2].value;
  const last = series[series.length - 1].value;
  if (prev === 0) return last === 0 ? 0 : null;
  return Math.round(((last - prev) / Math.abs(prev)) * 100);
}
