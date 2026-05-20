/**
 * Phase 3 — feature × role × CRUD permission matrix.
 *
 * Per the master plan, every action in the UI maps to one `Feature` + one `Crud` verb.
 * Pages call `useCan(feature, crud)` to decide whether to render a control.
 *
 * The matrix can be overridden at runtime via `RoleMatrixContext` (persisted to
 * localStorage under `mss.roleMatrix.v1`). Missing features fall back to defaults.
 *
 * `super_admin` always returns true regardless of matrix contents.
 */
import type { UserRole } from "@/domain/entities/identity";
import { AUDIT_VIEW_FEATURES, type AuditViewFeature } from "@/lib/auditRouteFeatures";

export type Feature =
  // Pipeline
  | "enquiry" | "customer" | "quotation" | "quotationApprove" | "agent" | "agentCommission"
  // Operations
  | "project" | "projectDirectCreate" | "projectCommercial" | "projectExecution" | "projectAudit"
  | "site" | "task" | "siteVisit" | "scheduleInstallation"
  | "materialReservation" | "materialDamage" | "blockage"
  | "inventoryItem" | "inventoryMovement" | "tool" | "toolMovement"
  | "template"
  // Finance
  | "financeHub"
  | "invoice" | "saleBill" | "payment" | "expense" | "income"
  | "vendor" | "vendorBill" | "vendorPayment"
  | "partner" | "partnerTransaction"
  | "loan" | "loanRepayment"
  // People
  | "employee" | "team" | "attendance" | "holiday" | "payroll" | "employeeWallet"
  // Audit & Books — one feature per `/audit/*` page (Role Matrix row controls route access)
  | "auditDashboard" | "auditChartOfAccounts" | "auditProfitLoss" | "auditInventory"
  | "auditDebtorsCreditors" | "auditGst" | "auditCashBank" | "auditExpenses" | "auditAssets"
  | "auditLogs" | "auditReports" | "auditDataFlow"
  // System / read-mostly pages
  | "analytics" | "calendar" | "timeline" | "dashboard" | "notifications"
  // Settings sub-areas
  | "settingsProfile" | "settingsCompany" | "settingsTheme" | "settingsSecurity"
  | "settingsTeam" | "settingsData" | "settingsMasters" | "settingsRoleMatrix"
  | "resetPrototype";

export type Crud = "view" | "create" | "edit" | "delete";

export type FeaturePermissionMatrix = Record<Feature, Record<Crud, UserRole[]>>;

/**
 * Human-readable notes for matrix rows where View/Create columns look inconsistent by design.
 * Shown in Settings → Masters reference matrix and Role Matrix editor.
 */
export const FEATURE_MATRIX_ROW_NOTES: Partial<Record<Feature, string>> = {
  inventoryItem:
    "Catalog master data. Field roles get view-only here; issue/return/receive stock uses inventoryMovement (not create/edit on this row).",
  inventoryMovement:
    "Stock ledger (issue, return, receive). Separate from inventoryItem; movement reversal is super_admin-only in AppDataContext.",
  employeeWallet:
    "Formal advance/recovery ledger on Employee Profile. Admin/management create; CEO view-only. Employee salary advances in attendance come from expense records (expense feature), not auto-synced here.",
  auditProfitLoss:
    "Controls /audit/profit-loss only. Independent from Cash & bank and other audit sub-pages.",
  auditCashBank: "Controls /audit/cash-bank only. Independent from Profit & loss and other audit sub-pages.",
};

/** Compact helper to build a row: `r("view,create", ["admin", "management"])`. */
const r = (
  view: UserRole[],
  create: UserRole[],
  edit: UserRole[],
  del: UserRole[],
): Record<Crud, UserRole[]> => ({ view, create, edit, delete: del });

const ALL_NON_SUPER: UserRole[] = ["admin", "ceo", "management", "salesperson", "installation_team"];
const ADMIN_MGMT: UserRole[] = ["admin", "management"];
const ADMIN_MGMT_CEO_VIEW: UserRole[] = ["admin", "ceo", "management"];
const ADMIN_ONLY: UserRole[] = ["admin"];
const NONE: UserRole[] = [];

