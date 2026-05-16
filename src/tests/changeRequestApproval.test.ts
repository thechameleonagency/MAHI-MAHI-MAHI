import { describe, it, expect } from "vitest";
import {
  applyChangeRequestToProject,
  computeAdditionalWorkTotal,
  resolveChangeRequestDeltaAmount,
} from "@/lib/changeRequestApproval";
import type { Project } from "@/types/project";
import type { ProjectChangeRequest } from "@/types/operations";

const baseProject: Project = {
  id: "P-1",
  name: "Test 10kW",
  client: "Client",
  capacity: "10kW",
  contractAmount: 500000,
  commercialBaseline: { basis: "per_kw", rateValue: 50_000, pricingQuantity: 10 },
  projectType: "Residential",
  startDate: "2026-05-01",
  createdAt: "2026-05-01",
} as Project;

describe("changeRequestApproval", () => {
  it("derives delta amount from per-kW contract on capacity change", () => {
    const cr: ProjectChangeRequest = {
      id: "CR-1",
      projectId: "P-1",
      type: "capacity",
      deltaKw: 2,
      status: "draft",
      requestedAt: "2026-05-10",
    };
    expect(resolveChangeRequestDeltaAmount(baseProject, cr)).toBe(100000);
  });

  it("patches contract, capacity, checklist, and reservations", () => {
    const cr: ProjectChangeRequest = {
      id: "CR-2",
      projectId: "P-1",
      type: "addon-work",
      deltaAmount: 25000,
      materialDelta: [{ itemId: 1, deltaQty: 4 }],
      status: "draft",
      requestedAt: "2026-05-10",
    };
    const { projectPatch, reservations, deltaAmount } = applyChangeRequestToProject(
      baseProject,
      cr,
      [{ id: 1, name: "Panel 540W", unit: "pcs" }],
    );
    expect(deltaAmount).toBe(25000);
    expect(projectPatch.contractAmount).toBe(525000);
    expect(projectPatch.executionLineItems?.length).toBe(1);
    expect(projectPatch.siteChecklist?.length).toBe(1);
    expect(reservations).toHaveLength(1);
  });

  it("computes INC additional work totals by basis", () => {
    expect(computeAdditionalWorkTotal("fixed", 15000, undefined, baseProject)).toBe(15000);
    expect(computeAdditionalWorkTotal("per_kw", 5000, undefined, baseProject)).toBe(50000);
    expect(computeAdditionalWorkTotal("per_sqft", 120, 200, baseProject)).toBe(24000);
  });
});
