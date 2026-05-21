import type { NarrativeApply } from "./shared";
import { seedDayAt } from "../seedTimeModel";

/** FC7 — direct-exception project completes so customer auto-archive can run on hydrate. */
export const applyDirectExceptionProjectComplete: NarrativeApply = (state) => {
  const project = state.projects.find((p) =>
    p.directCreationReason?.includes("Urgent hospital backup power"),
  );
  if (!project?.customerId) return;
  project.lifecycleStatus = "Completed";
  project.status = "Completed";
  project.endDate = seedDayAt(0.75);

  const customerId = project.customerId;
  for (const q of state.quotations) {
    if (q.customerId === customerId && ["draft", "sent", "approved"].includes(q.status)) {
      q.status = "converted_to_project";
    }
  }
  for (const e of state.enquiries) {
    if (e.customerId !== customerId) continue;
    if (["new", "meeting_scheduled", "quotation_sent", "quotation_rejected"].includes(e.status)) {
      e.status = "converted";
    }
  }
};
