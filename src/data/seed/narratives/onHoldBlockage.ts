import type { NarrativeApply } from "./shared";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { seedDateAt, seedDayAt } from "../seedTimeModel";

export const applyOnHoldBlockage: NarrativeApply = (state) => {
  const project = state.projects.find((p) => p.lifecycleStatus === "On Hold");
  if (!project) return;
  if (state.blockages.some((b) => b.projectId === project.id && b.status === "active")) return;
  state.blockages.push({
    id: seedId(SEED_ID_PREFIX.blockage),
    projectId: project.id,
    title: "DISCOM meter file pending",
    reason: "Client yet to submit property tax receipt for net metering",
    status: "active",
    projectStage: "work-in-progress",
    timelineStage: "discom",
    timelineSubStage: "meter-file",
    createdAt: seedDateAt(0.35),
    startDate: seedDayAt(0.3),
  });
};
