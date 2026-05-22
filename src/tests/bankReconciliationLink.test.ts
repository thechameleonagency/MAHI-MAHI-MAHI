import { describe, expect, it } from "vitest";
import {
  buildBankReconciliationLink,
  clearBankReconciliationLinksForStatement,
  formatBankReconciliationLinkLabel,
  ledgerKindFromReconciliationType,
  syncBankReconciliationLinks,
} from "@/lib/bankReconciliationLink";
import { buildCashBankEntries } from "@/lib/audit/cashBankLedger";
import type { Expense, Payment } from "@/types/finance";

describe("bankReconciliationLink (E9)", () => {
  it("maps reconciliation ledger types to entity kinds", () => {
    expect(ledgerKindFromReconciliationType("Expense")).toBe("expense");
    expect(ledgerKindFromReconciliationType("Payment Received")).toBe("payment");
    expect(ledgerKindFromReconciliationType("Vendor Payment")).toBe("vendor_payment");
  });

  it("syncBankReconciliationLinks writes reconciledWith on matched expense", () => {
    const expenses: Expense[] = [
      {
        id: "EXP-005",
        date: "2026-03-25",
        amount: 4200,
        category: "Office",
        paidBy: { type: "company" },
      },
    ];
    const matchedAt = "2026-03-26T10:00:00.000Z";
    const synced = syncBankReconciliationLinks(
      { expenses, incomes: [], payments: [], vendorPayments: [] },
      ["stmt-1"],
      [
        {
          flag: "matched",
          statementId: "stmt-1",
          statementName: "hdfc.csv",
          bankEntryDate: "2026-03-25",
          ledgerEntryId: "EXP-005",
          ledgerEntryType: "Expense",
        },
      ],
      matchedAt,
    );
    const link = synced.expenses[0].reconciledWith!;
    expect(link.statementId).toBe("stmt-1");
    expect(link.bankEntryDate).toBe("2026-03-25");
    expect(link.matchFlag).toBe("matched");
    expect(formatBankReconciliationLinkLabel(link)).toContain("hdfc.csv");
    expect(formatBankReconciliationLinkLabel(link)).toContain("2026-03-25");
  });

  it("clears links when statement is removed from active set", () => {
    const expenses: Expense[] = [
      {
        id: "EXP-005",
        date: "2026-03-25",
        amount: 4200,
        category: "Office",
        paidBy: { type: "company" },
        reconciledWith: {
          statementId: "stmt-old",
          bankEntryDate: "2026-03-25",
        },
      },
    ];
    const synced = syncBankReconciliationLinks(
      { expenses, incomes: [], payments: [], vendorPayments: [] },
      [],
      [],
    );
    expect(synced.expenses[0].reconciledWith).toBeUndefined();
  });

  it("clearBankReconciliationLinksForStatement removes one statement only", () => {
    const expenses: Expense[] = [
      {
        id: "EXP-A",
        date: "2026-03-25",
        amount: 100,
        category: "Office",
        paidBy: { type: "company" },
        reconciledWith: { statementId: "stmt-a", bankEntryDate: "2026-03-25" },
      },
      {
        id: "EXP-B",
        date: "2026-03-26",
        amount: 200,
        category: "Office",
        paidBy: { type: "company" },
        reconciledWith: { statementId: "stmt-b", bankEntryDate: "2026-03-26" },
      },
    ];
    const next = clearBankReconciliationLinksForStatement(expenses, "stmt-a");
    expect(next[0].reconciledWith).toBeUndefined();
    expect(next[1].reconciledWith?.statementId).toBe("stmt-b");
  });

  // BL-9: Payment must carry `reconciledWith` so customer-payment rows survive
  // upload → match → apply → reopen round-trips. The type was previously missing
  // this field even though the link code and seed already wrote to it.
  it("Payment round-trip: apply, clear via inactive set, re-apply", () => {
    const matchedAt = "2026-03-26T10:00:00.000Z";
    const initialPayment: Payment = {
      id: "PAY-001",
      date: "2026-03-25",
      amount: 50000,
      direction: "in",
      paymentMode: "bank",
      counterpartyType: "customer",
      counterpartyName: "Acme Co",
    };

    // Step 1: first reconciliation cycle — apply match.
    const applied = syncBankReconciliationLinks(
      { expenses: [], incomes: [], payments: [initialPayment], vendorPayments: [] },
      ["stmt-1"],
      [
        {
          flag: "matched",
          statementId: "stmt-1",
          statementName: "hdfc.csv",
          bankEntryDate: "2026-03-25",
          ledgerEntryId: "PAY-001",
          ledgerEntryType: "Payment Received",
        },
      ],
      matchedAt,
    );
    expect(applied.payments[0].reconciledWith?.statementId).toBe("stmt-1");
    expect(applied.payments[0].reconciledWith?.matchFlag).toBe("matched");

    // Step 2: user removes statement from active set; link is stripped.
    const cleared = syncBankReconciliationLinks(
      { expenses: [], incomes: [], payments: applied.payments, vendorPayments: [] },
      [],
      [],
    );
    expect(cleared.payments[0].reconciledWith).toBeUndefined();

    // Step 3: re-upload same statement and re-apply same match. Round-trips correctly.
    const reapplied = syncBankReconciliationLinks(
      { expenses: [], incomes: [], payments: cleared.payments, vendorPayments: [] },
      ["stmt-1"],
      [
        {
          flag: "matched",
          statementId: "stmt-1",
          statementName: "hdfc.csv",
          bankEntryDate: "2026-03-25",
          ledgerEntryId: "PAY-001",
          ledgerEntryType: "Payment Received",
        },
      ],
      matchedAt,
    );
    expect(reapplied.payments[0].reconciledWith?.statementId).toBe("stmt-1");
    expect(reapplied.payments[0].reconciledWith?.bankEntryDate).toBe("2026-03-25");
  });

  it("buildCashBankEntries surfaces bankReconciledNote", () => {
    const entries = buildCashBankEntries({
      payments: [],
      incomes: [],
      vendorPayments: [],
      loanRepayments: [],
      expenses: [
        {
          id: "EXP-005",
          date: "2026-03-25",
          amount: 4200,
          category: "Office",
          paidBy: { type: "company" },
          reconciledWith: {
            statementId: "stmt-seed",
            statementName: "hdfc.csv",
            bankEntryDate: "2026-03-25",
          },
        },
      ],
    });
    expect(entries[0].bankReconciledNote).toContain("hdfc.csv");
  });
});
