import type { Expense, Income, Invoice, Payment } from "@/types/finance";
import type { VendorBill } from "@/types/inventory";
import type { MaterialDamage } from "@/types/operations";
import type { InventoryItem } from "@/types/project";
import { expenseToAccountMapping } from "@/data/auditBooksMasters";
import { getRevenueCashInPeriod } from "@/domain/finance/financialSemantics";

export type RevenueBasis = "accrual" | "cash";

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
  financeCostLines: { key: string; label: string; amount: number }[];
  taxLines: { key: string; label: string; amount: number }[];
  /** Items routed to non-P&L (Capital / Drawings / Liability / Asset) — surfaced for transparency, NOT subtracted from net profit. */
  excludedFromPL: { key: string; label: string; amount: number }[];
  totalDirect: number;
  totalIndirect: number;
  totalFinanceCost: number;
  totalTax: number;
  operatingProfit: number;
  profitBeforeTax: number;
  netProfit: number;
  inventoryValue: number;
}

/**
 * Resolve an Expense to its `(mainCategory, sub|category)` mapping key per the
 * audit-books master matrix. Returns the matching mapping row or undefined.
 */
function resolveMapping(e: Expense) {
  const main = e.mainCategory;
  const sub = e.subCategory || e.category;
  if (!main || !sub) return undefined;
  const key = `${main}:${sub}`;
  return expenseToAccountMapping.find((m) => m.value === key);
}

/**
 * Per Indian accounting standards (Ind-AS) the P&L includes:
 *   Revenue − Direct (COGS) = Gross Profit
 *   − Indirect (Operating) = Operating Profit (EBIT)
 *   − Finance Cost = Profit Before Tax
 *   − Tax = Net Profit
 *
 * Items NOT in P&L: Owner contribution/drawing, Partner investment/drawing,
 * Loan principal, Vehicle EMI principal, Capital movements, GST / TDS settlement.
 *
 * Vehicle EMI / Loan Repayment lines with `requiresInterestPrincipalSplit` contribute
 * ONLY their `interestPortion` to Finance Cost; the principal portion is excluded.
 */
