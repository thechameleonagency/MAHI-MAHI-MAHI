import type { UserRole } from "@/domain/entities/identity";

export type ProjectLifecycleStatus = "New" | "In Progress" | "On Hold" | "Completed" | "Closed";

const transitions: Record<ProjectLifecycleStatus, ProjectLifecycleStatus[]> = {
  New: ["In Progress", "On Hold"],
  "In Progress": ["On Hold", "Completed"],
  "On Hold": ["In Progress"],
  Completed: ["Closed"],
  Closed: [],
};

export const canTransitionProjectStatus = (
  from: ProjectLifecycleStatus,
  to: ProjectLifecycleStatus,
  actorRole: UserRole,
  overrideReason?: string,
): boolean => {
  if (from === "Closed") {
    return actorRole === "super_admin" && Boolean(overrideReason?.trim());
  }

  if (from === "Completed" && to === "In Progress") {
    return actorRole === "super_admin" && Boolean(overrideReason?.trim());
  }

  return transitions[from].includes(to);
};
