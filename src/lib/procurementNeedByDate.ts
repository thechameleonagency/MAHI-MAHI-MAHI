import { format, subDays } from "date-fns";

/**
 * Calendar days before work/install start that materials should be procured by.
 * Matches site checklist rule (day before `workStartDate`) and project shortfall views.
 */
export const DEFAULT_PROCUREMENT_LEAD_DAYS = 1;

export type ResolveProcurementNeedByDateParams = {
  /** Site install / work start (preferred anchor). */
  workStartDate?: string | null;
  /** Project planned start when site schedule is not set yet. */
  projectStartDate?: string | null;
  /** Used only when no schedule anchor exists (defaults to today). */
  fallbackDate?: Date;
};

/**
 * Single need-by rule for procurement shortfalls:
 * `workStartDate` → else `projectStartDate` → else today,
 * each minus {@link DEFAULT_PROCUREMENT_LEAD_DAYS}.
 */
export function resolveProcurementNeedByDate(params: ResolveProcurementNeedByDateParams): string {
  const anchor = params.workStartDate?.trim() || params.projectStartDate?.trim();
  if (!anchor) {
    return format(params.fallbackDate ?? new Date(), "yyyy-MM-dd");
  }
  return format(
    subDays(new Date(`${anchor}T12:00:00`), DEFAULT_PROCUREMENT_LEAD_DAYS),
    "yyyy-MM-dd",
  );
}
