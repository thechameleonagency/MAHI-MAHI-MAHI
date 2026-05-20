export const USER_ROLES = [
  "super_admin",
  "admin",
  "ceo",
  "management",
  "salesperson",
  "installation_team",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/**
 * Prototype session boot role — lowest-privilege pipeline role so first load
 * reflects restricted navigation/permissions (Md1).
 */
export const DEMO_DEFAULT_SESSION_ROLE: UserRole = "salesperson";

export interface ActorContext {
  actorUserId: string;
  actorRole: UserRole;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  ceo: "CEO",
  management: "Management",
  salesperson: "Salesperson",
  installation_team: "Installation Team",
};
