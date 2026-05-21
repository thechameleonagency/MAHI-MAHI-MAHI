import type { ClientPaymentRecord } from "@/types/blockage";
import type { Customer, Income, Invoice, Payment } from "@/types/finance";
import type { Project } from "@/types/project";
import { getProjectAmountReceived, isActiveBill } from "@/lib/billingSelectors";
import { isIncGivenProject } from "@/lib/incGiverLedgerContinuity";

/**
 * Payment rows emitted from {@link addClientPaymentRecord} use this id/reference prefix.
 * Write-path overview: `customerInflowWritePaths.ts` (E10).
 */
export const CLIENT_PAYMENT_RECORD_PAYMENT_PREFIX = "cpr:";

export function clientPaymentRecordPaymentId(recordId: string): string {
  return `${CLIENT_PAYMENT_RECORD_PAYMENT_PREFIX}${recordId}`;
}

export function isClientPaymentRecordPayment(payment: Payment): boolean {
  return (
    payment.id.startsWith(CLIENT_PAYMENT_RECORD_PAYMENT_PREFIX) ||
    (payment.reference?.startsWith(CLIENT_PAYMENT_RECORD_PAYMENT_PREFIX) ?? false)
  );
}

function invoiceStatusFromReceived(total: number, received: number): Invoice["status"] {
  if (received <= 0) return "pending";
  if (received >= total - 0.01) return "paid";
  return "partial";
}

/** Strip erroneous `amountReceived` on voided/draft billing documents (FC6). */
export function normalizeNonCollectibleBillingDocuments<T extends Invoice>(docs: T[]): T[] {
  return docs.map((inv) => (isActiveBill(inv) ? inv : { ...inv, amountReceived: 0 }));
}

/** FIFO-apply a client payment amount against a project's open invoices (oldest invoice date first). */
export function fifoApplyClientPaymentToInvoices(
  invoices: Invoice[],
  projectId: string,
  amount: number,
  paymentDate: string,
  paymentMode: string,
  saleBills: Invoice[] = [],
): Invoice[] {
  const applied = fifoApplyClientPaymentToBilling(
    invoices,
    saleBills,
    projectId,
    amount,
    paymentDate,
    paymentMode,
  );
  return applied.invoices;
}

/** FIFO-apply CPR/client payment across invoices and sale bills for one project (ER5). */
export function fifoApplyClientPaymentToBilling(
  invoices: Invoice[],
  saleBills: Invoice[],
  projectId: string,
  amount: number,
  paymentDate: string,
  paymentMode: string,
): { invoices: Invoice[]; saleBills: Invoice[] } {
  let remaining = amount;
  type Tagged = { collection: "invoices" | "saleBills"; doc: Invoice };
  const queue: Tagged[] = [
    ...invoices
      .filter((inv) => inv.projectId === projectId && isActiveBill(inv))
      .map((doc) => ({ collection: "invoices" as const, doc })),
    ...saleBills
      .filter((inv) => inv.projectId === projectId && isActiveBill(inv))
      .map((doc) => ({ collection: "saleBills" as const, doc })),
  ].sort(
    (a, b) =>
      new Date(a.doc.invoiceDate || a.doc.dueDate || 0).getTime() -
      new Date(b.doc.invoiceDate || b.doc.dueDate || 0).getTime(),
  );

  const invoiceUpdates = new Map<string, Invoice>();
  const saleBillUpdates = new Map<string, Invoice>();

  for (const { collection, doc } of queue) {
    if (remaining <= 0) break;
    const due = (doc.total || 0) - (doc.amountReceived || 0);
    if (due <= 0) continue;
    const pay = Math.min(due, remaining);
    remaining -= pay;
    const nextReceived = (doc.amountReceived || 0) + pay;
    const nextDoc = {
      ...doc,
      amountReceived: nextReceived,
      status: invoiceStatusFromReceived(doc.total || 0, nextReceived),
      receivedDate: paymentDate,
      receivedIn: paymentMode,
    };
    if (collection === "invoices") invoiceUpdates.set(doc.id, nextDoc);
    else saleBillUpdates.set(doc.id, nextDoc);
  }

  return {
    invoices: invoices.map((inv) => invoiceUpdates.get(inv.id) ?? inv),
    saleBills: saleBills.map((inv) => saleBillUpdates.get(inv.id) ?? inv),
  };
}

