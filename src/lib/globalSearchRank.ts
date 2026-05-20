/**
 * Global search result ordering: better text match first, then non-terminal entities.
 * Match tiers: 0 exact, 1 prefix (startsWith), 2 substring (includes).
 */

export type GlobalSearchMatchTier = 0 | 1 | 2;

export type GlobalSearchRankable = {
  name: string;
  matchTier: GlobalSearchMatchTier;
  isTerminal: boolean;
};

/** Best (lowest) tier across fields that contain `query`; null when none match. */
export function computeMatchTier(
  query: string,
  fields: (string | undefined | null)[],
): GlobalSearchMatchTier | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  let best: GlobalSearchMatchTier | null = null;
  for (const raw of fields) {
    if (raw == null || String(raw).trim() === "") continue;
    const f = String(raw).toLowerCase().trim();
    if (!f.includes(q)) continue;
    const tier: GlobalSearchMatchTier = f === q ? 0 : f.startsWith(q) ? 1 : 2;
    best = best === null ? tier : (Math.min(best, tier) as GlobalSearchMatchTier);
  }
  return best;
}

export function sortGlobalSearchResults<T extends GlobalSearchRankable>(results: T[]): T[] {
  return [...results].sort((a, b) => {
    if (a.isTerminal !== b.isTerminal) return a.isTerminal ? 1 : -1;
    if (a.matchTier !== b.matchTier) return a.matchTier - b.matchTier;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export function isProjectSearchTerminal(project: {
  lifecycleStatus?: string;
  status?: string;
}): boolean {
  return (
    project.lifecycleStatus === "Completed" ||
    project.lifecycleStatus === "Closed" ||
    project.status === "Completed" ||
    project.status === "Closed"
  );
}

export function isQuotationSearchTerminal(status: string): boolean {
  return status === "rejected" || status === "withdrawn" || status === "converted_to_project";
}

export function isEnquirySearchTerminal(status: string): boolean {
  return status === "converted" || status === "lost";
}

export function isInvoiceSearchTerminal(status: string): boolean {
  return status === "voided";
}

export function isEmployeeSearchTerminal(status: string): boolean {
  return status === "Inactive";
}

export function isTeamSearchTerminal(status: string): boolean {
  return status === "Inactive";
}

export function isTaskSearchTerminal(status: string): boolean {
  return status === "done";
}

export function isToolSearchTerminal(status: string): boolean {
  return status === "Retired";
}

export function isSiteSearchTerminal(site: { status?: string; archivedAt?: string | null }): boolean {
  return site.status === "completed" || Boolean(site.archivedAt);
}
