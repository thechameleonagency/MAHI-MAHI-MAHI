import type { UserRole } from "@/domain/entities/identity";

export type ProjectLifecycleStatus = "New" | "In Progress" | "On Hold" | "Completed" | "Closed";

/** Map persisted / seed lifecycle labels to state-machine keys. */
export function normalizeLifecycleForTransition(
  status: string | undefined,
): ProjectLifecycleStatus {
  if (status === "Active" || status === "Ongoing" || status === "In Progress") return "In Progress";
  if (status === "Draft" || status === "New") return "New";
  if (
    status === "New" ||
    status === "In Progress" ||
    status === "On Hold" ||
    status === "Completed" ||
    status === "Closed"
  ) {
    return status;
  }
  return "New";
}

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

  const fromKey = normalizeLifecycleForTransition(from);
  return transitions[fromKey]?.includes(to) ?? false;
};

/**
 * Phase 1.4 — Start Project guard.
 *
 * Returns whether the "Start project" action is permitted right now. Distinct
 * from `canTransitionProjectStatus`: a project can be in lifecycle "New" but
 * still not startable until site readiness is confirmed.
 *
 * Super admin can bypass the readiness gate with a written override reason.
 */
export const canStartProject = (
  currentStatus: ProjectLifecycleStatus,
  siteReady: boolean,
  actorRole: UserRole,
  overrideReason?: string,
): { ok: true } | { ok: false; reason: string } => {
  if (currentStatus !== "New") {
    return { ok: false, reason: `Project is already ${currentStatus}; cannot start again.` };
  }
  if (!siteReady) {
    if (actorRole === "super_admin" && overrideReason?.trim()) {
      return { ok: true };
    }
    return { ok: false, reason: "Site readiness not yet marked as ready." };
  }
  return { ok: true };
};
