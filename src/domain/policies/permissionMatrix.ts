import type { UserRole } from "@/domain/entities/identity";
import { canFeature, type Crud, type Feature, type FeaturePermissionMatrix } from "@/domain/policies/featurePermissions";
import { featureForPath } from "@/lib/routeFeatureMap";

export type AppAction =
  | "enquiry:create"
  | "customer:create"
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
  | "hr:record_wallet"
  | "hr:mark_holiday"
  | "hr:update_employee"
  | "approval:resolve";

/**
 * Phase 3.4 — Translation map from legacy `AppAction` keys to the new
 * `(Feature, Crud)` shape. New code should use `canFeature` directly; legacy
 * callsites continue to call `canPerformAction(role, action)` and get
 * delegated through this map.
 *
 * When a feature combo doesn't match exactly (e.g. "approval:resolve" is a
 * meta-action, not a feature), the table picks the closest feature+crud and
 * the test in `featurePermissions.test.ts` keeps both sides in agreement.
 */
const ACTION_TO_FEATURE: Record<AppAction, { feature: Feature; crud: Crud }> = {
  "enquiry:create": { feature: "enquiry", crud: "create" },
  "customer:create": { feature: "customer", crud: "create" },
  "quotation:create": { feature: "quotation", crud: "create" },
  "quotation:confirm": { feature: "quotationApprove", crud: "edit" },
  "project:create_from_quote": { feature: "project", crud: "create" },
  "project:create_direct_exception": { feature: "projectDirectCreate", crud: "create" },
  "project:update_commercial": { feature: "projectCommercial", crud: "edit" },
  "project:update_execution": { feature: "projectExecution", crud: "edit" },
  /** Stock ledger — not inventoryItem create/edit (see FEATURE_MATRIX_ROW_NOTES.inventoryItem). */
  "inventory:material_movement": { feature: "inventoryMovement", crud: "create" },
  "finance:create_invoice": { feature: "invoice", crud: "create" },
  "finance:record_payment": { feature: "payment", crud: "create" },
  "finance:update_payment": { feature: "payment", crud: "edit" },
  "finance:delete_payment": { feature: "payment", crud: "delete" },
  "finance:record_expense_income": { feature: "expense", crud: "create" },
  "finance:update_expense": { feature: "expense", crud: "edit" },
  "finance:delete_expense": { feature: "expense", crud: "delete" },
  "finance:update_income": { feature: "income", crud: "edit" },
  "finance:delete_income": { feature: "income", crud: "delete" },
  "partner:update": { feature: "partner", crud: "edit" },
  "partner:delete": { feature: "partner", crud: "delete" },
  "partner:add_transaction": { feature: "partnerTransaction", crud: "create" },
  "loan:update": { feature: "loan", crud: "edit" },
  "loan:delete": { feature: "loan", crud: "delete" },
  "loan:add_repayment": { feature: "loanRepayment", crud: "create" },
  "vendor:record_bill": { feature: "vendorBill", crud: "create" },
  "vendor:record_payment": { feature: "vendorPayment", crud: "create" },
  "vendor:update_payment": { feature: "vendorPayment", crud: "edit" },
  "vendor:delete_payment": { feature: "vendorPayment", crud: "delete" },
  "hr:release_payroll": { feature: "payroll", crud: "create" },
  "hr:record_wallet": { feature: "employeeWallet", crud: "create" },
  "hr:mark_holiday": { feature: "holiday", crud: "create" },
  "hr:update_employee": { feature: "employee", crud: "edit" },
  "approval:resolve": { feature: "project", crud: "edit" }, // resolving reviews = project mutation
};

/** Used by tests to verify the translation table is exhaustive. */
export function getActionToFeatureMap(): Readonly<Record<AppAction, { feature: Feature; crud: Crud }>> {
  return ACTION_TO_FEATURE;
}

type PermissionMatrix = Record<AppAction, UserRole[]>;

// Owners of the business (CEO / management) get sensible create + record + approve rights
// across every operational surface they already have read access to. Permission gates are NOT a
// soft-delete: if a role can see a button in the UI, the button must work for that role.
const actionPermissions: PermissionMatrix = {
  "enquiry:create": ["super_admin", "admin", "ceo", "management", "salesperson"],
  "customer:create": ["super_admin", "admin", "ceo", "management", "salesperson"],
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
  "hr:record_wallet": ["super_admin", "admin", "ceo", "management"],
  "hr:mark_holiday": ["super_admin", "admin", "ceo", "management"],
  "hr:update_employee": ["super_admin", "admin", "ceo", "management"],
  "approval:resolve": ["super_admin", "admin", "ceo", "management"],
};

type RoutePermissionConfig = {
  /** Exact path string. Also prefix-matches `${exact}/...` (used for `/projects/:id` etc.). */
  exact?: string;
  /** RegExp pattern. Use for detail routes whose path differs from the list page (`/inc-sources/:id` vs `/inc-work-sources`). */
  pattern?: RegExp;
  roles: UserRole[];
};

