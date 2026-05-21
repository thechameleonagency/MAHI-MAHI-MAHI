import type { AppState } from "@/contexts/AppDataContext";
import type { SettingsTeamMember } from "@/types/project";
import type { SeedProfile } from "./seedLayerOrder";
import { seedDateAt } from "./seedTimeModel";
import { pushAudit } from "./seedHelpers";
import { DEMO_LOGIN_USERS } from "@/domain/demoCredentials";

/** L0 — settings team directory (§7 role activity map + demo login roster). */
export function buildL0SettingsTeam(state: AppState, _profile: SeedProfile): AppState {
  const members: SettingsTeamMember[] = DEMO_LOGIN_USERS.map((u) => ({
    id: u.memberId,
    name: u.name,
    email: u.email,
    role: u.role,
    status: "Active",
  }));

  members.push({
    id: "INV-PENDING-001",
    name: "pending.invite",
    email: "pending.invite@mss.solar",
    role: "salesperson",
    status: "Pending",
    inviteToken: "demo-invite-token-sales",
    invitedAt: seedDateAt(0.02),
  });

  state.settingsTeamMembers = members;
  for (let i = 0; i < members.length; i++) {
    pushAudit(state, {
      action: "create",
      entityType: "SettingsTeamMember",
      entityId: members[i].id,
      entityName: members[i].name,
      fraction: 0.01 + i * 0.001,
      role: "admin",
    });
  }
  return state;
}
