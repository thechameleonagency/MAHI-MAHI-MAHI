import type { NarrativeApply } from "./shared";
import { seedDateAt } from "../seedTimeModel";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { PHOTO_CAPTURE_TASK_PREFIX } from "@/lib/progressReportTaskContinuity";

const SEED_PHOTO_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='48'%3E%3Crect fill='%23e2e8f0' width='64' height='48'/%3E%3Ctext x='8' y='28' font-size='10' fill='%2364748b'%3ESeed%3C/text%3E%3C/svg%3E";

const SEED_VIDEO_SVG =
  "data:video/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='48'%3E%3Crect fill='%23e2e8f0' width='64' height='48'/%3E%3Ctext x='8' y='28' font-size='10' fill='%2364748b'%3EVid%3C/text%3E%3C/svg%3E";

export const applyRichTimeline: NarrativeApply = (state) => {
  const ids = state.projects.filter((p) => p.projectKind === "SOLO_EPC" || p.projectKind === "PARTNER_EPC").slice(0, 3);
  const installer =
    state.employees.find((e) => e.role.toLowerCase().includes("install")) ?? state.employees[0];
  const siteByProject = new Map(state.sites.filter((s) => s.projectId).map((s) => [s.projectId!, s]));

  for (const p of ids) {
    const site = siteByProject.get(p.id);
    const structureTaskId = seedId(SEED_ID_PREFIX.task);
    const inverterTaskId = seedId(SEED_ID_PREFIX.task);
    const today = seedDateAt(0.5).slice(0, 10);

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
        inverter: {
          status: "approved",
          approvedAt: seedDateAt(0.5),
          approvedByName: "Anita Deshmukh",
          videoCount: 1,
          videoUrls: [SEED_VIDEO_SVG],
          linkedTaskId: inverterTaskId,
        },
        structure: {
          status: "closed",
          photoCount: 1,
          photoUrls: [SEED_PHOTO_SVG],
          updatedBy: "admin-001",
          updatedByName: "Anita Deshmukh",
          approvedAt: seedDateAt(0.45),
          approvedByName: "Anita Deshmukh",
          linkedTaskId: structureTaskId,
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

    if (site && installer) {
      state.tasks.push(
        {
          id: structureTaskId,
          employeeId: installer.id,
          projectId: p.id,
          siteId: site.id,
          siteName: site.name,
          workType: `${PHOTO_CAPTURE_TASK_PREFIX} Structure`,
          workTag: "structure",
          milestoneId: "structure",
          notes: `Photo task ${structureTaskId} — seed structure completion`,
          createdDate: today,
          workDate: today,
          status: "done",
          createdBy: "Anita Deshmukh",
          workItems: [{ stageKey: "structure", stageName: "Structure", subItems: [] }],
        },
        {
          id: inverterTaskId,
          employeeId: installer.id,
          projectId: p.id,
          siteId: site.id,
          siteName: site.name,
          workType: `${PHOTO_CAPTURE_TASK_PREFIX} Inverter`,
          workTag: "inverter",
          milestoneId: "inverter",
          notes: `Photo task ${inverterTaskId} — seed inverter video`,
          createdDate: today,
          workDate: today,
          status: "done",
          createdBy: "Anita Deshmukh",
          workItems: [{ stageKey: "inverter", stageName: "Inverter", subItems: [] }],
        },
      );
    }
  }
};
