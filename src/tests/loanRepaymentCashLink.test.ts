import { describe, expect, it } from "vitest";
import { buildCashBankEntries } from "@/lib/audit/cashBankLedger";
import {
  buildOutboundPaymentForRepayment,
  findUnlinkedPaymentForRepayment,
  loanRepaymentHasCashLink,
  resolveLoanRepaymentCashLink,
} from "@/lib/loanRepaymentCashLink";
import type { Loan, LoanRepayment, Payment } from "@/types/finance";
import { seedLoanRepayments, seedLoans, seedPayments } from "@/data/seedData";

const loan: Loan = seedLoans[0];

describe("loanRepaymentCashLink (E6)", () => {
  it("creates outbound payment linked to repayment by default", () => {
    const repayment: LoanRepayment = {
      id: "LR-TEST",
      loanId: loan.id,
      loanSource: loan.source,
      date: "2026-06-01",
      emiNumber: 9,
      principalPaid: 90000,
      interestPaid: 35000,
      totalPaid: 125000,
    };
    const result = resolveLoanRepaymentCashLink(
      { payments: [], expenses: [], vendorPayments: [] },
      repayment,
      loan,
      { type: "payment", paymentMode: "NEFT" },
      { paymentId: "PAY-TEST" },
    );
    expect(result.repayment.linkedPaymentId).toBe("PAY-TEST");
    expect(result.payment?.loanRepaymentId).toBe("LR-TEST");
    expect(result.payment?.direction).toBe("out");
    expect(result.payment?.amount).toBe(125000);
  });

  it("links existing payment on same loan, date, and amount", () => {
    const payment: Payment = {
      id: "PAY-MATCH",
      date: "2026-05-15",
      amount: 45000,
      direction: "out",
      paymentMode: "Bank Transfer",
      counterpartyType: "other",
      counterpartyName: "ICICI Bank",
      loanId: "LOAN-002",
    };
    const repayment: LoanRepayment = {
      id: "LR-MATCH",
      loanId: "LOAN-002",
      loanSource: "ICICI Bank",
      date: "2026-05-15",
      emiNumber: 6,
      principalPaid: 32000,
      interestPaid: 13000,
      totalPaid: 45000,
    };
    expect(findUnlinkedPaymentForRepayment([payment], repayment)?.id).toBe("PAY-MATCH");
    const result = resolveLoanRepaymentCashLink(
      { payments: [payment], expenses: [], vendorPayments: [] },
      repayment,
      seedLoans[1],
      { type: "payment" },
      {},
    );
    expect(result.repayment.linkedPaymentId).toBe("PAY-MATCH");
    expect(result.payment?.loanRepaymentId).toBe("LR-MATCH");
  });

  it("cash bank ledger skips repayments that already have a cash link", () => {
    const linked = seedLoanRepayments.filter((r) => r.linkedPaymentId);
    expect(linked.length).toBeGreaterThan(0);
    const rows = buildCashBankEntries({
      payments: seedPayments,
      expenses: [],
      incomes: [],
      vendorPayments: [],
      loanRepayments: seedLoanRepayments,
    });
    const linkedCredits = rows.filter(
      (r) => r.type === "loan_repayment" && linked.some((lr) => lr.date === r.date && lr.totalPaid === r.credit),
    );
    expect(linkedCredits.length).toBe(0);
    const payRows = rows.filter((r) => r.reference === "PAY-010" || r.description.includes("HDFC"));
    expect(payRows.some((r) => r.type === "payment_paid")).toBe(true);
  });

  it("buildOutboundPaymentForRepayment sets loan ids on payment", () => {
    const repayment = seedLoanRepayments[3];
    const pay = buildOutboundPaymentForRepayment(repayment, loan, "PAY-X");
    expect(pay.loanId).toBe(repayment.loanId);
    expect(pay.loanRepaymentId).toBe(repayment.id);
    expect(loanRepaymentHasCashLink({ ...repayment, linkedPaymentId: "PAY-X" })).toBe(true);
  });
});
