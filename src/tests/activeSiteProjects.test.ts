import { describe, expect, it } from "vitest";
import { isActiveSiteProject } from "@/lib/activeSiteProjects";
import type { Project } from "@/types/project";

const base = {
  id: "p1",
  name: "Site A",
  client: "Client",
  capacity: "5 kW",
  contractAmount: 100000,
  status: "Ongoing",
  lifecycleStatus: "Active",
} as Project;

describe("isActiveSiteProject", () => {
  it("excludes projects that are Active but not started", () => {
    expect(isActiveSiteProject({ ...base, startedAt: undefined })).toBe(false);
  });

  it("includes started in-progress projects", () => {
    expect(isActiveSiteProject({ ...base, startedAt: "2026-01-01T00:00:00.000Z" })).toBe(true);
  });

  it("excludes completed lifecycle", () => {
    expect(
      isActiveSiteProject({
        ...base,
        startedAt: "2026-01-01T00:00:00.000Z",
        lifecycleStatus: "Completed",
      }),
    ).toBe(false);
  });
});
