/**
 * E6 — Loan repayment ↔ cash movement linkage
 *
 * Every repayment should tie to exactly one cash source: outbound `Payment`,
 * `Expense` (loan-repayment category with interest/principal split), or `VendorPayment`.
 * The cash-bank ledger uses the linked row only (no duplicate standalone repayment credit).
 */
import type { Expense, Loan, LoanRepayment, Payment } from "@/types/finance";
import type { VendorPayment } from "@/types/inventory";

export type LoanRepaymentCashLinkInput =
  | { type: "payment"; paymentMode?: string; existingPaymentId?: string }
  | { type: "expense"; existingExpenseId?: string }
  | { type: "vendor_payment"; existingVendorPaymentId?: string }
  | { type: "none" };

const DEFAULT_PAYMENT_MODE = "Bank Transfer";
const AMOUNT_TOLERANCE = 1.5;

export function loanRepaymentHasCashLink(repayment: Pick<LoanRepayment, "linkedPaymentId" | "linkedExpenseId" | "linkedVendorPaymentId">): boolean {
  return Boolean(repayment.linkedPaymentId || repayment.linkedExpenseId || repayment.linkedVendorPaymentId);
}

export function findUnlinkedPaymentForRepayment(
  payments: Payment[],
  repayment: Pick<LoanRepayment, "loanId" | "date" | "totalPaid">,
): Payment | undefined {
  return payments.find(
    (p) =>
      p.direction === "out" &&
      p.loanId === repayment.loanId &&
      !p.loanRepaymentId &&
      p.date === repayment.date &&
      Math.abs(p.amount - repayment.totalPaid) <= AMOUNT_TOLERANCE,
  );
}

export function findUnlinkedExpenseForRepayment(
  expenses: Expense[],
  repayment: Pick<LoanRepayment, "loanId" | "date" | "totalPaid">,
): Expense | undefined {
  return expenses.find(
    (e) =>
      e.loanId === repayment.loanId &&
      !e.loanRepaymentId &&
      e.date === repayment.date &&
      Math.abs(e.amount - repayment.totalPaid) <= AMOUNT_TOLERANCE,
  );
}

export function findUnlinkedVendorPaymentForRepayment(
  vendorPayments: VendorPayment[],
  repayment: Pick<LoanRepayment, "loanId" | "date" | "totalPaid">,
): VendorPayment | undefined {
  return vendorPayments.find(
    (vp) =>
      vp.loanId === repayment.loanId &&
      !vp.loanRepaymentId &&
      vp.date === repayment.date &&
      Math.abs(vp.amount - repayment.totalPaid) <= AMOUNT_TOLERANCE,
  );
}

export function buildOutboundPaymentForRepayment(
  repayment: LoanRepayment,
  loan: Loan,
  paymentId: string,
  paymentMode = DEFAULT_PAYMENT_MODE,
): Payment {
  const splitNote =
    repayment.interestPaid > 0
      ? ` (principal ${repayment.principalPaid} + interest ${repayment.interestPaid})`
      : "";
  return {
    id: paymentId,
    date: repayment.date,
    amount: repayment.totalPaid,
    direction: "out",
    paymentMode,
    notes: `Loan repayment — ${loan.source}${splitNote}`,
    counterpartyType: "other",
    counterpartyName: loan.source,
    loanId: loan.id,
    loanRepaymentId: repayment.id,
  };
}

export function buildExpenseForRepayment(
  repayment: LoanRepayment,
  loan: Loan,
  expenseId: string,
  paymentMode = DEFAULT_PAYMENT_MODE,
): Expense {
  return {
    id: expenseId,
    date: repayment.date,
    amount: repayment.totalPaid,
    mainCategory: "company",
    category: "Loan Repayment",
    description: `Loan repayment — ${loan.source} (${repayment.id})`,
    paidBy: { type: "company" },
    paymentMode,
    interestPortion: repayment.interestPaid,
    principalPortion: repayment.principalPaid,
    loanId: loan.id,
    loanRepaymentId: repayment.id,
    createdAt: new Date().toISOString(),
  };
}

