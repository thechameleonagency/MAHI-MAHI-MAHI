/**
 * AR1 — documents the prototype's dual persistence paths and how they stay aligned.
 *
 * Canonical store: `mahi_solar_app_data` (AppDataContext).
 * Command-bus mirrors: `mss.repo.*` (localStorage JSON repos) — refreshed from AppState.
 */

import {
  APP_STATE_CONTEXT_ONLY_SLICES,
  PROTOTYPE_REPOSITORY_MIRROR_SLICES,
} from "@/infrastructure/repositories/prototypeRepositoryManifest";

export type PersistencePath = "command_bus" | "direct_app_state";

export type PersistenceModuleSpec = {
  id: string;
  label: string;
  path: PersistencePath;
  commands?: readonly string[];
  appActions?: readonly string[];
  notes: string;
};

/** Modules routed through CommandBus + repository mirrors. */
export const COMMAND_BUS_MODULES: readonly PersistenceModuleSpec[] = [
  {
    id: "enquiry",
    label: "Enquiries",
    path: "command_bus",
    commands: ["enquiry.create", "enquiry.update", "enquiry.update_status", "enquiry.convert"],
    appActions: ["enquiry:create"],
    notes: "Handler writes enquiryRepository + AuditService; AppData merges enquiries/audit from repos.",
  },
  {
    id: "quotation",
    label: "Quotations",
    path: "command_bus",
    commands: ["quotation.create", "quotation.update", "quotation.transition_status"],
    appActions: ["quotation:create", "quotation:confirm"],
    notes: "Terminal gates and revision history enforced in command handlers.",
  },
  {
    id: "project_command",
    label: "Projects (create / commercial)",
    path: "command_bus",
    commands: ["project.create_from_quote", "project.create_direct_exception", "project.update_commercial"],
    appActions: ["project:create_from_quote", "project:create_direct_exception", "project:update_commercial"],
    notes: "Lifecycle transitions on existing rows still use direct AppData + ProjectInvariantService.",
  },
  {
    id: "inventory",
    label: "Inventory movements",
    path: "command_bus",
    commands: ["inventory.material_movement_at_project", "inventory.warehouse_movement"],
    appActions: ["inventory:material_movement"],
    notes: "Merges projects, inventoryItems, auditLogs from repos; reservations patched in AppData.",
  },
] as const;

/** Finance / ops slices that mutate AppState directly (with audit helpers). */
export const DIRECT_APP_STATE_MODULES: readonly PersistenceModuleSpec[] = [
  {
    id: "finance_invoices",
    label: "Invoices & sale bills",
    path: "direct_app_state",
    appActions: ["finance:create_invoice"],
    notes: "Voucher post + review queue + reconcileProjectsAmountInvoiced in setState.",
  },
  {
    id: "finance_payments",
    label: "Payments & CPR",
    path: "direct_app_state",
    appActions: ["finance:record_payment", "finance:update_payment", "finance:delete_payment"],
    notes: "Client payment ledger linkage (FC10) applied in AppData reducers.",
  },
  {
    id: "finance_expense_income",
    label: "Expenses & income",
    path: "direct_app_state",
    appActions: [
      "finance:record_expense_income",
      "finance:update_expense",
      "finance:delete_expense",
      "finance:update_income",
      "finance:delete_income",
    ],
    notes: "UnifiedFinanceValidationService guards before persist.",
  },
  {
    id: "vendor_ops",
    label: "Vendor bills & payments",
    path: "direct_app_state",
    appActions: ["vendor:record_bill", "vendor:record_payment", "vendor:update_payment", "vendor:delete_payment"],
    notes: "Warehouse receipt ordering (ER6) and GL planning (MD7) in AppData.",
  },
  {
    id: "project_execution",
    label: "Project execution (tasks, timeline, blockages)",
    path: "direct_app_state",
    appActions: ["project:update_execution"],
    notes: "Progress-report task continuity (ER9) runs on task status done.",
  },
  {
    id: "hr_partner_loan",
    label: "HR, partners, loans",
    path: "direct_app_state",
    appActions: [
      "hr:release_payroll",
      "hr:record_wallet",
      "partner:add_transaction",
      "loan:add_repayment",
    ],
    notes: "Context-only finance/HR slices — no mss.repo mirror (sites/tasks/vendors are mirrored per AR3).",
  },
] as const;

export const DUAL_PERSISTENCE_SUMMARY =
  "CRM and inventory mutations go through the command bus into mss.repo mirrors; finance and field ops write AppState directly. Both paths now refresh mirrors immediately after each AppState commit so the next command sees current data.";

export const DUAL_PERSISTENCE_DIVERGENCE_RULE =
  "UI reads AppDataContext for all entities. Command-bus mirrors include sites, tasks, and vendors (AR3) so automation stays aligned; finance/vendor-bill/payment slices remain context-only. Mirrors sync before every command and after every AppState commit (AR1).";

export function mirroredRepositoryKeys(): string[] {
  return PROTOTYPE_REPOSITORY_MIRROR_SLICES.map((s) => s.key);
}

export function contextOnlySlices(): readonly string[] {
  return APP_STATE_CONTEXT_ONLY_SLICES;
}

export function moduleById(id: string): PersistenceModuleSpec | undefined {
  return [...COMMAND_BUS_MODULES, ...DIRECT_APP_STATE_MODULES].find((m) => m.id === id);
}
