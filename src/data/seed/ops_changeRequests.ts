import type { AppState } from "@/contexts/AppDataContext";
import type { SeedProfile } from "./seedLayerOrder";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDateAt } from "./seedTimeModel";
import { getMinimumFor } from "./seedVolumeTargets";

/** Supplement projectChangeRequests to §4 minimum (10–15). */
export function buildOpsChangeRequests(state: AppState, profile: SeedProfile): AppState {
  const target = getMinimumFor(profile, "projectChangeRequests");
  const types = ["capacity", "panels", "addon-work"] as const;
  const statuses = ["draft", "approved", "rejected"] as const;
  let i = 0;
  while (state.projectChangeRequests.length < target) {
    const project = state.projects.filter((p) => p.lifecycleStatus === "In Progress")[i % 10];
    if (!project) break;
    state.projectChangeRequests.push({
      id: seedId(SEED_ID_PREFIX.changeRequest),
      projectId: project.id,
      type: types[i % 3],
      deltaKw: types[i % 3] === "capacity" ? 1 : undefined,
      deltaPanels: types[i % 3] === "panels" ? 2 : undefined,
      deltaAmount: 18000 + i * 2000,
      status: statuses[i % 3],
      requestedAt: seedDateAt(0.58 + i * 0.004),
      approvedAt: statuses[i % 3] === "approved" ? seedDateAt(0.59 + i * 0.004) : undefined,
      notes: "Ops supplement change request",
    });
    i++;
  }
  return state;
}
