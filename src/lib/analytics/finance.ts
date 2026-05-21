import { getInvoiceOpenBalance } from "@/lib/billingSelectors";
import { getRevenueAccrualInPeriod, getRevenueCash } from "@/domain/finance/financialSemantics";
import type { AnalyticsDateRange, AnalyticsSlices, MetricRow } from "./types";
import { analyticsRangeToIsoBounds, inAnalyticsRange } from "./dateRange";

export interface DebtorBucket {
  bucket: "0-30" | "31-60" | "61-90" | "90+";
  count: number;
  amount: number;
}

export interface FinanceMetrics {
  revenueCash: number;
  revenueAccrual: number;
  expenseTotal: number;
  vendorOverdueAmount: number;
  debtorBuckets: DebtorBucket[];
  emiDueNext30: number;
  summaryRows: MetricRow[];
}

export function computeFinanceMetrics(
  slices: AnalyticsSlices,
  range: AnalyticsDateRange,
  now: Date = new Date(),
): FinanceMetrics {
  const { invoices, payments, expenses, vendorBills = [], loans = [] } = slices;

  const { fromDate, toDate } = analyticsRangeToIsoBounds(range, now);
  const revenueCash = getRevenueCash(payments, fromDate, toDate);
  const revenueAccrual = getRevenueAccrualInPeriod(invoices, (d) =>
    inAnalyticsRange(d, range, now),
  );

  const expenseTotal = expenses
    .filter((e) => inAnalyticsRange(e.date, range))
    .reduce((s, e) => s + e.amount, 0);

  const todayMs = now.getTime();
  const buckets: DebtorBucket[] = [
    { bucket: "0-30", count: 0, amount: 0 },
    { bucket: "31-60", count: 0, amount: 0 },
    { bucket: "61-90", count: 0, amount: 0 },
    { bucket: "90+", count: 0, amount: 0 },
  ];

  for (const inv of invoices) {
    if (inv.status === "paid" || inv.status === "voided" || inv.status === "draft") continue;
    const open = getInvoiceOpenBalance(inv, payments);
    if (open <= 0) continue;
    const dueMs = new Date(inv.dueDate).getTime();
    const daysPast = Math.floor((todayMs - dueMs) / 86_400_000);
    if (daysPast <= 30) {
      buckets[0].count++;
      buckets[0].amount += open;
    } else if (daysPast <= 60) {
      buckets[1].count++;
      buckets[1].amount += open;
    } else if (daysPast <= 90) {
      buckets[2].count++;
      buckets[2].amount += open;
    } else {
      buckets[3].count++;
      buckets[3].amount += open;
    }
  }

  const vendorOverdueAmount = vendorBills
    .filter((b) => {
      const open = Math.max(0, b.total - (b.amountPaid ?? 0));
      if (open <= 0 || !b.dueDate) return false;
      return new Date(b.dueDate).getTime() < todayMs;
    })
    .reduce((s, b) => s + Math.max(0, b.total - (b.amountPaid ?? 0)), 0);

  const in30 = new Date(now);
  in30.setDate(in30.getDate() + 30);
  const emiDueNext30 = loans
    .filter((loan) => loan.status === "Active" && loan.paymentType === "emi")
    .filter((loan) => {
      if (!loan.dueDate) return true;
      const d = new Date(loan.dueDate);
      return d >= now && d <= in30;
    })
    .reduce((s, loan) => s + (loan.emiAmount ?? 0), 0);

  const summaryRows: MetricRow[] = [
    { label: "Revenue (cash)", value: Math.round(revenueCash) },
    { label: "Revenue (accrual)", value: Math.round(revenueAccrual) },
    { label: "Expenses", value: Math.round(expenseTotal) },
    { label: "Vendor overdue ₹", value: Math.round(vendorOverdueAmount) },
    { label: "EMI due (30d)", value: Math.round(emiDueNext30) },
  ];

  return {
    revenueCash,
    revenueAccrual,
    expenseTotal,
    vendorOverdueAmount,
    debtorBuckets: buckets,
    emiDueNext30,
    summaryRows,
  };
}
