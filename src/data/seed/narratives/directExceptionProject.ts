import type { NarrativeApply } from "./shared";
import { seedDateAt } from "../seedTimeModel";

export const applyDirectExceptionProject: NarrativeApply = (state) => {
  const p = state.projects.find((x) =>
    x.directCreationReason?.includes("Urgent hospital backup power"),
  );
  if (p) {
    p.quotationId = undefined;
    p.lifecycleStatus = "In Progress";
    p.progressStage = "work-in-progress";
    p.executionPhase = "Panel installation";
    p.startedAt = p.startedAt ?? seedDateAt(0.72);
    p.status = "Ongoing";
  }
};
