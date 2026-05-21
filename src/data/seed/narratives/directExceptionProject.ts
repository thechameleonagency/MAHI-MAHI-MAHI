import type { NarrativeApply } from "./shared";

export const applyDirectExceptionProject: NarrativeApply = (state) => {
  const p = state.projects.find((x) => x.directCreationReason && x.directCreationReason.length >= 10);
  if (p) {
    p.quotationId = undefined;
    p.lifecycleStatus = "In Progress";
  }
};
