/** Coerce legacy numeric `markedBy` (incl. hardcoded 0) to a string actor id. */
export function normalizeSiteReadinessMarkedBy(markedBy: unknown): string {
  if (markedBy == null || markedBy === "" || markedBy === 0 || markedBy === "0") {
    return "unknown";
  }
  return String(markedBy);
}
