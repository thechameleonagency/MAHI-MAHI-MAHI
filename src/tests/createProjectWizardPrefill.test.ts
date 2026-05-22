import { describe, expect, it } from "vitest";
import {
  buildLeadPathSelectionResetPatch,
  buildQuotationPrefillPatch,
  buildSourceSelectionResetPatch,
  filterEligibleWizardQuotations,
  filterOpenWizardProjects,
} from "@/lib/createProjectWizardPrefill";
import type { Customer } from "@/types/finance";
import type { Project, Quotation } from "@/types/project";

function makeQuotation(overrides: Partial<Quotation> = {}): Quotation {
  return {
    id: "Q-1",
    quotationNumber: "QT-001",
    status: "approved",
    quotationType: "solar",
    clientName: "Sharma Family",
    clientPhone: "9999999999",
    clientEmail: "sharma@example.com",
    clientCity: "Delhi",
    clientState: "Delhi",
    systemCapacity: "5",
    systemCategory: "residential",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...overrides,
  } as Quotation;
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "P-100",
    name: "Sharma 5kW",
    client: "Sharma Family",
    lifecycleStatus: "In Progress",
    contractAmount: 250000,
    capacity: "5 kW",
    ...overrides,
  } as Project;
}

describe("createProjectWizardPrefill", () => {
  it("filterEligibleWizardQuotations keeps approved unconverted only", () => {
    const quotations = [
      makeQuotation({ id: "Q-1", status: "approved" }),
      makeQuotation({ id: "Q-2", status: "sent" }),
      makeQuotation({ id: "Q-3", status: "approved", linkedProjectId: "P-1" }),
      makeQuotation({ id: "Q-4", status: "converted_to_project" }),
    ];
    expect(filterEligibleWizardQuotations(quotations).map((q) => q.id)).toEqual(["Q-1"]);
  });

  it("filterOpenWizardProjects excludes completed projects", () => {
    const projects = [
      makeProject({ id: "P-1", lifecycleStatus: "In Progress" }),
      makeProject({ id: "P-2", lifecycleStatus: "Completed" }),
    ];
    expect(filterOpenWizardProjects(projects).map((p) => p.id)).toEqual(["P-1"]);
  });

  it("buildSourceSelectionResetPatch clears source-specific fields", () => {
    expect(buildSourceSelectionResetPatch("new")).toEqual({
      source: "new",
      selectedQuotationId: undefined,
      directExceptionReason: undefined,
      directExceptionProjectKind: undefined,
      attachToProjectId: undefined,
    });
  });

  it("buildQuotationPrefillPatch maps linked customer to select mode", () => {
    const customer: Customer = {
      id: "C-001",
      name: "Sharma Family",
      phone: "9999999999",
      email: "sharma@example.com",
      address: "12 MG Road",
      status: "Active",
    } as Customer;
    const quotation = makeQuotation({
      customerId: "C-001",
      paymentType: "cash",
      agentId: "AG-1",
      clientAgreedAmount: 250000,
    });

    const patch = buildQuotationPrefillPatch(quotation, customer);

    expect(patch.source).toBe("quotation");
    expect(patch.selectedQuotationId).toBe("Q-1");
    expect(patch.projectName).toBe("Sharma Family – 5kW");
    expect(patch.capacity).toBe("5");
    expect(patch.contractAmount).toBeGreaterThan(0);
    expect(patch.paymentType).toBe("cash");
    expect(patch.selectedAgentId).toBe("AG-1");
    expect(patch.customerMode).toBe("select");
    expect(patch.selectedCustomerId).toBe("C-001");
    expect(patch.newCustomerName).toBeUndefined();
  });

  it("buildQuotationPrefillPatch maps unlinked quotation to add-customer mode", () => {
    const quotation = makeQuotation({
      customerId: undefined,
      clientAddress: "Plot 9, Sector 12",
      paymentType: "loan",
    });

    const patch = buildQuotationPrefillPatch(quotation);

    expect(patch.customerMode).toBe("add");
    expect(patch.selectedCustomerId).toBeUndefined();
    expect(patch.newCustomerName).toBe("Sharma Family");
    expect(patch.newCustomerPhone).toBe("9999999999");
    expect(patch.newCustomerEmail).toBe("sharma@example.com");
    expect(patch.newCustomerAddress).toBe("Plot 9, Sector 12, Delhi, Delhi");
    expect(patch.paymentType).toBe("loan");
  });

  it("buildLeadPathSelectionResetPatch clears partner fields when switching lead path", () => {
    expect(buildLeadPathSelectionResetPatch("MSS_DIRECT")).toEqual({
      leadPath: "MSS_DIRECT",
      partnerType: undefined,
      selectedPartnerId: undefined,
      outsourceMode: undefined,
    });
  });

  it("buildLeadPathSelectionResetPatch defaults outsource mode to new for OUTSOURCED_INC", () => {
    expect(buildLeadPathSelectionResetPatch("OUTSOURCED_INC")).toEqual({
      leadPath: "OUTSOURCED_INC",
      partnerType: undefined,
      selectedPartnerId: undefined,
      outsourceMode: "new",
    });
  });
});