export const DEFAULT_FEATURE_PERMISSIONS: FeaturePermissionMatrix = {
  // ============ PIPELINE ============
  enquiry: r(
    [...ADMIN_MGMT_CEO_VIEW, "salesperson"],
    [...ADMIN_MGMT, "salesperson"],
    [...ADMIN_MGMT, "salesperson"], // edit-own enforced per row
    ADMIN_MGMT,
  ),
  customer: r(
    [...ADMIN_MGMT_CEO_VIEW, "salesperson"],
    [...ADMIN_MGMT, "salesperson"],
    ADMIN_MGMT,
    ADMIN_MGMT,
  ),
  quotation: r(
    [...ADMIN_MGMT_CEO_VIEW, "salesperson"],
    [...ADMIN_MGMT, "salesperson"],
    [...ADMIN_MGMT, "salesperson"], // edit-own enforced per row
    ADMIN_ONLY, // delete reserved for admin+
  ),
  /** Approve / confirm a quotation — CEO can approve in addition to admin/management. */
  quotationApprove: r(ADMIN_MGMT_CEO_VIEW, ADMIN_MGMT_CEO_VIEW, ADMIN_MGMT_CEO_VIEW, NONE),
  agent: r(
    [...ADMIN_MGMT_CEO_VIEW, "salesperson"],
    ADMIN_MGMT,
    ADMIN_MGMT,
    ADMIN_ONLY,
  ),
  agentCommission: r(ADMIN_MGMT_CEO_VIEW, ADMIN_MGMT, ADMIN_MGMT, ADMIN_ONLY),

  // ============ OPERATIONS ============
  project: r(
    [...ADMIN_MGMT_CEO_VIEW, "salesperson", "installation_team"], // salesperson sees only won-from-own-quo; installation only assigned
    ADMIN_MGMT_CEO_VIEW, // create-from-quote includes CEO (high-level approval)
    ADMIN_MGMT,
    ADMIN_ONLY,
  ),
  /** Direct-exception create (without quotation) — admin / management only; CEO blocked. */
  projectDirectCreate: r(ADMIN_MGMT_CEO_VIEW, ADMIN_MGMT, ADMIN_MGMT, NONE),
  projectCommercial: r(ADMIN_MGMT_CEO_VIEW, ADMIN_MGMT, ADMIN_MGMT, ADMIN_ONLY),
  projectExecution: r(
    [...ADMIN_MGMT_CEO_VIEW, "installation_team"],
    [...ADMIN_MGMT, "installation_team"],
    [...ADMIN_MGMT, "installation_team"],
    ADMIN_MGMT,
  ),
  projectAudit: r(ADMIN_MGMT_CEO_VIEW, NONE, NONE, NONE),
  site: r([...ADMIN_MGMT_CEO_VIEW, "installation_team"], ADMIN_MGMT, ADMIN_MGMT, ADMIN_MGMT),
  task: r(
    [...ADMIN_MGMT_CEO_VIEW, "installation_team"],
    [...ADMIN_MGMT, "installation_team"],
    [...ADMIN_MGMT, "installation_team"],
    ADMIN_MGMT,
  ),
  siteVisit: r(
    [...ADMIN_MGMT_CEO_VIEW, "installation_team"],
    [...ADMIN_MGMT, "installation_team"],
    [...ADMIN_MGMT, "installation_team"],
    ADMIN_MGMT,
  ),
  scheduleInstallation: r(
    [...ADMIN_MGMT_CEO_VIEW, "installation_team"],
    [...ADMIN_MGMT, "installation_team"],
    [...ADMIN_MGMT, "installation_team"],
    ADMIN_MGMT,
  ),
  materialReservation: r(ADMIN_MGMT_CEO_VIEW, ADMIN_MGMT, ADMIN_MGMT, ADMIN_MGMT),
  materialDamage: r(
    [...ADMIN_MGMT_CEO_VIEW, "installation_team"],
    [...ADMIN_MGMT, "installation_team"],
    ADMIN_MGMT,
    ADMIN_MGMT,
  ),
  blockage: r(
    [...ADMIN_MGMT_CEO_VIEW, "installation_team"],
    [...ADMIN_MGMT, "installation_team"],
    [...ADMIN_MGMT, "installation_team"],
    ADMIN_MGMT,
  ),
  // Catalog master data (SKU, min stock, pricing). installation_team + salesperson get view-only
  // so they can pick materials in quotes / site flows; stock changes are gated under inventoryMovement.
  inventoryItem: r(
    [...ADMIN_MGMT_CEO_VIEW, "salesperson", "installation_team"],
    ADMIN_MGMT,
    ADMIN_MGMT,
    ADMIN_MGMT,
  ),
  inventoryMovement: r(
    [...ADMIN_MGMT_CEO_VIEW, "installation_team"],
    [...ADMIN_MGMT, "installation_team"],
    ADMIN_MGMT,
    NONE, // delete unused; reversal is super_admin only in AppDataContext.reverseInventoryMovement / reverseToolMovement
  ),
  tool: r(
    [...ADMIN_MGMT_CEO_VIEW, "installation_team"],
    ADMIN_MGMT,
    ADMIN_MGMT,
    ADMIN_MGMT,
  ),
  toolMovement: r(
    [...ADMIN_MGMT_CEO_VIEW, "installation_team"],
    [...ADMIN_MGMT, "installation_team"],
    ADMIN_MGMT,
    NONE,
  ),
  /** Shared quotation / site-checklist BOM templates — salesperson view; installation team uses materials only. */
  template: r(
    [...ADMIN_MGMT_CEO_VIEW, "salesperson"],
    ADMIN_MGMT,
    ADMIN_MGMT,
    ADMIN_MGMT,
  ),

  // ============ FINANCE ============
  /** Finance Hub (`/finance`) — route gate; sub-areas use invoice / expense / payment / … view. */
  financeHub: r(ADMIN_MGMT_CEO_VIEW, NONE, NONE, NONE),
  invoice: r(ADMIN_MGMT_CEO_VIEW, ADMIN_MGMT, ADMIN_MGMT, NONE),
  saleBill: r(ADMIN_MGMT_CEO_VIEW, ADMIN_MGMT, ADMIN_MGMT, NONE),
  payment: r(ADMIN_MGMT_CEO_VIEW, ADMIN_MGMT, ADMIN_MGMT, ADMIN_ONLY),
  expense: r(ADMIN_MGMT_CEO_VIEW, ADMIN_MGMT, ADMIN_MGMT, ADMIN_ONLY),
  income: r(ADMIN_MGMT_CEO_VIEW, ADMIN_MGMT, ADMIN_MGMT, ADMIN_ONLY),
  vendor: r(ADMIN_MGMT_CEO_VIEW, ADMIN_MGMT, ADMIN_MGMT, ADMIN_ONLY),
  vendorBill: r(ADMIN_MGMT_CEO_VIEW, ADMIN_MGMT, ADMIN_MGMT, ADMIN_MGMT),
  vendorPayment: r(ADMIN_MGMT_CEO_VIEW, ADMIN_MGMT, ADMIN_MGMT, ADMIN_MGMT),
  partner: r(ADMIN_MGMT_CEO_VIEW, ADMIN_MGMT, ADMIN_MGMT, ADMIN_ONLY),
  partnerTransaction: r(ADMIN_MGMT_CEO_VIEW, ADMIN_MGMT, ADMIN_MGMT, ADMIN_MGMT),
  loan: r(ADMIN_MGMT_CEO_VIEW, ADMIN_MGMT, ADMIN_MGMT, ADMIN_ONLY),
  loanRepayment: r(ADMIN_MGMT_CEO_VIEW, ADMIN_MGMT, ADMIN_MGMT, ADMIN_MGMT),

  // ============ PEOPLE ============
  employee: r(
    [...ADMIN_MGMT_CEO_VIEW, "installation_team"], // installation_team sees own+teammates only — enforced per row
    ADMIN_MGMT,
    ADMIN_MGMT,
    ADMIN_MGMT,
  ),
  team: r(
    [...ADMIN_MGMT_CEO_VIEW, "installation_team"],
    ADMIN_MGMT,
    ADMIN_MGMT,
    ADMIN_MGMT,
  ),
  attendance: r(
    [...ADMIN_MGMT_CEO_VIEW, "installation_team"],
    [...ADMIN_MGMT, "installation_team"],
    ADMIN_MGMT,
    ADMIN_MGMT,
  ),
  holiday: r(ADMIN_MGMT_CEO_VIEW, ADMIN_MGMT, ADMIN_MGMT, ADMIN_MGMT),
  payroll: r(ADMIN_MGMT_CEO_VIEW, ADMIN_MGMT, ADMIN_MGMT, ADMIN_ONLY),
  /** Aligns with who can post employee advance expenses; distinct from `expense` (see FEATURE_MATRIX_ROW_NOTES). */
  employeeWallet: r(ADMIN_MGMT_CEO_VIEW, ADMIN_MGMT, ADMIN_MGMT, ADMIN_ONLY),

  // ============ AUDIT (per page) + ANALYTICS + SYSTEM PAGES ============
  auditDashboard: r(ADMIN_MGMT_CEO_VIEW, NONE, NONE, NONE),
  auditChartOfAccounts: r(ADMIN_MGMT_CEO_VIEW, NONE, NONE, NONE),
  auditProfitLoss: r(ADMIN_MGMT_CEO_VIEW, NONE, NONE, NONE),
  auditInventory: r(ADMIN_MGMT_CEO_VIEW, NONE, NONE, NONE),
  auditDebtorsCreditors: r(ADMIN_MGMT_CEO_VIEW, NONE, NONE, NONE),
  auditGst: r(ADMIN_MGMT_CEO_VIEW, NONE, NONE, NONE),
  auditCashBank: r(ADMIN_MGMT_CEO_VIEW, NONE, NONE, NONE),
  auditExpenses: r(ADMIN_MGMT_CEO_VIEW, NONE, NONE, NONE),
  auditAssets: r(ADMIN_MGMT_CEO_VIEW, NONE, NONE, NONE),
  auditLogs: r(ADMIN_MGMT_CEO_VIEW, NONE, NONE, NONE),
  auditReports: r(ADMIN_MGMT_CEO_VIEW, NONE, NONE, NONE),
  auditDataFlow: r(ADMIN_MGMT_CEO_VIEW, NONE, NONE, NONE),
  analytics: r(ADMIN_MGMT_CEO_VIEW, NONE, NONE, NONE),
  calendar: r(ALL_NON_SUPER, ADMIN_MGMT, ADMIN_MGMT, ADMIN_MGMT),
  timeline: r(
    [...ADMIN_MGMT_CEO_VIEW, "installation_team"],
    [...ADMIN_MGMT, "installation_team"],
    [...ADMIN_MGMT, "installation_team"],
    ADMIN_MGMT,
  ),
  dashboard: r(ALL_NON_SUPER, NONE, NONE, NONE),
  notifications: r(ALL_NON_SUPER, NONE, NONE, NONE),

  // ============ SETTINGS ============
  settingsProfile: r(ALL_NON_SUPER, NONE, ALL_NON_SUPER, NONE),
  settingsCompany: r(ADMIN_MGMT, NONE, ADMIN_MGMT, NONE),
  settingsTheme: r(ADMIN_MGMT, NONE, ADMIN_MGMT, NONE),
  settingsSecurity: r(ADMIN_MGMT, NONE, ADMIN_MGMT, NONE),
  settingsTeam: r(ADMIN_MGMT, ADMIN_MGMT, ADMIN_MGMT, ADMIN_MGMT),
  settingsData: r(NONE, NONE, NONE, NONE), // super_admin only
  settingsMasters: r(["admin", "management"], ADMIN_ONLY, ADMIN_ONLY, ADMIN_ONLY),
  settingsRoleMatrix: r(NONE, NONE, NONE, NONE), // super_admin only
  resetPrototype: r(NONE, NONE, NONE, NONE), // super_admin only
};