export function paymentReceivedOnInvoice(payments: Payment[], invoiceId: string): number {
  return payments
    .filter(
      (p) =>
        p.direction === "in" &&
        p.invoiceId === invoiceId &&
        !isClientPaymentRecordPayment(p),
    )
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);
}

export function buildClientPaymentRecordPaymentRow(
  record: ClientPaymentRecord,
  customerName?: string,
): Payment {
  const compositeKey = clientPaymentRecordPaymentId(record.id);
  return {
    id: compositeKey,
    date: record.date,
    amount: record.amount,
    direction: "in",
    paymentMode: record.paymentMode,
    counterpartyType: "customer",
    counterpartyId: record.projectId,
    counterpartyName: customerName ?? "",
    projectId: record.projectId,
    notes: record.notes ?? `Client payment (record ${record.id})`,
    reference: compositeKey,
  };
}

/**
 * Idempotent boot-time reconciliation:
 * - ensures each clientPaymentRecord has a matching Payment row
 * - replays FIFO invoice allocation from CPRs (non-CPR invoice payments kept as baseline)
 * - syncs project.amountReceived from inbound payments on the project
 */
export function reconcileClientPaymentLedger(input: {
  clientPaymentRecords: ClientPaymentRecord[];
  payments: Payment[];
  invoices: Invoice[];
  saleBills?: Invoice[];
  projects: Project[];
  /** Standalone project incomes (excludes rows linked to payments — see `incomeCountsTowardProjectReceived`). */
  incomes?: Income[];
}): {
  payments: Payment[];
  invoices: Invoice[];
  saleBills: Invoice[];
  projects: Project[];
} {
  const { clientPaymentRecords } = input;
  let payments = [...input.payments];
  const missing: Payment[] = [];

  for (const record of clientPaymentRecords) {
    const compositeKey = clientPaymentRecordPaymentId(record.id);
    const exists = payments.some(
      (p) => p.id === compositeKey || p.reference === compositeKey,
    );
    if (!exists) {
      missing.push(buildClientPaymentRecordPaymentRow(record));
    }
  }
  if (missing.length > 0) {
    payments = [...missing, ...payments];
  }

  const projectIds = new Set(clientPaymentRecords.map((r) => r.projectId));
  const saleBillsIn = input.saleBills ?? [];

  const baselineBillingRow = (inv: Invoice): Invoice => {
    if (!isActiveBill(inv)) {
      return { ...inv, amountReceived: 0 };
    }
    const baseReceived = paymentReceivedOnInvoice(payments, inv.id);
    return {
      ...inv,
      amountReceived: baseReceived,
      status: invoiceStatusFromReceived(inv.total || 0, baseReceived),
    };
  };

  let invoices = input.invoices.map(baselineBillingRow);
  let saleBills = saleBillsIn.map(baselineBillingRow);

  const recordsByProject = new Map<string, ClientPaymentRecord[]>();
  for (const record of clientPaymentRecords) {
    const list = recordsByProject.get(record.projectId) ?? [];
    list.push(record);
    recordsByProject.set(record.projectId, list);
  }

  for (const [, records] of recordsByProject) {
    const sorted = [...records].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    for (const record of sorted) {
      const applied = fifoApplyClientPaymentToBilling(
        invoices,
        saleBills,
        record.projectId,
        record.amount,
        record.date,
        record.paymentMode,
      );
      invoices = applied.invoices;
      saleBills = applied.saleBills;
    }
  }

  const incomes = input.incomes ?? [];
  const projects = input.projects.map((project) => ({
    ...project,
    amountReceived: isIncGivenProject(project)
      ? (project.amountReceived ?? 0)
      : getProjectAmountReceived(project.id, payments, incomes),
  }));

  return { payments, invoices, saleBills, projects };
}

export type ClientPaymentLedgerReconcileSummary = {
  changed: boolean;
  clientPaymentRecordCount: number;
  paymentsAdded: number;
  invoicesAllocationAdjusted: number;
  projectsAmountReceivedSynced: number;
};

