import { describe, expect, it } from "vitest";
import { featureForPath } from "@/lib/routeFeatureMap";
import {
  DEFAULT_FEATURE_PERMISSIONS,
  canFeature,
  migrateRoleMatrixOverride,
} from "@/domain/policies/featurePermissions";
import { AUDIT_ROUTE_FEATURE_DEFS } from "@/lib/auditRouteFeatures";

describe("audit route features (O5)", () => {
  it("maps each audit sub-route to its own feature", () => {
    expect(featureForPath("/audit")).toBe("auditDashboard");
    expect(featureForPath("/audit/profit-loss")).toBe("auditProfitLoss");
    expect(featureForPath("/audit/cash-bank")).toBe("auditCashBank");
    expect(featureForPath("/audit/chart-of-accounts")).toBe("auditChartOfAccounts");
  });

  it("covers every registered audit path", () => {
    for (const { path, feature } of AUDIT_ROUTE_FEATURE_DEFS) {
      expect(featureForPath(path)).toBe(feature);
    }
  });

  it("migrates legacy auditPage override to per-page rows", () => {
    const migrated = migrateRoleMatrixOverride({
      auditPage: { ...DEFAULT_FEATURE_PERMISSIONS.auditDashboard, view: ["ceo"] },
    });
    expect(migrated?.auditPage).toBeUndefined();
    expect(migrated?.auditProfitLoss?.view).toEqual(["ceo"]);
    expect(migrated?.auditCashBank?.view).toEqual(["ceo"]);
  });

  it("allows independent profit-loss vs cash-bank view grants", () => {
    const override = {
      auditProfitLoss: { ...DEFAULT_FEATURE_PERMISSIONS.auditProfitLoss, view: ["ceo"] },
      auditCashBank: { ...DEFAULT_FEATURE_PERMISSIONS.auditCashBank, view: ["management"] },
    };
    expect(canFeature("ceo", "auditProfitLoss", "view", override)).toBe(true);
    expect(canFeature("ceo", "auditCashBank", "view", override)).toBe(false);
    expect(canFeature("management", "auditCashBank", "view", override)).toBe(true);
  });
});
