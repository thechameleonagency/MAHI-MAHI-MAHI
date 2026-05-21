import type { NarrativeApply } from "./shared";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { seedDateAt } from "../seedTimeModel";

export const applyChangeRequestRejected: NarrativeApply = (state) => {
  const project = state.projects.find((p) => p.lifecycleStatus === "In Progress" && p.projectKind === "PARTNER_EPC");
  if (!project) return;
  state.projectChangeRequests.push({
    id: seedId(SEED_ID_PREFIX.changeRequest),
    projectId: project.id,
    type: "addon-work",
    deltaAmount: 45000,
    status: "rejected",
    requestedAt: seedDateAt(0.54),
    notes: "Client declined addon civil work cost",
  });
};
