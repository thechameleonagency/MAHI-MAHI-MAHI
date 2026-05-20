import { describe, expect, it } from "vitest";
import { featureForPath, ROUTE_VIEW_FEATURE } from "@/lib/routeFeatureMap";

describe("routeFeatureMap", () => {
  it("maps dashboard and pipeline list routes", () => {
    expect(featureForPath("/")).toBe("dashboard");
    expect(featureForPath("/enquiries")).toBe("enquiry");
    expect(featureForPath("/quotations?create=1")).toBe("quotation");
  });

  it("maps detail routes under the same feature as list pages", () => {
    expect(featureForPath("/projects/PROJ-2026-001")).toBe("project");
    expect(featureForPath("/customers/C-1")).toBe("customer");
    expect(featureForPath("/agents/A001")).toBe("agent");
  });

  it("maps audit sub-routes to distinct per-page features", () => {
    expect(featureForPath("/audit")).toBe("auditDashboard");
    expect(featureForPath("/audit/profit-loss")).toBe("auditProfitLoss");
    expect(featureForPath("/audit/cash-bank")).toBe("auditCashBank");
    expect(featureForPath("/audit/chart-of-accounts")).toBe("auditChartOfAccounts");
  });

  it("maps /finance to financeHub (not expense)", () => {
    expect(featureForPath("/finance")).toBe("financeHub");
  });

  it("uses longest matching prefix when prefixes overlap", () => {
    const materials = ROUTE_VIEW_FEATURE.find((r) => r.prefix === "/inventory/materials");
    expect(materials?.feature).toBe("inventoryItem");
    expect(featureForPath("/inventory/materials")).toBe("inventoryItem");
    expect(featureForPath("/inventory/tools")).toBe("tool");
  });
});
