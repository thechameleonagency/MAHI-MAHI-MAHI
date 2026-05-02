import { describe, expect, it } from "vitest";
import { ProjectReadinessService } from "@/application/services/ProjectReadinessService";
import type { Project } from "@/types/project";

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: "P-1",
  name: "Project One",
  type: "EPC",
  projectType: "Residential",
  projectCategory: "solar",
  ownerType: "solo",
  status: "Ongoing",
  progressStage: "work-in-progress",
  lifecycleStatus: "Active",
  executionPhase: "execution",
  client: "Client A",
  customerId: "C-1",
  capacity: "5 kW",
  location: "Jaipur",
  assignees: [],
  onSite: 0,
  contractAmount: 100000,
  totalCost: 70000,
  amountReceived: 0,
  photos: 0,
  startDate: "2026-01-01",
  endDate: null,
  createdAt: "2026-01-01",
  ...overrides,
});

describe("ProjectReadinessService", () => {
  it("passes completion readiness for minimally valid project", () => {
    const service = new ProjectReadinessService();
    const project = makeProject();
    const result = service.validateForCompletion(project);
    expect(result.ok).toBe(true);
  });

  it("blocks completion when required documents exist but none uploaded", () => {
    const service = new ProjectReadinessService();
    const project = makeProject({
      projectKindConfigSnapshot: {
        requiredParties: ["customer"],
        requiredCommercialFields: ["contractAmount"],
        allowedBillingDirections: ["company_to_customer"],
        visibleTabs: ["overview", "billing"],
        requiredDocuments: ["agreement"],
        forbiddenActions: [],
      },
      documents: [],
    });
    const result = service.validateForCompletion(project);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Required project documents are not uploaded");
  });
});

