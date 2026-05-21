/**
 * E10 — Customer inflow write paths (`addPayment` vs `addClientPaymentRecord`)
 *
 * Two first-class AppDataContext writers plus one legacy UI pattern. Boot-time
 * `reconcileClientPaymentLedger` (C3) replays CPR rows only — not ad-hoc FIFO in CustomerDetail.
 *
 * | Path | API | When to use | Invoice allocation | Ledger row |
 * |------|-----|-------------|-------------------|------------|
 * | Project FIFO | `addClientPaymentRecord` | Project Financials, ClientPaymentHistory | FIFO in context | CPR + Payment `cpr:<id>` |
 * | Invoice-targeted | `addPayment` (with `invoiceId`) | Invoices / sale-bill receipt modal | That invoice only | `PAY-*`, `invoiceId` set |
 * | Customer manual FIFO | `addPayment` (no `invoiceId`) | CustomerDetail only — UI patches invoices first | UI FIFO, then one Payment | `PAY-*`, no CPR |
 *
 * Prefer `recordCustomerInflow()` for new code so the path is explicit at the call site.
 */
import type { ClientPaymentRecord } from "@/types/blockage";
import type { Payment } from "@/types/finance";
import { isClientPaymentRecordPayment } from "@/lib/clientPaymentReconciliation";

export type CustomerInflowWritePath = "project_fifo" | "invoice_targeted";

export type RecordCustomerInflowInput =
  | { path: "project_fifo"; record: ClientPaymentRecord }
  | { path: "invoice_targeted"; payment: Payment };

export const CUSTOMER_INFLOW_PATH_LABELS: Record<CustomerInflowWritePath, string> = {
  project_fifo: "Project payment (FIFO + ClientPaymentRecord)",
  invoice_targeted: "Invoice receipt (Payment with invoiceId)",
};

/** Call sites that should use each path (grep these when adding UI). */
export const CUSTOMER_INFLOW_CALL_SITES: Record<CustomerInflowWritePath, readonly string[]> = {
  project_fifo: [
    "ProjectDetail → ClientPaymentHistory",
    "ProjectDetail → record payment actions",
  ],
  invoice_targeted: [
    "Invoices.tsx → record payment on selected invoice",
    "CustomerDetail.tsx → legacy bulk pay (manual FIFO + addPayment — migrate to project path per project when possible)",
  ],
};

export function validateInvoiceTargetedInflow(
  payment: Payment,
): { ok: true } | { ok: false; reason: string } {
  if (payment.direction !== "in") {
    return { ok: false, reason: "Invoice-targeted inflow must be direction 'in'." };
  }
  if (!payment.invoiceId?.trim()) {
    return {
      ok: false,
      reason: "Invoice-targeted inflow requires invoiceId on the Payment row.",
    };
  }
  return { ok: true };
}

export function validateProjectFifoInflow(
  record: Pick<ClientPaymentRecord, "projectId" | "amount" | "date">,
): { ok: true } | { ok: false; reason: string } {
  if (!record.projectId?.trim()) {
    return { ok: false, reason: "Project FIFO inflow requires projectId on ClientPaymentRecord." };
  }
  if (!Number.isFinite(record.amount) || record.amount <= 0) {
    return { ok: false, reason: "Project FIFO inflow requires a positive amount." };
  }
  if (!record.date?.trim()) {
    return { ok: false, reason: "Project FIFO inflow requires a payment date." };
  }
  return { ok: true };
}

/**
 * Single dispatch for customer inflow — delegates to the correct AppDataContext writer.
 * Returns false when project FIFO validation/handlers reject the record.
 */
export function recordCustomerInflowDispatch(
  input: RecordCustomerInflowInput,
  handlers: {
    addClientPaymentRecord: (record: ClientPaymentRecord) => boolean;
    addPayment: (payment: Payment) => void;
  },
): boolean {
  if (input.path === "project_fifo") {
    const check = validateProjectFifoInflow(input.record);
    if (!check.ok) return false;
    return handlers.addClientPaymentRecord(input.record);
  }
  const check = validateInvoiceTargetedInflow(input.payment);
  if (!check.ok) return false;
  handlers.addPayment(input.payment);
  return true;
}

/** Whether a Payment row originated from a ClientPaymentRecord (boot reconciler uses this). */
export function isSyntheticClientPaymentRow(payment: Payment): boolean {
  return isClientPaymentRecordPayment(payment);
}