export function computeProfitLoss(
  input: ProfitLossInput,
  inPeriod: (dateStr: string) => boolean,
  basis: RevenueBasis = "accrual",
): ProfitLossResult {
  const allInvoices = [...input.invoices, ...input.saleBills];
  const periodInvoices = allInvoices.filter(
    (i) => inPeriod(i.invoiceDate) && i.status !== "voided" && i.status !== "draft",
  );

  // ============ REVENUE ============
  let revenueTotal = 0;
  if (basis === "accrual") {
    revenueTotal = periodInvoices.reduce((s, inv) => s + inv.total, 0);
  } else {
    // Cash basis = payments-in only (never add invoice.amountReceived — double-counts with CPR rows).
    revenueTotal = getRevenueCashInPeriod(input.payments ?? [], inPeriod);
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
  // company income from Income table — EXCLUDES capital / loan / non-revenue (those have plLine != "revenue" in master)
  const companyIncome = input.incomes
    .filter((i) => inPeriod(i.date) && i.mainCategory === "company")
    .reduce((s, i) => s + i.amount, 0);

  // ============ COGS (vendor bills + material damage) ============
  const cogs = input.vendorBills.filter((b) => inPeriod(b.billDate)).reduce((s, b) => s + b.total, 0);
  const damageWriteOff = (input.materialDamageRecords ?? [])
    .filter((d) => inPeriod(d.reportedAt))
    .reduce((s, d) => s + (d.costImpact ?? 0), 0);

  // ============ EXPENSES — classified per audit-books master ============
  const periodExpenses = input.expenses.filter((e) => inPeriod(e.date));

  const directBuckets = new Map<string, { label: string; amount: number }>();
  const indirectBuckets = new Map<string, { label: string; amount: number }>();
  const financeBuckets = new Map<string, { label: string; amount: number }>();
  const taxBuckets = new Map<string, { label: string; amount: number }>();
  const excludedBuckets = new Map<string, { label: string; amount: number }>();
  let agentAndCommission = 0;
  let partnerShare = 0;

  for (const e of periodExpenses) {
    const mapping = resolveMapping(e);
    if (!mapping) {
      // Unmapped expenses default to Indirect (Misc) — but flag separately.
      const cur = indirectBuckets.get("misc-unmapped") ?? { label: `Miscellaneous (unmapped: ${e.mainCategory ?? "?"}:${e.subCategory || e.category})`, amount: 0 };
      cur.amount += e.amount;
      indirectBuckets.set("misc-unmapped", cur);
      continue;
    }

    // Resolve the contributing amount:
    //  - If split required (Vehicle EMI / Loan Repayment): only interestPortion counts toward P&L Finance Cost.
    //  - Principal is implicit liability-reduction (Balance Sheet) — NEVER P&L.
    let contribution = e.amount;
    if (mapping.requiresInterestPrincipalSplit) {
      contribution = e.interestPortion ?? 0;
      // Track principal separately as excluded from P&L for transparency
      const principal = e.principalPortion ?? Math.max(0, e.amount - (e.interestPortion ?? 0));
      if (principal > 0) {
        const k = "loan-principal";
        const cur = excludedBuckets.get(k) ?? { label: "Loan / EMI principal (reduces liability)", amount: 0 };
        cur.amount += principal;
        excludedBuckets.set(k, cur);
      }
    }

    if (contribution <= 0) continue;

    const leafLabel = mapping.coaLeaf ?? mapping.label;
    const labelStr = mapping.label;
    const key = mapping.coaLeaf ?? mapping.value;

    switch (mapping.plLine) {
      case "direct": {
        const cur = directBuckets.get(key) ?? { label: leafLabel, amount: 0 };
        cur.amount += contribution;
        directBuckets.set(key, cur);
        break;
      }
      case "indirect": {
        const cur = indirectBuckets.get(key) ?? { label: leafLabel, amount: 0 };
        cur.amount += contribution;
        indirectBuckets.set(key, cur);
        break;
      }
      case "finance-cost": {
        const cur = financeBuckets.get(key) ?? { label: leafLabel, amount: 0 };
        cur.amount += contribution;
        financeBuckets.set(key, cur);
        break;
      }
      case "tax": {
        const cur = taxBuckets.get(key) ?? { label: leafLabel, amount: 0 };
        cur.amount += contribution;
        taxBuckets.set(key, cur);
        break;
      }
      case "non-pl-capital":
      case "non-pl-drawings":
      case "non-pl-liability":
      case "non-pl-asset": {
        // EXCLUDED from P&L per Ind-AS. Surface as a separate "Excluded" group for transparency.
        const cur = excludedBuckets.get(key) ?? { label: `${labelStr} — ${mapping.plLine}`, amount: 0 };
        cur.amount += contribution;
        excludedBuckets.set(key, cur);
        break;
      }
      default: {
        // No plLine on mapping → default to indirect
        const cur = indirectBuckets.get(key) ?? { label: leafLabel, amount: 0 };
        cur.amount += contribution;
        indirectBuckets.set(key, cur);
      }
    }

    // Legacy aggregate tallies for backward compatibility with callers
    if (e.category === "commission") agentAndCommission += contribution;
    if (e.category === "partner-profit-payment" || e.category === "partner-expense") partnerShare += contribution;
  }

  const directLines = [...directBuckets.entries()].map(([key, v]) => ({ key, ...v }));
  const indirectLines = [...indirectBuckets.entries()].map(([key, v]) => ({ key, ...v }));
  const financeCostLines = [...financeBuckets.entries()].map(([key, v]) => ({ key, ...v }));
  const taxLines = [...taxBuckets.entries()].map(([key, v]) => ({ key, ...v }));
  const excludedFromPL = [...excludedBuckets.entries()].map(([key, v]) => ({ key, ...v }));

  if (damageWriteOff > 0) {
    directLines.push({ key: "damage", label: "Material damage write-off", amount: damageWriteOff });
  }

  const totalDirect = directLines.reduce((s, l) => s + l.amount, 0);
  const totalIndirect = indirectLines.reduce((s, l) => s + l.amount, 0);
  const totalFinanceCost = financeCostLines.reduce((s, l) => s + l.amount, 0);
  const totalTax = taxLines.reduce((s, l) => s + l.amount, 0);

  const grossProfit = revenueTotal - cogs - totalDirect;
  const operatingProfit = grossProfit - totalIndirect;
  const profitBeforeTax = operatingProfit - totalFinanceCost;
  const netProfit = profitBeforeTax - totalTax;

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
    financeCostLines,
    taxLines,
    excludedFromPL,
    totalDirect,
    totalIndirect,
    totalFinanceCost,
    totalTax,
    operatingProfit,
    profitBeforeTax,
    netProfit,
    inventoryValue,
  };
}
