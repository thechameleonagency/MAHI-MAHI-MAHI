import type { AppState } from "@/contexts/AppDataContext";
import type { SeedProfile } from "./seedLayerOrder";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDayAt } from "./seedTimeModel";
import { getMinimumFor } from "./seedVolumeTargets";

/** Supplement procurementNeedLines to §4 minimum (30–50). */
export function buildOpsProcurementNeedLines(state: AppState, profile: SeedProfile): AppState {
  const target = getMinimumFor(profile, "procurementNeedLines");
  let i = 0;
  while (state.procurementNeedLines.length < target) {
    const project = state.projects.filter((p) => p.lifecycleStatus === "In Progress")[i % 12];
    const site = project ? state.sites.find((s) => s.projectId === project.id) : undefined;
    const item = state.inventoryItems[i % state.inventoryItems.length];
    const vendor = state.vendors[i % state.vendors.length];
    if (!project || !site || !item) break;
    const needBy = seedDayAt(0.66 + i * 0.004);
    state.procurementNeedLines.push({
      id: seedId(SEED_ID_PREFIX.procurement),
      lineKey: `${project.id}|${site.id}|${item.id}|${needBy}`,
      projectId: project.id,
      siteId: site.id,
      materialId: item.id,
      materialName: item.name,
      qtyNeeded: 3 + (i % 6),
      needByDate: needBy,
      lastPurchaseRate: item.buyPrice,
      vendorId: vendor?.id,
      status: i % 3 === 0 ? "acquired" : "pending",
      acquiredAt: i % 3 === 0 ? seedDayAt(0.7 + i * 0.004) : undefined,
      acquiredQty: i % 3 === 0 ? 3 + (i % 6) : undefined,
      acquiredRate: item.buyPrice,
    });
    i++;
  }
  return state;
}
