/**
 * Canonical definitions for money fields — all KPI/profit surfaces must use these helpers.
 */
import {
  getAccrualRevenue,
  getCashRevenue,
  getCashRevenueInPeriod,
  getInvoiceOpenBalance,
  isActiveBill,
  getProjectAmountInvoiced,
  getProjectAmountReceived,
  getProjectTotalCost,
} from "@/lib/billingSelectors";
import { calculateProjectProfit as derivePartnerProfit } from "@/domain/partners/derivePartnerEconomics";
import type { Expense, Invoice, Payment } from "@/types/finance";
import type { VendorBill } from "@/types/inventory";
import { sumVendorOpenPayables } from "@/lib/vendorBillVoucherPosting";
import type { Project } from "@/types/project";
import { resolveContractAmount } from "@/domain/quotation/quotationCommercialAmount";

export type ProfitMode = "cash" | "accrual";

/** @see resolveContractAmount in quotationCommercialAmount */
export { resolveContractAmount };

export function computeProjectProfit(
  project: Pick<Project, "id" | "contractAmount" | "totalCost" | "amountReceived" | "amountInvoiced">,
  mode: ProfitMode,
  slices: {
    invoices: Invoice[];
    saleBills?: Invoice[];
    payments: Payment[];
    expenses: Expense[];
  },
): number {
  const cost =
    slices.expenses.length > 0
      ? getProjectTotalCost(project.id, slices.expenses)
      : (project.totalCost ?? 0);
  const billDocs = [...slices.invoices, ...(slices.saleBills ?? [])];
  const revenue =
    mode === "cash"
      ? slices.payments.length > 0
        ? getProjectAmountReceived(project.id, slices.payments)
        : (project.amountReceived ?? 0)
      : billDocs.length > 0
        ? getProjectAmountInvoiced(project.id, slices.invoices, slices.saleBills ?? [])
        : (project.amountInvoiced ?? project.contractAmount ?? 0);
  return revenue - cost;
}

/** Legacy cash profit from contractAmount - totalCost (partner economics). */
export function computeProjectProfitLegacy(
  project: Pick<Project, "contractAmount" | "totalCost">,
): number {
  return derivePartnerProfit(project);
}

export function formatProfitMargin(profit: number, revenue: number): string {
  if (revenue <= 0) return "—";
  return ((profit / revenue) * 100).toFixed(1);
}

/** Cash-basis revenue (payments in). Prefer this over summing `invoice.amountReceived`. */
export function getRevenueCash(payments: Payment[], fromDate?: string, toDate?: string): number {
  return getCashRevenue({ payments, fromDate, toDate });
}

/** Cash-basis revenue with a custom period predicate (audit charts, ledger KPIs). */
export function getRevenueCashInPeriod(
  payments: Payment[],
  inPeriod: (dateStr: string) => boolean,
): number {
  return getCashRevenueInPeriod(payments, inPeriod);
}

/** Accrual-basis revenue (active invoice totals). */
export function getRevenueAccrual(invoices: Invoice[]): number {
  return getAccrualRevenue(invoices);
}

/** Accrual-basis revenue for invoices whose invoiceDate passes `inPeriod`. */
export function getRevenueAccrualInPeriod(
  invoices: Invoice[],
  inPeriod: (dateStr: string) => boolean,
): number {
  return invoices
    .filter((i) => inPeriod(i.invoiceDate) && isActiveBill(i))
    .reduce((s, i) => s + i.total, 0);
}

/** @alias Explicit export for cross-module KPI wiring. */
export const computeCashRevenue = getRevenueCash;

/** @alias Explicit export for cross-module KPI wiring. */
export const computeAccrualRevenue = getRevenueAccrual;

/**
 * Open AR across invoices and sale bills using payment-linked balances
 * (`getInvoiceOpenBalance`), not stored `amountReceived` alone.
 */
export function getOutstandingReceivables(
  invoices: Invoice[],
  payments: Payment[],
  saleBills: Invoice[] = [],
): number {
  return [...invoices, ...saleBills]
    .filter((i) => i.status !== "voided" && i.status !== "paid" && i.status !== "draft")
    .reduce((s, inv) => s + getInvoiceOpenBalance(inv, payments), 0);
}

/** Accounts payable from bookable vendor bills (matches Vendor detail + GL voucher path). */
export function getAccountsPayable(vendorBills: VendorBill[]): number {
  return sumVendorOpenPayables(vendorBills);
}

/** Cash revenue split by whether the payment references an invoice or sale bill. */
export function partitionCashRevenueByBillKind(
  payments: Payment[],
  invoices: Invoice[],
  saleBills: Invoice[],
  fromDate?: string,
  toDate?: string,
): { fromInvoices: number; fromSaleBills: number; unlinked: number; total: number } {
  const invIds = new Set(invoices.map((i) => i.id));
  const sbIds = new Set(saleBills.map((i) => i.id));
  let fromInvoices = 0;
  let fromSaleBills = 0;
  let unlinked = 0;
  for (const p of payments) {
    if (p.direction !== "in") continue;
    if (fromDate && p.date < fromDate) continue;
    if (toDate && p.date > toDate) continue;
    if (p.invoiceId && invIds.has(p.invoiceId)) fromInvoices += p.amount;
    else if (p.invoiceId && sbIds.has(p.invoiceId)) fromSaleBills += p.amount;
    else unlinked += p.amount;
  }
  return { fromInvoices, fromSaleBills, unlinked, total: fromInvoices + fromSaleBills + unlinked };
}
