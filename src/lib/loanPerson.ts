import type { Loan } from "@/types/finance";

/**
 * Stable identity key for the *person* behind a loan, so list rows in `/loans` and the
 * detail view at `/loans/person/:id` agree on which records belong together.
 *
 * Preference order (per audit C6):
 *  1. Explicit {@link Loan.personId} (added optionally for new loans).
 *  2. A slug of {@link Loan.personName} (most user-recognisable label).
 *  3. A slug of {@link Loan.source} (legacy fallback — same string the list cell renders).
 */
export function normalizeLoanPersonKey(loan: Pick<Loan, "personId" | "personName" | "source">): string {
  if (loan.personId && loan.personId.trim()) return loan.personId.trim();
  return slug(loan.personName ?? loan.source ?? "");
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
