import { ROLE_LABELS, type UserRole } from "@/domain/entities/identity";
import type { SettingsTeamMember } from "@/types/project";

/** Human label for task/material accountability fields (matches AppDataContext actor resolution). */
export function resolveSessionActorDisplayName(input: {
  demoUserName: string;
  sessionUserId: string;
  role: UserRole;
  teamMembers?: Pick<SettingsTeamMember, "id" | "name">[];
}): string {
  const trimmed = input.demoUserName.trim();
  if (trimmed) return trimmed;
  const member = input.teamMembers?.find((m) => m.id === input.sessionUserId);
  if (member?.name?.trim()) return member.name.trim();
  return ROLE_LABELS[input.role] ?? "User";
}
