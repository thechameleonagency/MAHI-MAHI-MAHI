import { ROLE_LABELS, type UserRole } from "@/domain/entities/identity";

/** Normalize pathname for user-facing copy (strip query/hash). */
export function normalizeDeniedPath(path: string): string {
  const base = path.split("?")[0].split("#")[0];
  return base || "/";
}

/**
 * Toast copy when a registered route is denied for the current role (M6).
 */
export function routeAccessDeniedToastContent(
  deniedPath: string,
  role: UserRole,
): { title: string; description: string } {
  const path = normalizeDeniedPath(deniedPath);
  const roleLabel = ROLE_LABELS[role] ?? role;
  return {
    title: "You don't have access to this page",
    description: `"${path}" isn't available for the ${roleLabel} role. You've been returned to the dashboard.`,
  };
}
