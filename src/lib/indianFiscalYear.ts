import { parseISO, isValid } from "date-fns";

/** Indian financial year: 1 Apr (year) → 31 Mar (year+1). */
export function getIndianFyBoundsForReferenceDate(ref: Date): { start: Date; end: Date; label: string } {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const fyStartYear = m >= 3 ? y : y - 1;
  const start = new Date(fyStartYear, 3, 1, 0, 0, 0, 0);
  const end = new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999);
  const label = `${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;
  return { start, end, label };
}

export function isProjectDateInIndianFy(isoDate: string | undefined, ref: Date = new Date()): boolean {
  if (!isoDate?.trim()) return false;
  const d = parseISO(isoDate.includes("T") ? isoDate : `${isoDate.slice(0, 10)}T12:00:00`);
  if (!isValid(d)) return false;
  const { start, end } = getIndianFyBoundsForReferenceDate(ref);
  return d >= start && d <= end;
}
