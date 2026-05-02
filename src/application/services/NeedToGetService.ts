import { format, subDays } from "date-fns";
import type { VendorBill } from "@/data/inventoryData";
import type { InventoryItem, Project, SiteRecord } from "@/types/project";

export type NeedToGetRow = {
  projectId: string;
  projectName: string;
  siteId: number;
  siteName: string;
  materialId: number;
  materialName: string;
  qtyShort: number;
  needByDate: string;
  lastPurchaseRate: number;
};

/** How the Need-to-Get table groups and merges lines (see `aggregateNeedToGetRows`). */
export type NeedToGetGroupMode = "flat" | "project" | "site" | "material" | "needBy";

/** Row after merge: `displayWhere` is what to show instead of raw per-site labels when lines are combined. */
export type NeedToGetViewRow = NeedToGetRow & {
  displayWhere: string;
  /** How many raw shortfall lines were merged into this row (omit when 1). */
  mergedCount?: number;
};

function mergeBucketKey(mode: NeedToGetGroupMode, r: NeedToGetRow): string {
  switch (mode) {
    case "flat":
      return `${r.projectId}|${r.siteId}|${r.materialId}|${r.needByDate}`;
    case "project":
      return `${r.projectId}|${r.materialId}|${r.needByDate}`;
    case "site":
      return `${r.siteId}|${r.materialId}|${r.needByDate}`;
    case "material":
      return String(r.materialId);
    case "needBy":
      return `${r.materialId}|${r.needByDate}`;
  }
}

/** Build a readable “Where” label for merged rows (deduped location labels, capped length). */
function buildMergedWhereLabel(
  _mode: NeedToGetGroupMode,
  members: NeedToGetRow[],
  getLocationLabel: (r: NeedToGetRow) => string,
): string {
  const labels = [...new Set(members.map((m) => getLocationLabel(m)))].sort((a, b) => a.localeCompare(b));
  if (labels.length <= 1) return labels[0] ?? "—";

  if (labels.length <= 4) return labels.join(" · ");

  const shown = labels.slice(0, 3);
  const more = labels.length - shown.length;
  return `${shown.join(" · ")} · +${more} more`;
}

function weightedAvgRate(members: NeedToGetRow[]): number {
  let q = 0;
  let sum = 0;
  for (const m of members) {
    q += m.qtyShort;
    sum += m.qtyShort * m.lastPurchaseRate;
  }
  if (q <= 0) return members[0]?.lastPurchaseRate ?? 0;
  return Math.round((sum / q) * 100) / 100;
}

/**
 * Merges shortfall lines according to the current group mode so the table matches user intent:
 * - **flat** — one row per (project, site, material, need-by); duplicates collapse.
 * - **project** — combine sites within the same project when material + need-by match.
 * - **site** — combine only duplicate keys within a site.
 * - **material** — single total per material in the filter (earliest need-by when dates differ).
 * - **needBy** — combine across locations when material + need-by date match.
 */
export function aggregateNeedToGetRows(
  rows: NeedToGetRow[],
  mode: NeedToGetGroupMode,
  getLocationLabel: (r: NeedToGetRow) => string,
): NeedToGetViewRow[] {
  const buckets = new Map<string, NeedToGetRow[]>();
  for (const r of rows) {
    const k = mergeBucketKey(mode, r);
    const arr = buckets.get(k) ?? [];
    arr.push(r);
    buckets.set(k, arr);
  }

  const out: NeedToGetViewRow[] = [];

  for (const members of buckets.values()) {
    members.sort(
      (a, b) =>
        a.needByDate.localeCompare(b.needByDate) ||
        a.projectName.localeCompare(b.projectName) ||
        a.siteName.localeCompare(b.siteName),
    );
    const base = members[0];
    const qtySum = members.reduce((s, m) => s + m.qtyShort, 0);
    const rate = weightedAvgRate(members);

    let needBy = base.needByDate;
    if (mode === "material") {
      const dates = members.map((m) => m.needByDate).sort();
      needBy = dates[0] ?? base.needByDate;
    }

    const materialName =
      [...new Set(members.map((m) => m.materialName))].length === 1
        ? base.materialName
        : members.sort((a, b) => b.qtyShort - a.qtyShort)[0].materialName;

    const displayWhere = buildMergedWhereLabel(mode, members, getLocationLabel);
    const mergedCount = members.length;

    out.push({
      ...base,
      materialName,
      qtyShort: qtySum,
      needByDate: needBy,
      lastPurchaseRate: rate,
      displayWhere,
      mergedCount: mergedCount > 1 ? mergedCount : undefined,
    });
  }

  const sorted = [...out].sort((a, b) => {
    if (mode === "flat") {
      return (
        a.displayWhere.localeCompare(b.displayWhere) || a.materialName.localeCompare(b.materialName)
      );
    }
    if (mode === "project") {
      return (
        a.projectName.localeCompare(b.projectName) ||
        a.needByDate.localeCompare(b.needByDate) ||
        a.materialName.localeCompare(b.materialName)
      );
    }
    if (mode === "site") {
      return a.siteName.localeCompare(b.siteName) || a.materialName.localeCompare(b.materialName);
    }
    if (mode === "material") {
      return a.materialName.localeCompare(b.materialName);
    }
    if (mode === "needBy") {
      return a.needByDate.localeCompare(b.needByDate) || a.materialName.localeCompare(b.materialName);
    }
    return 0;
  });

  return sorted;
}

