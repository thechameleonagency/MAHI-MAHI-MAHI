import type { Customer, Expense, Income, Invoice, INCGiverTransaction, Payment } from "@/types/finance";
import {
  isIncGivenProject,
  resolveIncGivenProjectAmountReceived,
} from "@/lib/incGiverLedgerContinuity";
import type { Project } from "@/types/project";

type BillDoc = Pick<Invoice, "id" | "total" | "status" | "amountReceived" | "customerId" | "projectId" | "invoiceDate">;

/** Bills that participate in collections, FIFO, and open-balance (excludes voided + draft). */
export function isActiveBill(inv: BillDoc): boolean {
  return inv.status !== "voided" && inv.status !== "draft";
}

/** Cash received on an invoice: stored amountReceived + linked payments-in (deduped). */
export function getInvoiceAmountReceived(
  invoiceId: string,
  payments: Payment[],
  invoice?: Pick<Invoice, "amountReceived">,
): number {
  const fromPayments = payments
    .filter((p) => p.direction === "in" && p.invoiceId === invoiceId)
    .reduce((s, p) => s + p.amount, 0);
  const stored = invoice?.amountReceived ?? 0;
  return Math.max(stored, fromPayments);
}

export function getInvoiceOpenBalance(
  invoice: BillDoc,
  payments?: Payment[],
): number {
  if (!isActiveBill(invoice)) return 0;
  const received =
    payments != null
      ? getInvoiceAmountReceived(invoice.id, payments, invoice)
      : (invoice.amountReceived ?? 0);
  return Math.max(0, invoice.total - received);
}

export function getCustomerTotalPurchases(
  customerId: string,
  invoices: Invoice[],
): number {
  return invoices
    .filter((i) => i.customerId === customerId && isActiveBill(i))
    .reduce((s, i) => s + i.total, 0);
}

export function getCustomerTotalReceived(
  customerId: string,
  invoices: Invoice[],
  payments: Payment[],
): number {
  const invIds = new Set(
    invoices.filter((i) => i.customerId === customerId && isActiveBill(i)).map((i) => i.id),
  );
  return payments
    .filter(
      (p) =>
        p.direction === "in" &&
        (p.customerId === customerId || (p.invoiceId != null && invIds.has(p.invoiceId))),
    )
    .reduce((s, p) => s + p.amount, 0);
}

export function getCustomerLastPurchase(
  customerId: string,
  invoices: Invoice[],
): string | undefined {
  const dates = invoices
    .filter((i) => i.customerId === customerId && isActiveBill(i))
    .map((i) => i.invoiceDate)
    .filter(Boolean);
  if (dates.length === 0) return undefined;
  return dates.sort().at(-1);
}

/** Sum of active (non-draft, non-voided) invoice + sale-bill totals for a project. */
export function getProjectAmountInvoiced(
  projectId: string,
  invoices: Invoice[],
  saleBills: Invoice[] = [],
): number {
  return [...invoices, ...saleBills]
    .filter((i) => i.projectId === projectId && isActiveBill(i))
    .reduce((s, i) => s + i.total, 0);
}

/** Recompute stored `amountInvoiced` from billing documents (single source of truth). */
export function reconcileProjectsAmountInvoiced(
  projects: Project[],
  invoices: Invoice[],
  saleBills: Invoice[] = [],
): Project[] {
  return projects.map((project) => ({
    ...project,
    amountInvoiced: getProjectAmountInvoiced(project.id, invoices, saleBills),
  }));
}

/** Whether a non-invoice income row should bump stored `project.amountReceived`. */
export function incomeCountsTowardProjectReceived(
  income: Pick<Income, "projectId" | "isOutgoing" | "linkedPaymentId">,
): boolean {
  return Boolean(income.projectId?.trim()) && income.isOutgoing !== true && !income.linkedPaymentId;
}

/** Apply a signed delta to one project's stored `amountReceived`. */
export function applyProjectReceivedFromIncomeDelta(
  projects: Project[],
  projectId: string | undefined,
  delta: number,
): Project[] {
  if (!projectId?.trim() || delta === 0) return projects;
  return projects.map((p) =>
    p.id === projectId
      ? { ...p, amountReceived: Math.max(0, (p.amountReceived ?? 0) + delta) }
      : p,
  );
}

