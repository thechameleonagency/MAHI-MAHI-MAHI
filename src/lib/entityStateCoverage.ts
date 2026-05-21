/**
 * AR2 — which entities use formal state machines vs soft inline status unions.
 */

import type { AppState } from "@/contexts/AppDataContext";
import {
  canTransitionEnquiryStatus,
  type EnquiryStatus,
} from "@/domain/stateMachines/enquiryStateMachine";
import {
  canTransitionQuotationStatus,
  type QuotationStatus,
} from "@/domain/stateMachines/quotationStateMachine";
import {
  canonicalizeProjectLifecycleStatus,
  isCanonicalProjectLifecycleStatus,
  type ProjectLifecycleStatus,
} from "@/domain/stateMachines/projectStateMachine";

export type StateCoverageTier =
  | "machine_backed"
  | "command_guarded"
  | "invariant_gated"
  | "soft_state";

export type EntityStateSpec = {
  id: string;
  entity: string;
  typesFile: string;
  statusField: string;
  tier: StateCoverageTier;
  allowedValues: readonly string[];
  guard: string;
  notes: string;
};

const ENQUIRY_STATUSES: readonly EnquiryStatus[] = [
  "new",
  "meeting_scheduled",
  "quotation_sent",
  "quotation_rejected",
  "converted",
  "lost",
];

const QUOTATION_STATUSES: readonly QuotationStatus[] = [
  "draft",
  "sent",
  "approved",
  "rejected",
  "withdrawn",
  "converted_to_project",
];

const PROJECT_LIFECYCLE: readonly ProjectLifecycleStatus[] = [
  "New",
  "In Progress",
  "On Hold",
  "Completed",
  "Closed",
];

/** Formal machines in `src/domain/stateMachines/*`. */
export const MACHINE_BACKED_ENTITIES: readonly EntityStateSpec[] = [
  {
    id: "enquiry",
    entity: "Enquiry",
    typesFile: "project.ts",
    statusField: "status",
    tier: "machine_backed",
    allowedValues: ENQUIRY_STATUSES,
    guard: "canTransitionEnquiryStatus + enquiry.update_status command",
    notes: "Terminal lost/convert require reason; lost→new reopen admin-only.",
  },
  {
    id: "quotation",
    entity: "Quotation",
    typesFile: "project.ts",
    statusField: "status",
    tier: "machine_backed",
    allowedValues: QUOTATION_STATUSES,
    guard: "canTransitionQuotationStatus + quotation.transition_status command",
    notes: "Direct status patch blocked in quotation.update command; UI uses transition command.",
  },
  {
    id: "project_lifecycle",
    entity: "Project",
    typesFile: "project.ts",
    statusField: "lifecycleStatus",
    tier: "machine_backed",
    allowedValues: PROJECT_LIFECYCLE,
    guard: "canTransitionProjectStatus + canStartProject on updateProject",
    notes: "Legacy `status` mirrors lifecycle (UX1). Completion also gated by ProjectInvariantService.",
  },
] as const;

/** Command-only status paths (inventory has no standalone SM file). */
export const COMMAND_GUARDED_ENTITIES: readonly EntityStateSpec[] = [
  {
    id: "inventory_movement",
    entity: "Inventory movement",
    typesFile: "inventory.ts",
    statusField: "n/a",
    tier: "command_guarded",
    allowedValues: ["IssueToProject", "IssueToSite", "ReturnFromSite", "WarehouseIn", "WarehouseOut"],
    guard: "inventory.material_movement_at_project / inventory.warehouse_movement commands",
    notes: "Quantity and site rules enforced in command handlers, not a lifecycle enum on rows.",
  },
] as const;

/** Completion / start gates without a transition matrix on the status field itself. */
export const INVARIANT_GATED_ENTITIES: readonly EntityStateSpec[] = [
  {
    id: "project_completion",
    entity: "Project completion",
    typesFile: "ProjectInvariantService.ts",
    statusField: "lifecycleStatus → Completed",
    tier: "invariant_gated",
    allowedValues: PROJECT_LIFECYCLE,
    guard: "ProjectInvariantService.canMarkCompleted",
    notes: "Invoices paid, blockages, BOQ issued, partner settlement, accounting queue, documents.",
  },
] as const;

