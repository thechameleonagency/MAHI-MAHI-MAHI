import { describe, expect, it } from "vitest";
import {
  isValidBankDate,
  normalizeBankDate,
  parseBankAmount,
  parseBankCsv,
} from "@/lib/bankReconciliationCsvParser";
import {
  syncBankReconciliationLinks,
  toBankReconciliationMatchInputs,
} from "@/lib/bankReconciliationLink";
import type { Expense, Payment } from "@/types/finance";

describe("BL-11: bank reconciliation CSV parser", () => {
  it("normalizes Indian dd-mm-yyyy and dd/mm/yyyy to ISO yyyy-MM-dd", () => {
    expect(normalizeBankDate("25-03-2026")).toBe("2026-03-25");
    expect(normalizeBankDate("25/03/2026")).toBe("2026-03-25");
    expect(normalizeBankDate("2026-03-25")).toBe("2026-03-25");
    expect(normalizeBankDate("2026/03/25")).toBe("2026-03-25");
  });

  it("parseBankAmount strips Indian currency markers and thousand separators", () => {
    expect(parseBankAmount("₹ 1,23,456.78")).toBeCloseTo(123456.78);
    expect(parseBankAmount("Rs. 50,000")).toBeCloseTo(50000);
    expect(parseBankAmount(" ")).toBe(0);
    expect(parseBankAmount("")).toBe(0);
    expect(parseBankAmount(undefined)).toBe(0);
    expect(parseBankAmount("abc")).toBe(0);
  });

  it("isValidBankDate accepts canonical bank formats and rejects garbage", () => {
    expect(isValidBankDate("25-03-2026")).toBe(true);
    expect(isValidBankDate("2026-03-25")).toBe(true);
    expect(isValidBankDate("13-13-2026")).toBe(false); // month 13
    expect(isValidBankDate("garbage")).toBe(false);
    expect(isValidBankDate("")).toBe(false);
  });

  it("parses HDFC-style header row with mixed case + skips invalid rows", () => {
    const csv = [
      "Date,Narration,Debit,Credit,Closing Balance,Chq/Ref No",
      "25/03/2026,NEFT-ACME-CO,,50000,920000,UTR123",
      "26/03/2026,Office Rent,15000,,905000,",
      "BAD-ROW-NO-DATE,Random,100,0,0,",
      "27/03/2026,Bank service charge SMS,75.50,,904924.50,",
    ].join("\n");

    const { transactions, skippedInvalid } = parseBankCsv(csv);
    expect(skippedInvalid).toBe(1);
    expect(transactions).toHaveLength(3);
    expect(transactions[0]).toMatchObject({
      date: "25/03/2026",
      credit: 50000,
      debit: 0,
      reference: "UTR123",
    });
    expect(transactions[1]).toMatchObject({
      date: "26/03/2026",
      debit: 15000,
      credit: 0,
    });
    expect(transactions[2].debit).toBeCloseTo(75.5);
  });

  it("parses SBI-style header row (Withdrawal/Deposit/Particulars)", () => {
    const csv = [
      "Txn Date,Particulars,Withdrawal,Deposit,Balance",
      "01-04-2026,Vendor Payment XYZ,25000.00,0.00,500000.00",
      "02-04-2026,Customer NEFT IN,0.00,75000.00,575000.00",
    ].join("\n");

    const { transactions, skippedInvalid } = parseBankCsv(csv);
    expect(skippedInvalid).toBe(0);
    expect(transactions).toHaveLength(2);
    expect(transactions[0].debit).toBe(25000);
    expect(transactions[1].credit).toBe(75000);
  });

  it("falls back to positional columns when headers are missing", () => {
    // Note: header row is still consumed even though it's not "named".
    const csv = [
      "header1,header2,header3,header4,header5,header6",
      "25-03-2026,desc,1000,0,99000,ref1",
    ].join("\n");
    const { transactions } = parseBankCsv(csv);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].debit).toBe(1000);
  });

  it("returns zero transactions when input has only a header (or is blank)", () => {
    expect(parseBankCsv("").transactions).toEqual([]);
    expect(parseBankCsv("Date,Description,Debit,Credit,Balance").transactions).toEqual([]);
  });

  it("BL-11 end-to-end: parse CSV → match against ledger → apply links to Payment + Expense", () => {
    // Seed a ledger slice resembling a real user workspace.
    const payment: Payment = {
      id: "PAY-RECON-1",
      date: "2026-03-25",
      amount: 50000,
      direction: "in",
      paymentMode: "neft",
      counterpartyType: "customer",
      counterpartyName: "Acme Co",
    };
    const expense: Expense = {
      id: "EXP-RECON-1",
      date: "2026-03-26",
      amount: 15000,
      category: "Office",
      paidBy: { type: "company" },
    };

    // User uploads a bank statement CSV exported from their bank.
    const csv = [
      "Date,Narration,Debit,Credit,Balance,Ref",
      "25/03/2026,NEFT Acme Co,,50000,920000,UTR-ACME-001",
      "26/03/2026,Office Rent paid,15000,,905000,",
      "27/03/2026,Bank service charge,75,,904925,",
    ].join("\n");

    const { transactions, skippedInvalid } = parseBankCsv(csv);
    expect(skippedInvalid).toBe(0);
    expect(transactions).toHaveLength(3);

    // Replicate the BankReconciliationSheet match algorithm at a high level:
    // amount match (±0.5) + direction match. Use ISO dates for comparison.
    type LedgerEntry = { id: string; type: string; amount: number; date: string; direction: "debit" | "credit" };
    const ledger: LedgerEntry[] = [
      { id: payment.id, type: "Payment Received", amount: payment.amount, date: payment.date, direction: "credit" },
      { id: expense.id, type: "Expense", amount: expense.amount, date: expense.date, direction: "debit" },
    ];

    const used = new Set<string>();
    const results = transactions.map((txn) => {
      const direction: "debit" | "credit" = txn.debit > 0 ? "debit" : "credit";
      const amount = txn.debit || txn.credit;
      const match = ledger.find(
        (l) => !used.has(l.id) && Math.abs(l.amount - amount) <= 0.5 && l.direction === direction,
      );
      if (match) used.add(match.id);
      return {
        flag: (match ? "matched" : "unmatched") as "matched" | "unmatched",
        statementId: "stmt-user-1",
        statementName: "user-hdfc.csv",
        bankTransaction: { date: txn.date },
        matchedLedgerEntry: match ? { id: match.id, type: match.type } : undefined,
      };
    });

    const matchedRows = results.filter((r) => r.flag === "matched");
    expect(matchedRows).toHaveLength(2); // Payment + Expense matched, bank charge unmatched.

    // toBankReconciliationMatchInputs converts UI results to apply inputs.
    const applyInputs = toBankReconciliationMatchInputs(
      results,
      (d) => normalizeBankDate(d),
    );
    expect(applyInputs).toHaveLength(2);

    // Apply matches to ledger via syncBankReconciliationLinks.
    const synced = syncBankReconciliationLinks(
      { expenses: [expense], incomes: [], payments: [payment], vendorPayments: [] },
      ["stmt-user-1"],
      applyInputs,
    );

    expect(synced.payments[0].reconciledWith?.statementId).toBe("stmt-user-1");
    expect(synced.payments[0].reconciledWith?.bankEntryDate).toBe("2026-03-25");
    expect(synced.expenses[0].reconciledWith?.statementId).toBe("stmt-user-1");
    expect(synced.expenses[0].reconciledWith?.bankEntryDate).toBe("2026-03-26");
  });
});
