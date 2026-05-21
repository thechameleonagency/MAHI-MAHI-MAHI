import type { NarrativeApply } from "./shared";

export const applyDirectExceptionProject: NarrativeApply = (state) => {
  const p = state.projects.find((x) =>
    x.directCreationReason?.includes("Urgent hospital backup power"),
  );
  if (p) {
    p.quotationId = undefined;
    p.lifecycleStatus = "In Progress";
    p.progressStage = "work-in-progress";
    p.executionPhase = "Panel installation";
  }
};
