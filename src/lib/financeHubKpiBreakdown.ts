import {
  getRevenueAccrualInPeriod,
  getRevenueCash,
  partitionCashRevenueByBillKind,
} from "@/domain/finance/financialSemantics";
import type { Invoice, Payment } from "@/types/finance";

export interface FinanceHubRevenueBreakdown {
  /** Cash KPI — payments in only (matches Finance hub revenue tile). */
  cashRevenue: number;
  /** Accrual — active bill totals with invoiceDate in range (not added to cash KPI). */
  accrualRevenue: number;
  cashFromInvoices: number;
  cashFromSaleBills: number;
  cashUnlinked: number;
  topReceipts: { label: string; amount: number }[];
}

/**
 * Finance hub revenue drill-down — cash components use payment ledger only (DA2 / V7).
 * Never sums stored `invoice.amountReceived` for cash totals (double-counts with CPR payments).
 */
export function buildFinanceHubRevenueBreakdown(
  payments: Payment[],
  invoices: Invoice[],
  saleBills: Invoice[],
  inDateRange: (iso: string | undefined | null) => boolean,
  fromDate?: string,
  toDate?: string,
): FinanceHubRevenueBreakdown {
  const cashRevenue = getRevenueCash(payments, fromDate, toDate);
  const accrualRevenue = getRevenueAccrualInPeriod(
    [...invoices, ...saleBills],
    (d) => inDateRange(d),
  );
  const { fromInvoices, fromSaleBills, unlinked } = partitionCashRevenueByBillKind(
    payments,
    invoices,
    saleBills,
    fromDate,
    toDate,
  );

  const receiptBucket = new Map<string, number>();
  payments
    .filter((p) => p.direction === "in" && inDateRange(p.date))
    .forEach((p) => {
      const label = p.counterpartyName?.trim() || p.counterpartyType || "Other";
      receiptBucket.set(label, (receiptBucket.get(label) || 0) + p.amount);
    });
  const topReceipts = Array.from(receiptBucket.entries())
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 12);

  return {
    cashRevenue,
    accrualRevenue,
    cashFromInvoices: fromInvoices,
    cashFromSaleBills: fromSaleBills,
    cashUnlinked: unlinked,
    topReceipts,
  };
}
