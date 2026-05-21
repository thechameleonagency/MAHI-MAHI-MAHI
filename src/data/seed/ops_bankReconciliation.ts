import type { AppState } from "@/contexts/AppDataContext";
import type { SeedProfile } from "./seedLayerOrder";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDayAt, seedDateAt } from "./seedTimeModel";
import { getMinimumFor } from "./seedVolumeTargets";
import type { BankReconciliationStatement } from "@/types/finance";

/** Ensure bank statements + matched/unmatched ledger coverage (§4 row 46). */
export function buildOpsBankReconciliation(state: AppState, profile: SeedProfile): AppState {
  const target = getMinimumFor(profile, "bankReconciliationStatements");
  while (state.bankReconciliationStatements.length < target) {
    const idx = state.bankReconciliationStatements.length;
    const stmtId = seedId(SEED_ID_PREFIX.bankStatement);
    const payment = state.payments[idx % Math.max(1, state.payments.length)];
    const expense = state.expenses[idx % Math.max(1, state.expenses.length)];
    const income = state.incomes[idx % Math.max(1, state.incomes.length)];
    const vp = state.vendorPayments[idx % Math.max(1, state.vendorPayments.length)];

    const transactions: BankReconciliationStatement["transactions"] = [];
    let balance = 920000 + idx * 5000;

    if (payment) {
      const credit = payment.direction === "in" ? payment.amount : 0;
      const debit = payment.direction === "out" ? payment.amount : 0;
      balance += credit - debit;
      transactions.push({
        date: payment.date,
        description: `NEFT ${payment.counterpartyType}`,
        debit,
        credit,
        balance,
        reference: payment.reference,
        rawLine: `${payment.id},matched`,
      });
    }
    if (expense && idx % 2 === 0) {
      balance -= expense.amount;
      transactions.push({
        date: expense.date,
        description: `Expense ${expense.category}`,
        debit: expense.amount,
        credit: 0,
        balance,
        rawLine: `${expense.id},matched`,
      });
    }
    if (income && idx % 3 === 0) {
      balance += income.amount;
      transactions.push({
        date: income.date,
        description: `Income ${income.category}`,
        debit: 0,
        credit: income.amount,
        balance,
        rawLine: `${income.id},matched`,
      });
    }
    if (vp && idx % 4 === 0) {
      balance -= vp.amount;
      transactions.push({
        date: vp.date,
        description: `Vendor payment ${vp.vendorName}`,
        debit: vp.amount,
        credit: 0,
        balance,
        rawLine: `${vp.id},matched`,
      });
    }

    transactions.push({
      date: seedDayAt(0.74 + idx * 0.005),
      description: "UPI — unmapped credit",
      debit: 0,
      credit: 8500 + idx * 100,
      balance: balance + 8500,
      rawLine: "unmatched",
    });

    state.bankReconciliationStatements.push({
      id: stmtId,
      fileName: `HDFC-Ops-${idx + 1}-2026.csv`,
      type: "bank",
      transactions,
      uploadedAt: seedDateAt(0.76 + idx * 0.005),
    });
  }

  return state;
}

/** Build match inputs for hydration syncBankReconciliationLinks. */
export function buildBankReconciliationMatches(state: AppState) {
  const matches: Array<{
    flag: "matched" | "possible-match";
    statementId: string;
    statementName: string;
    bankEntryDate: string;
    ledgerEntryId: string;
    ledgerEntryType: string;
  }> = [];

  for (const payment of state.payments) {
    if (!payment.reconciledWith) continue;
    matches.push({
      flag: payment.reconciledWith.matchFlag ?? "matched",
      statementId: payment.reconciledWith.statementId,
      statementName: payment.reconciledWith.statementName,
      bankEntryDate: payment.reconciledWith.bankEntryDate,
      ledgerEntryId: payment.id,
      ledgerEntryType: payment.direction === "in" ? "Payment Received" : "Payment Paid",
    });
  }
  for (const expense of state.expenses) {
    if (!expense.reconciledWith) continue;
    matches.push({
      flag: expense.reconciledWith.matchFlag ?? "matched",
      statementId: expense.reconciledWith.statementId,
      statementName: expense.reconciledWith.statementName,
      bankEntryDate: expense.reconciledWith.bankEntryDate,
      ledgerEntryId: expense.id,
      ledgerEntryType: "Expense",
    });
  }
  for (const income of state.incomes) {
    if (!income.reconciledWith) continue;
    matches.push({
      flag: income.reconciledWith.matchFlag ?? "matched",
      statementId: income.reconciledWith.statementId,
      statementName: income.reconciledWith.statementName,
      bankEntryDate: income.reconciledWith.bankEntryDate,
      ledgerEntryId: income.id,
      ledgerEntryType: "Income",
    });
  }
  for (const vp of state.vendorPayments) {
    if (!vp.reconciledWith) continue;
    matches.push({
      flag: vp.reconciledWith.matchFlag ?? "matched",
      statementId: vp.reconciledWith.statementId,
      statementName: vp.reconciledWith.statementName,
      bankEntryDate: vp.reconciledWith.bankEntryDate,
      ledgerEntryId: vp.id,
      ledgerEntryType: "Vendor Payment",
    });
  }

  return matches;
}
