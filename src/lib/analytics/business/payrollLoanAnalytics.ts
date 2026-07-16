/**
 * Payroll (salaries paid) and loan/debt analytics with monthly trends and
 * increase/decrease direction.
 */
import type {
  EmployeePayrollRecord,
  Loan,
  LoanRepayment,
} from "@/types/finance";
import {
  buildTimeSeries,
  inWindow,
  trendPct,
  type BusinessGranularity,
  type BusinessWindow,
  type SeriesPoint,
} from "./timeBuckets";

export interface PayrollAnalytics {
  totalPaid: number;
  payoutCount: number;
  employeesPaid: number;
  avgPerEmployee: number;
  highest: { employeeId: string; name: string; total: number } | null;
  perEmployee: { employeeId: string; name: string; total: number; payouts: number }[];
  paidSeries: SeriesPoint[];
  /** % change of the latest bucket vs previous (null when not computable). */
  trend: number | null;
}

export function computePayrollAnalytics(
  payrollRecords: EmployeePayrollRecord[],
  window: BusinessWindow,
  granularity: BusinessGranularity,
): PayrollAnalytics {
  const inPeriod = payrollRecords.filter((r) => inWindow(r.paidDate, window));

  const perEmpMap = new Map<string, { name: string; total: number; payouts: number }>();
  for (const r of inPeriod) {
    const key = String(r.employeeId);
    const entry = perEmpMap.get(key) ?? { name: r.employeeName, total: 0, payouts: 0 };
    entry.total += r.netAmount || 0;
    entry.payouts++;
    perEmpMap.set(key, entry);
  }
  const perEmployee = [...perEmpMap.entries()]
    .map(([employeeId, e]) => ({ employeeId, ...e, total: Math.round(e.total) }))
    .sort((a, b) => b.total - a.total);

  const totalPaid = Math.round(inPeriod.reduce((s, r) => s + (r.netAmount || 0), 0));
  const paidSeries = buildTimeSeries(
    inPeriod,
    (r) => r.paidDate,
    window,
    granularity,
    (r) => r.netAmount || 0,
  );

  return {
    totalPaid,
    payoutCount: inPeriod.length,
    employeesPaid: perEmployee.length,
    avgPerEmployee: perEmployee.length ? Math.round(totalPaid / perEmployee.length) : 0,
    highest: perEmployee[0]
      ? { employeeId: perEmployee[0].employeeId, name: perEmployee[0].name, total: perEmployee[0].total }
      : null,
    perEmployee,
    paidSeries,
    trend: trendPct(paidSeries),
  };
}

export interface LoanAnalytics {
  activeCount: number;
  totalOutstanding: number;
  monthlyEmiCommitment: number;
  /** Outstanding-weighted average interest rate across active loans. */
  avgInterestRate: number | null;
  newPrincipalInPeriod: number;
  principalRepaidInPeriod: number;
  interestPaidInPeriod: number;
  /** Debt direction over the window: borrowing vs principal repaid. */
  direction: "increasing" | "decreasing" | "flat";
  newLoanSeries: SeriesPoint[];
  repaymentSeries: SeriesPoint[];
  interestSeries: SeriesPoint[];
  loanRates: { loanId: string; source: string; interestRate: number; outstanding: number; status: string }[];
}

export function computeLoanAnalytics(
  loans: Loan[],
  repayments: LoanRepayment[],
  window: BusinessWindow,
  granularity: BusinessGranularity,
): LoanAnalytics {
  const active = loans.filter((l) => l.status === "Active");
  const totalOutstanding = Math.round(active.reduce((s, l) => s + (l.outstanding || 0), 0));

  const weighted = active.filter((l) => l.interestRate > 0 && l.outstanding > 0);
  const weightSum = weighted.reduce((s, l) => s + l.outstanding, 0);
  const avgInterestRate =
    weightSum > 0
      ? Math.round(
          (weighted.reduce((s, l) => s + l.interestRate * l.outstanding, 0) / weightSum) * 100,
        ) / 100
      : null;

  const newLoans = loans.filter((l) => inWindow(l.startDate, window));
  const repaymentsInPeriod = repayments.filter((r) => inWindow(r.date, window));

  const newPrincipalInPeriod = Math.round(newLoans.reduce((s, l) => s + (l.principal || 0), 0));
  const principalRepaidInPeriod = Math.round(
    repaymentsInPeriod.reduce((s, r) => s + (r.principalPaid || 0), 0),
  );
  const interestPaidInPeriod = Math.round(
    repaymentsInPeriod.reduce((s, r) => s + (r.interestPaid || 0), 0),
  );

  return {
    activeCount: active.length,
    totalOutstanding,
    monthlyEmiCommitment: Math.round(
      active.filter((l) => l.paymentType === "emi").reduce((s, l) => s + (l.emiAmount || 0), 0),
    ),
    avgInterestRate,
    newPrincipalInPeriod,
    principalRepaidInPeriod,
    interestPaidInPeriod,
    direction:
      newPrincipalInPeriod > principalRepaidInPeriod
        ? "increasing"
        : newPrincipalInPeriod < principalRepaidInPeriod
          ? "decreasing"
          : "flat",
    newLoanSeries: buildTimeSeries(newLoans, (l) => l.startDate, window, granularity, (l) => l.principal || 0),
    repaymentSeries: buildTimeSeries(
      repaymentsInPeriod,
      (r) => r.date,
      window,
      granularity,
      (r) => r.totalPaid || 0,
    ),
    interestSeries: buildTimeSeries(
      repaymentsInPeriod,
      (r) => r.date,
      window,
      granularity,
      (r) => r.interestPaid || 0,
    ),
    loanRates: loans
      .map((l) => ({
        loanId: l.id,
        source: l.source,
        interestRate: l.interestRate,
        outstanding: l.outstanding,
        status: l.status,
      }))
      .sort((a, b) => b.outstanding - a.outstanding),
  };
}
