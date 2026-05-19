/**
 * Canonical definitions for money fields — all KPI/profit surfaces must use these helpers.
 */
import {
  getAccrualRevenue,
  getCashRevenue,
  getInvoiceOpenBalance,
  getProjectAmountInvoiced,
  getProjectAmountReceived,
  getProjectTotalCost,
} from "@/lib/billingSelectors";
import { calculateProjectProfit as derivePartnerProfit } from "@/domain/partners/derivePartnerEconomics";
import type { Expense, Invoice, Payment } from "@/types/finance";
import type { Project, Quotation } from "@/types/project";

export type ProfitMode = "cash" | "accrual";

/** Agreed commercial value at quotation conversion (GST-inclusive total unless clientAgreedAmount set). */
export function resolveContractAmount(
  quotation: Pick<Quotation, "clientAgreedAmount" | "totalAmount">,
): number {
  return quotation.clientAgreedAmount ?? quotation.totalAmount ?? 0;
}

export function computeProjectProfit(
  project: Pick<Project, "id" | "contractAmount" | "totalCost" | "amountReceived" | "amountInvoiced">,
  mode: ProfitMode,
  slices: { invoices: Invoice[]; payments: Payment[]; expenses: Expense[] },
): number {
  const cost =
    slices.expenses.length > 0
      ? getProjectTotalCost(project.id, slices.expenses)
      : (project.totalCost ?? 0);
  const revenue =
    mode === "cash"
      ? slices.payments.length > 0
        ? getProjectAmountReceived(project.id, slices.payments)
        : (project.amountReceived ?? 0)
      : slices.invoices.length > 0
        ? getProjectAmountInvoiced(project.id, slices.invoices)
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

export function getRevenueCash(payments: Payment[], fromDate?: string, toDate?: string): number {
  return getCashRevenue({ payments, fromDate, toDate });
}

export function getRevenueAccrual(invoices: Invoice[]): number {
  return getAccrualRevenue(invoices);
}

export function getOutstandingReceivables(invoices: Invoice[], payments: Payment[]): number {
  return invoices
    .filter((i) => i.status !== "voided" && i.status !== "paid" && i.status !== "draft")
    .reduce((s, inv) => s + getInvoiceOpenBalance(inv, payments), 0);
}
