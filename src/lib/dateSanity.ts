/** Parse YYYY-MM-DD (or ISO date prefix) to local midnight for comparisons. */
export function parseUiDate(value: string | undefined | null): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isDateOnOrBefore(a: string, b: string): boolean {
  const da = parseUiDate(a);
  const db = parseUiDate(b);
  if (!da || !db) return true;
  return da.getTime() <= db.getTime();
}

export function isDateOnOrAfter(a: string, b: string): boolean {
  const da = parseUiDate(a);
  const db = parseUiDate(b);
  if (!da || !db) return true;
  return da.getTime() >= db.getTime();
}

/** Returns an error message when `child` is before `parent`, else undefined. */
export function requireDateNotBefore(
  childLabel: string,
  child: string,
  parentLabel: string,
  parent: string,
): string | undefined {
  if (!child?.trim() || !parent?.trim()) return undefined;
  if (isDateOnOrBefore(child, parent)) return undefined;
  return `${childLabel} cannot be before ${parentLabel}`;
}

/** Returns an error when return/issue date is in the future (vs today). */
export function requireDateNotInFuture(label: string, value: string, today = new Date()): string | undefined {
  const d = parseUiDate(value);
  if (!d) return undefined;
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);
  if (d.getTime() <= end.getTime()) return undefined;
  return `${label} cannot be in the future`;
}
