import { format } from "date-fns";
import { canonicalizeProjectLifecycleStatus } from "@/domain/stateMachines/projectStateMachine";
import {
  attributeDamageToShortfall,
  buildDamageQtyIndex,
} from "@/lib/needToGetDamageAttribution";
import { resolveProcurementNeedByDate } from "@/lib/procurementNeedByDate";
import type { VendorBill } from "@/types/inventory";
import type { InventoryItem, Project, SiteRecord } from "@/types/project";
import type { MaterialDamage, MaterialReservation } from "@/types/operations";

export type NeedToGetRowKind = "material" | "nonMaterial";

export type NeedToGetRow = {
  projectId: string;
  projectName: string;
  siteId: string;
  siteName: string;
  materialId: string;
  materialName: string;
  qtyShort: number;
  needByDate: string;
  lastPurchaseRate: number;
  /** Material shortfall vs checklist-only / status line (no warehouse SKU). */
  rowKind?: NeedToGetRowKind;
  /** Warehouse damage write-offs widened this stock-based shortfall. */
  shortfallIncludesDamage?: boolean;
  /** Damaged qty attributed to this row (project-scoped when reported). */
  damageQtyAttributed?: number;
};

function checklistNonMaterialRowId(siteId: string, lineId: string): string {
  return `nm:${siteId}:${lineId}`;
}

/** How the Need-to-Get table groups and merges lines (see `aggregateNeedToGetRows`). */
export type NeedToGetGroupMode = "flat" | "project" | "material";

/** Prototype group modes exposed in the UI (site / need-by removed — use flat + filters). */
export const NEED_TO_GET_GROUP_MODES: readonly NeedToGetGroupMode[] = ["flat", "project", "material"];

/** Map removed legacy modes from bookmarks or old builds to a supported mode. */
export function normalizeNeedToGetGroupMode(value: string | null | undefined): NeedToGetGroupMode {
  if (value === "project" || value === "material") return value;
  if (value === "site" || value === "needBy") return value === "needBy" ? "material" : "flat";
  return "flat";
}

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
    case "material":
      return String(r.materialId);
  }
}

/** Build a readable “Where” label for merged rows (deduped location labels, capped length). */
function safeStr(value: string | undefined | null): string {
  return value ?? "";
}

function buildMergedWhereLabel(
  _mode: NeedToGetGroupMode,
  members: NeedToGetRow[],
  getLocationLabel: (r: NeedToGetRow) => string,
): string {
  const labels = [...new Set(members.map((m) => getLocationLabel(m)))].sort((a, b) =>
    safeStr(a).localeCompare(safeStr(b)),
  );
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
 * - **material** — single total per material in the filter (earliest need-by when dates differ).
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
        safeStr(a.needByDate).localeCompare(safeStr(b.needByDate)) ||
        safeStr(a.projectName).localeCompare(safeStr(b.projectName)) ||
        safeStr(a.siteName).localeCompare(safeStr(b.siteName)),
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
    const damageMembers = members.filter((m) => m.shortfallIncludesDamage);
    const shortfallIncludesDamage = damageMembers.length > 0;
    const damageQtyAttributed = shortfallIncludesDamage
      ? damageMembers.reduce((s, m) => s + (m.damageQtyAttributed ?? 0), 0)
      : undefined;

    out.push({
      ...base,
      materialName,
      qtyShort: qtySum,
      needByDate: needBy,
      lastPurchaseRate: rate,
      displayWhere,
      mergedCount: mergedCount > 1 ? mergedCount : undefined,
      shortfallIncludesDamage: shortfallIncludesDamage || undefined,
      damageQtyAttributed,
    });
  }

  const sorted = [...out].sort((a, b) => {
    if (mode === "flat") {
      return (
        safeStr(a.displayWhere).localeCompare(safeStr(b.displayWhere)) ||
        safeStr(a.materialName).localeCompare(safeStr(b.materialName))
      );
    }
    if (mode === "project") {
      return (
        safeStr(a.projectName).localeCompare(safeStr(b.projectName)) ||
        safeStr(a.needByDate).localeCompare(safeStr(b.needByDate)) ||
        safeStr(a.materialName).localeCompare(safeStr(b.materialName))
      );
    }
    return safeStr(a.materialName).localeCompare(safeStr(b.materialName));
  });

  return sorted;
}

