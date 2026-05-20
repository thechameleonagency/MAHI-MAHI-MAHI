import { describe, expect, it } from "vitest";
import {
  applyTeamAssignmentToProject,
  buildProjectConfirmationData,
  projectNeedsTeamAssignment,
} from "@/lib/projectTeamAssignment";
import type { Project } from "@/types/project";

const baseProject = {
  id: "P-TEST",
  name: "Test Site",
  type: "EPC" as const,
  projectType: "Residential" as const,
  lifecycleStatus: "New" as const,
  client: "Client Co",
  capacity: "5 kW",
  location: "Jaipur",
  contractAmount: 100000,
  amountReceived: 0,
  startDate: "2026-05-20",
  endDate: null,
  createdAt: "2026-05-20",
  assignees: [],
} satisfies Partial<Project> as Project;

describe("projectTeamAssignment", () => {
  it("flags projects with no assignees", () => {
    expect(projectNeedsTeamAssignment({ assignees: [] })).toBe(true);
    expect(projectNeedsTeamAssignment({ assignees: ["EMP001"] })).toBe(false);
  });

  it("applies primary assignee and end date", () => {
    const updated = applyTeamAssignmentToProject(baseProject, {
      primaryAssigneeId: "EMP002",
      targetEndDate: "2026-12-31",
    });
    expect(updated.assignees).toEqual(["EMP002"]);
    expect(updated.endDate).toBe("2026-12-31");
  });

  it("leaves assignees empty when skipped", () => {
    const updated = applyTeamAssignmentToProject(baseProject, {});
    expect(updated.assignees).toEqual([]);
    expect(projectNeedsTeamAssignment(updated)).toBe(true);
  });

  it("builds confirmation view model from project", () => {
    const vm = buildProjectConfirmationData(
      { ...baseProject, quotationId: "Q1", agentName: "Agent A" },
      { quotationNumber: "MSS/26/001" },
    );
    expect(vm.name).toBe("Test Site");
    expect(vm.quotationNumber).toBe("MSS/26/001");
    expect(vm.referredBy).toBe("Agent A");
  });
});
