import type { NarrativeApply } from "./shared";
import { pushAudit } from "../seedHelpers";
import { seedDateAt } from "../seedTimeModel";

export const applyClosedProjectReopen: NarrativeApply = (state) => {
  const closed = state.projects.find((p) => p.lifecycleStatus === "Closed") ?? state.projects.find((p) => p.edgeTag === "closed-reopen");
  if (!closed) {
    const p = state.projects.find((x) => x.lifecycleStatus === "Completed");
    if (p) {
      p.lifecycleStatus = "Closed";
      p.endDate = "2026-04-20";
    }
  }
  const target = state.projects.find((p) => p.lifecycleStatus === "Closed");
  if (!target) return;
  target.lifecycleStatus = "In Progress";
  target.status = "In Progress";
  target.executionNotes = "Reopened by super_admin — warranty callback for inverter fault";
  pushAudit(state, {
    action: "update",
    entityType: "Project",
    entityId: target.id,
    entityName: target.name,
    fraction: 0.86,
    role: "super_admin",
    field: "project:update_execution",
    oldValue: "Closed",
    newValue: "In Progress",
  });
  target.startedAt = seedDateAt(0.86);
};
