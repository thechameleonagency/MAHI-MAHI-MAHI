import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { seedIncludesProjects } from "@/data/seed/seedProjectPhase";

const itIfProjects = seedIncludesProjects() ? it : it.skip;

describe("seedIntegrity", () => {
  it("full profile meets core volume and verification gates", () => {
    const { state, verification } = buildBusinessSeed("full");
    expect(verification.ok).toBe(true);
    if (!seedIncludesProjects()) {
      expect(state.projects).toHaveLength(0);
      expect(state.invoices.every((inv) => !inv.projectId)).toBe(true);
    }
    expect(state.attendanceRecords.length).toBeGreaterThanOrEqual(400);
    expect(state.auditLogs.length).toBeGreaterThanOrEqual(240);
    expect(verification.jsonSizeBytes).toBeLessThan(8 * 1024 * 1024);
  });

  itIfProjects("includes project and transport volume when project seed enabled", () => {
    const { state } = buildBusinessSeed("full");
    expect(state.projects.length).toBeGreaterThanOrEqual(28);
    expect(state.tasks.filter((t) => t.workType.includes("Transport")).length).toBeGreaterThanOrEqual(30);
  });
});
