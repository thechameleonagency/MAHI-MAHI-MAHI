import { format, parseISO, isValid } from "date-fns";

/** Consistent UI date strings (B3.22); ISO `yyyy-MM-dd` or full ISO supported. */
export function formatUiDate(isoOrDate: string | Date | undefined | null, pattern = "dd MMM yyyy"): string {
  if (isoOrDate == null || isoOrDate === "") return "—";
  const d = typeof isoOrDate === "string" ? parseISO(isoOrDate.length <= 10 ? `${isoOrDate}T12:00:00` : isoOrDate) : isoOrDate;
  if (!isValid(d)) return "—";
  return format(d, pattern);
}
