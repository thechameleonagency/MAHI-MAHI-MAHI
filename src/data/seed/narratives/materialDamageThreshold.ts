import type { NarrativeApply } from "./shared";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { seedDateAt } from "../seedTimeModel";
import { panelItem } from "../seedInventoryCatalog";

export const applyMaterialDamageThreshold: NarrativeApply = (state) => {
  const project = state.projects.find((p) => p.lifecycleStatus === "In Progress");
  const item = panelItem(state.inventoryItems);
  if (!project) return;
  state.materialDamageRecords.push({
    id: seedId(SEED_ID_PREFIX.damage),
    itemId: item.id,
    qty: 8,
    stage: "installation",
    projectId: project.id,
    notes: "Eight modules cracked during lifting — replacement PO raised per vendor SLA",
    costImpact: 116000,
    reportedAt: seedDateAt(0.64),
    reportedBy: "Karthik Rao",
  });
};
