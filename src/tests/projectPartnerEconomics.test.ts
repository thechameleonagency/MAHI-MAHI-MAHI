import { describe, expect, it } from "vitest";
import { normalizeProject } from "@/lib/projectNormalize";
import { buildProjectShellFromQuotation } from "@/domain/project/buildProjectShellFromQuotation";
import {
  ensureProjectPartnerEconomics,
  resolveProjectPartnerRow,
} from "@/lib/projectPartnerEconomics";
import { calculateProjectPartnerEarning } from "@/domain/partners/derivePartnerEconomics";
import type { Project } from "@/types/project";
import { seedPartners } from "@/data/seedData";

describe("projectPartnerEconomics (E7)", () => {
  it("materializes partners[] from scope.partnerId on normalize (seed-style project)", () => {
    const raw = {
      id: "PROJ-TEST",
      name: "Mehta",
      projectKind: "PARTNER_EPC" as const,
      client: "Client",
      capacity: "3 kW",
      contractAmount: 240_000,
      totalCost: 180_000,
      scope: {
        hasMaterial: true,
        hasInstallation: true,
        vendorshipOwner: "MSS" as const,
        leadSource: "PARTNER" as const,
        partnerId: "P001",
        billingParty: "MSS" as const,
        profitSharePercent: 30,
      },
    } as Project;

    const normalized = normalizeProject(raw);
    expect(normalized.partners?.[0]?.partnerId).toBe("P001");
    expect(normalized.partners?.[0]?.partnerType).toBe("profit");
    expect(normalized.partners?.[0]?.sharePercentage).toBe(30);

    const row = resolveProjectPartnerRow(normalized);
    expect(row?.partnerId).toBe("P001");
    const earning = calculateProjectPartnerEarning(normalized, row!);
    expect(earning).toBe(Math.max(0, 60_000) * 0.3);
  });

  it("fallback shell from quotation + partner intake gets partners row", () => {
    const result = buildProjectShellFromQuotation({
      quotation: {
        id: "Q-1",
        quotationNumber: "Q-1",
        status: "approved",
        quotationType: "solar",
        clientName: "Acme",
        systemCategory: "commercial",
        systemCapacity: "120",
        paymentType: "cash",
        totalAmount: 2_500_000,
        isConverted: false,
        createdAt: "2026-01-01",
      },
      intake: {
        kind: "PARTNER_EPC",
        parties: { customer: "Acme", partner: "EnergyMitra Solutions" },
        commercial: { contractAmount: 2_500_000, paymentType: "cash", internalCostEstimate: 0 },
      },
      projectName: "Acme 120 kW",
      projectId: "P-SHELL",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.partners?.[0]?.partnerName).toBe("EnergyMitra Solutions");
    expect(result.project.partners?.[0]?.partnerType).toBe("profit");

    const withCatalog = ensureProjectPartnerEconomics(result.project, {
      intake: {
        kind: "PARTNER_EPC",
        parties: { customer: "Acme", partner: "EnergyMitra Solutions" },
        commercial: { contractAmount: 2_500_000, paymentType: "cash" },
      },
      partnerCatalog: seedPartners,
    });
    expect(withCatalog.partners?.[0]?.partnerId).toBe("P001");
  });

  it("ensureProjectPartnerEconomics sets fixed-EPC amounts from intake commercial", () => {
    const project: Project = {
      id: "P-FIX",
      name: "Fixed deal",
      projectKind: "FIXED_EPC",
      client: "X",
      capacity: "10 kW",
      contractAmount: 700_000,
      totalCost: 500_000,
      scope: {
        hasMaterial: true,
        hasInstallation: true,
        vendorshipOwner: "MSS",
        leadSource: "PARTNER",
        partnerId: "P002",
        billingParty: "PARTNER",
        fixedRatePerKw: 65_000,
      },
    } as Project;

    const next = ensureProjectPartnerEconomics(project, {
      intake: {
        kind: "FIXED_EPC",
        parties: { customer: "Y", partner: "Bharat Solar Net" },
        commercial: {
          contractAmount: 700_000,
          backendPrice: 650_000,
          partnerSellPrice: 700_000,
        },
      },
      partnerCatalog: seedPartners,
    });
    expect(next.mssBackendAmount).toBe(650_000);
    expect(next.partnerCustomerSellAmount).toBe(700_000);
    expect(next.partners?.[0]?.partnerType).toBe("fixed");
    expect(next.partners?.[0]?.fixedAmount).toBe(50_000);
  });
});
