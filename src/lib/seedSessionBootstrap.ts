import type { AppState } from "@/contexts/AppDataContext";
import type { SettingsTeamMember } from "@/types/project";
import { findDemoUserByMemberId, SUPER_ADMIN_MEMBER_ID } from "@/domain/demoCredentials";
import {
  clearAuthenticatedSession,
  persistAuthenticatedSession,
} from "@/lib/sessionActorStorage";

/** Normalize legacy lowercase team status from older seeds. */
export function normalizeTeamMemberStatus(status: string): string {
  if (status === "active") return "Active";
  if (status === "pending") return "Pending";
  if (status === "inactive") return "Inactive";
  return status;
}

export function normalizeSettingsTeamMembers(members: SettingsTeamMember[]): SettingsTeamMember[] {
  return members.map((m) => ({
    ...m,
    status: normalizeTeamMemberStatus(m.status),
  }));
}

/** After business seed load — log in as super admin for Data tab access. */
export function bootstrapSessionAfterSeed(state: AppState, preferredMemberId = SUPER_ADMIN_MEMBER_ID): void {
  const members = normalizeSettingsTeamMembers(state.settingsTeamMembers);
  const member =
    members.find((m) => m.id === preferredMemberId && m.status === "Active") ??
    members.find((m) => m.role === "super_admin" && m.status === "Active") ??
    members.find((m) => m.status === "Active");

  if (!member) {
    clearAuthenticatedSession();
    return;
  }

  const demo = findDemoUserByMemberId(member.id);
  persistAuthenticatedSession({
    memberId: member.id,
    email: member.email,
    role: (demo?.role ?? member.role) as import("@/domain/entities/identity").UserRole,
    displayName: member.name,
  });
}

/** After reset to empty workspace — clear login session. */
export function bootstrapSessionAfterReset(): void {
  clearAuthenticatedSession();
}
