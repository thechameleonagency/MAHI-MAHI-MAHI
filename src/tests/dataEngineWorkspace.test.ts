import { describe, expect, it } from "vitest";
import { isWorkspacePipelineSeeded, readWorkspaceDataCounts } from "@/lib/data-engine/workspaceDataCounts";
import { isAutoSeedDone, clearAutoSeedDone, markAutoSeedDoneIfSeeded } from "@/lib/data-engine/autoSeedStorage";

describe("workspaceDataCounts", () => {
  it("detects seeded pipeline", () => {
    expect(
      isWorkspacePipelineSeeded({
        projects: 1,
        customers: 1,
        enquiries: 1,
        quotations: 1,
        invoices: 0,
        employees: 0,
      }),
    ).toBe(true);
    expect(
      isWorkspacePipelineSeeded({
        projects: 0,
        customers: 0,
        enquiries: 0,
        quotations: 0,
        invoices: 0,
        employees: 0,
      }),
    ).toBe(false);
  });

  it("reads counts from app data shape", () => {
    const counts = readWorkspaceDataCounts({
      projects: [{ id: "P1" }],
      customers: [{ id: "C1" }, { id: "C2" }],
      enquiries: [],
      quotations: [],
    });
    expect(counts.projects).toBe(1);
    expect(counts.customers).toBe(2);
  });
});

describe("markAutoSeedDoneIfSeeded", () => {
  it("only sets flag when pipeline rows exist", () => {
    localStorage.clear();
    expect(
      markAutoSeedDoneIfSeeded({ projects: 0, customers: 0, enquiries: 0, quotations: 0 }),
    ).toBe(false);
    expect(isAutoSeedDone()).toBe(false);

    expect(
      markAutoSeedDoneIfSeeded({ projects: 2, customers: 2, enquiries: 2, quotations: 2 }),
    ).toBe(true);
    expect(isAutoSeedDone()).toBe(true);
    clearAutoSeedDone();
  });
});
