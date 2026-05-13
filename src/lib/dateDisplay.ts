import { format, isValid, parseISO } from "date-fns";

/** Consistent short date for tables and attendance (B3.22). */
export function formatUiDate(isoOrYmd: string | undefined | null, fallback = "—"): string {
  if (!isoOrYmd?.trim()) return fallback;
  const d = parseISO(isoOrYmd.includes("T") ? isoOrYmd : `${isoOrYmd}T12:00:00`);
  if (!isValid(d)) return fallback;
  return format(d, "dd MMM yyyy");
}
