import type { Expense, Income, Invoice, Payment } from "@/types/finance";
import type { VendorBill } from "@/types/inventory";
import type { MaterialDamage } from "@/types/operations";
import type { InventoryItem } from "@/types/project";
import { DIRECT_EXPENSE_CATEGORIES } from "@/services/finance/chartOfAccounts";

export type RevenueBasis = "accrual" | "cash";

const EXPENSE_PL_MAP: Record<string, { label: string; categories: string[] }> = {
  salaries: { label: "Salaries & Wages", categories: ["salary"] },
  commission: { label: "Site Commissions / Agent fees", categories: ["commission"] },
  partnerProfit: { label: "Partner profit share", categories: ["partner-profit-payment"] },
  partnerExpense: { label: "Partner expenses", categories: ["partner-expense"] },
  materialTransport: { label: "Material Transport", categories: ["material-transport", "non-inventory-transport"] },
  siteLabour: { label: "Site Labour & Machinery", categories: ["pulley-transport", "labour-material-shift", "machine-rent"] },
  outsource: { label: "Outsource Work", categories: ["outsource-work"] },
  officeRent: { label: "Office Rent", categories: ["office-rent"] },
  marketing: { label: "Marketing", categories: ["marketing", "physical-marketing"] },
  otherCompany: { label: "Other Company Expenses", categories: ["other-company", "other-site"] },
};

export interface ProfitLossInput {
  invoices: Invoice[];
  saleBills: Invoice[];
  expenses: Expense[];
  incomes: Income[];
  vendorBills: VendorBill[];
  inventoryItems: InventoryItem[];
  materialDamageRecords?: MaterialDamage[];
  payments?: Payment[];
}

export interface ProfitLossResult {
  basis: RevenueBasis;
  revenueTotal: number;
  revenueBreakdown: { solarSales: number; serviceIncome: number; otherItemSales: number; companyIncome: number };
  cogs: number;
  damageWriteOff: number;
  agentAndCommission: number;
  partnerShare: number;
  grossProfit: number;
  directLines: { key: string; label: string; amount: number }[];
  indirectLines: { key: string; label: string; amount: number }[];
  totalDirect: number;
  totalIndirect: number;
  netProfit: number;
  inventoryValue: number;
}

export function computeProfitLoss(
  input: ProfitLossInput,
  inPeriod: (dateStr: string) => boolean,
  basis: RevenueBasis = "accrual",
): ProfitLossResult {
  const allInvoices = [...input.invoices, ...input.saleBills];
  const periodInvoices = allInvoices.filter(
    (i) => inPeriod(i.invoiceDate) && i.status !== "voided" && i.status !== "draft",
  );

  let revenueTotal = 0;
  if (basis === "accrual") {
    revenueTotal = periodInvoices.reduce((s, inv) => s + inv.total, 0);
  } else {
    const cashFromInvoices = periodInvoices.reduce((s, inv) => s + (inv.amountReceived ?? 0), 0);
    const cashFromPayments = (input.payments ?? [])
      .filter((p) => p.direction === "in" && inPeriod(p.date))
      .reduce((s, p) => s + p.amount, 0);
    revenueTotal = Math.max(cashFromInvoices, cashFromPayments);
  }

  const solarSales = periodInvoices.reduce(
    (s, inv) =>
      s + inv.items.filter((item) => item.hsn?.startsWith("8541")).reduce((is, item) => is + item.quantity * item.rate, 0),
    0,
  );
  const serviceIncome = periodInvoices.reduce(
    (s, inv) => s + inv.services.reduce((ss, svc) => ss + svc.rate, 0),
    0,
  );
  const otherItemSales = periodInvoices.reduce(
    (s, inv) =>
      s +
      inv.items
        .filter((item) => !item.hsn?.startsWith("8541"))
        .reduce((is, item) => is + item.quantity * item.rate, 0),
    0,
  );
  const companyIncome = input.incomes
    .filter((i) => inPeriod(i.date) && i.mainCategory === "company")
    .reduce((s, i) => s + i.amount, 0);

  const cogs = input.vendorBills.filter((b) => inPeriod(b.billDate)).reduce((s, b) => s + b.total, 0);
  const damageWriteOff = (input.materialDamageRecords ?? [])
    .filter((d) => inPeriod(d.reportedAt))
    .reduce((s, d) => s + (d.costImpact ?? 0), 0);

  const periodExpenses = input.expenses.filter((e) => inPeriod(e.date));
  const agentAndCommission = periodExpenses
    .filter((e) => e.category === "commission")
    .reduce((s, e) => s + e.amount, 0);
  const partnerShare = periodExpenses
    .filter((e) => ["partner-profit-payment", "partner-expense"].includes(e.category))
    .reduce((s, e) => s + e.amount, 0);

  const directLines: { key: string; label: string; amount: number }[] = [];
  const indirectLines: { key: string; label: string; amount: number }[] = [];
  let totalDirect = 0;
  let totalIndirect = 0;

  Object.entries(EXPENSE_PL_MAP).forEach(([key, { label, categories }]) => {
    const amount = periodExpenses
      .filter((e) => categories.includes(e.category))
      .reduce((s, e) => s + e.amount, 0);
    if (amount <= 0) return;
    const isDirect = categories.some((c) => DIRECT_EXPENSE_CATEGORIES.includes(c));
    if (isDirect) {
      directLines.push({ key, label, amount });
      totalDirect += amount;
    } else {
      indirectLines.push({ key, label, amount });
      totalIndirect += amount;
    }
  });

  const mapped = Object.values(EXPENSE_PL_MAP).flatMap((v) => v.categories);
  const uncategorized = periodExpenses
    .filter((e) => !mapped.includes(e.category))
    .reduce((s, e) => s + e.amount, 0);
  if (uncategorized > 0) {
    indirectLines.push({ key: "misc", label: "Miscellaneous", amount: uncategorized });
    totalIndirect += uncategorized;
  }

  if (damageWriteOff > 0) {
    directLines.push({ key: "damage", label: "Material damage write-off", amount: damageWriteOff });
    totalDirect += damageWriteOff;
  }

  const grossProfit = revenueTotal - cogs;
  const netProfit = grossProfit - totalDirect - totalIndirect;
  const inventoryValue = input.inventoryItems.reduce((s, item) => s + item.stock * item.buyPrice, 0);

  return {
    basis,
    revenueTotal,
    revenueBreakdown: { solarSales, serviceIncome, otherItemSales, companyIncome },
    cogs,
    damageWriteOff,
    agentAndCommission,
    partnerShare,
    grossProfit,
    directLines,
    indirectLines,
    totalDirect,
    totalIndirect,
    netProfit,
    inventoryValue,
  };
}
