import type { NarrativeApply } from "./shared";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { seedDateAt } from "../seedTimeModel";
import { panelItem } from "../seedInventoryCatalog";
import { resolveProcurementNeedByDate } from "@/lib/procurementNeedByDate";
import { syncSitesChecklistFromProjects } from "@/lib/siteChecklistNeedToGetSync";

export const applyNeedToGetDamage: NarrativeApply = (state) => {
  const project = state.projects.find((p) => p.lifecycleStatus === "In Progress" && p.siteChecklist?.length);
  const site = state.sites.find((s) => s.projectId === project?.id);
  const item = panelItem(state.inventoryItems);
  if (!project || !site) return;
  item.stock = Math.max(2, item.minStock - 5);
  const needBy = resolveProcurementNeedByDate({
    workStartDate: site.workStartDate,
    projectStartDate: project.startDate,
  });
  state.sites = syncSitesChecklistFromProjects(
    state.projects,
    state.sites,
    state.inventoryItems,
    [project.id],
  );
  state.procurementNeedLines.push({
    id: seedId(SEED_ID_PREFIX.procurement),
    lineKey: `${project.id}|${site.id}|${item.id}|${needBy}`,
    projectId: project.id,
    siteId: site.id,
    materialId: item.id,
    materialName: item.name,
    qtyNeeded: 12,
    needByDate: needBy,
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
