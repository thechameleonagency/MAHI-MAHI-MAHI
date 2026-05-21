import type { NarrativeApply } from "./shared";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { seedDayAt, seedDateAt } from "../seedTimeModel";

export const applyLoanRepaymentLinks: NarrativeApply = (state) => {
  const loan = state.loans.find((l) => l.status === "Active" && l.paymentType === "emi");
  if (!loan) return;
  const linkTypes = [
    { linkedPaymentId: state.payments[0]?.id },
    { linkedExpenseId: state.expenses[0]?.id },
    { linkedVendorPaymentId: state.vendorPayments[0]?.id },
    {},
  ] as const;
  for (let i = 0; i < linkTypes.length; i++) {
    const total = loan.emiAmount || 12000;
    state.loanRepayments.push({
      id: seedId(SEED_ID_PREFIX.loanRepayment),
      loanId: loan.id,
      loanSource: loan.source,
      date: seedDayAt(0.48 + i * 0.01),
      emiNumber: 20 + i,
      interestPaid: Math.round(total * 0.28),
      principalPaid: Math.round(total * 0.72),
      totalPaid: total,
      ...linkTypes[i],
    });
  }
};
