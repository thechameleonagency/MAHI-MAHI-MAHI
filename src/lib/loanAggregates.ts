/**
 * BL-22: Reconcile stored loan aggregate fields from the repayment ledger.
 *
 * `Loan.outstanding` was seeded as `principal - emi * paid` for EMI loans and
 * arbitrary `principal * 0.6` for one-time loans. This decoupled the stored
 * value from the actual repayment history.
 *
 * After Round 8 this helper derives:
 *   - `outstanding` = principal − Σ(principalPaid)  [clamped ≥ 0]
 *   - `status`      = "Closed" when outstanding ≤ 0.01, else preserve "Active"
 *                      unless the source already marked it Closed.
 *
 * Runs in both hydration pipelines so list/detail/audit surfaces agree on
 * the canonical balance.
 */
import type { Loan, LoanRepayment } from "@/types/finance";

export function getLoanOutstanding(
  loan: Pick<Loan, "id" | "principal">,
  repayments: LoanRepayment[],
): number {
  const paid = repayments
    .filter((r) => r.loanId === loan.id)
    .reduce((s, r) => s + (r.principalPaid ?? 0), 0);
  return Math.max(0, (loan.principal ?? 0) - paid);
}

export function reconcileLoansOutstanding(
  loans: Loan[],
  repayments: LoanRepayment[],
): Loan[] {
  return loans.map((loan) => {
    const outstanding = getLoanOutstanding(loan, repayments);
    const status: Loan["status"] =
      outstanding <= 0.01
        ? "Closed"
        : loan.status === "Closed"
          ? "Closed"
          : "Active";
    return { ...loan, outstanding, status };
  });
}
