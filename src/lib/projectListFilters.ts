import {
  canonicalizeProjectLifecycleStatus,
  type ProjectLifecycleStatus,
} from "@/domain/stateMachines/projectStateMachine";
import { normalizeProject } from "@/lib/projectNormalize";
import type { Project } from "@/types/project";

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