export function buildLastPurchaseRateByMaterial(
  vendorBills: VendorBill[],
  inventoryItems: InventoryItem[],
): Map<number, number> {
  const map = new Map<number, number>();
  const sorted = [...vendorBills].sort((a, b) => b.billDate.localeCompare(a.billDate));
  for (const bill of sorted) {
    for (const line of bill.items) {
      if (line.inventoryItemId != null) {
        if (!map.has(line.inventoryItemId)) {
          map.set(line.inventoryItemId, line.rate);
        }
        continue;
      }
      const label = (line.name || line.description).toLowerCase();
      const inv = inventoryItems.find(
        (i) =>
          (line.name && i.name.toLowerCase() === line.name.toLowerCase()) ||
          label.includes(i.name.toLowerCase().slice(0, 5)) ||
          i.name.toLowerCase().includes(label.slice(0, 4)),
      );
      if (inv && !map.has(inv.id)) {
        map.set(inv.id, line.rate);
      }
    }
  }
  for (const item of inventoryItems) {
    if (!map.has(item.id)) {
      map.set(item.id, item.buyPrice);
    }
  }
  return map;
}

/** Count active sites per project (for “single site → show project name, multi → show site name”). */
export function countActiveSitesByProjectId(sites: SiteRecord[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of sites) {
    if (s.status && s.status !== "active") continue;
    if (!s.projectId) continue;
    m.set(s.projectId, (m.get(s.projectId) ?? 0) + 1);
  }
  return m;
}

export function needToGetLocationLabel(
  row: NeedToGetRow,
  activeSitesPerProject: Map<string, number>,
  projects: Project[],
): string {
  const cnt = activeSitesPerProject.get(row.projectId) ?? 0;
  if (cnt > 1) return row.siteName;
  return projects.find((p) => p.id === row.projectId)?.name ?? row.projectName;
}

export class NeedToGetService {
  buildRows(
    sites: SiteRecord[],
    projects: Project[],
    inventoryItems: InventoryItem[],
    vendorBills: VendorBill[],
  ): NeedToGetRow[] {
    const lastRate = buildLastPurchaseRateByMaterial(vendorBills, inventoryItems);
    const projectById = new Map(projects.map((p) => [p.id, p]));
    const stock = new Map(inventoryItems.map((i) => [i.id, i.stock]));
    const rows: NeedToGetRow[] = [];

    for (const site of sites) {
      if (site.status && site.status !== "active") {
        continue;
      }
      const proj = site.projectId ? projectById.get(site.projectId) : undefined;
      if (site.projectId && proj && proj.status !== "Ongoing") {
        continue;
      }
      if (!site.checklistItems?.length) {
        continue;
      }
      const workStart = site.workStartDate;
      const needBy = workStart
        ? format(subDays(new Date(workStart + "T12:00:00"), 1), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd");

      for (const line of site.checklistItems) {
        if (!line.requiresMaterial || line.inventoryItemId == null || line.requiredQuantity == null) {
          continue;
        }
        const id = line.inventoryItemId;
        const current = stock.get(id) ?? 0;
        const required = line.requiredQuantity;
        const shortfall = Math.max(0, required - current);
        if (shortfall <= 0) {
          continue;
        }
        const inv = inventoryItems.find((i) => i.id === id);
        rows.push({
          projectId: site.projectId || "",
          projectName: site.projectName || proj?.name || "—",
          siteId: site.id,
          siteName: site.name,
          materialId: id,
          materialName: line.materialName || inv?.name || "Material",
          qtyShort: shortfall,
          needByDate: needBy,
          lastPurchaseRate: lastRate.get(id) ?? inv?.buyPrice ?? 0,
        });
      }
    }

    /** BOQ execution variance — quoted vs issued (when execution lines exist). */
    for (const project of projects) {
      const lines = project.executionLineItems ?? [];
      const siteForProject = sites.find((s) => s.projectId === project.id && (!s.status || s.status === "active"));
      for (const line of lines) {
        if (line.inventoryItemId == null) continue;
        const shortfall = Math.max(0, line.quantity - line.issuedQty);
        if (shortfall <= 0) continue;
        const id = line.inventoryItemId;
        const inv = inventoryItems.find((i) => i.id === id);
        rows.push({
          projectId: project.id,
          projectName: project.name,
          siteId: typeof siteForProject?.id === "number" ? siteForProject.id : 0,
          siteName: siteForProject?.name ?? "BOQ / site",
          materialId: id,
          materialName: line.description || inv?.name || "Material",
          qtyShort: shortfall,
          needByDate: format(new Date(), "yyyy-MM-dd"),
          lastPurchaseRate: lastRate.get(id) ?? inv?.buyPrice ?? 0,
        });
      }
    }

    return rows.sort(
      (a, b) => a.needByDate.localeCompare(b.needByDate) || a.projectName.localeCompare(b.projectName),
    );
  }
}
