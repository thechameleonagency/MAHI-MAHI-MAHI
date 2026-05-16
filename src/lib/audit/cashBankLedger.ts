import type { Expense, Income, Payment } from "@/types/finance";
import type { LoanRepayment } from "@/types/finance";
import type { VendorPayment } from "@/types/inventory";

export interface CashBankEntry {
  date: string;
  description: string;
  account: string;
  debit: number;
  credit: number;
  reference: string;
  type: string;
}

export interface CashBankLedgerInput {
  payments: Payment[];
  expenses: Expense[];
  incomes: Income[];
  vendorPayments: VendorPayment[];
  loanRepayments: LoanRepayment[];
}

export function normalizePaymentAccount(mode?: string): string {
  if (!mode) return "Other";
  const m = mode.toLowerCase();
  if (m.includes("cash")) return "Cash";
  if (m.includes("bank") || m.includes("transfer") || m.includes("neft") || m.includes("rtgs")) return "Bank";
  if (m.includes("upi")) return "UPI";
  if (m.includes("cheque")) return "Cheque";
  return "Other";
}

/** Skip internal cash↔bank movements that would double-count liquidity. */
export function isInterAccountTransfer(description: string, type: string): boolean {
  const d = description.toLowerCase();
  if (type === "transfer") return true;
  return (
    d.includes("cash to bank") ||
    d.includes("bank to cash") ||
    d.includes("inter-account") ||
    d.includes("contra entry") ||
    (d.includes("transfer") && d.includes("account"))
  );
}

export function buildCashBankEntries(input: CashBankLedgerInput): CashBankEntry[] {
  const entries: CashBankEntry[] = [];

  input.payments
    .filter((p) => p.direction === "in")
    .forEach((p) => {
      entries.push({
        date: p.date,
        description: `Payment from ${p.counterpartyName || "Customer"}`,
        account: normalizePaymentAccount(p.paymentMode),
        debit: p.amount,
        credit: 0,
        reference: p.invoiceId || p.id,
        type: "payment_received",
      });
    });

  input.payments
    .filter((p) => p.direction === "out")
    .forEach((p) => {
      entries.push({
        date: p.date,
        description: `Payment to ${p.counterpartyName || "Vendor"}`,
        account: normalizePaymentAccount(p.paymentMode),
        debit: 0,
        credit: p.amount,
        reference: p.id,
        type: "payment_paid",
      });
    });

  input.expenses.forEach((e) => {
    entries.push({
      date: e.date,
      description: `Expense: ${e.category}${e.projectName ? ` (${e.projectName})` : ""}`,
      account: normalizePaymentAccount(e.paymentMode),
      debit: 0,
      credit: e.amount,
      reference: e.id,
      type: "expense",
    });
  });

  input.incomes
    .filter((i) => !i.isOutgoing)
    .forEach((i) => {
      entries.push({
        date: i.date,
        description: `Income: ${i.category}${i.projectName ? ` (${i.projectName})` : ""}`,
        account: normalizePaymentAccount(i.paymentMode),
        debit: i.amount,
        credit: 0,
        reference: i.id,
        type: "income",
      });
    });

  input.incomes
    .filter((i) => i.isOutgoing)
    .forEach((i) => {
      entries.push({
        date: i.date,
        description: `Outgoing: ${i.category}`,
        account: normalizePaymentAccount(i.paymentMode),
        debit: 0,
        credit: i.amount,
        reference: i.id,
        type: "outgoing",
      });
    });

  input.vendorPayments.forEach((vp) => {
    entries.push({
      date: vp.date,
      description: `Vendor payment: ${vp.vendorName || "Vendor"}`,
      account: normalizePaymentAccount(vp.paymentMode),
      debit: 0,
      credit: vp.amount,
      reference: vp.billNumber || vp.id,
      type: "vendor_payment",
    });
  });

  input.loanRepayments.forEach((lr) => {
    entries.push({
      date: lr.date,
      description: `Loan repayment: ${lr.loanSource}`,
      account: "Bank",
      debit: 0,
      credit: lr.totalPaid,
      reference: lr.loanId,
      type: "loan_repayment",
    });
  });

  return entries
    .filter((e) => !isInterAccountTransfer(e.description, e.type))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function applyRunningBalance(
  entries: CashBankEntry[],
  openingBalance: number,
): (CashBankEntry & { balance: number })[] {
  const sorted = [...entries].reverse();
  let balance = openingBalance;
  const withBalance = sorted.map((e) => {
    balance += e.debit - e.credit;
    return { ...e, balance };
  });
  return withBalance.reverse();
}

export function accountClosingBalances(
  entries: CashBankEntry[],
  openingBalance: number,
): Record<string, number> {
  const accounts = ["Cash", "Bank", "UPI", "Cheque", "Other"];
  const totals: Record<string, { debit: number; credit: number }> = {};
  accounts.forEach((a) => {
    totals[a] = { debit: 0, credit: 0 };
  });
  entries.forEach((e) => {
    if (!totals[e.account]) totals[e.account] = { debit: 0, credit: 0 };
    totals[e.account].debit += e.debit;
    totals[e.account].credit += e.credit;
  });
  const result: Record<string, number> = {};
  accounts.forEach((a) => {
    const base = a === "Cash" || a === "Bank" ? openingBalance / 2 : 0;
    result[a] = base + totals[a].debit - totals[a].credit;
  });
  return result;
}
