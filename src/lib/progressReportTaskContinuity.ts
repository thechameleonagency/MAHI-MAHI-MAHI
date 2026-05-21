import type { AppState } from "@/contexts/AppDataContext";
import {
  WORK_STATUS_STAGES,
  type ProjectTimelineStatus,
  type WorkStatusApprovalInfo,
  type WorkStatusSubItemApproval,
} from "@/types/blockage";
import type { Task } from "@/types/project";

export const PHOTO_CAPTURE_TASK_PREFIX = "Site photos:";

const MAIN_STAGE_KEYS = new Set(WORK_STATUS_STAGES.map((s) => s.value));

export type StaleProgressReportTaskLinkage = {
  projectId: string;
  stageKey?: string;
  taskId?: string;
  reason:
    | "media_count_drift"
    | "closed_without_media"
    | "orphan_linked_task"
    | "pending_without_photo_task"
    | "task_project_mismatch"
    | "task_site_mismatch";
};

export function isPhotoCaptureTask(task: Task): boolean {
  return task.workType.startsWith(PHOTO_CAPTURE_TASK_PREFIX);
}

/** Resolve main work-stage key (structure, panel, …) from task linkage fields. */
export function resolveWorkStageKeyFromTask(task: Task): string | undefined {
  const fromMilestone = task.milestoneId?.trim();
  if (fromMilestone) {
    if (MAIN_STAGE_KEYS.has(fromMilestone)) return fromMilestone;
    const prefix = fromMilestone.split("-")[0];
    if (MAIN_STAGE_KEYS.has(prefix)) return prefix;
  }

  const tag = task.workTag?.trim();
  if (tag && MAIN_STAGE_KEYS.has(tag)) return tag;

  const wt = task.workType.toLowerCase();
  for (const stage of WORK_STATUS_STAGES) {
    if (wt === stage.value || wt.includes(stage.label.toLowerCase())) {
      return stage.value;
    }
  }
  return undefined;
}

export function parsePhotoTaskIdFromNotes(notes: string | undefined): string | undefined {
  if (!notes) return undefined;
  const match = notes.match(/Photo task ([A-Za-z0-9-]+)/);
  return match?.[1];
}

function isAdminOverrideApproval(approval: WorkStatusApprovalInfo): boolean {
  return Boolean(approval.notes?.includes("Admin override"));
}

function normalizeApprovalMedia<T extends WorkStatusApprovalInfo | WorkStatusSubItemApproval>(
  approval: T,
): T {
  const photoUrls = approval.photoUrls;
  const videoUrls = approval.videoUrls;
  const photoN = photoUrls?.length ?? approval.photoCount ?? 0;
  const videoN = videoUrls?.length ?? approval.videoCount ?? 0;
  return {
    ...approval,
    photoCount: photoN,
    videoCount: videoN,
  };
}

function normalizeTimelineApprovals(
  timeline: ProjectTimelineStatus,
): ProjectTimelineStatus {
  const raw = timeline.workStatusApprovals;
  if (!raw) return timeline;

  const workStatusApprovals: Record<string, WorkStatusApprovalInfo> = {};
  for (const [stageKey, approval] of Object.entries(raw)) {
    let next = normalizeApprovalMedia(approval);
    if (next.subItemApprovals) {
      const subItemApprovals: Record<string, WorkStatusSubItemApproval> = {};
      for (const [subKey, sub] of Object.entries(next.subItemApprovals)) {
        subItemApprovals[subKey] = normalizeApprovalMedia(sub);
      }
      next = { ...next, subItemApprovals };
    }

    const status = next.status;
    const hasMedia = (next.photoUrls?.length ?? 0) > 0 || (next.videoUrls?.length ?? 0) > 0;
    if (
      (status === "closed" || status === "approved") &&
      !hasMedia &&
      ((next.photoCount ?? 0) > 0 || (next.videoCount ?? 0) > 0) &&
      !isAdminOverrideApproval(next)
    ) {
      next = {
        ...next,
        status: "requested",
        photoCount: 0,
        videoCount: 0,
        notes: next.notes ?? "Reconciled: completion requires uploaded media or admin override",
      };
    }

    workStatusApprovals[stageKey] = next;
  }

  return { ...timeline, workStatusApprovals };
}

function findPhotoTaskForStage(
  tasks: Task[],
  projectId: string,
  stageKey: string,
): Task | undefined {
  return tasks.find(
    (t) =>
      t.projectId === projectId &&
      isPhotoCaptureTask(t) &&
      resolveWorkStageKeyFromTask(t) === stageKey,
  );
}

