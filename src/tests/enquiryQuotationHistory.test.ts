import { describe, expect, it } from "vitest";
import {
  buildEnquiryQuotationLinkUpdate,
  getCurrentEnquiryQuotationId,
  getEnquiryQuotationIds,
  reconcileEnquiryQuotationHistory,
} from "@/lib/enquiryQuotationHistory";
import type { Enquiry, Quotation } from "@/types/project";

const enquiry = (overrides: Partial<Enquiry> = {}): Enquiry =>
  ({
    id: "ENQ-1",
    customerName: "A",
    customerPhone: "1",
    customerEmail: "a@a.com",
    customerAddress: "X",
    customerType: "individual",
    source: "phone",
    systemCapacity: "5",
    estimatedBudget: 100000,
    requirements: "",
    status: "quotation_sent",
    priority: "medium",
    assignedTo: "",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    notes: [],
    ...overrides,
  }) as Enquiry;

describe("enquiryQuotationHistory", () => {
  it("appends new quotation id without dropping prior links", () => {
    const link = buildEnquiryQuotationLinkUpdate(
      enquiry({ quotationId: "Q-1", quotationIds: ["Q-1"] }),
      "Q-2",
    );
    expect(link.quotationIds).toEqual(["Q-1", "Q-2"]);
    expect(link.quotationId).toBe("Q-2");
    expect(getCurrentEnquiryQuotationId({ quotationId: link.quotationId, quotationIds: link.quotationIds })).toBe(
      "Q-2",
    );
  });

  it("reconciles history from quotations.enquiryId ordered by createdAt", () => {
    const quotes: Quotation[] = [
      {
        id: "Q-old",
        quotationNumber: "Q-1",
        status: "rejected",
        quotationType: "solar",
        clientName: "A",
        clientPhone: "1",
        clientEmail: "a@a.com",
        clientCity: "Jaipur",
        clientState: "Rajasthan",
        paymentType: "cash",
        totalAmount: 500000,
        enquiryId: "ENQ-1",
        createdAt: "2026-05-01",
      },
      {
        id: "Q-new",
        quotationNumber: "Q-2",
        status: "sent",
        quotationType: "solar",
        clientName: "A",
        clientPhone: "1",
        clientEmail: "a@a.com",
        clientCity: "Jaipur",
        clientState: "Rajasthan",
        paymentType: "cash",
        totalAmount: 450000,
        enquiryId: "ENQ-1",
        createdAt: "2026-05-07",
      },
    ] as Quotation[];

    const reconciled = reconcileEnquiryQuotationHistory(
      enquiry({ quotationId: "Q-new" }),
      quotes,
    );
    expect(getEnquiryQuotationIds(reconciled)).toEqual(["Q-old", "Q-new"]);
    expect(getCurrentEnquiryQuotationId(reconciled)).toBe("Q-new");
  });
});