/**
 * Returns true if `role` is allowed `crud` on `feature`. `super_admin` always wins.
 *
 * @param override If provided, this matrix replaces individual feature rows. Missing rows fall back to defaults.
 */
export function canFeature(
  role: UserRole,
  feature: Feature,
  crud: Crud,
  override?: Partial<FeaturePermissionMatrix>,
): boolean {
  if (role === "super_admin") return true;
  const row = override?.[feature] ?? DEFAULT_FEATURE_PERMISSIONS[feature];
  return row[crud].includes(role);
}

/**
 * Returns the full {view, create, edit, delete} flags for one feature under the given role.
 * Convenience for components that need multiple verbs at once.
 */
export function featureFlags(
  role: UserRole,
  feature: Feature,
  override?: Partial<FeaturePermissionMatrix>,
): Record<Crud, boolean> {
  return {
    view: canFeature(role, feature, "view", override),
    create: canFeature(role, feature, "create", override),
    edit: canFeature(role, feature, "edit", override),
    delete: canFeature(role, feature, "delete", override),
  };
}

/** Used by `permissionMatrix.ts` to delegate legacy AppAction → (feature, crud). */
export function isFeature(value: string): value is Feature {
  return value in DEFAULT_FEATURE_PERMISSIONS;
}

function deepClonePermissionData<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Deep-clone a permission matrix for draft editing without mutating defaults. */
export function cloneFeaturePermissionMatrix(
  source: FeaturePermissionMatrix = DEFAULT_FEATURE_PERMISSIONS,
): FeaturePermissionMatrix {
  return deepClonePermissionData(source);
}

