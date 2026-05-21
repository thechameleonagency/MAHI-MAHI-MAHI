import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import {
  applyTaskCompletionToTimeline,
  findStaleProgressReportTaskLinkage,
  isPhotoCaptureTask,
  reconcileProgressReportTaskLinkage,
  resolveWorkStageKeyFromTask,
} from "@/lib/progressReportTaskContinuity";
import type { Task } from "@/types/project";

describe("progressReportTaskContinuity (ER9)", () => {
  it("hydrated smoke seed has no stale progress-report task linkage", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    const stale = findStaleProgressReportTaskLinkage(hydrated);
    expect(stale, stale.map((s) => `${s.projectId}:${s.stageKey}:${s.reason}`).join("; ")).toEqual([]);
  });

  it("resolves work stage from milestoneId and photo task prefix", () => {
    const task: Task = {
      id: "TASK-1",
      projectId: "P1",
      siteId: "S1",
      siteName: "Site",
      workType: "Site photos: Structure",
      workTag: "structure",
      milestoneId: "structure",
      notes: "",
      createdDate: "2026-05-01",
      workDate: "2026-05-01",
      status: "sent",
      createdBy: "Admin",
    };
    expect(isPhotoCaptureTask(task)).toBe(true);
    expect(resolveWorkStageKeyFromTask(task)).toBe("structure");
  });

  it("photo task completion moves timeline approval to requested with linkedTaskId", () => {
    const task: Task = {
      id: "TASK-PHOTO",
      projectId: "P1",
      siteId: "S1",
      siteName: "Site",
      workType: "Site photos: Panel",
      workTag: "panel",
      milestoneId: "panel",
      notes: "",
      createdDate: "2026-05-01",
      workDate: "2026-05-01",
      status: "done",
      createdBy: "Admin",
    };
    const patch = applyTaskCompletionToTimeline(task, {
      P1: {
        projectId: "P1",
        fileLogin: "pending",
        subsidyType: "",
        bankFileType: "",
        loanStage: "",
        loanStatus: "",
        workStatusChecks: [],
        discomChecks: [],
        discomSubsidyStatus: "",
        paymentType: "",
        updatedAt: "2026-05-01",
        workStatusApprovals: {
          panel: { status: "pending", linkedTaskId: "TASK-PHOTO" },
        },
      },
    });
    expect(patch?.projectTimelineByProjectId.P1.workStatusApprovals?.panel.status).toBe("requested");
    expect(patch?.projectTimelineByProjectId.P1.workStatusApprovals?.panel.linkedTaskId).toBe("TASK-PHOTO");
  });

  it("reconcile derives photoCount from photoUrls and clears fake closed-without-media", () => {
    const { state } = buildBusinessSeed("smoke");
    const project = state.projects[0];
    const broken = {
      ...state,
      projectTimelineByProjectId: {
        ...state.projectTimelineByProjectId,
        [project.id]: {
          ...(state.projectTimelineByProjectId[project.id] ?? {
            projectId: project.id,
            fileLogin: "pending",
            subsidyType: "",
            bankFileType: "",
            loanStage: "",
            loanStatus: "",
            workStatusChecks: [],
            discomChecks: [],
            discomSubsidyStatus: "",
            paymentType: "",
            updatedAt: "2026-05-01",
          }),
          workStatusApprovals: {
            wiring: {
              status: "closed",
              photoCount: 3,
            },
          },
        },
      },
    };
    const fixed = reconcileProgressReportTaskLinkage(broken);
    const approval = fixed.projectTimelineByProjectId[project.id]?.workStatusApprovals?.wiring;
    expect(approval?.status).toBe("requested");
    expect(approval?.photoCount).toBe(0);
    expect(findStaleProgressReportTaskLinkage(fixed)).toEqual([]);
  });

  it("full seed verification passes ER9 checks", () => {
    const { verification } = buildBusinessSeed("full");
    const er9 = verification.errors.filter((e) => e.startsWith("ER9:"));
    expect(er9).toEqual([]);
  });
});
