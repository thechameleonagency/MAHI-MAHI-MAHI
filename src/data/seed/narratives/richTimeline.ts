import type { NarrativeApply } from "./shared";
import { seedDateAt } from "../seedTimeModel";

export const applyRichTimeline: NarrativeApply = (state) => {
  const ids = state.projects.filter((p) => p.projectKind === "SOLO_EPC" || p.projectKind === "PARTNER_EPC").slice(0, 3);
  for (const p of ids) {
    state.projectTimelineByProjectId[p.id] = {
      projectId: p.id,
      fileLogin: "complete",
      fileLoginComplete: true,
      subsidyType: "both",
      bankFileType: "cash-and-loan",
      loanStage: "loan-apply",
      loanStatus: "approved",
      workStatusChecks: ["structure", "panel", "wiring", "inverter"],
      workStatusApprovals: {
        inverter: { status: "approved", approvedAt: seedDateAt(0.5), approvedByName: "Anita Deshmukh", videoCount: 1 },
        structure: {
          status: "closed",
          photoCount: 1,
          photoUrls: [
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='48'%3E%3Crect fill='%23e2e8f0' width='64' height='48'/%3E%3Ctext x='8' y='28' font-size='10' fill='%2364748b'%3ESeed%3C/text%3E%3C/svg%3E",
          ],
          updatedBy: "admin-001",
          updatedByName: "Anita Deshmukh",
          approvedAt: seedDateAt(0.45),
          approvedByName: "Anita Deshmukh",
        },
      },
      discomChecks: ["meter-file-submit", "net-metering"],
      discomSubsidyStatus: "approved",
      paymentType: "instalments",
      firstInstallmentPaid: true,
      secondInstallmentPaid: false,
      dcrStatus: "submitted",
      dcrComplete: false,
      updatedAt: seedDateAt(0.55),
    };
  }
};
