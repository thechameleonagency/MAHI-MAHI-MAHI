import type { AppState } from "@/contexts/AppDataContext";
import type { AppAction } from "@/domain/policies/permissionMatrix";
import type { SeedProfile } from "./seedLayerOrder";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDateAt } from "./seedTimeModel";
import { seedActor, pushAudit } from "./seedHelpers";
import { volumeTarget } from "./seedVolumeTargets";

const APP_ACTIONS: AppAction[] = [
  "enquiry:create", "customer:create", "quotation:create", "quotation:confirm",
  "project:create_from_quote", "project:create_direct_exception", "project:update_commercial",
  "project:update_execution", "inventory:material_movement", "finance:create_invoice",
  "finance:record_payment", "finance:update_payment", "finance:delete_payment",
  "finance:record_expense_income", "finance:update_expense", "finance:delete_expense",
  "finance:update_income", "finance:delete_income", "partner:update", "partner:delete",
  "partner:add_transaction", "loan:update", "loan:delete", "loan:add_repayment",
  "vendor:record_bill", "vendor:record_payment", "vendor:update_payment", "vendor:delete_payment",
  "hr:release_payroll", "hr:record_wallet", "hr:mark_holiday", "hr:update_employee",
  "approval:resolve",
];

const ACTION_META: Record<AppAction, { entityType: string; action: "create" | "update" | "delete"; role: Parameters<typeof seedActor>[0] }> = {
  "enquiry:create": { entityType: "Enquiry", action: "create", role: "salesperson" },
  "customer:create": { entityType: "Customer", action: "create", role: "salesperson" },
  "quotation:create": { entityType: "Quotation", action: "create", role: "salesperson" },
  "quotation:confirm": { entityType: "Quotation", action: "update", role: "admin" },
  "project:create_from_quote": { entityType: "Project", action: "create", role: "admin" },
  "project:create_direct_exception": { entityType: "Project", action: "create", role: "admin" },
  "project:update_commercial": { entityType: "Project", action: "update", role: "management" },
  "project:update_execution": { entityType: "Project", action: "update", role: "installation_team" },
  "inventory:material_movement": { entityType: "InventoryItem", action: "update", role: "admin" },
  "finance:create_invoice": { entityType: "Invoice", action: "create", role: "admin" },
  "finance:record_payment": { entityType: "Payment", action: "create", role: "management" },
  "finance:update_payment": { entityType: "Payment", action: "update", role: "admin" },
  "finance:delete_payment": { entityType: "Payment", action: "delete", role: "super_admin" },
  "finance:record_expense_income": { entityType: "Expense", action: "create", role: "management" },
  "finance:update_expense": { entityType: "Expense", action: "update", role: "admin" },
  "finance:delete_expense": { entityType: "Expense", action: "delete", role: "super_admin" },
  "finance:update_income": { entityType: "Income", action: "update", role: "admin" },
  "finance:delete_income": { entityType: "Income", action: "delete", role: "super_admin" },
  "partner:update": { entityType: "Partner", action: "update", role: "management" },
  "partner:delete": { entityType: "Partner", action: "delete", role: "super_admin" },
  "partner:add_transaction": { entityType: "PartnerTransaction", action: "create", role: "management" },
  "loan:update": { entityType: "Loan", action: "update", role: "management" },
  "loan:delete": { entityType: "Loan", action: "delete", role: "super_admin" },
  "loan:add_repayment": { entityType: "LoanRepayment", action: "create", role: "management" },
  "vendor:record_bill": { entityType: "VendorBill", action: "create", role: "admin" },
  "vendor:record_payment": { entityType: "VendorPayment", action: "create", role: "admin" },
  "vendor:update_payment": { entityType: "VendorPayment", action: "update", role: "admin" },
  "vendor:delete_payment": { entityType: "VendorPayment", action: "delete", role: "super_admin" },
  "hr:release_payroll": { entityType: "EmployeePayrollRecord", action: "create", role: "admin" },
  "hr:record_wallet": { entityType: "EmployeeWalletLedgerEntry", action: "create", role: "admin" },
  "hr:mark_holiday": { entityType: "EmployeePaidHoliday", action: "create", role: "admin" },
  "hr:update_employee": { entityType: "Employee", action: "update", role: "admin" },
  "approval:resolve": { entityType: "WorkStatusApproval", action: "update", role: "admin" },
};

/** §20 — ensure ≥1 audit row per AppAction + volume target 240–400. */
export function seedAuditCoverage(state: AppState, profile: SeedProfile): AppState {
  const existing = new Set(state.auditLogs.map((l) => l.field).filter(Boolean));

  for (let i = 0; i < APP_ACTIONS.length; i++) {
    const appAction = APP_ACTIONS[i];
    if (existing.has(appAction)) continue;
    const meta = ACTION_META[appAction];
    pushAudit(state, {
      action: meta.action,
      entityType: meta.entityType,
      entityId: seedId("AUD"),
      entityName: appAction,
      fraction: 0.82 + i * 0.002,
      role: meta.role,
      field: appAction,
    });
  }

  const target = volumeTarget(profile, "auditLogs", 280);
  const domains = [
    "ScheduledInstallation", "SiteVisit", "MaterialDamage", "Blockage",
    "ProjectChangeRequest", "BankReconciliation", "MaterialReservation",
    "AgentCommissionAccrual", "ProcurementNeedLine", "ClientPaymentRecord",
  ];
  let i = 0;
  while (state.auditLogs.length < target) {
    const domain = domains[i % domains.length];
    pushAudit(state, {
      action: i % 5 === 0 ? "delete" : i % 3 === 0 ? "update" : "create",
      entityType: domain,
      entityId: seedId(SEED_ID_PREFIX.auditLog),
      entityName: `${domain} operational trace ${i}`,
      fraction: 0.85 + (i % 100) * 0.001,
      role: i % 2 === 0 ? "admin" : "installation_team",
    });
    i++;
  }

  return state;
}