/** UI labels for aggregation modes (paired with `aggregateNeedToGetRows`). */
export const NEED_TO_GET_GROUP_LABELS: Record<NeedToGetGroupMode, string> = {
  flat: "Flat list",
  project: "By project",
  material: "By material",
};

/** How rows merge for each mode — shown in tooltips and the group-mode picker. */
export const NEED_TO_GET_MERGE_HINT: Record<NeedToGetGroupMode, string> = {
  flat:
    "One row per site, material, and need-by date. Use project/site filters to narrow; multi-site projects show the site in Where.",
  project:
    "Combines rows inside each project when material and need-by date match (multiple sites roll into one line per project).",
  material:
    "Totals each material across the current filter. Need-by shows the earliest date among merged lines.",
};

export type NeedToGetMergeStats = {
  rawLineCount: number;
  mergedRowCount: number;
  /** Raw shortfall lines folded away by aggregation (raw − merged rows). */
  linesMergedAway: number;
  /** Display rows that combined 2+ raw lines inside one bucket. */
  rowsWithInternalMerge: number;
};

export function summarizeNeedToGetMerge(
  rawLineCount: number,
  displayRows: NeedToGetViewRow[],
): NeedToGetMergeStats {
  const mergedRowCount = displayRows.length;
  const linesMergedAway = Math.max(0, rawLineCount - mergedRowCount);
  const rowsWithInternalMerge = displayRows.filter((r) => (r.mergedCount ?? 1) > 1).length;
  return { rawLineCount, mergedRowCount, linesMergedAway, rowsWithInternalMerge };
}

/** One-line summary for the active group mode and current filter. */
export function formatNeedToGetMergeSummary(
  stats: NeedToGetMergeStats,
  mode: NeedToGetGroupMode,
): string {
  const modeLabel = NEED_TO_GET_GROUP_LABELS[mode];
  if (stats.rawLineCount === 0) {
    return `No shortfall lines under current filters (${modeLabel}).`;
  }
  if (stats.linesMergedAway === 0) {
    return `${stats.mergedRowCount} row${stats.mergedRowCount === 1 ? "" : "s"} — no lines combined (${modeLabel}).`;
  }
  const combined = stats.linesMergedAway === 1 ? "line" : "lines";
  return `${stats.rawLineCount} shortfall lines → ${stats.mergedRowCount} rows (${stats.linesMergedAway} ${combined} combined · ${modeLabel})`;
}

