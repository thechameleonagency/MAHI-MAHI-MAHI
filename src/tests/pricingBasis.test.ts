import { describe, expect, it } from "vitest";
import {
  commercialBaselineWithPricing,
  computeContractFromBasis,
  formatPricingLineDescription,
  resolvePricingBasis,
} from "@/lib/pricingBasis";
import type { Project, Quotation } from "@/types/project";

describe("pricingBasis (Phase 4.5b)", () => {
  const project = {
    id: "P-1",
    name: "10kW Site",
    client: "Client",
    capacity: "10kW",
    contractAmount: 500_000,
    commercialBaseline: { basis: "per_kw" as const, rateValue: 50_000, pricingQuantity: 10 },
    projectType: "Residential",
    startDate: "2026-01-01",
    createdAt: "2026-01-01",
  } as Project;

  it("resolves basis from commercial baseline", () => {
    expect(resolvePricingBasis(project)).toBe("per_kw");
  });

  it("formats per-kW invoice line", () => {
    expect(formatPricingLineDescription(project)).toContain("10kW");
    expect(formatPricingLineDescription(project)).toContain("/kW");
  });

  it("computes contract from basis", () => {
    expect(computeContractFromBasis("per_kw", 50_000, 10)).toBe(500_000);
    expect(computeContractFromBasis("per_sqft", 120, 200)).toBe(24_000);
  });

  it("stores quotation pricing on baseline", () => {
    const q = {
      id: "Q-1",
      pricingBasis: "per_kw",
      pricingRate: 48_000,
      pricingQuantity: 8,
      totalAmount: 384_000,
      clientAgreedAmount: 384_000,
    } as Quotation;
    const baseline = commercialBaselineWithPricing(
      {
        id: "CB-1",
        customerId: "C-1",
        capturedAt: "2026-01-01",
        lines: [],
        materialsTotal: 0,
        servicesTotal: 384_000,
      },
      q,
    );
    expect(baseline.basis).toBe("per_kw");
    expect(baseline.rateValue).toBe(48_000);
  });
});
