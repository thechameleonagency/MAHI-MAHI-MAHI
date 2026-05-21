import type { NarrativeApply } from "./shared";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { seedDateAt, seedDayAt } from "../seedTimeModel";
import { panelItem } from "../seedInventoryCatalog";

export const applyNeedToGetDamage: NarrativeApply = (state) => {
  const project = state.projects.find((p) => p.lifecycleStatus === "In Progress" && p.siteChecklist?.length);
  const site = state.sites.find((s) => s.projectId === project?.id);
  const item = panelItem(state.inventoryItems);
  if (!project || !site) return;
  item.stock = Math.max(2, item.minStock - 5);
  state.procurementNeedLines.push({
    id: seedId(SEED_ID_PREFIX.procurement),
    lineKey: `${project.id}|${site.id}|${item.id}|${seedDayAt(0.66)}`,
    projectId: project.id,
    siteId: site.id,
    materialId: item.id,
    materialName: item.name,
    qtyNeeded: 12,
    needByDate: seedDayAt(0.66),
    lastPurchaseRate: item.buyPrice,
    status: "pending",
  });
  state.materialDamageRecords.push({
    id: seedId(SEED_ID_PREFIX.damage),
    itemId: item.id,
    qty: 3,
    stage: "transport",
    projectId: project.id,
    notes: "Corner chip during unloading — need-to-get adjusted",
    costImpact: 4200,
    reportedAt: seedDateAt(0.655),
    reportedBy: "Karthik Rao",
  });
};
