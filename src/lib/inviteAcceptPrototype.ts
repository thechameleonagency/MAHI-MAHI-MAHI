import type { SettingsTeamMember } from "@/types/project";

/** Shown on `/invite/:token` — clarifies local-only invite flow (MN4). */
export const DEMO_INVITE_PROTOTYPE_LABEL = "Demo: invitation prototype";

/** Seeded pending member in L0_settingsTeam for role-switch demos. */
export const SEED_DEMO_INVITE_TOKEN = "demo-invite-token-sales";

export const SEED_DEMO_INVITE_PATH = `/invite/${SEED_DEMO_INVITE_TOKEN}`;

export function findPendingInviteMember(
  members: SettingsTeamMember[],
  token: string | undefined,
): SettingsTeamMember | undefined {
  const trimmed = token?.trim();
  if (!trimmed) return undefined;
  return members.find((m) => m.inviteToken === trimmed);
}
