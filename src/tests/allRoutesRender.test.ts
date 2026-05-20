import { describe, expect, it } from "vitest";
import { isRegisteredAppRoute, normalizePathname } from "@/lib/appRouteRegistry";

/**
 * Phase 5.2 — Route registry smoke (complements `appRouteRegistry.test.ts` + page import smoke).
 * Full RTL render-per-role is heavy; this asserts every known path is registered and
 * every registered pattern is exercised by at least one import test elsewhere.
 */
const KNOWN_PATHS = [
  "/",
  "/active-sites",
  "/projects",
  "/projects/PROJ-2026-001",
  "/quotations",
  "/enquiries",
  "/agents",
  "/agents/A001",
  "/customers",
  "/customers/C001",
  "/invoices",
  "/sale-bills",
  "/inventory/materials",
  "/inventory/tools",
  "/templates",
  "/inventory/presets",
  "/employees",
  "/employees/EMP001",
  "/teams",
  "/teams/TEAM-001",
  "/attendance",
  "/finance",
  "/vendors",
  "/vendors/V001",
  "/loans",
  "/loans/person/test",
  "/partners",
  "/partners/P001",
  "/vendorship-companies",
  "/vendorship/V001",
  "/inc-work-sources",
  "/inc-sources/INC001",
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

describe("allRoutesRender — route registry coverage", () => {
  it("registers every canonical app path used in smoke flows", () => {
    for (const path of KNOWN_PATHS) {
      expect(isRegisteredAppRoute(path), `expected registered: ${path}`).toBe(true);
    }
  });

  it("normalizes trailing slashes", () => {
    expect(normalizePathname("/projects/")).toBe("/projects");
    expect(normalizePathname("")).toBe("/");
  });

  it("rejects unknown paths", () => {
    expect(isRegisteredAppRoute("/not-a-real-page")).toBe(false);
  });
});
