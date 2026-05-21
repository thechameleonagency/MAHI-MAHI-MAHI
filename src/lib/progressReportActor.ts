import type { UserRole } from "@/domain/entities/identity";
import { canApproveWorkStatusRole } from "@/lib/progressReportWorkStatus";

/** Resolve persisted actor fields for Progress Report / timeline writes. */
export function resolveProgressReportActor(input: {
  sessionUserId: string;
  displayName: string;
  role: UserRole;
}): {
  userId: string;
  displayName: string;
  /** Full admin powers including override-without-media on photo stages. */
  isAdmin: boolean;
  /** May approve/reject work-status requests (admin, CEO, management). */
  canApproveWorkStatus: boolean;
} {
  const isAdmin =
    input.role === "admin" || input.role === "super_admin" || input.role === "ceo";
  return {
    userId: input.sessionUserId,
    displayName: input.displayName.trim() || "User",
    isAdmin,
    canApproveWorkStatus: canApproveWorkStatusRole(input.role),
  };
}
