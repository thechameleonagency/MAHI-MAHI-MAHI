/**
 * BL-21: Reconcile stored employee aggregate fields from primary data slices.
 *
 * Per the audit mandate, all aggregate display values must derive from real
 * source-of-truth entities. These fields were previously seeded with
 * arbitrary demo numbers (`daysPresent: 18 + (i % 5)`, `advancePaid: 5000`,
 * etc.). After Round 8 the seed sets them to 0 and this reconciler hydrates
 * them from attendance records, the wallet ledger, and salary expenses.
 *
 * Runs at:
 *   - End of seed assembly (`seedHydration.ts`)
 *   - Boot rehydrate (`appDataStorage.ts`)
 *   - On every commit cycle that touches the relevant primary slices
 *
 * Field derivation:
 *   - `daysPresent`     = count of attendance rows with status "present" in the
 *                          current calendar month for this employee
 *   - `daysAbsent`      = count of "absent" rows in current month
 *   - `holidays`        = count of "holiday" rows in current month
 *   - `advancePaid`     = Σ(advances) − Σ(recoveries) in wallet ledger (lifetime),
 *                          clamped to ≥ 0 — represents net advance balance owed
 *                          back to the company.
 *   - `pendingAmount`   = pro-rata salary earned this month − salary payments
 *                          made this month, clamped to ≥ 0.
 *   - `wallet`          = same as `pendingAmount`. Some UI labels it "Wallet"
 *                          which is misleading; the field is kept for backward
 *                          compatibility but the derived value is the truth.
 */
import { format } from "date-fns";
import type { Employee, AttendanceRecord } from "@/types/project";
import type {
  EmployeeWalletLedgerEntry,
  EmployeePayrollRecord,
} from "@/types/finance";

function isCurrentMonth(dateIso: string, monthPrefix: string): boolean {
  return dateIso.startsWith(monthPrefix);
}

export function getEmployeeAdvanceBalance(
  employeeId: string,
  ledger: EmployeeWalletLedgerEntry[],
): number {
  let balance = 0;
  for (const row of ledger) {
    if (String(row.employeeId) !== String(employeeId)) continue;
    if (row.kind === "advance") balance += row.amount;
    else if (row.kind === "recovery") balance -= row.amount;
    else if (row.kind === "adjustment") balance += row.amount;
  }
  return Math.max(0, balance);
}

export function getEmployeeAttendanceCounts(
  employeeId: string,
  records: AttendanceRecord[],
  monthPrefix: string,
): { daysPresent: number; daysAbsent: number; holidays: number } {
  let p = 0;
  let a = 0;
  let h = 0;
  for (const r of records) {
    if (String(r.employeeId) !== String(employeeId)) continue;
    if (!isCurrentMonth(r.date, monthPrefix)) continue;
    if (r.status === "present" || r.status === "half-day") p += 1;
    else if (r.status === "absent") a += 1;
    else if (r.status === "holiday") h += 1;
  }
  return { daysPresent: p, daysAbsent: a, holidays: h };
}

export function getEmployeePendingSalary(
  employeeId: string,
  monthlySalary: number,
  payrollRecords: EmployeePayrollRecord[],
  attendanceRecords: AttendanceRecord[],
  monthPrefix: string,
): number {
  // Accrued portion based on present + half-day attendance (half = 0.5 day).
  let attendedDays = 0;
  for (const r of attendanceRecords) {
    if (String(r.employeeId) !== String(employeeId)) continue;
    if (!isCurrentMonth(r.date, monthPrefix)) continue;
    if (r.status === "present") attendedDays += 1;
    else if (r.status === "half-day") attendedDays += 0.5;
  }
  // Standard month basis: 26 working days. Salary accrual = monthly × (attended / 26).
  const accrued = (monthlySalary * attendedDays) / 26;
  // Salary actually paid this month.
  const paid = payrollRecords
    .filter(
      (r) =>
        String(r.employeeId) === String(employeeId) &&
        r.month === monthPrefix,
    )
    .reduce((s, r) => s + (r.netAmount ?? 0), 0);
  return Math.max(0, Math.round(accrued - paid));
}

export interface ReconcileEmployeesInput {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  walletLedger: EmployeeWalletLedgerEntry[];
  payrollRecords: EmployeePayrollRecord[];
  /** Defaults to today's month — pass for deterministic tests. */
  now?: Date;
}

/** Hydrate stored employee aggregate fields from primary data slices. */
export function reconcileEmployeesAggregates(
  input: ReconcileEmployeesInput,
): Employee[] {
  const now = input.now ?? new Date();
  const monthPrefix = format(now, "yyyy-MM");

  return input.employees.map((emp) => {
    const counts = getEmployeeAttendanceCounts(
      emp.id,
      input.attendanceRecords,
      monthPrefix,
    );
    const advancePaid = getEmployeeAdvanceBalance(emp.id, input.walletLedger);
    const pendingAmount = getEmployeePendingSalary(
      emp.id,
      emp.salary ?? 0,
      input.payrollRecords,
      input.attendanceRecords,
      monthPrefix,
    );
    return {
      ...emp,
      daysPresent: counts.daysPresent,
      daysAbsent: counts.daysAbsent,
      holidays: counts.holidays,
      advancePaid,
      pendingAmount,
      wallet: pendingAmount,
    };
  });
}