export function attachVendorPaymentLink(
  vp: VendorPayment,
  repayment: LoanRepayment,
  loan: Loan,
): VendorPayment {
  return {
    ...vp,
    loanId: loan.id,
    loanRepaymentId: repayment.id,
    notes: [vp.notes, `Loan repayment ${repayment.id}`].filter(Boolean).join(" · "),
  };
}

export type LoanRepaymentCashLinkResult = {
  repayment: LoanRepayment;
  payment?: Payment;
  expense?: Expense;
  vendorPayment?: VendorPayment;
  /** Patched vendor payments array (when linking existing VP). */
  vendorPayments?: VendorPayment[];
};

export function resolveLoanRepaymentCashLink(
  ctx: {
    payments: Payment[];
    expenses: Expense[];
    vendorPayments: VendorPayment[];
  },
  repayment: LoanRepayment,
  loan: Loan,
  input: LoanRepaymentCashLinkInput,
  ids: { paymentId?: string; expenseId?: string },
): LoanRepaymentCashLinkResult {
  if (input.type === "none") {
    return { repayment };
  }

  if (input.type === "payment") {
    const existing =
      (input.existingPaymentId
        ? ctx.payments.find((p) => p.id === input.existingPaymentId)
        : undefined) ?? findUnlinkedPaymentForRepayment(ctx.payments, repayment);
    if (existing && !existing.loanRepaymentId) {
      const payment: Payment = { ...existing, loanId: loan.id, loanRepaymentId: repayment.id };
      return {
        repayment: { ...repayment, linkedPaymentId: payment.id },
        payment,
      };
    }
    const paymentId = ids.paymentId ?? repayment.id.replace(/^LR/, "PAY-LR-");
    const payment = buildOutboundPaymentForRepayment(
      repayment,
      loan,
      paymentId,
      input.paymentMode ?? DEFAULT_PAYMENT_MODE,
    );
    return {
      repayment: { ...repayment, linkedPaymentId: payment.id },
      payment,
    };
  }

  if (input.type === "expense") {
    const existing =
      (input.existingExpenseId
        ? ctx.expenses.find((e) => e.id === input.existingExpenseId)
        : undefined) ?? findUnlinkedExpenseForRepayment(ctx.expenses, repayment);
    if (existing && !existing.loanRepaymentId) {
      const expense: Expense = {
        ...existing,
        loanId: loan.id,
        loanRepaymentId: repayment.id,
        interestPortion: repayment.interestPaid,
        principalPortion: repayment.principalPaid,
      };
      return {
        repayment: { ...repayment, linkedExpenseId: expense.id },
        expense,
      };
    }
    const expenseId = ids.expenseId ?? repayment.id.replace(/^LR/, "EXP-LR-");
    const expense = buildExpenseForRepayment(repayment, loan, expenseId);
    return {
      repayment: { ...repayment, linkedExpenseId: expense.id },
      expense,
    };
  }

  const existing =
    (input.existingVendorPaymentId
      ? ctx.vendorPayments.find((vp) => vp.id === input.existingVendorPaymentId)
      : undefined) ?? findUnlinkedVendorPaymentForRepayment(ctx.vendorPayments, repayment);
  if (existing && !existing.loanRepaymentId) {
    const vendorPayment = attachVendorPaymentLink(existing, repayment, loan);
    return {
      repayment: { ...repayment, linkedVendorPaymentId: vendorPayment.id },
      vendorPayment,
      vendorPayments: ctx.vendorPayments.map((vp) => (vp.id === vendorPayment.id ? vendorPayment : vp)),
    };
  }

  return { repayment };
}

/** Apply payment patch into payments array (insert or replace by id). */
export function upsertPaymentRow(payments: Payment[], row: Payment): Payment[] {
  const idx = payments.findIndex((p) => p.id === row.id);
  if (idx >= 0) {
    return payments.map((p, i) => (i === idx ? row : p));
  }
  return [row, ...payments];
}

export function upsertExpenseRow(expenses: Expense[], row: Expense): Expense[] {
  const idx = expenses.findIndex((e) => e.id === row.id);
  if (idx >= 0) {
    return expenses.map((e, i) => (i === idx ? row : e));
  }
  return [row, ...expenses];
}
