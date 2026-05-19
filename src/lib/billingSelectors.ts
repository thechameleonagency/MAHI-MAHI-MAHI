import type { Customer, Expense, Income, Invoice, Payment } from "@/types/finance";
import type { Project } from "@/types/project";

type BillDoc = Pick<Invoice, "id" | "total" | "status" | "amountReceived" | "customerId" | "projectId" | "invoiceDate">;

function isActiveBill(inv: BillDoc): boolean {
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

export function getProjectAmountInvoiced(
  projectId: string,
  invoices: Invoice[],
): number {
  return invoices
    .filter((i) => i.projectId === projectId && isActiveBill(i))
    .reduce((s, i) => s + i.total, 0);
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
    .filter((i) => i.projectId === projectId && !i.isOutgoing)
    .reduce((s, i) => s + i.amount, 0);
  return fromPayments + fromIncome;
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
): {
  amountInvoicedDrift: number;
  amountReceivedDrift: number;
  totalCostDrift: number;
} {
  const derivedInvoiced = getProjectAmountInvoiced(project.id, invoices);
  const derivedReceived = getProjectAmountReceived(project.id, payments);
  const derivedCost = getProjectTotalCost(project.id, expenses);
  return {
    amountInvoicedDrift: Math.abs((project.amountInvoiced ?? 0) - derivedInvoiced),
    amountReceivedDrift: Math.abs((project.amountReceived ?? 0) - derivedReceived),
    totalCostDrift: Math.abs((project.totalCost ?? 0) - derivedCost),
  };
}
