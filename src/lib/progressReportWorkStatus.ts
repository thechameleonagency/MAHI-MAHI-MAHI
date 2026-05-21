import type { UserRole } from "@/domain/entities/identity";
import type {
  WorkStatusApprovalStatus,
  WorkStatusSubItemApproval,
} from "@/types/blockage";

/** Roles that may approve / reject field work-status submissions (C3 / approval:resolve). */
export function canApproveWorkStatusRole(role: UserRole): boolean {
  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "ceo" ||
    role === "management"
  );
}

/** Field roles that submit work-status for approval (non-approver path). */
export function isWorkStatusFieldSubmitterRole(role: UserRole): boolean {
  return role === "installation_team" || role === "salesperson";
}

/** Main stage awaiting approver action (requested by field). */
export function stageAwaitingApproverAction(status: WorkStatusApprovalStatus | undefined): boolean {
  return status === "requested";
}

/**
 * Sub-item awaiting approver action.
 * - `requested` — media submitted for review
 * - `pending` without photo — field marked complete inline (no media gate)
 */
export function subItemAwaitingApproverAction(
  subApproval: WorkStatusSubItemApproval | undefined,
  photoRequired: boolean,
): boolean {
  if (!subApproval?.status || subApproval.status === "approved" || subApproval.status === "closed") {
    return false;
  }
  if (subApproval.status === "requested") {
    return true;
  }
  if (subApproval.status === "pending") {
    if (photoRequired) {
      return Boolean(subApproval.photoUrls?.length || subApproval.videoCount);
    }
    return Boolean(subApproval.updatedAt);
  }
  return false;
}

/** Status assigned when a field user submits a sub-item (before approver acts). */
export function fieldSubItemSubmissionStatus(
  canApprove: boolean,
  hasMedia: boolean,
): WorkStatusApprovalStatus {
  if (canApprove) return "approved";
  return hasMedia ? "requested" : "pending";
}
