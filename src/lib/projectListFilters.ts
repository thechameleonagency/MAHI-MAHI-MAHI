import type { AppState } from "@/contexts/AppDataContext";
import {
  canonicalizeProjectLifecycleStatus,
  projectLifecycleDisplayLabel,
  type ProjectLifecycleStatus,
} from "@/domain/stateMachines/projectStateMachine";
import { normalizeProject } from "@/lib/projectNormalize";
import type { Project } from "@/types/project";

export { projectLifecycleDisplayLabel };

export type ProjectLifecycleFilter = "all" | ProjectLifecycleStatus;

export const PROJECT_LIFECYCLE_FILTER_OPTIONS: ReadonlyArray<{
  value: ProjectLifecycleFilter;
  label: string;
}> = [
  { value: "all", label: "All Status" },
  { value: "New", label: "New" },
  { value: "In Progress", label: "In Progress" },
  { value: "On Hold", label: "On Hold" },
  { value: "Completed", label: "Completed" },
  { value: "Closed", label: "Closed" },
] as const;

/** Read `?status=` from list URLs; maps legacy labels to canonical lifecycle. */
export function parseProjectStatusFilterFromUrl(
  raw: string | null | undefined,
): ProjectLifecycleFilter {
  const value = raw?.trim();
  if (!value || value === "all") return "all";
  if (value === "Ongoing" || value === "Active") return "In Progress";
  if (value === "Draft") return "New";
  const canonical = canonicalizeProjectLifecycleStatus(value);
  if (canonical === value || value === canonical) {
    return canonical;
  }
  return canonical;
}

export function projectLifecycleFilterToUrlParam(
  filter: ProjectLifecycleFilter,
): string | null {
  if (filter === "all") return null;
  return filter;
}

export function getProjectLifecycleStatus(project: Project): ProjectLifecycleStatus {
  return normalizeProject(project).lifecycleStatus;
}

export function matchesProjectLifecycleFilter(
  project: Project,
  filter: ProjectLifecycleFilter,
): boolean {
  if (filter === "all") return true;
  return getProjectLifecycleStatus(project) === filter;
}

export function countProjectsByLifecycle(
  projects: Project[],
): Record<ProjectLifecycleFilter, number> {
  const counts: Record<ProjectLifecycleFilter, number> = {
    all: projects.length,
    New: 0,
    "In Progress": 0,
    "On Hold": 0,
    Completed: 0,
    Closed: 0,
  };
  for (const project of projects) {
    const lifecycle = getProjectLifecycleStatus(project);
    counts[lifecycle] += 1;
  }
  return counts;
}

/** Projects list KPI strip — always derived from canonical lifecycle, never legacy `status`. */
export function buildProjectsListKpiStats(projects: Project[]) {
  const lifecycleCounts = countProjectsByLifecycle(projects);
  return {
    total: lifecycleCounts.all,
    new: lifecycleCounts.New,
    inProgress: lifecycleCounts["In Progress"],
    onHold: lifecycleCounts["On Hold"],
    completed: lifecycleCounts.Completed,
    closed: lifecycleCounts.Closed,
    totalKW: projects.reduce((sum, p) => sum + (parseFloat(p.capacity) || 0), 0).toFixed(1),
  };
}

/** Executing on site — canonical `In Progress` only (excludes New intake). */
export function isProjectLifecycleInProgress(project: Project): boolean {
  return getProjectLifecycleStatus(project) === "In Progress";
}

export function isProjectLifecycleOnHold(project: Project): boolean {
  return getProjectLifecycleStatus(project) === "On Hold";
}

export function isProjectLifecycleNew(project: Project): boolean {
  return getProjectLifecycleStatus(project) === "New";
}

/** Dashboard / analytics “active project” counts — in-flight execution, not intake. */
export function isProjectActiveForOperations(project: Project): boolean {
  return isProjectLifecycleInProgress(project);
}

/** Active Sites tab — started execution, not terminal. */
export function isProjectActiveForSiteExecution(project: Project): boolean {
  const lifecycle = getProjectLifecycleStatus(project);
  if (lifecycle === "Completed" || lifecycle === "Closed") return false;
  if (!project.startedAt?.trim()) return false;
  return lifecycle === "In Progress" || lifecycle === "On Hold";
}

export function projectStatusBadgeProps(project: Project): {
  status: string;
  label: string;
} {
  const lifecycle = getProjectLifecycleStatus(project);
  return {
    status: lifecycle,
    label: projectLifecycleDisplayLabel(lifecycle),
  };
}

/** Hydrate pass — sync legacy `status` + lifecycle from normalizeProject (UX1). */
export function reconcileProjectsLifecycleVocabulary(state: AppState): AppState {
  return {
    ...state,
    projects: state.projects.map((p) => normalizeProject(p)),
  };
}