/** @deprecated Pre-O5 single row for all `/audit/*` routes — migrated on load/save. */
const LEGACY_AUDIT_PAGE_KEY = "auditPage" as const;

type LegacyAuditPageRow = Record<Crud, UserRole[]>;

/**
 * Expands saved overrides that still use `auditPage` into per-route audit features (O5).
 */
export function migrateRoleMatrixOverride(
  override?: Partial<FeaturePermissionMatrix> & { [LEGACY_AUDIT_PAGE_KEY]?: LegacyAuditPageRow },
): Partial<FeaturePermissionMatrix> | undefined {
  if (!override) return undefined;
  const legacy = override[LEGACY_AUDIT_PAGE_KEY];
  if (!legacy) return override as Partial<FeaturePermissionMatrix>;

  const { [LEGACY_AUDIT_PAGE_KEY]: _removed, ...rest } = override;
  const migrated: Partial<FeaturePermissionMatrix> = { ...(rest as Partial<FeaturePermissionMatrix>) };
  const viewRoles = legacy.view ?? DEFAULT_FEATURE_PERMISSIONS.auditDashboard.view;

  for (const feature of AUDIT_VIEW_FEATURES) {
    if (!migrated[feature]) {
      migrated[feature] = {
        ...DEFAULT_FEATURE_PERMISSIONS[feature as AuditViewFeature],
        view: [...viewRoles],
      };
    }
  }
  return migrated;
}

/** Editable Role Matrix draft: cloned defaults with optional override rows cloned on top. */
export function buildFeaturePermissionMatrixDraft(
  override?: Partial<FeaturePermissionMatrix>,
): FeaturePermissionMatrix {
  const normalized = migrateRoleMatrixOverride(
    override as Partial<FeaturePermissionMatrix> & { auditPage?: LegacyAuditPageRow },
  );
  const merged = cloneFeaturePermissionMatrix(DEFAULT_FEATURE_PERMISSIONS);
  if (!normalized) return merged;
  for (const key of Object.keys(normalized) as Feature[]) {
    const row = normalized[key];
    if (row) merged[key] = deepClonePermissionData(row);
  }
  return merged;
}
