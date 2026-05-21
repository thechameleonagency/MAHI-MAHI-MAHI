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
 *
 * All UI call sites use `recordCustomerInflow()` so the path is explicit at the call site.
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
    "CustomerDetail.tsx → bulk pay (per-project FIFO slices)",
  ],
  invoice_targeted: [
    "Invoices.tsx → record payment on selected invoice",
    "CustomerDetail.tsx → bulk pay (sale bills + invoices without projectId)",
  ],
};

export type CustomerBulkFifoLine = {
  invoice: {
    id: string;
    projectId?: string | null;
    invoiceNumber: string;
    _isSaleBill?: boolean;
  };
  payAmount: number;
};

export type CustomerBulkInflowPlanItem =
  | { path: "invoice_targeted"; invoiceId: string; amount: number; projectId?: string }
  | { path: "project_fifo"; projectId: string; amount: number };

/**
 * Plans customer-level bulk payment into project FIFO slices and invoice-targeted rows.
 * Sale bills and project-less invoices use invoice_targeted; other lines roll up per projectId.
 */
export function planCustomerBulkInflow(
  breakdown: CustomerBulkFifoLine[],
): CustomerBulkInflowPlanItem[] {
  const projectAmounts = new Map<string, number>();
  const planned: CustomerBulkInflowPlanItem[] = [];

  for (const { invoice, payAmount } of breakdown) {
    if (payAmount <= 0) continue;
    const projectId = invoice.projectId?.trim();
    if (invoice._isSaleBill || !projectId) {
      planned.push({
        path: "invoice_targeted",
        invoiceId: invoice.id,
        amount: payAmount,
        projectId: projectId || undefined,
      });
    } else {
      projectAmounts.set(projectId, (projectAmounts.get(projectId) ?? 0) + payAmount);
    }
  }

  for (const [projectId, amount] of projectAmounts) {
    planned.push({ path: "project_fifo", projectId, amount });
  }

  return planned;
}

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
