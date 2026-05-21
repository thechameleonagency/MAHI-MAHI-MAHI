import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { SEED_COLLECTION_KEYS } from "@/data/seed/seedLayerOrder";

describe("buildBusinessSeed", () => {
  it("builds full profile with all 53 collection keys populated", () => {
    const { state, verification } = buildBusinessSeed("full");
    expect(verification.ok).toBe(true);
    for (const key of SEED_COLLECTION_KEYS) {
      expect(state[key]).toBeDefined();
    }
    expect(state.projects.length).toBeGreaterThanOrEqual(28);
    expect(state.customers.length).toBeGreaterThanOrEqual(30);
    expect(state.tasks.length).toBeGreaterThanOrEqual(120);
    expect(state.auditLogs.length).toBeGreaterThanOrEqual(240);
  });

  it("smoke profile is smaller but structurally complete", () => {
    const { state, verification } = buildBusinessSeed("smoke");
    expect(verification.ok).toBe(true);
    expect(state.projects.length).toBeGreaterThan(0);
    expect(state.enquiries.length).toBeGreaterThan(0);
    expect(verification.jsonSizeBytes).toBeLessThan(8 * 1024 * 1024);
  });

  it("uses realistic names — no placeholder patterns", () => {
    const { state } = buildBusinessSeed("smoke");
    const names = state.customers.map((c) => c.name).join(" ");
    expect(names).not.toMatch(/Dummy Customer/i);
    expect(names).not.toMatch(/Test User/i);
    expect(names).not.toMatch(/Lorem ipsum/i);
  });

  it("dispatch projects have transport tasks from materialsSent", () => {
    const { state } = buildBusinessSeed("full");
    const transportTasks = state.tasks.filter((t) => t.workType.includes("Transport"));
    expect(transportTasks.length).toBeGreaterThanOrEqual(30);
    const dispatchProjects = state.projects.filter((p) => (p.materialsSent?.length ?? 0) > 0);
    expect(dispatchProjects.length).toBeGreaterThan(0);
  });
});
