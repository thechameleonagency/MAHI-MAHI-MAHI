import type { UserRole } from "@/domain/entities/identity";

/** Resolve persisted actor fields for Progress Report / timeline writes. */
export function resolveProgressReportActor(input: {
  sessionUserId: string;
  displayName: string;
  role: UserRole;
}): { userId: string; displayName: string; isAdmin: boolean } {
  const isAdmin =
    input.role === "admin" || input.role === "super_admin" || input.role === "ceo";
  return {
    userId: input.sessionUserId,
    displayName: input.displayName.trim() || "User",
    isAdmin,
  };
}
