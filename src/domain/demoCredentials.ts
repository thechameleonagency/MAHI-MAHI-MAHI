import type { UserRole } from "@/domain/entities/identity";

/** Shared demo password shown on the login page (local prototype only). */
export const DEMO_PASSWORD = "Mss@2026";

export interface DemoLoginUser {
  memberId: string;
  email: string;
  password: string;
  role: UserRole;
  name: string;
}

/** Canonical login roster — IDs must match L0_settingsTeam seed. */
export const DEMO_LOGIN_USERS: DemoLoginUser[] = [
  { memberId: "SA-001", email: "rajesh.kulkarni@mss.solar", password: DEMO_PASSWORD, role: "super_admin", name: "Rajesh Kulkarni" },
  { memberId: "ADM-001", email: "anita.deshmukh@mss.solar", password: DEMO_PASSWORD, role: "admin", name: "Anita Deshmukh" },
  { memberId: "CEO-001", email: "vikram.menon@mss.solar", password: DEMO_PASSWORD, role: "ceo", name: "Vikram Menon" },
  { memberId: "MGT-001", email: "suresh.iyer@mss.solar", password: DEMO_PASSWORD, role: "management", name: "Suresh Iyer" },
  { memberId: "SAL-001", email: "priya.nair@mss.solar", password: DEMO_PASSWORD, role: "salesperson", name: "Priya Nair" },
  { memberId: "SAL-002", email: "deepa.sharma@mss.solar", password: DEMO_PASSWORD, role: "salesperson", name: "Deepa Sharma" },
  { memberId: "INST-001", email: "karthik.rao@mss.solar", password: DEMO_PASSWORD, role: "installation_team", name: "Karthik Rao" },
  { memberId: "INST-002", email: "manoj.patel@mss.solar", password: DEMO_PASSWORD, role: "installation_team", name: "Manoj Patel" },
  { memberId: "INST-003", email: "ravi.singh@mss.solar", password: DEMO_PASSWORD, role: "installation_team", name: "Ravi Singh" },
  { memberId: "INST-004", email: "sunil.reddy@mss.solar", password: DEMO_PASSWORD, role: "installation_team", name: "Sunil Reddy" },
];

export const SUPER_ADMIN_MEMBER_ID = "SA-001";

export function findDemoUserByEmail(email: string): DemoLoginUser | undefined {
  const normalized = email.trim().toLowerCase();
  return DEMO_LOGIN_USERS.find((u) => u.email.toLowerCase() === normalized);
}

export function findDemoUserByMemberId(memberId: string): DemoLoginUser | undefined {
  return DEMO_LOGIN_USERS.find((u) => u.memberId === memberId);
}

export function demoUsersByRole(role: UserRole): DemoLoginUser[] {
  return DEMO_LOGIN_USERS.filter((u) => u.role === role);
}
