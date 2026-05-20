import { describe, expect, it } from "vitest";
import {
  BillingDirectionGuardService,
  HIGH_VALUE_INVOICE_THRESHOLD_INR,
  isHighValueInvoiceAmount,
} from "@/application/services/BillingDirectionGuardService";
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
  client: "Client A",
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
  customerId: "C-1",
  lifecycleStatus: "In Progress",
  executionPhase: "execution",
  ...overrides,
});

describe("BillingDirectionGuardService", () => {
  it("allows company_to_customer even when project has no config snapshot", () => {
    const service = new BillingDirectionGuardService();
    const result = service.canUseDirection(makeProject(), "company_to_customer");
    expect(result.ok).toBe(true);
  });

  it("always allows company_to_customer MSS billing regardless of allowedBillingDirections", () => {
    const service = new BillingDirectionGuardService();
    const result = service.canUseDirection(
      makeProject({
        projectKind: "PARTNER_EPC",
        projectKindConfigSnapshot: {
          requiredParties: ["customer", "partner"],
          requiredCommercialFields: ["contractAmount", "partnerSellPrice"],
          allowedBillingDirections: ["company_to_partner", "partner_to_customer"],
          visibleTabs: ["overview"],
          requiredDocuments: [],
          forbiddenActions: [],
        },
      }),
      "company_to_customer",
    );
    expect(result.ok).toBe(true);
  });

  it("still restricts legacy non-customer billing directions when not in allowed list", () => {
    const service = new BillingDirectionGuardService();
    const result = service.canUseDirection(
      makeProject({
        projectKind: "INC",
        projectKindConfigSnapshot: {
          requiredParties: ["customer"],
          requiredCommercialFields: ["contractAmount"],
          allowedBillingDirections: ["company_to_customer"],
          visibleTabs: ["overview"],
          requiredDocuments: [],
          forbiddenActions: [],
        },
      }),
      "partner_to_customer",
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain("partner_to_customer");
  });

  it("requires written justification for issuance above ₹5L", () => {
    const service = new BillingDirectionGuardService();
    expect(isHighValueInvoiceAmount(HIGH_VALUE_INVOICE_THRESHOLD_INR)).toBe(false);
    expect(isHighValueInvoiceAmount(HIGH_VALUE_INVOICE_THRESHOLD_INR + 1)).toBe(true);

    const blocked = service.validateHighValueIssuance(600_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.requiresJustification).toBe(true);

    const allowed = service.validateHighValueIssuance(600_000, "Approved by management for milestone billing");
    expect(allowed.ok).toBe(true);
    expect(allowed.requiresJustification).toBe(true);

    const draftOk = service.validateHighValueIssuance(600_000, undefined, { isDraft: true });
    expect(draftOk.ok).toBe(true);
    expect(draftOk.requiresJustification).toBe(false);
  });
});
