import type { Feature } from "@/domain/policies/featurePermissions";
import { auditRouteFeatureEntries } from "@/lib/auditRouteFeatures";
import { LEGACY_APP_REDIRECT_PATHS, normalizePathname } from "@/lib/appRouteRegistry";

/**
 * Maps app route prefixes to a primary feature for `view` permission.
 * Used by `canAccessPath` — Role Matrix overrides apply to every mapped route (longest-prefix wins).
 */
export const ROUTE_VIEW_FEATURE: { prefix: string; feature: Feature }[] = [
  { prefix: "/enquiries", feature: "enquiry" },
  { prefix: "/quotations", feature: "quotation" },
  { prefix: "/projects", feature: "project" },
  { prefix: "/active-sites", feature: "project" },
  { prefix: "/customers", feature: "customer" },
  { prefix: "/agents", feature: "agent" },
  { prefix: "/invoices", feature: "invoice" },
  { prefix: "/finance", feature: "financeHub" },
  { prefix: "/partners", feature: "partner" },
  { prefix: "/vendorship-companies", feature: "partner" },
  { prefix: "/vendorship/", feature: "partner" },
  { prefix: "/inc-work-sources", feature: "partner" },
  { prefix: "/inc-sources/", feature: "partner" },
  { prefix: "/subcontractors", feature: "partner" },
  { prefix: "/subcontractor/", feature: "partner" },
  { prefix: "/vendors", feature: "vendor" },
  { prefix: "/loans", feature: "loan" },
  { prefix: "/inventory/materials", feature: "inventoryItem" },
  { prefix: "/inventory/tools", feature: "tool" },
  { prefix: "/templates", feature: "template" },
  { prefix: "/inventory", feature: "inventoryItem" },
  { prefix: "/employees", feature: "employee" },
  { prefix: "/teams", feature: "team" },
  { prefix: "/attendance", feature: "attendance" },
  ...auditRouteFeatureEntries(),
  { prefix: "/analytics", feature: "analytics" },
  { prefix: "/calendar", feature: "calendar" },
  { prefix: "/timeline", feature: "timeline" },
  { prefix: "/notifications", feature: "notifications" },
  { prefix: "/settings", feature: "settingsProfile" },
];

import { isRegisteredAppRoute } from "@/lib/appRouteRegistry";

function pathMatchesRoutePrefix(path: string, prefix: string): boolean {
  if (path === prefix) return true;
  if (prefix.endsWith("/")) {
    return path.startsWith(prefix);
  }
  return path.startsWith(`${prefix}/`);
}

export function featureForPath(pathname: string): Feature | undefined {
  const path = normalizePathname(pathname.split("?")[0].split("#")[0]);
  if ((LEGACY_APP_REDIRECT_PATHS as readonly string[]).includes(path)) {
    return undefined;
  }
  if (path === "/") return "dashboard";
  let best: { prefix: string; feature: Feature } | undefined;
  for (const entry of ROUTE_VIEW_FEATURE) {
    if (pathMatchesRoutePrefix(path, entry.prefix)) {
      if (!best || entry.prefix.length > best.prefix.length) {
        best = entry;
      }
    }
  }
  return best?.feature;
}
