import { getInvoiceOpenBalance } from "@/lib/billingSelectors";
import type { Invoice, Payment } from "@/types/finance";

type BillDoc = Pick<Invoice, "id" | "total" | "status" | "amountReceived">;

/** Open receivable: non-draft/non-void with balance outstanding (same rule as Dashboard KPI). */
export function matchesOpenReceivable(doc: BillDoc, payments?: Payment[]): boolean {
  if (doc.status === "paid" || doc.status === "voided" || doc.status === "draft") {
    return false;
  }
  return getInvoiceOpenBalance(doc, payments) > 0.01;
}
