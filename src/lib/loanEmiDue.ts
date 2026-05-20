/** Loan EMI due-date helpers (shared by Dashboard and Loans list deep-links). */

export type LoanEmiDueInput = {
  nextEmiDate?: string;
  dueDate?: string;
};

export function getLoanEmiDueDate(loan: LoanEmiDueInput): Date | null {
  const raw = loan.nextEmiDate ?? loan.dueDate;
  if (!raw || Number.isNaN(Date.parse(raw))) return null;
  return new Date(raw);
}

export function startOfLocalDay(ref: Date = new Date()): Date {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isLoanEmiOverdue(loan: LoanEmiDueInput, ref: Date = new Date()): boolean {
  const due = getLoanEmiDueDate(loan);
  if (!due) return false;
  return due < startOfLocalDay(ref);
}

export function isLoanEmiDueWithinDays(
  loan: LoanEmiDueInput,
  days: number,
  ref: Date = new Date(),
): boolean {
  const due = getLoanEmiDueDate(loan);
  if (!due) return false;
  const start = startOfLocalDay(ref);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  end.setHours(23, 59, 59, 999);
  return due >= start && due <= end;
}
