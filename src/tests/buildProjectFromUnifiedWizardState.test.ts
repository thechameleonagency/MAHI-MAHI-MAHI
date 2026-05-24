import { describe, expect, it } from "vitest";
import {
  buildIntakeFromUnifiedWizardState,
  buildProjectFromUnifiedWizardState,
} from "@/lib/buildProjectFromUnifiedWizardState";
import { createInitialUnifiedWizardState } from "@/types/createProjectWizard";
import type { Subcontractor } from "@/types/finance";

const generateId = () => "PRJ-OUT-1";

const subcontractor: Subcontractor = {
  id: "SUB-42",
  name: "Rooftop Install LLP",
  phone: "9876543210",
  defaultRatePerKw: 1800,
  createdAt: "2026-01-01",
};

const baseCtx = {
  generateId,
  partners: [],
  subcontractors: [subcontractor],
  incGiverCompanies: [],
  vendorshipCompanies: [],
  enquiries: [],
  quotations: [],
};

describe("buildProjectFromUnifiedWizardState OUTSOURCED_INC", () => {
  it("links subcontractor and payout on project create", () => {
    const state = createInitialUnifiedWizardState({
      dealOrigin: "OUTSOURCED_INC",
      vendorshipOwner: "MSS",
      paymentType: "cash",
      counterpartyId: "SUB-42",
      subcontractorPayoutRate: 2000,
      endCustomer: {
        name: "Home Owner",
        phone: "9000000000",
        address: "Pune",
        kNumber: "K-99",
      },
      capacityKw: 5,
      grossContractValue: 350000,
      projectName: "Pune rooftop",
      projectType: "Residential",
    });

    const project = buildProjectFromUnifiedWizardState(state, baseCtx);

    expect(project.projectKind).toBe("OUTSOURCED_INC");
    expect(project.outsource).toEqual(
      expect.objectContaining({
        partyId: "SUB-42",
        partyName: "Rooftop Install LLP",
        rateBasis: "per_kw",
        rateValue: 2000,
        quantity: 5,
        total: 10000,
      }),
    );
    expect(project.scope?.installationBy).toBe("Subcontractor");
    expect(project.incScope).toBe("labour");
    expect(project.type).toBe("INC");
  });

  it("records subcontractor on intake parties", () => {
    const state = createInitialUnifiedWizardState({
      dealOrigin: "OUTSOURCED_INC",
      vendorshipOwner: "MSS",
      paymentType: "cash",
      counterpartyId: "SUB-42",
      subcontractorPayoutRate: 2000,
      endCustomer: {
        name: "Home Owner",
        phone: "9000000000",
        address: "Pune",
        kNumber: "K-99",
      },
      capacityKw: 5,
      grossContractValue: 350000,
    });

    const intake = buildIntakeFromUnifiedWizardState(state, baseCtx);

    expect(intake.kind).toBe("OUTSOURCED_INC");
    expect(intake.parties.subcontractor).toBe("Rooftop Install LLP");
    expect(intake.parties.customer).toBe("Home Owner");
    expect(intake.parties.partner).toBeUndefined();
  });
});
