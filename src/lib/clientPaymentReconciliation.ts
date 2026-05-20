import type { ClientPaymentRecord } from "@/types/blockage";
import type { Invoice, Payment } from "@/types/finance";
import type { Project } from "@/types/project";

/** Payment rows emitted from {@link addClientPaymentRecord} use this id/reference prefix. */
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

/** FIFO-apply a client payment amount against a project's open invoices (oldest invoice date first). */
export function fifoApplyClientPaymentToInvoices(
  invoices: Invoice[],
  projectId: string,
  amount: number,
  paymentDate: string,
  paymentMode: string,
): Invoice[] {
  let remaining = amount;
  const sortedProjectInvoices = invoices
    .filter((inv) => inv.projectId === projectId)
    .sort(
      (a, b) =>
        new Date(a.invoiceDate || a.dueDate || 0).getTime() -
        new Date(b.invoiceDate || b.dueDate || 0).getTime(),
    );

  const updates = new Map<string, Invoice>();
  for (const inv of sortedProjectInvoices) {
    if (remaining <= 0) break;
    const due = (inv.total || 0) - (inv.amountReceived || 0);
    if (due <= 0) continue;
    const pay = Math.min(due, remaining);
    remaining -= pay;
    const nextReceived = (inv.amountReceived || 0) + pay;
    updates.set(inv.id, {
      ...inv,
      amountReceived: nextReceived,
      status: invoiceStatusFromReceived(inv.total || 0, nextReceived),
      receivedDate: paymentDate,
      receivedIn: paymentMode,
    });
  }

  return invoices.map((inv) => updates.get(inv.id) ?? inv);
}

function paymentReceivedOnInvoice(payments: Payment[], invoiceId: string): number {
  return payments
    .filter(
      (p) =>
        p.direction === "in" &&
        p.invoiceId === invoiceId &&
        !isClientPaymentRecordPayment(p),
    )
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);
}

function projectAmountReceivedFromPayments(payments: Payment[], projectId: string): number {
  return payments
    .filter((p) => p.direction === "in" && p.projectId === projectId)
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
  projects: Project[];
}): {
  payments: Payment[];
  invoices: Invoice[];
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
  let invoices = input.invoices.map((inv) => {
    if (!inv.projectId || !projectIds.has(inv.projectId)) return inv;
    const baseReceived = paymentReceivedOnInvoice(payments, inv.id);
    return {
      ...inv,
      amountReceived: baseReceived,
      status: invoiceStatusFromReceived(inv.total || 0, baseReceived),
    };
  });

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
      invoices = fifoApplyClientPaymentToInvoices(
        invoices,
        record.projectId,
        record.amount,
        record.date,
        record.paymentMode,
      );
    }
  }

  const projects = input.projects.map((project) => ({
    ...project,
    amountReceived: projectAmountReceivedFromPayments(payments, project.id),
  }));

  return { payments, invoices, projects };
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
