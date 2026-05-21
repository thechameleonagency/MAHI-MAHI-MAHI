import type { Invoice, Payment } from "@/types/finance";
import type { VendorBill } from "@/types/inventory";
import { getInvoiceAmountReceived, getInvoiceOpenBalance } from "@/lib/billingSelectors";
import { differenceInDays, parseISO } from "date-fns";

export type AgingBucketKey = "0-30" | "31-60" | "61-90" | "90+";

export interface AgingBucketTotals {
  bucket: AgingBucketKey;
  label: string;
  count: number;
  amount: number;
}

function openBillBalance(bill: VendorBill): number {
  return Math.max(0, bill.total - (bill.amountPaid ?? 0));
}

function bucketForDays(days: number): AgingBucketKey {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

export function computeDebtorRows(
  invoices: Invoice[],
  saleBills: Invoice[],
  payments: Payment[] = [],
  asOf = new Date(),
) {
  return [...invoices, ...saleBills]
    .filter((i) => i.status !== "paid" && i.status !== "voided" && i.status !== "draft")
    .map((inv) => {
      const outstanding = getInvoiceOpenBalance(inv, payments);
      const amountReceived = getInvoiceAmountReceived(inv.id, payments, inv);
      const refDate = inv.dueDate ?? inv.invoiceDate;
      const daysOverdue = refDate
        ? Math.max(0, differenceInDays(asOf, parseISO(refDate)))
        : 0;
      return { ...inv, amountReceived, outstanding, daysOverdue };
    })
    .filter((r) => r.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding);
}

export function computeCreditorRows(vendorBills: VendorBill[], asOf = new Date()) {
  return vendorBills
    .filter((b) => b.status !== "paid")
    .map((bill) => {
      const outstanding = openBillBalance(bill);
      const refDate = bill.dueDate ?? bill.billDate;
      const daysOverdue = refDate
        ? Math.max(0, differenceInDays(asOf, parseISO(refDate)))
        : 0;
      return { ...bill, outstanding, daysOverdue };
    })
    .filter((r) => r.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding);
}

export function sumAgingBuckets(
  items: { outstanding: number; daysOverdue: number }[],
): AgingBucketTotals[] {
  const sums: Record<AgingBucketKey, { count: number; amount: number }> = {
    "0-30": { count: 0, amount: 0 },
    "31-60": { count: 0, amount: 0 },
    "61-90": { count: 0, amount: 0 },
    "90+": { count: 0, amount: 0 },
  };
  for (const item of items) {
    const key = bucketForDays(item.daysOverdue);
    sums[key].count += 1;
    sums[key].amount += item.outstanding;
  }
  return (["0-30", "31-60", "61-90", "90+"] as const).map((bucket) => ({
    bucket,
    label: bucket === "90+" ? "90+ days" : `${bucket} days`,
    count: sums[bucket].count,
    amount: sums[bucket].amount,
  }));
}

export function debtorCreditorSummary(
  invoices: Invoice[],
  saleBills: Invoice[],
  vendorBills: VendorBill[],
  payments: Payment[] = [],
) {
  const debtors = computeDebtorRows(invoices, saleBills, payments);
  const creditors = computeCreditorRows(vendorBills);
  const totalReceivables = debtors.reduce((s, d) => s + d.outstanding, 0);
  const totalPayables = creditors.reduce((s, c) => s + c.outstanding, 0);
  return {
    debtors,
    creditors,
    totalReceivables,
    totalPayables,
    overdueReceivables: debtors.filter((d) => d.daysOverdue > 0).reduce((s, d) => s + d.outstanding, 0),
    overduePayables: creditors.filter((c) => c.daysOverdue > 0).reduce((s, c) => s + c.outstanding, 0),
    debtorBuckets: sumAgingBuckets(debtors),
    creditorBuckets: sumAgingBuckets(creditors),
  };
}
