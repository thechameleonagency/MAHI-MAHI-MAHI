import { describe, expect, it } from "vitest";
import { buildProjectFromWizardState } from "@/lib/buildProjectFromWizardState";
import { createInitialCreateProjectWizardState } from "@/types/createProjectWizard";
import type { Customer, Partner } from "@/types/finance";

const generateId = () => "P-TEST-001";

const baseCtx = {
  generateId,
  customers: [] as Customer[],
  partners: [] as Partner[],
  subcontractors: [],
  incGiverCompanies: [{ id: "INC-1", name: "Sunrise Developers", address: "" }],
  vendorshipCompanies: [{ id: "V-1", name: "Green Code Co", address: "" }],
  agents: [],
  quotations: [],
  customer: { id: "C-1", name: "Acme Homes", address: "Jaipur" },
};

describe("buildProjectFromWizardState", () => {
  it("builds MSS direct project with vendorship expense side effect", () => {
    const state = createInitialCreateProjectWizardState({
      source: "new",
      leadPath: "MSS_DIRECT",
      projectName: "Acme 5kW",
      capacity: "5",
      contractAmount: 250000,
      paymentType: "cash",
      internalCostEstimate: 180000,
      vendorshipChoice: "THIRD_PARTY",
      vendorshipCompanyId: "V-1",
      vendorshipFeeAmount: 12000,
      kNumber: "K-123",
    });

    const result = buildProjectFromWizardState(state, baseCtx);

    expect(result.project.id).toBe("P-TEST-001");
    expect(result.project.projectKind).toBe("SOLO_EPC");
    expect(result.project.customerId).toBe("C-1");
    expect(result.project.contractAmount).toBe(250000);
    expect(result.project.scope?.kNumber).toBe("K-123");
    expect(result.project.scope?.vendorshipCompanyId).toBe("V-1");
    expect(result.sideEffects.vendorshipExpense).toEqual({
      amount: 12000,
      vendorshipCompanyId: "V-1",
      companyName: "Green Code Co",
    });
    expect(result.intake.parties.customer).toBe("Acme Homes");
  });

  it("builds partner profit-share project and end customer intake", () => {
    const state = createInitialCreateProjectWizardState({
      source: "new",
      leadPath: "PARTNER",
      partnerType: "profit_share",
      selectedPartnerId: "PART-1",
      partnerCustomerName: "End Client Ltd",
      partnerProjectName: "Partner deal",
      partnerCapacity: "10",
      partnerContractAmount: 500000,
      profitSharePercent: 30,
      partnerVendorshipChoice: "OUR_CODE",
      billingParty: "MSS",
    });

    const result = buildProjectFromWizardState(state, {
      ...baseCtx,
      partners: [{ id: "PART-1", name: "Channel Partner", type: "Profit-Share" } as Partner],
      customer: { id: "C-PARTNER", name: "End Client Ltd" },
    });

    expect(result.project.projectKind).toBe("PARTNER_EPC");
    expect(result.project.client).toBe("End Client Ltd");
    expect(result.project.scope?.partnerId).toBe("PART-1");
    expect(result.project.scope?.profitSharePercent).toBe(30);
    expect(result.intake.parties.partner).toBe("Channel Partner");
  });

  it("builds quotation-sourced SOLO_EPC with quotation id", () => {
    const state = createInitialCreateProjectWizardState({
      source: "quotation",
      selectedQuotationId: "Q-100",
      projectName: "Quote project",
      capacity: "8",
      contractAmount: 320000,
      selectedCustomerId: "C-1",
    });

    const result = buildProjectFromWizardState(state, baseCtx);

    expect(result.project.projectKind).toBe("SOLO_EPC");
    expect(result.project.quotationId).toBe("Q-100");
    expect(result.quotationId).toBe("Q-100");
  });

  it("builds OUTSOURCED_INC with subcontractor from subcontractors collection", () => {
    const state = createInitialCreateProjectWizardState({
      source: "new",
      leadPath: "OUTSOURCED_INC",
      selectedSubcontractorId: "SUB-1",
      projectName: "Outsource rooftop",
      capacity: "6",
      contractAmount: 180000,
      paymentType: "cash",
      internalCostEstimate: 120000,
      kNumber: "K-456",
    });

    const result = buildProjectFromWizardState(state, {
      ...baseCtx,
      subcontractors: [
        {
          id: "SUB-1",
          name: "Field Install Co",
          phone: "9999999999",
          defaultRatePerKw: 2500,
          createdAt: "2026-01-01",
        },
      ],
    });

    expect(result.project.projectKind).toBe("OUTSOURCED_INC");
    expect(result.project.outsource).toEqual(
      expect.objectContaining({
        partyId: "SUB-1",
        partyName: "Field Install Co",
        rateBasis: "fixed",
        rateValue: 180000,
        total: 180000,
      }),
    );
    expect(result.project.scope?.installationBy).toBe("Subcontractor");
    expect(result.intake.parties.subcontractor).toBe("Field Install Co");
  });
});