export function getProjectAmountReceived(
  projectId: string,
  payments: Payment[],
  incomes: Income[] = [],
): number {
  const fromPayments = payments
    .filter((p) => p.direction === "in" && p.projectId === projectId)
    .reduce((s, p) => s + p.amount, 0);
  const fromIncome = incomes
    .filter((i) => incomeCountsTowardProjectReceived(i))
    .filter((i) => i.projectId === projectId)
    .reduce((s, i) => s + i.amount, 0);
  return fromPayments + fromIncome;
}

/** Recompute stored `amountReceived` from payments + standalone project incomes. */
export function reconcileProjectsAmountReceived(
  projects: Project[],
  payments: Payment[],
  incomes: Income[],
): Project[] {
  return projects.map((project) => ({
    ...project,
    amountReceived: getProjectAmountReceived(project.id, payments, incomes),
  }));
}

export function getProjectTotalCost(
  projectId: string,
  expenses: Expense[],
): number {
  return expenses
    .filter(
      (e) =>
        e.projectId === projectId ||
        e.allocation?.type === "project" && e.allocation.projectId === projectId,
    )
    .reduce((s, e) => s + e.amount, 0);
}

export interface CashRevenueInput {
  payments: Payment[];
  /** Optional date filter: inclusive ISO date strings yyyy-MM-dd */
  fromDate?: string;
  toDate?: string;
}

/** Cash revenue from payments-in only — never add invoice.amountReceived on top. */
export function getCashRevenue(input: CashRevenueInput): number {
  const { payments, fromDate, toDate } = input;
  return payments
    .filter((p) => {
      if (p.direction !== "in") return false;
      if (fromDate && p.date < fromDate) return false;
      if (toDate && p.date > toDate) return false;
      return true;
    })
    .reduce((s, p) => s + p.amount, 0);
}

/** Cash revenue for an arbitrary period predicate (audit P&L, ledger totals). */
export function getCashRevenueInPeriod(
  payments: Payment[],
  inPeriod: (dateStr: string) => boolean,
): number {
  return payments
    .filter((p) => p.direction === "in" && inPeriod(p.date))
    .reduce((s, p) => s + p.amount, 0);
}

export function getAccrualRevenue(invoices: Invoice[]): number {
  return invoices
    .filter(isActiveBill)
    .reduce((s, i) => s + i.total, 0);
}

/** Dual-read: compare stored customer aggregates vs derived (for drift tests). */
export function customerMetricsDrift(
  customer: Customer,
  invoices: Invoice[],
  payments: Payment[],
): { totalPurchasesDrift: number; lastPurchaseDrift: boolean } {
  const derivedPurchases = getCustomerTotalPurchases(customer.id, invoices);
  const derivedLast = getCustomerLastPurchase(customer.id, invoices);
  return {
    totalPurchasesDrift: Math.abs((customer.totalPurchases ?? 0) - derivedPurchases),
    lastPurchaseDrift:
      (customer.lastPurchase || "") !== (derivedLast || "") &&
      !(customer.lastPurchase === "" && derivedLast == null),
  };
}

export function projectBillingDrift(
  project: Project,
  invoices: Invoice[],
  payments: Payment[],
  expenses: Expense[],
  saleBills: Invoice[] = [],
  incomes: Income[] = [],
  incGiverTransactions: INCGiverTransaction[] = [],
): {
  amountInvoicedDrift: number;
  amountReceivedDrift: number;
  totalCostDrift: number;
} {
  const derivedInvoiced = getProjectAmountInvoiced(project.id, invoices, saleBills);
  const derivedReceived = isIncGivenProject(project)
    ? resolveIncGivenProjectAmountReceived(project, incGiverTransactions, payments, incomes)
    : getProjectAmountReceived(project.id, payments, incomes);
  const derivedCost = getProjectTotalCost(project.id, expenses);
  return {
    amountInvoicedDrift: Math.abs((project.amountInvoiced ?? 0) - derivedInvoiced),
    amountReceivedDrift: Math.abs((project.amountReceived ?? 0) - derivedReceived),
    totalCostDrift: Math.abs((project.totalCost ?? 0) - derivedCost),
  };
}