/** Diff before/after boot reconcile for DEV toast and console tracing (O10). */
export function summarizeClientPaymentLedgerReconcile(
  before: {
    payments: Payment[];
    invoices: Invoice[];
    projects: Project[];
  },
  after: {
    payments: Payment[];
    invoices: Invoice[];
    projects: Project[];
  },
  clientPaymentRecordCount: number,
): ClientPaymentLedgerReconcileSummary {
  const beforePaymentIds = new Set(before.payments.map((p) => p.id));
  const paymentsAdded = after.payments.filter((p) => !beforePaymentIds.has(p.id)).length;

  const invoiceBefore = new Map(before.invoices.map((inv) => [inv.id, inv]));
  let invoicesAllocationAdjusted = 0;
  for (const inv of after.invoices) {
    const prev = invoiceBefore.get(inv.id);
    if (!prev) continue;
    if (
      (prev.amountReceived ?? 0) !== (inv.amountReceived ?? 0) ||
      prev.status !== inv.status
    ) {
      invoicesAllocationAdjusted += 1;
    }
  }

  const projectBefore = new Map(before.projects.map((p) => [p.id, p]));
  let projectsAmountReceivedSynced = 0;
  for (const proj of after.projects) {
    const prev = projectBefore.get(proj.id);
    if (!prev) continue;
    if ((prev.amountReceived ?? 0) !== (proj.amountReceived ?? 0)) {
      projectsAmountReceivedSynced += 1;
    }
  }

  const changed =
    paymentsAdded > 0 ||
    invoicesAllocationAdjusted > 0 ||
    projectsAmountReceivedSynced > 0;

  return {
    changed,
    clientPaymentRecordCount,
    paymentsAdded,
    invoicesAllocationAdjusted,
    projectsAmountReceivedSynced,
  };
}

/** One-line copy for DEV toast after C3 boot reconciler runs. */
export function formatClientPaymentLedgerReconcileDevMessage(
  summary: ClientPaymentLedgerReconcileSummary,
): string {
  const parts: string[] = [];
  if (summary.paymentsAdded > 0) {
    parts.push(
      `${summary.paymentsAdded} Payment row${summary.paymentsAdded === 1 ? "" : "s"} emitted (cpr:*)`,
    );
  }
  if (summary.invoicesAllocationAdjusted > 0) {
    parts.push(
      `${summary.invoicesAllocationAdjusted} invoice${summary.invoicesAllocationAdjusted === 1 ? "" : "s"} FIFO-updated`,
    );
  }
  if (summary.projectsAmountReceivedSynced > 0) {
    parts.push(
      `${summary.projectsAmountReceivedSynced} project${summary.projectsAmountReceivedSynced === 1 ? "" : "s"} amountReceived synced`,
    );
  }
  const detail = parts.length ? parts.join(" · ") : "Ledger replay applied";
  return `${detail} (${summary.clientPaymentRecordCount} client payment record${summary.clientPaymentRecordCount === 1 ? "" : "s"} on boot).`;
}

export type ClientPaymentValidationResult =
  | { ok: true; remainingDue: number }
  | { ok: false; reason: string };

/** Remaining contract balance before a new client payment record. */
export function clientPaymentRemainingDue(
  contractAmount: number,
  totalAlreadyReceived: number,
): number {
  const contract = Number.isFinite(contractAmount) ? contractAmount : 0;
  const received = Number.isFinite(totalAlreadyReceived) ? totalAlreadyReceived : 0;
  return Math.max(0, contract - received);
}

/** Defense-in-depth guards for client payment intake (UI also validates). */
export function validateClientPaymentRecord(
  record: Pick<ClientPaymentRecord, "amount" | "projectId">,
  contractAmount: number,
  totalAlreadyReceived: number,
): ClientPaymentValidationResult {
  if (!record.projectId?.trim()) {
    return { ok: false, reason: "Project is required to record a payment." };
  }

  const amount = record.amount;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: "Payment amount must be greater than zero." };
  }

  const remainingDue = clientPaymentRemainingDue(contractAmount, totalAlreadyReceived);
  if (amount > remainingDue + 0.01) {
    return {
      ok: false,
      reason:
        remainingDue <= 0
          ? "Contract balance is already fully collected. No further client payments can be recorded."
          : `Payment exceeds remaining contract balance (₹${remainingDue.toLocaleString("en-IN")} due).`,
    };
  }

  return { ok: true, remainingDue };
}

