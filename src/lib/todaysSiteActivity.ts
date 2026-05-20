import { isActiveSiteProject } from "@/lib/activeSiteProjects";
import type { AgingTone } from "@/lib/agingHelpers";
import type { Blockage, ProjectTimelineStatus } from "@/types/blockage";
import type { Project, Task } from "@/types/project";

export type TodaysSiteActivityRow = {
  projectId: string;
  projectName: string;
  client: string;
  label: string;
  tone: AgingTone;
  sortScore: number;
};

export type TodaysSiteActivitySnapshot = {
  ongoingCount: number;
  openBlockagesCount: number;
  tasksDueTodayCount: number;
  timelineInProgressCount: number;
  rows: TodaysSiteActivityRow[];
};

const TIMELINE_STEP_KEYS = [
  "fileLogin",
  "subsidyType",
  "bankFileType",
  "workStatus",
  "discomStatus",
  "paymentStatus",
] as const;

function isTimelineStepInProgress(stepKey: string, timeline: ProjectTimelineStatus): boolean {
  switch (stepKey) {
    case "fileLogin":
      return (
        timeline.fileLogin !== "pending" &&
        timeline.fileLogin !== "complete" &&
        !timeline.fileLoginComplete
      );
    case "subsidyType":
      return false;
    case "bankFileType":
      return timeline.bankFileType === "loan" && timeline.loanStatus !== "approved";
    case "workStatus":
      return (timeline.workStatusChecks?.length ?? 0) > 0 && !timeline.workStatusComplete;
    case "discomStatus":
      return (timeline.discomChecks?.length ?? 0) > 0 && timeline.discomSubsidyStatus !== "approved";
    case "paymentStatus":
      return (
        (timeline.paymentType === "cash-to-mahi" && !timeline.cashToMahiConfirmed) ||
        (timeline.paymentType === "instalments" &&
          timeline.firstInstallmentPaid &&
          !timeline.secondInstallmentPaid)
      );
    default:
      return false;
  }
}

export function activeSiteTimelineInProgress(timeline: ProjectTimelineStatus | null | undefined): boolean {
  if (!timeline) return false;
  return TIMELINE_STEP_KEYS.some((key) => isTimelineStepInProgress(key, timeline));
}

export function buildTodaysSiteActivitySnapshot(input: {
  projects: Project[];
  blockages: Blockage[];
  tasks: Task[];
  todayIso: string;
  projectTimelineByProjectId: Record<string, ProjectTimelineStatus>;
  maxRows?: number;
}): TodaysSiteActivitySnapshot {
  const maxRows = input.maxRows ?? 6;
  const ongoing = input.projects.filter(isActiveSiteProject);
  const ongoingIds = new Set(ongoing.map((p) => p.id));

  const openBlockages = input.blockages.filter(
    (b) => b.status === "active" && ongoingIds.has(b.projectId),
  );
  const tasksDueToday = input.tasks.filter(
    (t) =>
      t.workDate === input.todayIso &&
      t.status !== "done" &&
      ongoingIds.has(t.projectId),
  );

  const tasksByProject = new Map<string, number>();
  for (const t of tasksDueToday) {
    tasksByProject.set(t.projectId, (tasksByProject.get(t.projectId) ?? 0) + 1);
  }

  const blockagesByProject = new Map<string, number>();
  for (const b of openBlockages) {
    blockagesByProject.set(b.projectId, (blockagesByProject.get(b.projectId) ?? 0) + 1);
  }

  let timelineInProgressCount = 0;
  const rowCandidates: TodaysSiteActivityRow[] = [];

  for (const project of ongoing) {
    const blockageCount = blockagesByProject.get(project.id) ?? 0;
    const taskCount = tasksByProject.get(project.id) ?? 0;
    const timeline = input.projectTimelineByProjectId[project.id];
    const timelineActive = activeSiteTimelineInProgress(timeline);
    if (timelineActive) timelineInProgressCount += 1;

    let label = "Ongoing — no blockers today";
    let tone: AgingTone = "muted";
    let sortScore = 10;

    if (blockageCount > 0) {
      label =
        blockageCount === 1
          ? "1 open blockage"
          : `${blockageCount} open blockages`;
      tone = "danger";
      sortScore = 300 + blockageCount;
    } else if (taskCount > 0) {
      label = taskCount === 1 ? "Task due today" : `${taskCount} tasks due today`;
      tone = "warning";
      sortScore = 200 + taskCount;
    } else if (timelineActive) {
      label = "Timeline step in progress";
      tone = "warning";
      sortScore = 120;
    } else if (project.status === "On Hold" || project.lifecycleStatus === "On Hold") {
      label = "On hold";
      tone = "warning";
      sortScore = 80;
    }

    rowCandidates.push({
      projectId: project.id,
      projectName: project.name,
      client: project.client,
      label,
      tone,
      sortScore,
    });
  }

  rowCandidates.sort((a, b) => b.sortScore - a.sortScore);

  return {
    ongoingCount: ongoing.length,
    openBlockagesCount: openBlockages.length,
    tasksDueTodayCount: tasksDueToday.length,
    timelineInProgressCount,
    rows: rowCandidates.slice(0, maxRows),
  };
}
