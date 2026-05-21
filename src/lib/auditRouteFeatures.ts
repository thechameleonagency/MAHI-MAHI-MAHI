import type { Feature } from "@/domain/policies/featurePermissions";

/** One Role Matrix row per registered `/audit/*` route (O5). */
export const AUDIT_ROUTE_FEATURE_DEFS = [
  { path: "/audit/chart-of-accounts", feature: "auditChartOfAccounts", label: "Chart of accounts" },
  { path: "/audit/profit-loss", feature: "auditProfitLoss", label: "Profit & loss" },
  { path: "/audit/inventory", feature: "auditInventory", label: "Inventory audit" },
  { path: "/audit/debtors-creditors", feature: "auditDebtorsCreditors", label: "Debtors / creditors" },
  { path: "/audit/gst", feature: "auditGst", label: "GST compliance" },
  { path: "/audit/cash-bank", feature: "auditCashBank", label: "Cash & bank" },
  { path: "/audit/expenses", feature: "auditExpenses", label: "Expense audit" },
  { path: "/audit/assets", feature: "auditAssets", label: "Fixed assets" },
  { path: "/audit/logs", feature: "auditLogs", label: "Audit logs" },
  { path: "/audit/reports", feature: "auditReports", label: "Reports & export" },
  { path: "/audit/data-flow", feature: "auditDataFlow", label: "Data flow" },
  { path: "/audit", feature: "auditDashboard", label: "Audit dashboard" },
] as const satisfies readonly { path: string; feature: Feature; label: string }[];

export type AuditViewFeature = (typeof AUDIT_ROUTE_FEATURE_DEFS)[number]["feature"];

export const AUDIT_VIEW_FEATURES: AuditViewFeature[] = AUDIT_ROUTE_FEATURE_DEFS.map((d) => d.feature);

/** Non-route audit write surfaces (Role Matrix + useCan). */
export const AUDIT_WRITE_FEATURES = ["auditBankReconciliation"] as const satisfies readonly Feature[];

export type AuditWriteFeature = (typeof AUDIT_WRITE_FEATURES)[number];

export const AUDIT_FEATURE_LABELS: Record<AuditViewFeature, string> = Object.fromEntries(
  AUDIT_ROUTE_FEATURE_DEFS.map((d) => [d.feature, d.label]),
) as Record<AuditViewFeature, string>;

export const AUDIT_WRITE_FEATURE_LABELS: Record<AuditWriteFeature, string> = {
  auditBankReconciliation: "Bank reconciliation (statements & matches)",
};

/** Route → feature entries for `ROUTE_VIEW_FEATURE` (longest-prefix match in `featureForPath`). */
export function auditRouteFeatureEntries(): { prefix: string; feature: Feature }[] {
  return AUDIT_ROUTE_FEATURE_DEFS.map(({ path, feature }) => ({ prefix: path, feature }));
}
