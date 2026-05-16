import type { Expense, Invoice } from "@/types/finance";
import type { VendorBill } from "@/types/inventory";
import type { InventoryItem } from "@/types/project";
import type { MaterialDamage } from "@/types/operations";

export interface LedgerTotalsInput {
  invoices: Invoice[];
  saleBills: Invoice[];
  expenses: Expense[];
  vendorBills: VendorBill[];
  inventoryItems: InventoryItem[];
  materialDamageRecords?: MaterialDamage[];
}

export interface LedgerTotals {
  revenueAccrual: number;
  revenueCollected: number;
  receivablesOpen: number;
  payablesOpen: number;
  inventoryValueCost: number;
  damageWriteOff: number;
  periodExpenses: number;
}

export function computeLedgerTotals(
  input: LedgerTotalsInput,
  inPeriod: (dateStr: string) => boolean,
): LedgerTotals {
  const allInvoices = [...input.invoices, ...input.saleBills];
  const revenueAccrual = allInvoices
    .filter((i) => inPeriod(i.invoiceDate) && i.status !== "voided" && i.status !== "draft")
    .reduce((s, i) => s + i.total, 0);
  const revenueCollected = allInvoices.reduce((s, i) => s + (i.amountReceived ?? 0), 0);
  const receivablesOpen = allInvoices
    .filter((i) => i.status !== "paid" && i.status !== "voided" && i.status !== "draft")
    .reduce((s, i) => s + Math.max(0, i.total - (i.amountReceived ?? 0)), 0);
  const payablesOpen = input.vendorBills
    .filter((b) => b.status !== "paid")
    .reduce((s, b) => s + Math.max(0, b.total - (b.amountPaid ?? 0)), 0);
  const inventoryValueCost = input.inventoryItems.reduce(
    (s, item) => s + item.stock * (item.buyPrice ?? 0),
    0,
  );
  const damageWriteOff = (input.materialDamageRecords ?? [])
    .filter((d) => inPeriod(d.reportedAt))
    .reduce((s, d) => s + (d.costImpact ?? 0), 0);
  const periodExpenses = input.expenses
    .filter((e) => inPeriod(e.date))
    .reduce((s, e) => s + e.amount, 0);

  return {
    revenueAccrual,
    revenueCollected,
    receivablesOpen,
    payablesOpen,
    inventoryValueCost,
    damageWriteOff,
    periodExpenses,
  };
}
