import { describe, expect, it } from "vitest";
import {
  isRegisteredAppRoute,
  LEGACY_APP_REDIRECT_PATHS,
  normalizePathname,
} from "@/lib/appRouteRegistry";
import { getRoutePermissionExactPaths } from "@/domain/policies/permissionMatrix";
import { featureForPath } from "@/lib/routeFeatureMap";

describe("appRouteRegistry", () => {
  it("normalizes trailing slashes", () => {
    expect(normalizePathname("/projects/")).toBe("/projects");
    expect(normalizePathname("/")).toBe("/");
  });

  it("treats real app paths as registered", () => {
    expect(isRegisteredAppRoute("/audit/profit-loss")).toBe(true);
    expect(isRegisteredAppRoute("/projects/PROJ-1")).toBe(true);
    expect(isRegisteredAppRoute("/agents/A001")).toBe(true);
    expect(isRegisteredAppRoute("/teams/TEAM-1")).toBe(true);
  });

  it("registers every permission-matrix exact route (registry vs ACL parity)", () => {
    for (const path of getRoutePermissionExactPaths()) {
      expect(isRegisteredAppRoute(path)).toBe(true);
    }
  });

  it("excludes legacy Navigate aliases from the registered set (Md5)", () => {
    for (const path of LEGACY_APP_REDIRECT_PATHS) {
      expect(isRegisteredAppRoute(path)).toBe(false);
      expect(featureForPath(path)).toBeUndefined();
    }
  });
});
