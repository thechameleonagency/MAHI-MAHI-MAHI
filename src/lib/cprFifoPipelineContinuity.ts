import type { AppState } from "@/contexts/AppDataContext";
import { getInvoiceOpenBalance, isActiveBill } from "@/lib/billingSelectors";
import type { Invoice } from "@/types/finance";

export type StaleCprFifoAllocation = {
  invoiceId: string;
  status: Invoice["status"];
  amountReceived: number;
  reason: "voided_or_draft_with_fifo_allocation" | "voided_with_open_balance";
};

/** Voided/draft invoices must not carry CPR FIFO allocations or open balances (FC6). */
export function findStaleCprFifoVoidedAllocations(state: AppState): StaleCprFifoAllocation[] {
  const stale: StaleCprFifoAllocation[] = [];
  const billingDocs = [...state.invoices, ...(state.saleBills ?? [])];
  for (const inv of billingDocs) {
    if (isActiveBill(inv)) continue;
    const received = inv.amountReceived ?? 0;
    if (received > 0.01) {
      stale.push({
        invoiceId: inv.id,
        status: inv.status,
        amountReceived: received,
        reason: "voided_or_draft_with_fifo_allocation",
      });
      continue;
    }
    const open = getInvoiceOpenBalance(inv, state.payments);
    if (open > 0.01) {
      stale.push({
        invoiceId: inv.id,
        status: inv.status,
        amountReceived: received,
        reason: "voided_with_open_balance",
      });
    }
  }
  return stale;
}
