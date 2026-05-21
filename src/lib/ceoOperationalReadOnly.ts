import type { UserRole } from "@/domain/entities/identity";

/**
 * CEO may view operations and finance but must not mutate day-to-day records in sheets.
 * Exceptions (quotation approve, project-from-quote, change-request approve) stay on useCan / useCanAction.
 */
export function isCeoOperationalReadOnlyRole(role: UserRole | null | undefined): boolean {
  return role === "ceo";
}

export const CEO_OPERATIONAL_READ_ONLY_HINT =
  "CEO role is read-only on this screen. You can still approve quotations, convert approved quotes to projects, and resolve commercial change requests where permitted.";

/** Combine feature/action permission with CEO read-only policy for sheet and inline writes. */
export function allowOperationalWrite(
  ceoReadOnly: boolean,
  permitted: boolean,
): boolean {
  return !ceoReadOnly && permitted;
}
