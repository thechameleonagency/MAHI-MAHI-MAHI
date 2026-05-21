import type { AppState } from "@/contexts/AppDataContext";

export type StaleProcurementNeedLine = {
  lineKey: string;
  reason: "acquired_without_vendor_bill" | "missing_project" | "missing_site";
};

/** Procurement need lines must stay consistent with acquire → vendor bill flow (FC9). */
export function findStaleProcurementNeedLines(state: AppState): StaleProcurementNeedLine[] {
  const stale: StaleProcurementNeedLine[] = [];
  const projectIds = new Set(state.projects.map((p) => p.id));
  const siteIds = new Set(state.sites.map((s) => String(s.id)));

  for (const line of state.procurementNeedLines ?? []) {
    if (!projectIds.has(line.projectId)) {
      stale.push({ lineKey: line.lineKey, reason: "missing_project" });
      continue;
    }
    if (!siteIds.has(String(line.siteId))) {
      stale.push({ lineKey: line.lineKey, reason: "missing_site" });
      continue;
    }
    if (line.status === "acquired" && !line.vendorBillId) {
      stale.push({ lineKey: line.lineKey, reason: "acquired_without_vendor_bill" });
    }
  }
  return stale;
}
