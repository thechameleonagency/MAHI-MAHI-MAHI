import type { NarrativeApply } from "./shared";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { seedDateAt } from "../seedTimeModel";

export const applyChangeRequestApproved: NarrativeApply = (state) => {
  const project = state.projects.find((p) => p.lifecycleStatus === "In Progress");
  if (!project) return;
  state.projectChangeRequests.push({
    id: seedId(SEED_ID_PREFIX.changeRequest),
    projectId: project.id,
    type: "capacity",
    deltaKw: 2,
    deltaAmount: 95000,
    status: "approved",
    requestedAt: seedDateAt(0.52),
    approvedAt: seedDateAt(0.53),
    notes: "Client added 2kW after subsidy revision",
  });
};
