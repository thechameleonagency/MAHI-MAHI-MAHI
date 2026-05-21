import type { NarrativeApply } from "./shared";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { seedDateAt } from "../seedTimeModel";
import { applyChangeRequestToProject } from "@/lib/changeRequestApproval";

export const applyChangeRequestApproved: NarrativeApply = (state) => {
  const project = state.projects.find((p) => p.lifecycleStatus === "In Progress" && p.customerId);
  if (!project) return;
  const cr = {
    id: seedId(SEED_ID_PREFIX.changeRequest),
    projectId: project.id,
    type: "capacity" as const,
    deltaKw: 2,
    deltaAmount: 95000,
    status: "approved" as const,
    requestedAt: seedDateAt(0.52),
    approvedAt: seedDateAt(0.53),
    notes: "Client added 2kW after subsidy revision",
  };
  const inventoryLookup = state.inventoryItems.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
  }));
  const { projectPatch, deltaAmount } = applyChangeRequestToProject(project, cr, inventoryLookup);
  Object.assign(project, projectPatch);
  state.projectChangeRequests.push({ ...cr, deltaAmount: deltaAmount || cr.deltaAmount });
};
