import type { UserRole } from "@/domain/entities/identity";

export type AppAction =
  | "enquiry:create"
  | "quotation:create"
  | "quotation:confirm"
  | "project:create_from_quote"
  | "project:create_direct_exception"
  | "project:update_commercial"
  | "project:update_execution"
  | "inventory:material_movement"
  | "finance:create_invoice"
  | "finance:record_payment"
  | "finance:record_expense_income"
  | "hr:release_payroll"
  | "approval:resolve";

type PermissionMatrix = Record<AppAction, UserRole[]>;

const actionPermissions: PermissionMatrix = {
  "enquiry:create": ["super_admin", "admin", "salesperson"],
  "quotation:create": ["super_admin", "admin", "salesperson"],
  "quotation:confirm": ["super_admin", "admin"],
  "project:create_from_quote": ["super_admin", "admin"],
  "project:create_direct_exception": ["super_admin", "admin"],
  "project:update_commercial": ["super_admin", "admin"],
  "project:update_execution": ["super_admin", "admin", "installation_team"],
  "inventory:material_movement": ["super_admin", "admin"],
  "finance:create_invoice": ["super_admin", "admin"],
  "finance:record_payment": ["super_admin", "admin"],
  "finance:record_expense_income": ["super_admin", "admin"],
  "hr:release_payroll": ["super_admin", "admin"],
  "approval:resolve": ["super_admin", "admin", "management"],
};

type RoutePermissionConfig = {
  exact: string;
  roles: UserRole[];
};

const routePermissions: RoutePermissionConfig[] = [
  { exact: "/", roles: ["super_admin", "admin", "ceo", "management", "salesperson", "installation_team"] },
  { exact: "/enquiries", roles: ["super_admin", "admin", "ceo", "management", "salesperson"] },
  { exact: "/quotations", roles: ["super_admin", "admin", "ceo", "management", "salesperson"] },
  { exact: "/projects", roles: ["super_admin", "admin", "ceo", "management", "salesperson", "installation_team"] },
  { exact: "/active-sites", roles: ["super_admin", "admin", "ceo", "management", "salesperson", "installation_team"] },
  { exact: "/inventory/materials", roles: ["super_admin", "admin", "ceo", "management", "installation_team"] },
  { exact: "/inventory/tools", roles: ["super_admin", "admin", "ceo", "management", "installation_team"] },
  { exact: "/templates", roles: ["super_admin", "admin", "ceo", "management", "salesperson", "installation_team"] },
  { exact: "/finance", roles: ["super_admin", "admin", "ceo", "management"] },
  { exact: "/partners", roles: ["super_admin", "admin", "ceo", "management"] },
  { exact: "/attendance", roles: ["super_admin", "admin", "ceo", "management", "installation_team"] },
  { exact: "/employees", roles: ["super_admin", "admin", "ceo", "management"] },
  { exact: "/analytics", roles: ["super_admin", "admin", "ceo", "management"] },
  { exact: "/audit", roles: ["super_admin", "admin", "ceo", "management"] },
  { exact: "/settings", roles: ["super_admin", "admin"] },
];

export const canPerformAction = (role: UserRole, action: AppAction): boolean => {
  return actionPermissions[action].includes(role);
};

export const canAccessPath = (role: UserRole, path: string): boolean => {
  const matched = routePermissions.find((item) => path === item.exact || path.startsWith(`${item.exact}/`));
  if (!matched) {
    return true;
  }

  return matched.roles.includes(role);
};
