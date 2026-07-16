/**
 * Procurement rate analytics. There is no stored price history, so buy-rate
 * timelines are derived from vendor bill line items (matched by
 * `inventoryItemId`, falling back to normalized item name).
 */
import type { VendorBill } from "@/types/inventory";
import {
  buildTimeSeries,
  inWindow,
  type BusinessGranularity,
  type BusinessWindow,
  type SeriesPoint,
} from "./timeBuckets";

export interface ItemRatePoint {
  date: string;
  rate: number;
}

export interface ItemRateStats {
  key: string;
  name: string;
  points: ItemRatePoint[];
  firstRate: number;
  lastRate: number;
  /** % change first → last purchase rate in the window. */
  changePct: number;
  totalSpend: number;
  purchases: number;
}

export interface InventoryRateAnalytics {
  /** Items with a real rate change, sorted by |changePct| descending. */
  movers: ItemRateStats[];
  /** Most frequently purchased items (for trend lines). */
  topItems: ItemRateStats[];
  spendSeries: SeriesPoint[];
  totalSpend: number;
  billCount: number;
}

export function computeInventoryRateAnalytics(
  vendorBills: VendorBill[],
  window: BusinessWindow,
  granularity: BusinessGranularity,
): InventoryRateAnalytics {
  const bills = vendorBills.filter(
    (b) => b.status !== "draft" && inWindow(b.billDate, window),
  );

  const itemMap = new Map<string, { name: string; points: ItemRatePoint[]; spend: number }>();
  for (const bill of bills) {
    for (const line of bill.items ?? []) {
      if (!line.rate || line.rate <= 0) continue;
      const name = (line.name || line.description || "").trim();
      const key = line.inventoryItemId ?? name.toLowerCase();
      if (!key) continue;
      const entry = itemMap.get(key) ?? { name: name || key, points: [], spend: 0 };
      entry.points.push({ date: bill.billDate.slice(0, 10), rate: line.rate });
      entry.spend += line.amount || line.rate * (line.quantity || 0);
      itemMap.set(key, entry);
    }
  }

  const allStats: ItemRateStats[] = [...itemMap.entries()].map(([key, entry]) => {
    const points = [...entry.points].sort((a, b) => a.date.localeCompare(b.date));
    const firstRate = points[0]?.rate ?? 0;
    const lastRate = points[points.length - 1]?.rate ?? 0;
    return {
      key,
      name: entry.name,
      points,
      firstRate,
      lastRate,
      changePct: firstRate > 0 ? Math.round(((lastRate - firstRate) / firstRate) * 100) : 0,
      totalSpend: Math.round(entry.spend),
      purchases: points.length,
    };
  });

  const movers = allStats
    .filter((s) => s.purchases >= 2 && s.changePct !== 0)
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));

  const topItems = [...allStats].sort(
    (a, b) => b.purchases - a.purchases || b.totalSpend - a.totalSpend,
  );

  const spendSeries = buildTimeSeries(bills, (b) => b.billDate, window, granularity, (b) => b.total || 0);

  return {
    movers,
    topItems,
    spendSeries,
    totalSpend: Math.round(bills.reduce((s, b) => s + (b.total || 0), 0)),
    billCount: bills.length,
  };
}
