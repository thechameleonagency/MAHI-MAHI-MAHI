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
  | "finance:update_payment"
  | "finance:delete_payment"
  | "finance:record_expense_income"
  | "finance:update_expense"
  | "finance:delete_expense"
  | "finance:update_income"
  | "finance:delete_income"
  | "partner:update"
  | "partner:delete"
  | "partner:add_transaction"
  | "loan:update"
  | "loan:delete"
  | "loan:add_repayment"
  | "vendor:record_bill"
  | "vendor:record_payment"
  | "vendor:update_payment"
  | "vendor:delete_payment"
  | "hr:release_payroll"
  | "hr:mark_holiday"
  | "hr:update_employee"
  | "approval:resolve";

type PermissionMatrix = Record<AppAction, UserRole[]>;

// Owners of the business (CEO / management) get sensible create + record + approve rights
// across every operational surface they already have read access to. Permission gates are NOT a
// soft-delete: if a role can see a button in the UI, the button must work for that role.
const actionPermissions: PermissionMatrix = {
  "enquiry:create": ["super_admin", "admin", "ceo", "management", "salesperson"],
  "quotation:create": ["super_admin", "admin", "ceo", "management", "salesperson"],
  "quotation:confirm": ["super_admin", "admin", "ceo", "management"],
  "project:create_from_quote": ["super_admin", "admin", "ceo", "management"],
  "project:create_direct_exception": ["super_admin", "admin", "ceo", "management"],
  "project:update_commercial": ["super_admin", "admin", "ceo", "management"],
  "project:update_execution": ["super_admin", "admin", "ceo", "management", "installation_team"],
  "inventory:material_movement": ["super_admin", "admin", "ceo", "management", "installation_team"],
  "finance:create_invoice": ["super_admin", "admin", "ceo", "management"],
  "finance:record_payment": ["super_admin", "admin", "ceo", "management"],
  "finance:update_payment": ["super_admin", "admin", "ceo", "management"],
  "finance:delete_payment": ["super_admin", "admin"],
  "finance:record_expense_income": ["super_admin", "admin", "ceo", "management"],
  "finance:update_expense": ["super_admin", "admin", "ceo", "management"],
  "finance:delete_expense": ["super_admin", "admin"],
  "finance:update_income": ["super_admin", "admin", "ceo", "management"],
  "finance:delete_income": ["super_admin", "admin"],
  "partner:update": ["super_admin", "admin", "ceo", "management"],
  "partner:delete": ["super_admin", "admin"],
  "partner:add_transaction": ["super_admin", "admin", "ceo", "management"],
  "loan:update": ["super_admin", "admin", "ceo", "management"],
  "loan:delete": ["super_admin", "admin"],
  "loan:add_repayment": ["super_admin", "admin", "ceo", "management"],
  "vendor:record_bill": ["super_admin", "admin", "ceo", "management"],
  "vendor:record_payment": ["super_admin", "admin", "ceo", "management"],
  "vendor:update_payment": ["super_admin", "admin", "ceo", "management"],
  "vendor:delete_payment": ["super_admin", "admin"],
  "hr:release_payroll": ["super_admin", "admin", "ceo", "management"],
  "hr:mark_holiday": ["super_admin", "admin", "ceo", "management"],
  "hr:update_employee": ["super_admin", "admin", "ceo", "management"],
  "approval:resolve": ["super_admin", "admin", "ceo", "management"],
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
  { exact: "/vendorship-companies", roles: ["super_admin", "admin", "ceo", "management"] },
  { exact: "/inc-work-sources", roles: ["super_admin", "admin", "ceo", "management"] },
  { exact: "/attendance", roles: ["super_admin", "admin", "ceo", "management", "installation_team"] },
  { exact: "/employees", roles: ["super_admin", "admin", "ceo", "management"] },
  { exact: "/analytics", roles: ["super_admin", "admin", "ceo", "management"] },
  { exact: "/audit", roles: ["super_admin", "admin", "ceo", "management"] },
  { exact: "/settings", roles: ["super_admin", "admin"] },
  /** Keep this list aligned with `src/App.tsx` routes; unknown URLs use 404 via `RouteAccessGate` + `isRegisteredAppRoute`. */
  { exact: "/notifications", roles: ["super_admin", "admin", "ceo", "management", "salesperson", "installation_team"] },
  { exact: "/customers", roles: ["super_admin", "admin", "ceo", "management", "salesperson"] },
  { exact: "/invoices", roles: ["super_admin", "admin", "ceo", "management"] },
  { exact: "/vendors", roles: ["super_admin", "admin", "ceo", "management"] },
  { exact: "/loans", roles: ["super_admin", "admin", "ceo", "management"] },
  { exact: "/agents", roles: ["super_admin", "admin", "ceo", "management", "salesperson"] },
  { exact: "/teams", roles: ["super_admin", "admin", "ceo", "management"] },
  { exact: "/timeline", roles: ["super_admin", "admin", "ceo", "management", "salesperson", "installation_team"] },
  { exact: "/inventory", roles: ["super_admin", "admin", "ceo", "management", "salesperson", "installation_team"] },
  { exact: "/settings/design-system", roles: ["super_admin", "admin"] },
];

export const canPerformAction = (role: UserRole, action: AppAction): boolean => {
  return actionPermissions[action].includes(role);
};

export const canAccessPath = (role: UserRole, path: string): boolean => {
  const pathname = path.split("?")[0].split("#")[0];
  const matched = routePermissions.find(
    (item) => pathname === item.exact || pathname.startsWith(`${item.exact}/`),
  );
  if (!matched) {
    return false;
  }

  return matched.roles.includes(role);
};
