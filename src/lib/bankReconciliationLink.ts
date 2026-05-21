/**
 * E9 — Persist bank reconciliation matches on source ledger rows.
 */
import type { Expense, Income, Payment, BankReconciliationLink } from "@/types/finance";
import type { VendorPayment } from "@/types/inventory";

export type BankReconciliationLedgerKind = "expense" | "income" | "payment" | "vendor_payment";

export type BankReconciliationMatchApplyInput = {
  flag: "matched" | "possible-match";
  statementId: string;
  statementName: string;
  bankEntryDate: string;
  ledgerEntryId: string;
  ledgerEntryType: string;
};

export function ledgerKindFromReconciliationType(
  type: string,
): BankReconciliationLedgerKind | null {
  if (type === "Expense") return "expense";
  if (type === "Income") return "income";
  if (type === "Payment Received" || type === "Payment Paid") return "payment";
  if (type === "Vendor Payment") return "vendor_payment";
  return null;
}

export function buildBankReconciliationLink(
  input: Pick<
    BankReconciliationMatchApplyInput,
    "statementId" | "statementName" | "bankEntryDate" | "flag"
  >,
  matchedAt = new Date().toISOString(),
): BankReconciliationLink {
  return {
    statementId: input.statementId,
    statementName: input.statementName,
    bankEntryDate: input.bankEntryDate,
    matchedAt,
    matchFlag: input.flag,
  };
}

export function formatBankReconciliationLinkLabel(
  link: BankReconciliationLink,
): string {
  const name = link.statementName?.trim() || link.statementId;
  const flag =
    link.matchFlag === "possible-match" ? "Possible bank match" : "Reconciled with bank";
  return `${flag}: ${name} on ${link.bankEntryDate}`;
}

export function isBankReconciliationLinkActive(
  link: BankReconciliationLink | undefined,
  activeStatementIds: Set<string>,
): boolean {
  return Boolean(link && activeStatementIds.has(link.statementId));
}

function applyLinkToExpense(expense: Expense, link: BankReconciliationLink): Expense {
  return { ...expense, reconciledWith: link };
}

function applyLinkToIncome(income: Income, link: BankReconciliationLink): Income {
  return { ...income, reconciledWith: link };
}

function applyLinkToPayment(payment: Payment, link: BankReconciliationLink): Payment {
  return { ...payment, reconciledWith: link };
}

function applyLinkToVendorPayment(vp: VendorPayment, link: BankReconciliationLink): VendorPayment {
  return { ...vp, reconciledWith: link };
}

function stripStaleLink<T extends { reconciledWith?: BankReconciliationLink }>(
  row: T,
  activeStatementIds: Set<string>,
): T {
  if (!row.reconciledWith || activeStatementIds.has(row.reconciledWith.statementId)) {
    return row;
  }
  const { reconciledWith: _removed, ...rest } = row;
  return rest as T;
}

export function clearBankReconciliationLinksForStatement<
  T extends { reconciledWith?: BankReconciliationLink },
>(rows: T[], statementId: string): T[] {
  return rows.map((row) => {
    if (row.reconciledWith?.statementId !== statementId) return row;
    const { reconciledWith: _removed, ...rest } = row;
    return rest as T;
  });
}

export type BankReconciliationLedgerState = {
  expenses: Expense[];
  incomes: Income[];
  payments: Payment[];
  vendorPayments: VendorPayment[];
};

export function syncBankReconciliationLinks(
  state: BankReconciliationLedgerState,
  activeStatementIds: string[],
  matches: BankReconciliationMatchApplyInput[],
  matchedAt = new Date().toISOString(),
): BankReconciliationLedgerState {
  const active = new Set(activeStatementIds);

  let expenses = state.expenses.map((e) => stripStaleLink(e, active));
  let incomes = state.incomes.map((i) => stripStaleLink(i, active));
  let payments = state.payments.map((p) => stripStaleLink(p, active));
  let vendorPayments = state.vendorPayments.map((vp) => stripStaleLink(vp, active));

  for (const match of matches) {
    if (match.flag !== "matched" && match.flag !== "possible-match") continue;
    const kind = ledgerKindFromReconciliationType(match.ledgerEntryType);
    if (!kind) continue;
    const link = buildBankReconciliationLink(match, matchedAt);

    if (kind === "expense") {
      expenses = expenses.map((e) =>
        e.id === match.ledgerEntryId ? applyLinkToExpense(e, link) : e,
      );
    } else if (kind === "income") {
      incomes = incomes.map((i) =>
        i.id === match.ledgerEntryId ? applyLinkToIncome(i, link) : i,
      );
    } else if (kind === "payment") {
      payments = payments.map((p) =>
        p.id === match.ledgerEntryId ? applyLinkToPayment(p, link) : p,
      );
    } else {
      vendorPayments = vendorPayments.map((vp) =>
        vp.id === match.ledgerEntryId ? applyLinkToVendorPayment(vp, link) : vp,
      );
    }
  }

  return { expenses, incomes, payments, vendorPayments };
}

export function toBankReconciliationMatchInputs(
  results: Array<{
    flag: string;
    statementId: string;
    statementName: string;
    bankTransaction: { date: string };
    matchedLedgerEntry?: { id: string; type: string };
  }>,
  normalizeBankDate: (raw: string) => string,
): BankReconciliationMatchApplyInput[] {
  return results.flatMap((r) => {
    if (!r.matchedLedgerEntry) return [];
    if (r.flag !== "matched" && r.flag !== "possible-match") return [];
    return [
      {
        flag: r.flag,
        statementId: r.statementId,
        statementName: r.statementName,
        bankEntryDate: normalizeBankDate(r.bankTransaction.date),
        ledgerEntryId: r.matchedLedgerEntry.id,
        ledgerEntryType: r.matchedLedgerEntry.type,
      },
    ];
  });
}