function backfillLinkedTaskId(
  approval: WorkStatusApprovalInfo,
  tasks: Task[],
  projectId: string,
  stageKey: string,
): WorkStatusApprovalInfo {
  if (approval.linkedTaskId && tasks.some((t) => t.id === approval.linkedTaskId)) {
    return approval;
  }
  const fromNotes = parsePhotoTaskIdFromNotes(approval.notes);
  if (fromNotes && tasks.some((t) => t.id === fromNotes)) {
    return { ...approval, linkedTaskId: fromNotes };
  }
  const match = findPhotoTaskForStage(tasks, projectId, stageKey);
  if (match) return { ...approval, linkedTaskId: match.id };
  return approval;
}

/**
 * ER9 — align progress-report approvals with tasks, sites, and derived media counts.
 */
export function reconcileProgressReportTaskLinkage(state: AppState): AppState {
  const projectIds = new Set(state.projects.map((p) => p.id));
  const siteIds = new Set(state.sites.map((s) => s.id));
  const nextTimeline: Record<string, ProjectTimelineStatus> = { ...state.projectTimelineByProjectId };

  for (const [projectId, timeline] of Object.entries(nextTimeline)) {
    if (!projectIds.has(projectId)) continue;
    let tl = normalizeTimelineApprovals(timeline);
    const approvals = tl.workStatusApprovals;
    if (!approvals) {
      nextTimeline[projectId] = tl;
      continue;
    }

    const patched: Record<string, WorkStatusApprovalInfo> = {};
    for (const [stageKey, approval] of Object.entries(approvals)) {
      patched[stageKey] = backfillLinkedTaskId(approval, state.tasks, projectId, stageKey);
    }
    nextTimeline[projectId] = { ...tl, workStatusApprovals: patched };
  }

  const tasks = state.tasks.map((task) => {
    if (!projectIds.has(task.projectId)) return task;
    if (task.siteId && !siteIds.has(task.siteId)) {
      const site = state.sites.find((s) => s.projectId === task.projectId);
      if (site) return { ...task, siteId: site.id, siteName: site.name };
    }
    return task;
  });

  return {
    ...state,
    projectTimelineByProjectId: nextTimeline,
    tasks,
  };
}

export type TaskTimelineCompletionPatch = {
  projectTimelineByProjectId: AppState["projectTimelineByProjectId"];
};

/** When a field task is marked done, sync timeline work-status linkage (ER9). */
export function applyTaskCompletionToTimeline(
  task: Task,
  prevTimelineByProject: AppState["projectTimelineByProjectId"],
): TaskTimelineCompletionPatch | null {
  if (!task.projectId) return null;

  const stageKey = resolveWorkStageKeyFromTask(task);
  if (!stageKey) return null;

  const projectId = task.projectId;
  const currentTimeline: ProjectTimelineStatus = prevTimelineByProject[projectId] ?? {
    projectId,
    fileLogin: "pending",
    fileLoginComplete: false,
    subsidyType: "",
    bankFileType: "",
    loanStage: "",
    loanStatus: "",
    workStatusChecks: [],
    workStatusComplete: false,
    discomChecks: [],
    discomSubsidyStatus: "",
    paymentType: "",
    updatedAt: new Date().toISOString(),
  };

  const now = new Date().toISOString();
  const workType = task.workType.toLowerCase();
  const timelineUpdates: Partial<ProjectTimelineStatus> = {};

  if (workType.includes("file login") || workType.includes("document")) {
    timelineUpdates.fileLogin = "complete";
    timelineUpdates.fileLoginComplete = true;
  }

  if (workType.includes("discom") || workType.includes("net metering")) {
    const checks = currentTimeline.discomChecks || [];
    const discomKey = workType.includes("net metering") ? "net-metering" : "meter-file-submit";
    if (!checks.includes(discomKey)) {
      timelineUpdates.discomChecks = [...checks, discomKey];
    }
  }

  const approvals = { ...(currentTimeline.workStatusApprovals ?? {}) };
  const prevApproval = approvals[stageKey] ?? { status: "pending" as const };

  if (isPhotoCaptureTask(task)) {
    approvals[stageKey] = {
      ...prevApproval,
      status: "requested",
      linkedTaskId: task.id,
      requestedAt: prevApproval.requestedAt ?? now,
      requestedBy: prevApproval.requestedBy ?? task.employeeId,
      requestedByName: prevApproval.requestedByName ?? task.createdBy,
      notes:
        prevApproval.notes ??
        `Photo task ${task.id} completed in field — awaiting Progress Report media review`,
      updatedAt: now,
    };
  } else {
    const checks = currentTimeline.workStatusChecks || [];
    if (!checks.includes(stageKey)) {
      const newChecks = [...checks, stageKey];
      timelineUpdates.workStatusChecks = newChecks;
      if (newChecks.length >= WORK_STATUS_STAGES.length) {
        timelineUpdates.workStatusComplete = true;
      }
    }
  }

  if (Object.keys(approvals).length > 0) {
    timelineUpdates.workStatusApprovals = approvals;
  }

  if (
    Object.keys(timelineUpdates).length === 0 &&
    !isPhotoCaptureTask(task) &&
    !(currentTimeline.workStatusChecks ?? []).includes(stageKey)
  ) {
    return null;
  }

  return {
    projectTimelineByProjectId: {
      ...prevTimelineByProject,
      [projectId]: {
        ...currentTimeline,
        ...timelineUpdates,
        updatedAt: now,
      },
    },
  };
}

