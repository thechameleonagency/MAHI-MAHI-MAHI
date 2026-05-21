import type { NarrativeApply } from "./shared";
import { seedDateAt } from "../seedTimeModel";

export const applyWorkStatusApprovalPending: NarrativeApply = (state) => {
  const project = state.projects.find((p) => p.lifecycleStatus === "In Progress");
  if (!project) return;
  const tl = state.projectTimelineByProjectId[project.id] ?? { projectId: project.id, fileLogin: "complete", subsidyType: "not-applicable", bankFileType: "cash", loanStage: "", loanStatus: "", workStatusChecks: ["inverter"], discomChecks: [], discomSubsidyStatus: "", paymentType: "cash-to-mahi", updatedAt: seedDateAt(0.6) };
  tl.workStatusApprovals = {
    ...tl.workStatusApprovals,
    inverter: {
      status: "requested",
      requestedAt: seedDateAt(0.59),
      requestedBy: "INST-001",
      requestedByName: "Karthik Rao",
      videoCount: 0,
    },
  };
  state.projectTimelineByProjectId[project.id] = tl;
};
