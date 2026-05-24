import { describe, expect, it, vi } from "vitest";
import { executeCreateProjectWizard } from "@/lib/executeCreateProjectWizard";
import { createInitialCreateProjectWizardState } from "@/types/createProjectWizard";
import type { Partner } from "@/types/finance";
import type { Project } from "@/types/project";

const targetProject: Project = {
  id: "P-TARGET",
  name: "Open Rooftop 5kW",
  projectType: "Residential",
  projectCategory: "solar",
  lifecycleStatus: "New",
  client: "Acme",
  customerId: "C-1",
  capacity: "5 kW",
  location: "Jaipur",
  contractAmount: 250000,
  amountReceived: 0,
  startDate: "2026-01-01",
  endDate: null,
  createdAt: "2026-01-01",
  assignees: [],
  onSite: 0,
  photos: 0,
};

const subcontractor: Partner = {
  id: "SUB-1",
  name: "Install Co",
  type: "Subcontractor",
  phone: "",
  email: "",
  address: "",
  createdAt: "2026-01-01",
};

describe("executeCreateProjectWizard attach_outsourced", () => {
  it("updates the target project with outsource metadata", async () => {
    const updateProject = vi.fn(() => true);
    const state = createInitialCreateProjectWizardState({
      source: "attach_outsourced",
      attachToProjectId: "P-TARGET",
      selectedSubcontractorId: "SUB-1",
      outsourceRateBasis: "fixed",
      outsourceRateValue: 42000,
      outsourceNotes: "Labour only",
    });

    const result = await executeCreateProjectWizard({
      state,
      customers: [],
      partners: [subcontractor],
      subcontractors: [],
      incGiverCompanies: [],
      vendorshipCompanies: [],
      agents: [],
      quotations: [],
      projects: [targetProject],
      generateId: () => "X",
      allocateCustomerId: () => "C-NEW",
      addCustomer: () => true,
      addExpense: () => true,
      convertEnquiryToCustomer: async () => ({ ok: true }),
      createProjectFromConfirmedQuotation: async () => ({ ok: true, projectId: "P-1" }),
      createProjectIntake: async () => ({ ok: true, projectId: "P-1" }),
      createDirectProjectException: async () => ({ ok: true, projectId: "P-1" }),
      updateProject,
    });

    expect(result).toEqual({
      ok: true,
      projectId: "P-TARGET",
      attachSubcontractorName: "Install Co",
    });
    expect(updateProject).toHaveBeenCalledWith("P-TARGET", {
      outsource: expect.objectContaining({
        partyId: "SUB-1",
        partyName: "Install Co",
        rateBasis: "fixed",
        rateValue: 42000,
        total: 42000,
        notes: "Labour only",
      }),
    });
  });
});
