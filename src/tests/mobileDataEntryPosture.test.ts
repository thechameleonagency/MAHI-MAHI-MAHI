import { describe, expect, it } from "vitest";
import { smokeRoutes } from "@/data/seed/seedLayerOrder";
import {
  isDesktopFirstPath,
  MOBILE_DEMO_WALKTHROUGH,
  MOBILE_POSTURE_MODULES,
  modulesForTier,
  routePostureForPath,
  walkthroughStepsForPhase,
} from "@/lib/mobileDataEntryPosture";

describe("mobileDataEntryPosture (MO2)", () => {
  it("assigns unique module ids and classifies heavy authoring as desktop-first", () => {
    const ids = MOBILE_POSTURE_MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);

    const desktopIds = modulesForTier("desktop_first").map((m) => m.id);
    expect(desktopIds).toContain("quotations");
    expect(desktopIds).toContain("invoices");
    expect(desktopIds).toContain("progress_media");
  });

  it("routePostureForPath marks quotation and invoice routes desktop-first", () => {
    expect(routePostureForPath("/quotations")).toBe("desktop_first");
    expect(routePostureForPath("/quotations/Q-1001")).toBe("desktop_first");
    expect(isDesktopFirstPath("/invoices")).toBe(true);
    expect(routePostureForPath("/notifications")).toBe("mobile_ok");
    expect(routePostureForPath("/projects/P-1")).toBe("mobile_ok");
  });

  it("smoke routes are covered by at least one posture module route prefix", () => {
    for (const route of smokeRoutes) {
      const covered = MOBILE_POSTURE_MODULES.some((m) =>
        m.routes.some((r) => route === r || route.startsWith(`${r}/`)),
      );
      expect(covered, `smoke route ${route} has no MO2 module`).toBe(true);
    }
  });

  it("demo walkthrough has ordered mobile then desktop phases", () => {
    expect(MOBILE_DEMO_WALKTHROUGH.length).toBeGreaterThanOrEqual(4);
    const mobile = walkthroughStepsForPhase("mobile");
    const desktop = walkthroughStepsForPhase("desktop");
    expect(mobile.length).toBeGreaterThan(0);
    expect(desktop.length).toBeGreaterThan(0);
    expect(mobile.every((s) => s.phase === "mobile")).toBe(true);
    expect(Math.min(...mobile.map((s) => s.order))).toBeLessThan(Math.min(...desktop.map((s) => s.order)));
  });
});
