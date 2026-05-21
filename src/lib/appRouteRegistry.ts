import {
  APP_ROUTE_EXACT_PATHS,
  APP_ROUTE_PARAM_ROUTES,
  LEGACY_APP_REDIRECT_PATHS,
  LEGACY_APP_REDIRECT_PARAM_ROUTES,
} from "@/lib/appRoutes";

export { LEGACY_APP_REDIRECT_PATHS, LEGACY_APP_REDIRECT_PARAM_ROUTES };

export function normalizePathname(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

const EXACT_ROUTE_SET = new Set<string>(APP_ROUTE_EXACT_PATHS);

/**
 * True when `pathname` matches a real `<Route>` in `App.tsx` (not legacy redirects, not `*`).
 * Used by `RouteAccessGate` to distinguish unknown URLs from permission-denied known URLs.
 */
export function isLegacyAppRedirectPath(rawPathname: string): boolean {
  const p = normalizePathname(rawPathname);
  if ((LEGACY_APP_REDIRECT_PATHS as readonly string[]).includes(p)) return true;
  return LEGACY_APP_REDIRECT_PARAM_ROUTES.some((route) => route.test(p));
}

export function isRegisteredAppRoute(rawPathname: string): boolean {
  const p = normalizePathname(rawPathname);
  if (isLegacyAppRedirectPath(p)) return false;
  if (EXACT_ROUTE_SET.has(p)) return true;
  return APP_ROUTE_PARAM_ROUTES.some((route) => route.test(p));
}
