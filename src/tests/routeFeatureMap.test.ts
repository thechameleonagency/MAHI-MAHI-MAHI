import { describe, expect, it } from "vitest";
import { featureForPath } from "@/lib/routeFeatureMap";
import { canAccessPath } from "@/domain/policies/permissionMatrix";

describe("routeFeatureMap", () => {
  it("maps subcontractor detail paths to partner feature", () => {
    expect(featureForPath("/subcontractor/SUB-001")).toBe("partner");
    expect(featureForPath("/subcontractor/SUBmpjin24has4ojm")).toBe("partner");
  });

  it("maps subcontractor list path", () => {
    expect(featureForPath("/subcontractors")).toBe("partner");
  });

  it("does not confuse subcontractors list with subcontractor detail prefix only", () => {
    expect(featureForPath("/subcontractors")).toBe("partner");
    expect(featureForPath("/subcontractor/ABC")).toBe("partner");
  });
});

describe("canAccessPath super_admin", () => {
  it("allows all registered detail routes including subcontractor", () => {
    expect(canAccessPath("super_admin", "/subcontractor/SUB-001")).toBe(true);
    expect(canAccessPath("super_admin", "/subcontractors")).toBe(true);
    expect(canAccessPath("super_admin", "/calendar")).toBe(true);
    expect(canAccessPath("super_admin", "/templates")).toBe(true);
  });

  it("still allows super_admin on legacy unmapped paths only when registered", () => {
    expect(canAccessPath("super_admin", "/not-a-real-route-xyz")).toBe(false);
  });
});
