import { describe, expect, it } from "vitest";
import {
  buildProjectShellFromQuotation,
  formatProjectLocationFromQuotation,
} from "@/domain/project/buildProjectShellFromQuotation";
import type { ProjectIntakePayload } from "@/application/services/ProjectTypeService";
import type { Quotation } from "@/types/project";

const baseQuotation = (overrides: Partial<Quotation> = {}): Quotation => ({
  id: "Q-1",
  quotationNumber: "Q-001",
  status: "approved",
  quotationType: "solar",
  clientName: "Acme Industries",
  clientPhone: "999",
  clientEmail: "a@acme.com",
  clientCity: "",
  clientState: "",
  systemCategory: "commercial",
  systemCapacity: "120",
  paymentType: "cash",
  totalAmount: 2_500_000,
  isConverted: false,
  createdAt: "2026-01-01",
  ...overrides,
});

const partnerIntake: ProjectIntakePayload = {
  kind: "PARTNER_EPC",
  parties: { customer: "Acme", partner: "Channel Co" },
  commercial: { contractAmount: 2_500_000, paymentType: "cash", internalCostEstimate: 0 },
};

describe("buildProjectShellFromQuotation", () => {
  it("derives commercial + PARTNER_EPC from quotation and intake (not residential solo)", () => {
    const result = buildProjectShellFromQuotation({
      quotation: baseQuotation(),
      intake: partnerIntake,
      projectName: "Acme 120 kW",
      projectId: "P-1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.projectType).toBe("Commercial");
    expect(result.project.projectKind).toBe("PARTNER_EPC");
    expect(result.project.ownerType).toBe("partnership");
    expect(result.project.projectCategory).toBe("solar");
    expect(result.project.capacity).toBe("120 kW");
    expect(result.project.lifecycleStatus).toBe("New");
    expect(result.project.customerId).toBeUndefined();
    expect(result.project.client).toBe("Acme Industries");
    expect(result.project.partners?.[0]?.partnerType).toBe("profit");
    expect(result.project.partners?.[0]?.partnerName).toBe("Channel Co");
    expect(result.project.partners?.[0]?.sharePercentage).toBe(30);
  });

  it("freezes client snapshot fields including GSTIN from quotation (E1)", () => {
    const result = buildProjectShellFromQuotation({
      quotation: baseQuotation({
        customerId: "CUST-100",
        clientGstin: "08AAAAA0000A1Z5",
        clientState: "08",
      }),
      intake: partnerIntake,
      projectName: "Acme GST",
      projectId: "P-GST",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.customerId).toBe("CUST-100");
    expect(result.project.clientGstin).toBe("08AAAAA0000A1Z5");
    expect(result.project.state).toBe("08");
  });

  it("maps industrial system category", () => {
    const result = buildProjectShellFromQuotation({
      quotation: baseQuotation({ systemCategory: "industrial", systemCapacity: "500" }),
      intake: { kind: "SOLO_EPC", parties: { customer: "X" }, commercial: { contractAmount: 1, paymentType: "cash" } },
      projectName: "Plant",
      projectId: "P-2",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.projectType).toBe("Industrial");
    expect(result.project.projectKind).toBe("SOLO_EPC");
  });

  it("rejects solar quotation without systemCategory", () => {
    const result = buildProjectShellFromQuotation({
      quotation: baseQuotation({ systemCategory: undefined }),
      intake: partnerIntake,
      projectName: "X",
      projectId: "P-3",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe("QUOTATION_MISSING_SYSTEM_CATEGORY");
  });

  it("formatProjectLocationFromQuotation avoids lone comma", () => {
    expect(formatProjectLocationFromQuotation(baseQuotation())).toBe("");
    expect(
      formatProjectLocationFromQuotation(
        baseQuotation({ clientCity: "Jaipur", clientState: "Rajasthan" }),
      ),
    ).toBe("Jaipur, Rajasthan");
    expect(
      formatProjectLocationFromQuotation(
        baseQuotation({ clientAddress: "Plot 12, MIDC", clientCity: "Pune", clientState: "MH" }),
      ),
    ).toBe("Plot 12, MIDC");
  });
});