export function findStaleProgressReportTaskLinkage(state: AppState): StaleProgressReportTaskLinkage[] {
  const stale: StaleProgressReportTaskLinkage[] = [];
  const projectIds = new Set(state.projects.map((p) => p.id));
  const siteByProject = new Map<string, Set<string>>();
  for (const site of state.sites) {
    if (!site.projectId) continue;
    const set = siteByProject.get(site.projectId) ?? new Set<string>();
    set.add(site.id);
    siteByProject.set(site.projectId, set);
  }

  for (const task of state.tasks) {
    if (!projectIds.has(task.projectId)) {
      stale.push({ projectId: task.projectId, taskId: task.id, reason: "task_project_mismatch" });
      continue;
    }
    const allowedSites = siteByProject.get(task.projectId);
    if (task.siteId && allowedSites && !allowedSites.has(task.siteId)) {
      stale.push({
        projectId: task.projectId,
        taskId: task.id,
        reason: "task_site_mismatch",
      });
    }
  }

  for (const [projectId, timeline] of Object.entries(state.projectTimelineByProjectId)) {
    if (!projectIds.has(projectId)) continue;
    const approvals = timeline.workStatusApprovals ?? {};

    for (const [stageKey, approval] of Object.entries(approvals)) {
      const photoUrls = approval.photoUrls ?? [];
      const videoUrls = approval.videoUrls ?? [];
      const photoN = approval.photoCount ?? 0;
      const videoN = approval.videoCount ?? 0;

      if (photoUrls.length > 0 && photoN !== photoUrls.length) {
        stale.push({ projectId, stageKey, reason: "media_count_drift" });
      }
      if (videoUrls.length > 0 && videoN !== videoUrls.length) {
        stale.push({ projectId, stageKey, reason: "media_count_drift" });
      }

      const hasMedia = photoUrls.length > 0 || videoUrls.length > 0;
      if (
        (approval.status === "closed" || approval.status === "approved") &&
        !hasMedia &&
        (photoN > 0 || videoN > 0) &&
        !isAdminOverrideApproval(approval)
      ) {
        stale.push({ projectId, stageKey, reason: "closed_without_media" });
      }

      if (approval.linkedTaskId && !state.tasks.some((t) => t.id === approval.linkedTaskId)) {
        stale.push({
          projectId,
          stageKey,
          taskId: approval.linkedTaskId,
          reason: "orphan_linked_task",
        });
      }

      if (
        (approval.status === "pending" || approval.status === "requested") &&
        !approval.linkedTaskId &&
        !findPhotoTaskForStage(state.tasks, projectId, stageKey) &&
        parsePhotoTaskIdFromNotes(approval.notes)
      ) {
        stale.push({ projectId, stageKey, reason: "pending_without_photo_task" });
      }
    }
  }

  return stale;
}

export function formatStaleProgressReportTaskErrors(
  rows: StaleProgressReportTaskLinkage[],
): string[] {
  return rows.map((s) => {
    const loc = s.stageKey ? `stage ${s.stageKey}` : s.taskId ? `task ${s.taskId}` : "timeline";
    return `ER9: project ${s.projectId} ${loc} — ${s.reason}`;
  });
}
