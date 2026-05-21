import type { NarrativeApply } from "./shared";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { seedDateAt, seedDayAt } from "../seedTimeModel";

/** Active blockage >14 days for blockage_stale alert. */
export const applyStaleBlockage: NarrativeApply = (state) => {
  const project = state.projects.find((p) => p.lifecycleStatus === "On Hold") ?? state.projects.find((p) => p.lifecycleStatus === "In Progress");
  if (!project) return;
  state.blockages.push({
    id: seedId(SEED_ID_PREFIX.blockage),
    projectId: project.id,
    title: "Client payment delay blocking DISCOM file",
    reason: "Second installment pending for 18 days",
    status: "active",
    projectStage: "work-in-progress",
    timelineStage: "payment",
    timelineSubStage: "client-delay",
    createdAt: seedDateAt(0.25),
    startDate: seedDayAt(0.2),
  });
};
