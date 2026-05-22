/**
 * Project seed gate — when false, downstream layers emit zero project-linked rows.
 * Set via `SEED_INCLUDES_PROJECTS`; command-based re-seed lives in `projectReseed.ts`.
 */
export const SEED_INCLUDES_PROJECTS = true;

export function seedIncludesProjects(): boolean {
  return SEED_INCLUDES_PROJECTS;
}

/** Volume/verification floors zeroed while projects are cleared. */
export const PROJECT_CLEARED_ZERO_MINIMUM_KEYS = [
  "projects",
  "sites",
  "tasks",
  "blockages",
  "operationalTickets",
  "scheduledInstallations",
  "siteVisits",
  "projectChangeRequests",
  "materialReservations",
  "materialDamageRecords",
  "procurementNeedLines",
  "clientPaymentRecords",
  "incGiverTransactions",
  "agentCommissionPayments",
  "payments",
] as const;

export type ProjectClearedZeroMinimumKey = (typeof PROJECT_CLEARED_ZERO_MINIMUM_KEYS)[number];

export function isProjectClearedZeroMinimum(key: string): key is ProjectClearedZeroMinimumKey {
  return (PROJECT_CLEARED_ZERO_MINIMUM_KEYS as readonly string[]).includes(key);
}