const routePermissions: RoutePermissionConfig[] = [
  { exact: "/", roles: ["super_admin", "admin", "ceo", "management", "salesperson", "installation_team"] },
  { exact: "/enquiries", roles: ["super_admin", "admin", "ceo", "management", "salesperson"] },
  { exact: "/quotations", roles: ["super_admin", "admin", "ceo", "management", "salesperson"] },
  { exact: "/projects", roles: ["super_admin", "admin", "ceo", "management", "salesperson", "installation_team"] },
  { exact: "/active-sites", roles: ["super_admin", "admin", "ceo", "management", "salesperson", "installation_team"] },
  { exact: "/inventory/materials", roles: ["super_admin", "admin", "ceo", "management", "salesperson", "installation_team"] },
  { exact: "/inventory/tools", roles: ["super_admin", "admin", "ceo", "management", "installation_team"] },
  { exact: "/templates", roles: ["super_admin", "admin", "ceo", "management", "salesperson"] },
  { exact: "/finance", roles: ["super_admin", "admin", "ceo", "management"] },
  { exact: "/partners", roles: ["super_admin", "admin", "ceo", "management"] },
  { exact: "/vendorship-companies", roles: ["super_admin", "admin", "ceo", "management"] },
  // Detail route uses different prefix `/vendorship/:id` — needs its own pattern entry.
  { pattern: /^\/vendorship\/[^/]+$/, roles: ["super_admin", "admin", "ceo", "management"] },
  { exact: "/inc-work-sources", roles: ["super_admin", "admin", "ceo", "management"] },
  // Detail route uses different prefix `/inc-sources/:id` — needs its own pattern entry.
  { pattern: /^\/inc-sources\/[^/]+$/, roles: ["super_admin", "admin", "ceo", "management"] },
  { exact: "/attendance", roles: ["super_admin", "admin", "ceo", "management", "installation_team"] },
  { exact: "/employees", roles: ["super_admin", "admin", "ceo", "management", "installation_team"] },
  { exact: "/analytics", roles: ["super_admin", "admin", "ceo", "management"] },
  { exact: "/audit", roles: ["super_admin", "admin", "ceo", "management"] },
  { exact: "/settings", roles: ["super_admin", "admin", "ceo", "management"] },
  /** Aligned with `isRegisteredAppRoute` (excludes legacy `<Navigate>` aliases in `App.tsx`). */
  { exact: "/notifications", roles: ["super_admin", "admin", "ceo", "management", "salesperson", "installation_team"] },
  { exact: "/customers", roles: ["super_admin", "admin", "ceo", "management", "salesperson"] },
  { exact: "/invoices", roles: ["super_admin", "admin", "ceo", "management"] },
  { exact: "/vendors", roles: ["super_admin", "admin", "ceo", "management"] },
  { exact: "/loans", roles: ["super_admin", "admin", "ceo", "management"] },
  { exact: "/agents", roles: ["super_admin", "admin", "ceo", "management", "salesperson"] },
  { exact: "/teams", roles: ["super_admin", "admin", "ceo", "management", "installation_team"] },
  { exact: "/timeline", roles: ["super_admin", "admin", "ceo", "management", "salesperson", "installation_team"] },
  { exact: "/calendar", roles: ["super_admin", "admin", "ceo", "management", "salesperson", "installation_team"] },
  { exact: "/inventory", roles: ["super_admin", "admin", "ceo", "management", "salesperson", "installation_team"] },
  { exact: "/settings/design-system", roles: ["super_admin", "admin", "ceo", "management"] },
];

/** Exact paths used in route ACL — each must be recognized by `isRegisteredAppRoute`. Patterns are excluded. */
export function getRoutePermissionExactPaths(): string[] {
  return routePermissions.map((c) => c.exact).filter((p): p is string => typeof p === "string");
}

/**
 * Phase 3.4 — Delegate to the new `canFeature` API via the translation map.
 *
 * Legacy callsites can keep using `canPerformAction(role, "finance:delete_payment")`
 * and will route through the `Feature × Crud` matrix in `featurePermissions.ts`,
 * honoring any runtime override.
 *
 * The hardcoded `actionPermissions` table above is no longer the source of truth —
 * it is retained only for the `permissionService.test.ts` snapshot and will be
 * removed in a later round once every legacy caller is migrated to `useCan`.
 */
export const canPerformAction = (
  role: UserRole,
  action: AppAction,
  override?: Partial<FeaturePermissionMatrix>,
): boolean => {
  if (role === "super_admin") return true;
  const mapped = ACTION_TO_FEATURE[action];
  if (!mapped) {
    // Legacy callsite passed an unknown action; fall back to the static table.
    return actionPermissions[action]?.includes(role) ?? false;
  }
  return canFeature(role, mapped.feature, mapped.crud, override);
};

/**
 * Route access is driven by {@link featureForPath} + `canFeature(…, "view")` so Settings → Role
 * Matrix overrides apply to navigation, deep links, and RouteAccessGate consistently.
 * Legacy `routePermissions` is only used for registered paths with no feature mapping.
 */
const matchRoutePermission = (pathname: string): RoutePermissionConfig | undefined =>
  routePermissions.find((item) => {
    if (item.exact !== undefined) {
      return pathname === item.exact || pathname.startsWith(`${item.exact}/`);
    }
    if (item.pattern) {
      return item.pattern.test(pathname);
    }
    return false;
  });

export const canAccessPath = (
  role: UserRole,
  path: string,
  override?: Partial<FeaturePermissionMatrix>,
): boolean => {
  const pathname = path.split("?")[0].split("#")[0];
  const feature = featureForPath(pathname);
  const matched = matchRoutePermission(pathname);
  if (!feature && !matched) {
    return false;
  }
  if (role === "super_admin") return true;
  if (feature) {
    return canFeature(role, feature, "view", override);
  }
  return matched!.roles.includes(role);
};
