/**
 * Canonical app routes from `src/App.tsx` `<Route path="…">` entries.
 * Excludes `path="*"` and legacy `<Navigate>` aliases (see `LEGACY_APP_REDIRECT_PATHS`).
 *
 * `appRouteRegistry.ts` and tests import this manifest so registry drift is caught in CI.
 */

/** `<Navigate>` aliases in App.tsx — not ACL-checked; React Router redirects only (Md5). */
export const LEGACY_APP_REDIRECT_PATHS = [
  "/sale-bills",
  "/presets",
  "/inventory/presets",
] as const;

/**
 * List/detail prefix aliases (MD6) — `<ListPrefixDetailRedirect>` in App.tsx.
 * Not registered routes; React Router redirects to canonical detail paths.
 */
export const LEGACY_APP_REDIRECT_PARAM_ROUTES: readonly {
  appPath: string;
  test: (pathname: string) => boolean;
}[] = [
  {
    appPath: "/vendorship-companies/:id",
    test: (p) => /^\/vendorship-companies\/[^/]+$/.test(p),
  },
  {
    appPath: "/inc-work-sources/:id",
    test: (p) => /^\/inc-work-sources\/[^/]+$/.test(p),
  },
];

/** Static paths (no dynamic segments). */
export const APP_ROUTE_EXACT_PATHS = [
  "/login",
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
] as const;

/**
 * Dynamic routes in App.tsx (`:id` segments). Each `test` accepts normalized pathnames only.
 * List paths whose list URL differs from detail prefix (vendorship, inc-sources).
 */
export const APP_ROUTE_PARAM_ROUTES: readonly {
  appPath: string;
  test: (pathname: string) => boolean;
}[] = [
  { appPath: "/projects/:id", test: (p) => /^\/projects\/[^/]+$/.test(p) },
  { appPath: "/agents/:id", test: (p) => /^\/agents\/[^/]+$/.test(p) },
  { appPath: "/customers/:id", test: (p) => /^\/customers\/[^/]+$/.test(p) },
  { appPath: "/teams/:id", test: (p) => /^\/teams\/[^/]+$/.test(p) },
  { appPath: "/employees/:id", test: (p) => /^\/employees\/[^/]+$/.test(p) },
  { appPath: "/vendors/:id", test: (p) => /^\/vendors\/[^/]+$/.test(p) },
  { appPath: "/loans/person/:id", test: (p) => /^\/loans\/person\/[^/]+$/.test(p) },
  { appPath: "/partners/:id", test: (p) => /^\/partners\/[^/]+$/.test(p) },
  { appPath: "/vendorship/:id", test: (p) => /^\/vendorship\/[^/]+$/.test(p) },
  { appPath: "/inc-sources/:id", test: (p) => /^\/inc-sources\/[^/]+$/.test(p) },
  { appPath: "/invite/:token", test: (p) => /^\/invite\/[^/]+$/.test(p) },
];
