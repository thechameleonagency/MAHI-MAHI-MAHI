import { findDemoUserByMemberId } from "@/domain/demoCredentials";
import { ROLE_LABELS, type ActorContext } from "@/domain/entities/identity";
import type { AuditLogEntry } from "@/types/finance";
import type { SettingsTeamMember } from "@/types/project";

export interface AuditActorNameLookup {
  actor: Pick<ActorContext, "actorUserId" | "actorRole" | "actorDisplayName">;
  settingsTeamMembers?: Pick<SettingsTeamMember, "id" | "name">[];
  demoUserName?: string;
}

/** Resolve a human-readable audit actor label (never prefer raw ids when a roster match exists). */
export function resolveAuditActorUserName(input: AuditActorNameLookup): string {
  const { actor, settingsTeamMembers = [], demoUserName } = input;

  const explicit = actor.actorDisplayName?.trim();
  if (explicit) return explicit;

  const demoTrim = demoUserName?.trim();
  if (demoTrim) return demoTrim;

  const member = settingsTeamMembers.find((m) => m.id === actor.actorUserId);
  if (member?.name?.trim()) return member.name.trim();

  const demoUser = findDemoUserByMemberId(actor.actorUserId);
  if (demoUser?.name) return demoUser.name;

  const roleLabel = ROLE_LABELS[actor.actorRole];
  if (roleLabel) return roleLabel;

  return actor.actorUserId;
}

/** Backfill legacy rows where `userName` was stored as the raw member id. */
export function reconcileAuditLogUserNames(
  logs: AuditLogEntry[],
  teamMembers: Pick<SettingsTeamMember, "id" | "name">[] = [],
): AuditLogEntry[] {
  return logs.map((log) => {
    const resolved = resolveAuditLogDisplayName(log, teamMembers);
    return resolved === log.userName ? log : { ...log, userName: resolved };
  });
}

export function resolveAuditLogDisplayName(
  log: Pick<AuditLogEntry, "userId" | "userName">,
  teamMembers: Pick<SettingsTeamMember, "id" | "name">[] = [],
): string {
  const stored = log.userName?.trim();
  if (stored && stored !== log.userId) return stored;

  const member = teamMembers.find((m) => m.id === log.userId);
  if (member?.name?.trim()) return member.name.trim();

  const demoUser = findDemoUserByMemberId(log.userId);
  if (demoUser?.name) return demoUser.name;

  return stored || log.userId;
}
