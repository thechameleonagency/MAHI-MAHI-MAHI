import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  APP_ROUTE_EXACT_PATHS,
  APP_ROUTE_PARAM_ROUTES,
  LEGACY_APP_REDIRECT_PATHS,
  LEGACY_APP_REDIRECT_PARAM_ROUTES,
} from "@/lib/appRoutes";
import {
  isLegacyAppRedirectPath,
  isRegisteredAppRoute,
  LEGACY_APP_REDIRECT_PATHS as REGISTRY_LEGACY,
  LEGACY_APP_REDIRECT_PARAM_ROUTES as REGISTRY_LEGACY_PARAM,
  normalizePathname,
} from "@/lib/appRouteRegistry";
import { getRoutePermissionExactPaths } from "@/domain/policies/permissionMatrix";
import { featureForPath } from "@/lib/routeFeatureMap";

const LEGACY_ROUTE_ELEMENTS = new Set(["Navigate", "ListPrefixDetailRedirect"]);

function parseAppTsxRoutes(source: string): {
  exact: string[];
  param: string[];
  legacy: string[];
  legacyParam: string[];
} {
  const exact: string[] = [];
  const param: string[] = [];
  const legacy: string[] = [];
  const legacyParam: string[] = [];
  const re = /<Route\s+path="([^"]+)"\s+element=\{<(\w+)/g;
  for (const m of source.matchAll(re)) {
    const path = m[1];
    const el = m[2];
    if (path === "*") continue;
    if (LEGACY_ROUTE_ELEMENTS.has(el)) {
      if (path.includes(":")) legacyParam.push(path);
      else legacy.push(path);
      continue;
    }
    if (path.includes(":")) param.push(path);
    else exact.push(path);
  }
  return { exact, param, legacy, legacyParam };
}

describe("appRouteRegistry (Mn11)", () => {
  const appSource = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
  const appRoutes = parseAppTsxRoutes(appSource);

  it("manifest matches App.tsx Route paths (exact + param + legacy)", () => {
    expect([...APP_ROUTE_EXACT_PATHS].sort()).toEqual([...appRoutes.exact].sort());
    expect(APP_ROUTE_PARAM_ROUTES.map((r) => r.appPath).sort()).toEqual([...appRoutes.param].sort());
    expect([...LEGACY_APP_REDIRECT_PATHS].sort()).toEqual([...appRoutes.legacy].sort());
    expect(LEGACY_APP_REDIRECT_PARAM_ROUTES.map((r) => r.appPath).sort()).toEqual(
      [...appRoutes.legacyParam].sort(),
    );
    expect(REGISTRY_LEGACY).toEqual(LEGACY_APP_REDIRECT_PATHS);
    expect(REGISTRY_LEGACY_PARAM).toEqual(LEGACY_APP_REDIRECT_PARAM_ROUTES);
  });

  it("normalizes trailing slashes", () => {
    expect(normalizePathname("/projects/")).toBe("/projects");
    expect(normalizePathname("/")).toBe("/");
  });

  it("registers real app paths including parametric detail routes", () => {
    expect(isRegisteredAppRoute("/audit/profit-loss")).toBe(true);
    expect(isRegisteredAppRoute("/projects/PROJ-1")).toBe(true);
    expect(isRegisteredAppRoute("/agents/A001")).toBe(true);
    expect(isRegisteredAppRoute("/teams/TEAM-1")).toBe(true);
    expect(isRegisteredAppRoute("/loans/person/john-doe")).toBe(true);
    expect(isRegisteredAppRoute("/vendorship/V001")).toBe(true);
    expect(isRegisteredAppRoute("/inc-sources/INC001")).toBe(true);
  });

  it("does not register legacy Navigate aliases or stale shapes", () => {
    for (const path of LEGACY_APP_REDIRECT_PATHS) {
      expect(isRegisteredAppRoute(path)).toBe(false);
      expect(featureForPath(path)).toBeUndefined();
    }
    expect(isRegisteredAppRoute("/loans/person")).toBe(false);
    expect(isRegisteredAppRoute("/vendorship-companies/VC1")).toBe(false);
    expect(isRegisteredAppRoute("/inc-work-sources/IG1")).toBe(false);
    expect(isRegisteredAppRoute("/not-a-real-page")).toBe(false);
  });

  it("treats list-prefix detail aliases as legacy redirects (MD6)", () => {
    expect(isLegacyAppRedirectPath("/vendorship-companies/VC1")).toBe(true);
    expect(isLegacyAppRedirectPath("/inc-work-sources/INC001")).toBe(true);
    expect(featureForPath("/vendorship-companies/VC1")).toBe("partner");
    expect(featureForPath("/inc-work-sources/INC001")).toBe("partner");
  });

  it("registers every permission-matrix exact route (registry vs ACL parity)", () => {
    for (const path of getRoutePermissionExactPaths()) {
      expect(isRegisteredAppRoute(path)).toBe(true);
    }
  });
});