export function buildLastPurchaseRateByMaterial(
  vendorBills: VendorBill[],
  inventoryItems: InventoryItem[],
): Map<string, number> {
  const map = new Map<string, number>();
  const sorted = [...vendorBills].sort((a, b) =>
    (b.billDate ?? "").localeCompare(a.billDate ?? ""),
  );
  for (const bill of sorted) {
    for (const line of bill.items ?? []) {
      if (line.inventoryItemId != null) {
        const key = String(line.inventoryItemId);
        if (!map.has(key)) {
          map.set(key, line.rate);
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
      if (inv && !map.has(String(inv.id))) {
        map.set(String(inv.id), line.rate);
      }
    }
  }
  for (const item of inventoryItems) {
    const key = String(item.id);
    if (!map.has(key)) {
      map.set(key, item.buyPrice);
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
    materialReservations: MaterialReservation[],
    materialDamageRecords: MaterialDamage[] = [],
  ): NeedToGetRow[] {
    const lastRate = buildLastPurchaseRateByMaterial(vendorBills, inventoryItems);
    const projectById = new Map(projects.map((p) => [p.id, p]));
    const stock = new Map(inventoryItems.map((i) => [String(i.id), i.stock]));
    const rows: NeedToGetRow[] = [];
    const damageIndex = buildDamageQtyIndex(materialDamageRecords);

    const activeReservations = materialReservations.filter((r) => !r.releasedAt);
    const effectiveStockFor = (itemId: string, requestingProjectId: string): number => {
      const base = stock.get(itemId) ?? 0;
      const reserved = activeReservations
        .filter(
          (r) =>
            String(r.itemId) === itemId &&
            (r.projectId === undefined || r.projectId !== requestingProjectId),
        )
        .reduce((s, r) => s + r.qty, 0);
      return Math.max(0, base - reserved);
    };

    for (const site of sites) {
      if (site.status && site.status !== "active") {
        continue;
      }
      const proj = site.projectId ? projectById.get(site.projectId) : undefined;
      if (site.projectId && proj) {
        const lifecycle = canonicalizeProjectLifecycleStatus(proj.lifecycleStatus ?? proj.status);
        if (lifecycle === "Completed" || lifecycle === "Closed") {
          continue;
        }
      }
      if (!site.checklistItems?.length) {
        continue;
      }
      const needBy = resolveProcurementNeedByDate({
        workStartDate: site.workStartDate,
        projectStartDate: proj?.startDate,
      });

      for (const line of site.checklistItems) {
        if (!line.requiresMaterial || line.inventoryItemId == null || line.requiredQuantity == null) {
          continue;
        }
        const id = String(line.inventoryItemId);
        const current = effectiveStockFor(id, site.projectId || "");
        const required = line.requiredQuantity;
        const shortfall = Math.max(0, required - current);
        if (shortfall <= 0) {
          continue;
        }
        const inv = inventoryItems.find((i) => String(i.id) === id);
        const totalDamageQty = damageIndex.totalByItem.get(id) ?? 0;
        const projectDamageQty =
          damageIndex.projectByItem.get(id)?.get(site.projectId || "") ?? 0;
        const damageAttribution = attributeDamageToShortfall({
          requiredQty: required,
          effectiveStock: current,
          totalDamageQty,
          projectDamageQty,
        });
        rows.push({
          projectId: site.projectId || "",
          projectName: site.projectName || proj?.name || "—",
          siteId: String(site.id),
          siteName: site.name,
          materialId: id,
          materialName: line.materialName || inv?.name || "Material",
          qtyShort: shortfall,
          needByDate: needBy,
          lastPurchaseRate: lastRate.get(id) ?? inv?.buyPrice ?? 0,
          rowKind: "material",
          shortfallIncludesDamage: damageAttribution.shortfallIncludesDamage || undefined,
          damageQtyAttributed: damageAttribution.shortfallIncludesDamage
            ? damageAttribution.damageQtyAttributed
            : undefined,
        });
      }

      for (const line of site.checklistItems) {
        if (line.requiresMaterial) continue;
        if (line.status === "dispatched") continue;
        const label = line.materialName?.trim();
        if (!label) continue;
        const synId = checklistNonMaterialRowId(String(site.id), line.id);
        rows.push({
          projectId: site.projectId || "",
          projectName: site.projectName || proj?.name || "—",
          siteId: String(site.id),
          siteName: site.name,
          materialId: synId,
          materialName: label,
          qtyShort: 1,
          needByDate: needBy,
          lastPurchaseRate: 0,
          rowKind: "nonMaterial",
        });
      }
    }

    for (const project of projects) {
      const lines = project.executionLineItems ?? [];
      const siteForProject = sites.find((s) => s.projectId === project.id && (!s.status || s.status === "active"));
      const boqNeedBy = resolveProcurementNeedByDate({
        workStartDate: siteForProject?.workStartDate,
        projectStartDate: project.startDate,
      });
      for (const line of lines) {
        if (line.inventoryItemId == null) continue;
        const shortfall = Math.max(0, line.quantity - line.issuedQty);
        if (shortfall <= 0) continue;
        const id = String(line.inventoryItemId);
        const inv = inventoryItems.find((i) => String(i.id) === id);
        rows.push({
          projectId: project.id,
          projectName: project.name,
          siteId: siteForProject ? String(siteForProject.id) : "",
          siteName: siteForProject?.name ?? "BOQ / site",
          materialId: id,
          materialName: line.description || inv?.name || "Material",
          qtyShort: shortfall,
          needByDate: boqNeedBy,
          lastPurchaseRate: lastRate.get(id) ?? inv?.buyPrice ?? 0,
          rowKind: "material",
        });
      }
    }

    return rows.sort(
      (a, b) =>
        safeStr(a.needByDate).localeCompare(safeStr(b.needByDate)) ||
        safeStr(a.projectName).localeCompare(safeStr(b.projectName)),
    );
  }
}
