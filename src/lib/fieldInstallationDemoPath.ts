import type { AppState } from "@/contexts/AppDataContext";
import {
  applyTaskCompletionToTimeline,
  PHOTO_CAPTURE_TASK_PREFIX,
  reconcileProgressReportTaskLinkage,
} from "@/lib/progressReportTaskContinuity";
import { WORK_STATUS_STAGES, type WorkStatusApprovalInfo } from "@/types/blockage";
import type { Project, Task } from "@/types/project";

/** Seed + UI marker — search projects by name prefix. */
export const FIELD_INSTALL_DEMO_MARKER = "[Demo] Field install";

export const FIELD_INSTALL_DEMO_PANEL_STAGE = "panel";

/** Deterministic task id for scripted E2E (assign step). */
export const FIELD_INSTALL_DEMO_TASK_ID = "TASK-FIELD-DEMO-PANEL";

const DEMO_SEED_PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='48'%3E%3Crect fill='%23e2e8f0' width='64' height='48'/%3E%3Ctext x='8' y='28' font-size='10' fill='%2364748b'%3EDemo%3C/text%3E%3C/svg%3E";

export function isFieldInstallationDemoProject(project: Pick<Project, "name">): boolean {
  return project.name.includes(FIELD_INSTALL_DEMO_MARKER);
}

export function findFieldInstallationDemoProject(state: AppState): Project | undefined {
  return state.projects.find((p) => isFieldInstallationDemoProject(p));
}

function primarySiteForProject(state: AppState, projectId: string) {
  return state.sites.find((s) => s.projectId === projectId);
}

function panelStageLabel(): string {
  return WORK_STATUS_STAGES.find((s) => s.value === FIELD_INSTALL_DEMO_PANEL_STAGE)?.label ?? "Panel";
}

function patchTimeline(
  state: AppState,
  projectId: string,
  patch: (tl: NonNullable<AppState["projectTimelineByProjectId"][string]>) => NonNullable<
    AppState["projectTimelineByProjectId"][string]
  >,
): AppState {
  const current =
    state.projectTimelineByProjectId[projectId] ??
    ({
      projectId,
      fileLogin: "pending",
      subsidyType: "",
      bankFileType: "",
      loanStage: "",
      loanStatus: "",
      workStatusChecks: [],
      discomChecks: [],
      discomSubsidyStatus: "",
      paymentType: "",
      updatedAt: new Date().toISOString(),
    } as NonNullable<AppState["projectTimelineByProjectId"][string]>);

  return {
    ...state,
    projectTimelineByProjectId: {
      ...state.projectTimelineByProjectId,
      [projectId]: patch(current),
    },
  };
}

/** Step 1 — admin assigns panel photo capture task (Progress Report → photo assignment). */
export function assignPanelPhotoTask(
  state: AppState,
  params: {
    projectId: string;
    assigneeEmployeeId: string;
    assignerUserId: string;
    assignerName: string;
    taskId?: string;
    notes?: string;
  },
): AppState {
  const project = state.projects.find((p) => p.id === params.projectId);
  const site = primarySiteForProject(state, params.projectId);
  if (!project || !site) return state;

  const taskId = params.taskId ?? FIELD_INSTALL_DEMO_TASK_ID;
  const stageLabel = panelStageLabel();
  const today = new Date().toISOString().split("T")[0];
  const assignee = state.employees.find((e) => e.id === params.assigneeEmployeeId);

  const task: Task = {
    id: taskId,
    employeeId: params.assigneeEmployeeId,
    projectId: params.projectId,
    siteId: site.id,
    siteName: site.name,
    workType: `${PHOTO_CAPTURE_TASK_PREFIX} ${stageLabel}`,
    workTag: FIELD_INSTALL_DEMO_PANEL_STAGE,
    milestoneId: FIELD_INSTALL_DEMO_PANEL_STAGE,
    notes:
      params.notes?.trim() ||
      `Capture photos/videos for ${stageLabel} on ${project.name}`,
    createdDate: today,
    workDate: today,
    status: "sent",
    createdBy: params.assignerName,
    workItems: [
      {
        stageKey: FIELD_INSTALL_DEMO_PANEL_STAGE,
        stageName: stageLabel,
        subItems: [],
      },
    ],
  };

  const withoutDup = state.tasks.filter((t) => t.id !== taskId);
  let next: AppState = { ...state, tasks: [task, ...withoutDup] };

  next = patchTimeline(next, params.projectId, (tl) => {
    const prev = tl.workStatusApprovals?.[FIELD_INSTALL_DEMO_PANEL_STAGE];
    return {
      ...tl,
      updatedAt: new Date().toISOString(),
      workStatusApprovals: {
        ...tl.workStatusApprovals,
        [FIELD_INSTALL_DEMO_PANEL_STAGE]: {
          ...prev,
          status: "pending",
          linkedTaskId: taskId,
          requestedBy: params.assignerUserId,
          requestedByName: params.assignerName,
          requestedAt: new Date().toISOString(),
          notes:
            params.notes?.trim() ||
            `Photo task ${taskId} assigned to ${assignee?.name ?? "installer"}`,
        },
      },
    };
  });

  return reconcileProgressReportTaskLinkage(next);
}

/** Step 2 — field marks photo task done (Employee profile / task status). */
export function completePanelPhotoTask(
  state: AppState,
  params: { projectId: string; taskId?: string },
): AppState {
  const taskId = params.taskId ?? FIELD_INSTALL_DEMO_TASK_ID;
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task || task.projectId !== params.projectId) return state;

  const updatedTask: Task = { ...task, status: "done" };
  const tasks = state.tasks.map((t) => (t.id === taskId ? updatedTask : t));

  let next: AppState = { ...state, tasks };
  const patch = applyTaskCompletionToTimeline(updatedTask, next.projectTimelineByProjectId);
  if (patch) {
    next = { ...next, projectTimelineByProjectId: patch.projectTimelineByProjectId };
  }
  return reconcileProgressReportTaskLinkage(next);
}

