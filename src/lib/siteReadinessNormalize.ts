import type { SiteReadinessSnapshot } from "@/types/operations";

/** Coerce legacy numeric `markedBy` (incl. hardcoded 0 / EMP000 migration artifacts) to a string actor id. */
export function normalizeSiteReadinessMarkedBy(markedBy: unknown): string {
  if (markedBy == null || markedBy === "" || markedBy === 0 || markedBy === "0") {
    return "unknown";
  }
  const s = String(markedBy);
  if (s === "EMP000" || /^EMP0+$/.test(s)) {
    return "unknown";
  }
  return s;
}

/** Canonical site-readiness write payload (session actor, never numeric placeholder). */
export function buildSiteReadinessUpdate(input: {
  ready: boolean;
  note?: string;
  markedBy: string;
  markedAt?: string;
}): SiteReadinessSnapshot {
  return {
    ready: input.ready,
    note: input.note?.trim() || undefined,
    markedAt: input.markedAt ?? new Date().toISOString(),
    markedBy: normalizeSiteReadinessMarkedBy(input.markedBy),
  };
}