export function resolveClientPaymentRecordIdFromPayment(payment: Payment): string | null {
  if (!isClientPaymentRecordPayment(payment)) return null;
  if (payment.id.startsWith(CLIENT_PAYMENT_RECORD_PAYMENT_PREFIX)) {
    return payment.id.slice(CLIENT_PAYMENT_RECORD_PAYMENT_PREFIX.length);
  }
  if (payment.reference?.startsWith(CLIENT_PAYMENT_RECORD_PAYMENT_PREFIX)) {
    return payment.reference.slice(CLIENT_PAYMENT_RECORD_PAYMENT_PREFIX.length);
  }
  return null;
}

export type StaleClientPaymentLedgerLink = {
  recordId?: string;
  paymentId?: string;
  reason: "record_without_cpr_payment" | "cpr_payment_without_record";
};

/** CPR rows and `cpr:*` payment rows must stay paired (FC10). */
export function findStaleClientPaymentLedgerLinkage(input: {
  clientPaymentRecords: ClientPaymentRecord[];
  payments: Payment[];
}): StaleClientPaymentLedgerLink[] {
  const stale: StaleClientPaymentLedgerLink[] = [];
  for (const record of input.clientPaymentRecords) {
    const compositeKey = clientPaymentRecordPaymentId(record.id);
    const hasPayment = input.payments.some(
      (p) => p.id === compositeKey || p.reference === compositeKey,
    );
    if (!hasPayment) {
      stale.push({ recordId: record.id, reason: "record_without_cpr_payment" });
    }
  }
  for (const payment of input.payments) {
    if (!isClientPaymentRecordPayment(payment)) continue;
    const recordId = resolveClientPaymentRecordIdFromPayment(payment);
    if (!recordId || !input.clientPaymentRecords.some((r) => r.id === recordId)) {
      stale.push({ paymentId: payment.id, reason: "cpr_payment_without_record" });
    }
  }
  return stale;
}

export function syncCustomersAmountReceivedFromProjects(
  customers: Customer[],
  projects: Project[],
): Customer[] {
  const totals = new Map<string, number>();
  for (const project of projects) {
    if (!project.customerId) continue;
    totals.set(
      project.customerId,
      (totals.get(project.customerId) ?? 0) + (project.amountReceived ?? 0),
    );
  }
  return customers.map((c) => {
    const next = totals.get(c.id);
    return next === undefined ? c : { ...c, amountReceived: next };
  });
}

export type PaymentDeletionLedgerResult = {
  payments: Payment[];
  clientPaymentRecords: ClientPaymentRecord[];
  invoices: Invoice[];
  saleBills: Invoice[];
  projects: Project[];
  incomes: Income[];
  customers: Customer[];
  deletedPayment: Payment;
};

/**
 * Remove a payment, drop linked CPR when applicable, and replay FIFO allocations (FC10).
 * Keeps invoice/sale-bill balances consistent with remaining payments + CPR rows.
 */
export function applyPaymentDeletionToLedger(input: {
  paymentId: string;
  payments: Payment[];
  clientPaymentRecords: ClientPaymentRecord[];
  invoices: Invoice[];
  saleBills: Invoice[];
  projects: Project[];
  incomes: Income[];
  customers: Customer[];
}): PaymentDeletionLedgerResult | null {
  const payment = input.payments.find((p) => p.id === input.paymentId);
  if (!payment) return null;

  const cprId = resolveClientPaymentRecordIdFromPayment(payment);
  const clientPaymentRecords = cprId
    ? input.clientPaymentRecords.filter((r) => r.id !== cprId)
    : input.clientPaymentRecords;

  let payments = input.payments.filter((p) => p.id !== input.paymentId);
  let incomes = input.incomes;
  if (payment.linkedIncomeId) {
    incomes = incomes.map((row) =>
      row.id === payment.linkedIncomeId ? { ...row, linkedPaymentId: undefined } : row,
    );
  }

  const ledger = reconcileClientPaymentLedger({
    clientPaymentRecords,
    payments,
    invoices: input.invoices,
    saleBills: input.saleBills,
    projects: input.projects,
    incomes,
  });
  payments = ledger.payments;
  const invoices = ledger.invoices;
  const saleBills = ledger.saleBills;
  const projects = ledger.projects;

  const customers = syncCustomersAmountReceivedFromProjects(input.customers, projects);

  return {
    payments,
    clientPaymentRecords,
    invoices,
    saleBills,
    projects,
    incomes,
    customers,
    deletedPayment: payment,
  };
}
