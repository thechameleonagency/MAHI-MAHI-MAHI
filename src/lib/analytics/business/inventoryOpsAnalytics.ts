/**
 * Warehouse operations analytics: stock-value trend reconstructed from item
 * movement history, consumption by site / category (with per-kW intensity),
 * and tool fleet status.
 */
import type { InventoryItem, Project, SiteRecord, Tool } from "@/types/project";
import { parseKw } from "./geoAnalytics";
import {
  bucketKey,
  bucketLabel,
  inWindow,
  listBucketKeys,
  parseIsoDate,
  type BusinessGranularity,
  type BusinessWindow,
} from "./timeBuckets";

/** Signed stock delta for a movement (issue consumes; return/purchase add). */
function movementDelta(type: string, qty: number): number {
  if (type === "issue") return -Math.abs(qty);
  if (type === "return" || type === "purchase") return Math.abs(qty);
  return qty; // adjustment: trust the signed qty
}

export interface StockValuePoint {
  key: string;
  label: string;
  value: number;
  /** Change vs previous bucket. */
  change: number;
}

export interface ConsumptionByCategory {
  category: string;
  qty: number;
  value: number;
  siteCount: number;
  /** Consumption ₹ per kW across the distinct projects it was issued to. */
  valuePerKw: number | null;
}

export interface ConsumptionBySite {
  site: string;
  qty: number;
  value: number;
  kw: number | null;
}

export interface InventoryOpsAnalytics {
  stockValueSeries: StockValuePoint[];
  stockValueChangeInPeriod: number;
  consumptionValue: number;
  consumptionByCategory: ConsumptionByCategory[];
  consumptionBySite: ConsumptionBySite[];
  categories: string[];
  // Tools
  toolCount: number;
  toolFleetValue: number;
  toolStatusMix: { status: string; count: number }[];
  toolConditionMix: { condition: string; count: number }[];
  toolUtilizationPct: number;
}

export function computeInventoryOpsAnalytics(
  inventoryItems: InventoryItem[],
  tools: Tool[],
  sites: SiteRecord[],
  projects: Project[],
  window: BusinessWindow,
  granularity: BusinessGranularity,
  categoryFilter = "all",
): InventoryOpsAnalytics {
  const items =
    categoryFilter === "all"
      ? inventoryItems
      : inventoryItems.filter((i) => i.category === categoryFilter);

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const siteToKw = new Map<string, number>();
  const siteIdToName = new Map<string, string>();
  for (const s of sites) {
    const project = projectById.get(s.projectId);
    const kw = project ? parseKw(project.capacity) : 0;
    siteToKw.set(s.id, kw);
    siteToKw.set(s.name, kw);
    siteIdToName.set(s.id, s.name);
  }

  // ---- Stock value trend: walk backwards from current stock through movements.
  const keys = listBucketKeys(window, granularity);
  const deltaValueByBucket = new Map<string, number>();
  let deltaInWindowTotal = 0;
  for (const item of items) {
    const price = item.buyPrice || 0;
    for (const m of item.movementHistory ?? []) {
      if (m.reversedAt) continue;
      const d = parseIsoDate(m.date);
      if (!d || d < window.from || d > window.to) continue;
      const deltaValue = movementDelta(m.type, m.qty) * price;
      const key = bucketKey(d, granularity);
      deltaValueByBucket.set(key, (deltaValueByBucket.get(key) ?? 0) + deltaValue);
      deltaInWindowTotal += deltaValue;
    }
  }
  const currentValue = items.reduce((s, i) => s + (i.stock || 0) * (i.buyPrice || 0), 0);
  const startValue = currentValue - deltaInWindowTotal;
  let running = startValue;
  const stockValueSeries: StockValuePoint[] = keys.map((key) => {
    const change = deltaValueByBucket.get(key) ?? 0;
    running += change;
    return {
      key,
      label: bucketLabel(key, granularity),
      value: Math.round(running),
      change: Math.round(change),
    };
  });

  // ---- Consumption (issues) by category and site.
  const catMap = new Map<string, { qty: number; value: number; sites: Set<string> }>();
  const siteMap = new Map<string, { qty: number; value: number }>();
  let consumptionValue = 0;
  for (const item of items) {
    const price = item.buyPrice || 0;
    const category = item.category || "Uncategorised";
    for (const m of item.movementHistory ?? []) {
      if (m.reversedAt || m.type !== "issue") continue;
      if (!inWindow(m.date, window)) continue;
      const qty = Math.abs(m.qty);
      const value = qty * price;
      consumptionValue += value;
      const siteKey = m.siteName || (m.siteId ? siteIdToName.get(m.siteId) ?? m.siteId : "Warehouse / other");
      const cat = catMap.get(category) ?? { qty: 0, value: 0, sites: new Set<string>() };
      cat.qty += qty;
      cat.value += value;
      cat.sites.add(siteKey);
      catMap.set(category, cat);
      const site = siteMap.get(siteKey) ?? { qty: 0, value: 0 };
      site.qty += qty;
      site.value += value;
      siteMap.set(siteKey, site);
    }
  }

  const consumptionByCategory: ConsumptionByCategory[] = [...catMap.entries()]
    .map(([category, v]) => {
      const kwTotal = [...v.sites].reduce((s, site) => s + (siteToKw.get(site) ?? 0), 0);
      return {
        category,
        qty: Math.round(v.qty * 100) / 100,
        value: Math.round(v.value),
        siteCount: v.sites.size,
        valuePerKw: kwTotal > 0 ? Math.round(v.value / kwTotal) : null,
      };
    })
    .sort((a, b) => b.value - a.value);

  const consumptionBySite: ConsumptionBySite[] = [...siteMap.entries()]
    .map(([site, v]) => ({
      site,
      qty: Math.round(v.qty * 100) / 100,
      value: Math.round(v.value),
      kw: siteToKw.get(site) || null,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  // ---- Tools fleet.
  const toolStatusMap = new Map<string, number>();
  const toolConditionMap = new Map<string, number>();
  for (const t of tools) {
    toolStatusMap.set(t.status, (toolStatusMap.get(t.status) ?? 0) + 1);
    toolConditionMap.set(t.condition, (toolConditionMap.get(t.condition) ?? 0) + 1);
  }
  const activeTools = tools.filter((t) => t.status !== "Retired");
  const inUse = tools.filter((t) => t.status === "In Use").length;

  return {
    stockValueSeries,
    stockValueChangeInPeriod: Math.round(deltaInWindowTotal),
    consumptionValue: Math.round(consumptionValue),
    consumptionByCategory,
    consumptionBySite,
    categories: [...new Set(inventoryItems.map((i) => i.category || "Uncategorised"))].sort(),
    toolCount: tools.length,
    toolFleetValue: Math.round(tools.reduce((s, t) => s + (t.purchaseRate || 0), 0)),
    toolStatusMix: [...toolStatusMap.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    toolConditionMix: [...toolConditionMap.entries()]
      .map(([condition, count]) => ({ condition, count }))
      .sort((a, b) => b.count - a.count),
    toolUtilizationPct: activeTools.length
      ? Math.round((inUse / activeTools.length) * 100)
      : 0,
  };
}
