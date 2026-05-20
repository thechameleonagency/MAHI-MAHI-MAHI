import { describe, expect, it } from "vitest";
import { ProjectKindService } from "@/application/services/ProjectKindService";
import {
  isProjectPaymentType,
  parseProjectPaymentType,
  resolveProjectPaymentTypeFromSources,
} from "@/domain/project/projectPaymentType";
import { buildProjectShellFromQuotation } from "@/domain/project/buildProjectShellFromQuotation";
import type { Quotation } from "@/types/project";

describe("projectPaymentType", () => {
  it("rejects empty string and unknown values", () => {
    expect(parseProjectPaymentType("")).toBeUndefined();
    expect(parseProjectPaymentType("wire")).toBeUndefined();
    expect(isProjectPaymentType("cash")).toBe(true);
  });

  it("resolveProjectPaymentTypeFromSources prefers validated intake", () => {
    expect(
      resolveProjectPaymentTypeFromSources({
        intakePayment: "",
        quotationPayment: "loan",
      }),
    ).toBe("loan");
    expect(
      resolveProjectPaymentTypeFromSources({
        intakePayment: "bogus",
        quotationPayment: "cash",
      }),
    ).toBe("cash");
  });

  it("validateIntake rejects empty paymentType when required", () => {
    const svc = new ProjectKindService();
    const r = svc.validateIntake({
      kind: "SOLO_EPC",
      parties: { customer: "X", vendorOrDiscom: "DISCOM" },
      commercial: { contractAmount: 1, paymentType: "", internalCostEstimate: 0 },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/paymentType/i);
  });

  it("validateIntake rejects invalid paymentType strings", () => {
    const svc = new ProjectKindService();
    const r = svc.validateIntake({
      kind: "SOLO_EPC",
      parties: { customer: "X", vendorOrDiscom: "DISCOM" },
      commercial: { contractAmount: 1, paymentType: "crypto", internalCostEstimate: 0 },
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/Invalid payment type/i);
  });

  it("buildProjectShellFromQuotation ignores invalid intake payment cast", () => {
    const quotation: Quotation = {
      id: "Q-1",
      quotationNumber: "Q-1",
      status: "approved",
      quotationType: "solar",
      clientName: "Client",
      clientPhone: "9",
      clientEmail: "c@x.com",
      clientCity: "Jaipur",
      clientState: "RJ",
      systemCategory: "residential",
      systemCapacity: "5",
      paymentType: "cash-and-loan",
      totalAmount: 100,
      isConverted: false,
      createdAt: "2026-01-01",
    };
    const result = buildProjectShellFromQuotation({
      quotation,
      intake: {
        kind: "SOLO_EPC",
        parties: { customer: "Client", vendorOrDiscom: "V" },
        commercial: { contractAmount: 100, paymentType: "not-valid", internalCostEstimate: 0 },
      },
      projectName: "Test",
      projectId: "P-1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.paymentType).toBe("cash-and-loan");
  });
});