/** Inline unions — AppData or UI may set without transition matrix. */
export const SOFT_STATE_ENTITIES: readonly EntityStateSpec[] = [
  {
    id: "invoice",
    entity: "Invoice / SaleBill",
    typesFile: "finance.ts",
    statusField: "status",
    tier: "soft_state",
    allowedValues: ["draft", "pending", "partial", "paid", "overdue", "overpaid", "voided"],
    guard: "UnifiedFinanceValidationService + amountReceived derivation",
    notes: "Status derived from payments and void rules; not command-bus lifecycle.",
  },
  {
    id: "task",
    entity: "Task",
    typesFile: "project.ts",
    statusField: "status",
    tier: "soft_state",
    allowedValues: ["created", "sent", "checked", "started", "done"],
    guard: "updateTask in AppData; ER9 sync when done + photo tasks",
    notes: "Field roster uses sent/checked/started/done without formal transitions.",
  },
  {
    id: "work_status_approval",
    entity: "Progress report work status",
    typesFile: "blockage.ts",
    statusField: "workStatusApprovals[].status",
    tier: "soft_state",
    allowedValues: ["pending", "requested", "approved", "rejected", "closed"],
    guard: "progressReportWorkStatus + progressReportTaskContinuity",
    notes: "Per-stage approvals; photo tasks link via linkedTaskId.",
  },
  {
    id: "blockage",
    entity: "Blockage",
    typesFile: "blockage.ts",
    statusField: "status",
    tier: "soft_state",
    allowedValues: ["active", "resolved"],
    guard: "addBlockage / resolveBlockage in AppData",
    notes: "Active blockages block project completion invariant.",
  },
  {
    id: "change_request",
    entity: "Project change request",
    typesFile: "operations.ts",
    statusField: "status",
    tier: "soft_state",
    allowedValues: ["draft", "approved", "rejected"],
    guard: "validateChangeRequestDraft + approve/reject handlers",
    notes: "Approved CR may spawn delta invoice (FC3 continuity).",
  },
  {
    id: "vendor_bill",
    entity: "VendorBill",
    typesFile: "inventory.ts / finance",
    statusField: "status",
    tier: "soft_state",
    allowedValues: ["draft", "approved", "disputed", "pending", "partial", "paid"],
    guard: "vendor bill books + voucher posting",
    notes: "Payment amounts drive effective paid state.",
  },
  {
    id: "deletion_request",
    entity: "DeletionRequest",
    typesFile: "settings",
    statusField: "status",
    tier: "soft_state",
    allowedValues: ["pending", "approved", "rejected"],
    guard: "deletionRequestContinuity + Settings queue (PR2)",
    notes: "Approver role gated in UI.",
  },
  {
    id: "procurement_need",
    entity: "Procurement need line",
    typesFile: "operations.ts",
    statusField: "status",
    tier: "soft_state",
    allowedValues: ["pending", "acquired"],
    guard: "procurementNeedLineContinuity (FC9)",
    notes: "Acquire links vendorBillId.",
  },
  {
    id: "ticket",
    entity: "Operational ticket",
    typesFile: "blockage.ts",
    statusField: "status",
    tier: "soft_state",
    allowedValues: ["pending", "in-progress", "completed", "cancelled"],
    guard: "AppData ticket CRUD",
    notes: "Post-completion support only.",
  },
  {
    id: "agent_commission",
    entity: "Agent commission accrual",
    typesFile: "operations.ts",
    statusField: "status",
    tier: "soft_state",
    allowedValues: ["pending", "payable", "paid"],
    guard: "agentCommissionAccrualPolicy",
    notes: "Derived from quotation approval and project completion.",
  },
] as const;

export const ENTITY_STATE_COVERAGE_SUMMARY =
  "Enquiry, quotation, and project lifecycle are machine-backed with explicit transition guards. Finance, field tasks, progress approvals, and ops entities use soft inline status unions validated by domain helpers—not command lifecycle matrices.";

export const ENTITY_STATE_DIVERGENCE_RULE =
  "Never change enquiry/quotation/project lifecycle status without the matching canTransition* helper or command. Soft-state entities rely on continuity checks (ER*, FC*) after mutations.";

export const ALL_ENTITY_STATE_SPECS: readonly EntityStateSpec[] = [
  ...MACHINE_BACKED_ENTITIES,
  ...COMMAND_GUARDED_ENTITIES,
  ...INVARIANT_GATED_ENTITIES,
  ...SOFT_STATE_ENTITIES,
];

export function specsForTier(tier: StateCoverageTier): EntityStateSpec[] {
  return ALL_ENTITY_STATE_SPECS.filter((s) => s.tier === tier);
}

export function specById(id: string): EntityStateSpec | undefined {
  return ALL_ENTITY_STATE_SPECS.find((s) => s.id === id);
}

export type InvalidMachineBackedStatus = {
  entity: string;
  id: string;
  status: string;
  reason: string;
};

function isEnquiryStatus(v: string): v is EnquiryStatus {
  return (ENQUIRY_STATUSES as readonly string[]).includes(v);
}

function isQuotationStatus(v: string): v is QuotationStatus {
  return (QUOTATION_STATUSES as readonly string[]).includes(v);
}

/** Seed / hydrate integrity — machine-backed rows must use canonical status literals only. */
export function findInvalidMachineBackedStatuses(state: AppState): InvalidMachineBackedStatus[] {
  const invalid: InvalidMachineBackedStatus[] = [];

  for (const e of state.enquiries) {
    if (!isEnquiryStatus(e.status)) {
      invalid.push({
        entity: "Enquiry",
        id: e.id,
        status: e.status,
        reason: "status not in enquiry state machine union",
      });
    }
  }

  for (const q of state.quotations) {
    if (!isQuotationStatus(q.status)) {
      invalid.push({
        entity: "Quotation",
        id: q.id,
        status: q.status,
        reason: "status not in quotation state machine union",
      });
    }
  }

  for (const p of state.projects) {
    const raw = p.lifecycleStatus ?? p.status ?? "";
    if (!isCanonicalProjectLifecycleStatus(raw)) {
      invalid.push({
        entity: "Project",
        id: p.id,
        status: String(raw),
        reason: "lifecycleStatus not canonical (use canonicalizeProjectLifecycleStatus on hydrate)",
      });
    }
  }

  return invalid;
}

/** Expose transition helpers for tests and tooling. */
export const stateMachineGuards = {
  enquiry: canTransitionEnquiryStatus,
  quotation: canTransitionQuotationStatus,
  projectLifecycle: canonicalizeProjectLifecycleStatus,
} as const;