/** Step 3 — field uploads media on Progress Report (direct upload path). */
export function attachPanelStageMedia(
  state: AppState,
  params: {
    projectId: string;
    submitterUserId: string;
    submitterName: string;
    photoUrls?: string[];
  },
): AppState {
  const photoUrls = params.photoUrls ?? [DEMO_SEED_PHOTO];
  const photoN = photoUrls.length;

  let next = patchTimeline(state, params.projectId, (tl) => {
    const prev = tl.workStatusApprovals?.[FIELD_INSTALL_DEMO_PANEL_STAGE] ?? { status: "pending" as const };
    const approval: WorkStatusApprovalInfo = {
      ...prev,
      status: "requested",
      photoCount: photoN,
      photoUrls,
      videoCount: prev.videoCount ?? 0,
      requestedBy: params.submitterUserId,
      requestedByName: params.submitterName,
      requestedAt: prev.requestedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return {
      ...tl,
      updatedAt: new Date().toISOString(),
      workStatusApprovals: {
        ...tl.workStatusApprovals,
        [FIELD_INSTALL_DEMO_PANEL_STAGE]: approval,
      },
    };
  });

  return reconcileProgressReportTaskLinkage(next);
}

/** Step 4 — management approves panel stage. */
export function approvePanelStage(
  state: AppState,
  params: {
    projectId: string;
    approverUserId: string;
    approverName: string;
  },
): AppState {
  return patchTimeline(state, params.projectId, (tl) => {
    const prev = tl.workStatusApprovals?.[FIELD_INSTALL_DEMO_PANEL_STAGE];
    if (!prev) return tl;

    const checks = tl.workStatusChecks ?? [];
    const newChecks = checks.includes(FIELD_INSTALL_DEMO_PANEL_STAGE)
      ? checks
      : [...checks, FIELD_INSTALL_DEMO_PANEL_STAGE];

    return {
      ...tl,
      workStatusChecks: newChecks,
      workStatusComplete: newChecks.length >= WORK_STATUS_STAGES.length,
      updatedAt: new Date().toISOString(),
      workStatusApprovals: {
        ...tl.workStatusApprovals,
        [FIELD_INSTALL_DEMO_PANEL_STAGE]: {
          ...prev,
          status: "approved",
          approvedBy: params.approverUserId,
          approvedByName: params.approverName,
          approvedAt: new Date().toISOString(),
        },
      },
    };
  });
}

/** Step 5 — management closes panel stage on timeline. */
export function closePanelStage(state: AppState, projectId: string): AppState {
  return patchTimeline(state, projectId, (tl) => {
    const prev = tl.workStatusApprovals?.[FIELD_INSTALL_DEMO_PANEL_STAGE];
    if (!prev) return tl;
    return {
      ...tl,
      updatedAt: new Date().toISOString(),
      workStatusApprovals: {
        ...tl.workStatusApprovals,
        [FIELD_INSTALL_DEMO_PANEL_STAGE]: {
          ...prev,
          status: "closed",
        },
      },
    };
  });
}

export type FieldInstallationDemoRunResult = {
  state: AppState;
  projectId: string;
  taskId: string;
};

/**
 * PR1 — programmatic end-to-end: assign → field complete → media → approve → closed.
 * Mirrors Progress Report + Employee Profile flows without UI.
 */
export function runFieldInstallationDemoPath(
  state: AppState,
  opts?: {
    projectId?: string;
    assigneeEmployeeId?: string;
    assignerUserId?: string;
    assignerName?: string;
    fieldUserId?: string;
    fieldUserName?: string;
    approverUserId?: string;
    approverName?: string;
  },
): FieldInstallationDemoRunResult | null {
  const project = opts?.projectId
    ? state.projects.find((p) => p.id === opts.projectId)
    : findFieldInstallationDemoProject(state);
  if (!project) return null;

  const assignee =
    opts?.assigneeEmployeeId ??
    state.employees.find((e) => e.id === "INST-001")?.id ??
    state.employees[0]?.id;
  if (!assignee) return null;

  const assignerUserId = opts?.assignerUserId ?? "ADM-001";
  const assignerName = opts?.assignerName ?? "Anita Deshmukh";
  const fieldUserId = opts?.fieldUserId ?? "INST-001";
  const fieldUserName = opts?.fieldUserName ?? "Karthik Rao";
  const approverUserId = opts?.approverUserId ?? "MGT-001";
  const approverName = opts?.approverName ?? "Suresh Iyer";

  let next = assignPanelPhotoTask(state, {
    projectId: project.id,
    assigneeEmployeeId: assignee,
    assignerUserId,
    assignerName,
    taskId: FIELD_INSTALL_DEMO_TASK_ID,
  });
  next = completePanelPhotoTask(next, { projectId: project.id });
  next = attachPanelStageMedia(next, {
    projectId: project.id,
    submitterUserId: fieldUserId,
    submitterName: fieldUserName,
  });
  next = approvePanelStage(next, {
    projectId: project.id,
    approverUserId,
    approverName,
  });
  next = closePanelStage(next, project.id);
  next = reconcileProgressReportTaskLinkage(next);

  return { state: next, projectId: project.id, taskId: FIELD_INSTALL_DEMO_TASK_ID };
}

export function progressReportUrlForProject(projectId: string): string {
  return `/projects/${projectId}`;
}
