import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { SEED_LAYER_ORDER, smokeRoutes } from "@/data/seed/seedLayerOrder";

describe("seedLayerOrder", () => {
  it("declares expected layer sequence ending in narratives", () => {
    expect(SEED_LAYER_ORDER[0]).toBe("L0_settingsTeam");
    expect(SEED_LAYER_ORDER).toContain("L8_crm");
    expect(SEED_LAYER_ORDER[SEED_LAYER_ORDER.length - 1]).toBe("narratives");
  });

  it("smoke routes cover primary operational pages", () => {
    expect(smokeRoutes).toContain("/");
    expect(smokeRoutes).toContain("/projects");
    expect(smokeRoutes).toContain("/notifications");
    expect(smokeRoutes).toContain("/settings");
  });

  it("full build respects dependency order (projects before tasks)", () => {
    const { state, verification } = buildBusinessSeed("full");
    expect(state.projects.length).toBeGreaterThan(0);
    expect(state.tasks.length).toBeGreaterThan(state.projects.length);
    expect(verification.ok).toBe(true);
  });
});
