/**
 * Canonical list of permission-gated routes from `src/App.tsx` (excluding the `*` catch-all).
 * Used to tell "unknown URL" from "known URL denied for this role" in `RouteAccessGate`.
 *
 * Legacy `<Navigate>` aliases (`LEGACY_APP_REDIRECT_PATHS`) live in `App.tsx` but are
 * intentionally excluded — they are not ACL-checked; React Router handles the redirect.
 */
export const LEGACY_APP_REDIRECT_PATHS = [
  "/sale-bills",
  "/presets",
  "/inventory/presets",
] as const;
export function normalizePathname(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

export function isRegisteredAppRoute(rawPathname: string): boolean {
  const p = normalizePathname(rawPathname);

  const exact = new Set([
    "/",
    "/active-sites",
    "/projects",
    "/quotations",
    "/enquiries",
    "/agents",
    "/customers",
    "/invoices",
    "/inventory",
    "/inventory/materials",
    "/inventory/tools",
    "/templates",
    "/employees",
    "/teams",
    "/attendance",
    "/finance",
    "/vendors",
    "/loans",
    "/partners",
    "/vendorship-companies",
    "/inc-work-sources",
    "/timeline",
    "/calendar",
    "/analytics",
    "/notifications",
    "/settings",
    "/settings/design-system",
    "/audit",
    "/audit/chart-of-accounts",
    "/audit/profit-loss",
    "/audit/inventory",
    "/audit/debtors-creditors",
    "/audit/gst",
    "/audit/cash-bank",
    "/audit/expenses",
    "/audit/assets",
    "/audit/logs",
    "/audit/reports",
    "/audit/data-flow",
  ]);

  if (exact.has(p)) return true;

  if (/^\/projects\/[^/]+$/.test(p)) return true;
  if (/^\/customers\/[^/]+$/.test(p)) return true;
  if (/^\/vendors\/[^/]+$/.test(p)) return true;
  if (/^\/employees\/[^/]+$/.test(p)) return true;
  if (/^\/partners\/[^/]+$/.test(p)) return true;
  if (/^\/loans\/person\/[^/]+$/.test(p)) return true;
  if (/^\/teams\/[^/]+$/.test(p)) return true;
  if (/^\/vendorship\/[^/]+$/.test(p)) return true;
  if (/^\/inc-sources\/[^/]+$/.test(p)) return true;

  if (/^\/agents\/[^/]+$/.test(p)) return true;

  return false;
}
