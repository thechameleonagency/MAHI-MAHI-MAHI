import type { Expense, Invoice, Payment } from "@/types/finance";
import type { VendorBill } from "@/types/inventory";
import type { InventoryItem } from "@/types/project";
import type { MaterialDamage } from "@/types/operations";
import {
  getAccountsPayable,
  getOutstandingReceivables,
  getRevenueCashInPeriod,
} from "@/domain/finance/financialSemantics";

export interface LedgerTotalsInput {
  invoices: Invoice[];
  saleBills: Invoice[];
  expenses: Expense[];
  vendorBills: VendorBill[];
  inventoryItems: InventoryItem[];
  materialDamageRecords?: MaterialDamage[];
  payments?: Payment[];
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
  const payments = input.payments ?? [];
  const revenueAccrual = allInvoices
    .filter((i) => inPeriod(i.invoiceDate) && i.status !== "voided" && i.status !== "draft")
    .reduce((s, i) => s + i.total, 0);
  const revenueCollected = getRevenueCashInPeriod(payments, inPeriod);
  const receivablesOpen = getOutstandingReceivables(input.invoices, payments, input.saleBills);
  const payablesOpen = getAccountsPayable(input.vendorBills);
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
