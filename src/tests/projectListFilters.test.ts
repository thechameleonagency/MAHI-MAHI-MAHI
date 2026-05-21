import { describe, expect, it } from "vitest";
import {
  countProjectsByLifecycle,
  matchesProjectLifecycleFilter,
  parseProjectStatusFilterFromUrl,
} from "@/lib/projectListFilters";
import type { Project } from "@/types/project";

const base = (overrides: Partial<Project> = {}): Project =>
  ({
    id: "P-1",
    name: "Test",
    client: "Client",
    capacity: "5 kW",
    location: "Pune",
    lifecycleStatus: "New",
    status: "Ongoing",
    contractAmount: 100000,
    amountReceived: 0,
    assignees: [],
    startDate: "2026-01-01",
    createdAt: "2026-01-01",
    progressStage: "new",
    executionPhase: "Intake",
    ...overrides,
  }) as Project;

describe("projectListFilters (MD3)", () => {
  it("parseProjectStatusFilterFromUrl maps legacy Ongoing to In Progress", () => {
    expect(parseProjectStatusFilterFromUrl("Ongoing")).toBe("In Progress");
    expect(parseProjectStatusFilterFromUrl("On Hold")).toBe("On Hold");
    expect(parseProjectStatusFilterFromUrl("New")).toBe("New");
    expect(parseProjectStatusFilterFromUrl(null)).toBe("all");
  });

  it("legacy Ongoing URL filter matches In Progress projects not New intake", () => {
    const rows = [
      base({ id: "P-NEW", lifecycleStatus: "New" }),
      base({
        id: "P-IP",
        lifecycleStatus: "In Progress",
        startedAt: "2026-02-01",
        progressStage: "work-in-progress",
      }),
    ];
    const filter = parseProjectStatusFilterFromUrl("Ongoing");
    expect(filter).toBe("In Progress");
    expect(rows.filter((p) => matchesProjectLifecycleFilter(p, filter)).map((p) => p.id)).toEqual([
      "P-IP",
    ]);
  });

  it("matchesProjectLifecycleFilter isolates New intake projects", () => {
    const rows = [
      base({ id: "P-NEW", lifecycleStatus: "New", status: "Ongoing" }),
      base({
        id: "P-IP",
        lifecycleStatus: "In Progress",
        status: "Ongoing",
        startedAt: "2026-02-01",
        progressStage: "work-in-progress",
        executionPhase: "Panel installation",
      }),
    ];
    expect(matchesProjectLifecycleFilter(rows[0], "New")).toBe(true);
    expect(matchesProjectLifecycleFilter(rows[1], "New")).toBe(false);
    expect(
      rows.filter((p) => matchesProjectLifecycleFilter(p, "In Progress")).map((p) => p.id),
    ).toEqual(["P-IP"]);
  });

  it("countProjectsByLifecycle tallies each lifecycle bucket", () => {
    const rows = [
      base({ id: "P1", lifecycleStatus: "New" }),
      base({ id: "P2", lifecycleStatus: "In Progress", startedAt: "2026-01-02" }),
      base({ id: "P3", lifecycleStatus: "On Hold", startedAt: "2026-01-02" }),
    ];
    const counts = countProjectsByLifecycle(rows);
    expect(counts.New).toBe(1);
    expect(counts["In Progress"]).toBe(1);
    expect(counts["On Hold"]).toBe(1);
    expect(counts.all).toBe(3);
  });
});
