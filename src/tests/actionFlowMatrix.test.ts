import { describe, expect, it } from "vitest";
import { isQuotationConverted } from "@/lib/quotationSelectors";
import type { Quotation } from "@/types/project";

describe("actionFlowMatrix", () => {
  it("treats linkedProjectId as converted quotation", () => {
    const q: Quotation = {
      id: "Q-1",
      quotationNumber: "MSS/Q/1",
      clientName: "Test",
      status: "approved",
      linkedProjectId: "PROJ-1",
      systemCategory: "residential",
      systemCapacity: "5",
      paymentType: "cash",
      clientAgreedAmount: 100000,
      totalAmount: 100000,
      createdAt: "2026-01-01",
    };
    expect(isQuotationConverted(q)).toBe(true);
  });

  it("converted_to_project status implies converted", () => {
    const q: Quotation = {
      id: "Q-2",
      quotationNumber: "MSS/Q/2",
      clientName: "Test",
      status: "converted_to_project",
      systemCategory: "residential",
      systemCapacity: "5",
      paymentType: "cash",
      clientAgreedAmount: 100000,
      totalAmount: 100000,
      createdAt: "2026-01-01",
    };
    expect(isQuotationConverted(q)).toBe(true);
  });
});
