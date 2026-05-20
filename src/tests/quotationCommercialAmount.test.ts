import { describe, expect, it } from "vitest";
import {
  computeQuotationLineItemsTotal,
  hasPositiveQuotationAmount,
  resolveQuotationCommercialAmount,
  validateQuotationSendOrApprove,
} from "@/domain/quotation/quotationCommercialAmount";
import type { Quotation } from "@/types/project";

const baseQuotation = (overrides: Partial<Quotation> = {}): Quotation =>
  ({
    id: "Q-ZERO",
    quotationNumber: "Q-TEST",
    status: "draft",
    quotationType: "solar",
    clientName: "Test",
    clientPhone: "1",
    clientEmail: "a@a.com",
    clientCity: "Jaipur",
    clientState: "Rajasthan",
    paymentType: "cash",
    totalAmount: 0,
    createdAt: "2026-01-01",
    presetSnapshot: [{ id: "1", name: "Panel", quantity: 1, unit: "pcs", rate: 0 }],
    ...overrides,
  }) as Quotation;

describe("quotationCommercialAmount", () => {
  it("resolves amount from totalAmount and line items", () => {
    expect(
      resolveQuotationCommercialAmount(
        baseQuotation({ totalAmount: 250000, clientAgreedAmount: 240000 }),
      ),
    ).toBe(250000);
    expect(
      resolveQuotationCommercialAmount(
        baseQuotation({ totalAmount: 0, presetSnapshot: [{ id: "1", name: "X", quantity: 2, unit: "pcs", rate: 5000 }] }),
      ),
    ).toBe(10000);
  });

  it("rejects zero commercial value for send/approve", () => {
    expect(validateQuotationSendOrApprove(baseQuotation()).ok).toBe(false);
    expect(hasPositiveQuotationAmount(baseQuotation({ totalAmount: 1 }))).toBe(true);
  });

  it("sums custom item amount and preset lines", () => {
    const total = computeQuotationLineItemsTotal({
      presetSnapshot: [{ id: "a", name: "A", quantity: 3, unit: "pcs", rate: 100 }],
      customItems: [{ title: "Labour", quantity: 1, unit: "job", rate: 0, amount: 5000 }],
    });
    expect(total).toBe(5300);
  });
});
