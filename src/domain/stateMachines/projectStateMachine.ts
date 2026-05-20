import type { UserRole } from "@/domain/entities/identity";

export type ProjectLifecycleStatus = "New" | "In Progress" | "On Hold" | "Completed" | "Closed";

const CANONICAL_LIFECYCLE: readonly ProjectLifecycleStatus[] = [
  "New",
  "In Progress",
  "On Hold",
  "Completed",
  "Closed",
];

export function isCanonicalProjectLifecycleStatus(
  value: string | undefined,
): value is ProjectLifecycleStatus {
  return CANONICAL_LIFECYCLE.includes(value as ProjectLifecycleStatus);
}

/**
 * One-time normalization for persisted / seed labels → five canonical lifecycle states.
 * Call from {@link normalizeProject} on hydrate; state-machine callers assume canonical input.
 */
export function canonicalizeProjectLifecycleStatus(
  raw: string | undefined,
): ProjectLifecycleStatus {
  if (!raw?.trim()) return "New";
  if (isCanonicalProjectLifecycleStatus(raw)) return raw;
  if (raw === "Active" || raw === "Ongoing") return "In Progress";
  if (raw === "Draft") return "New";
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

  return transitions[from]?.includes(to) ?? false;
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

/** Legacy `status` field kept in sync with canonical lifecycle for list badges. */
export function legacyStatusFromLifecycle(
  lifecycle: ProjectLifecycleStatus,
): "Ongoing" | "Completed" | "On Hold" | "Closed" {
  if (lifecycle === "Completed") return "Completed";
  if (lifecycle === "Closed") return "Closed";
  if (lifecycle === "On Hold") return "On Hold";
  return "Ongoing";
}
