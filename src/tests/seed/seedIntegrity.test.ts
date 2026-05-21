import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";

describe("seedIntegrity", () => {
  it("full profile meets core volume and verification gates", () => {
    const { state, verification } = buildBusinessSeed("full");
    expect(verification.ok).toBe(true);
    expect(state.projects.length).toBeGreaterThanOrEqual(28);
    expect(state.tasks.filter((t) => t.workType.includes("Transport")).length).toBeGreaterThanOrEqual(30);
    expect(state.attendanceRecords.length).toBeGreaterThanOrEqual(400);
    expect(state.auditLogs.length).toBeGreaterThanOrEqual(240);
    expect(verification.jsonSizeBytes).toBeLessThan(8 * 1024 * 1024);
  });
});
