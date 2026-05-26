import { describe, expect, it } from "vitest";
import {
  deriveEnquiryStatusFromQuotations,
  getEnquiryDisplayStatus,
} from "@/lib/enquiryStatusReconcile";
import type { Enquiry, Quotation } from "@/types/project";

const enquiry = (status: Enquiry["status"], overrides?: Partial<Enquiry>): Enquiry => ({
  id: "ENQ-1",
  customerName: "Test",
  customerPhone: "9999999999",
  customerEmail: "t@test.com",
  customerAddress: "Addr",
  customerType: "individual",
  source: "phone",
  systemCapacity: "5kW",
  estimatedBudget: 100000,
  requirements: "Solar",
  status,
  priority: "medium",
  assignedTo: "",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  notes: [],
  quotationId: "Q-1",
  ...overrides,
});

const draftQuote = (): Quotation => ({
  id: "Q-1",
  quotationNumber: "Q-001",
  status: "draft",
  quotationType: "solar",
  clientName: "Test",
  clientPhone: "9999999999",
  clientEmail: "t@test.com",
  clientCity: "Jaipur",
  clientState: "Rajasthan",
  paymentType: "cash",
  totalAmount: 100000,
  isConverted: false,
  enquiryId: "ENQ-1",
  createdAt: "2026-01-01",
  presetSnapshot: [{ id: "l1", name: "Panel", quantity: 1, unitPrice: 100000 }],
});

describe("enquiryStatusReconcile", () => {
  it("downgrades quotation_sent when only draft quote is linked", () => {
    expect(
      deriveEnquiryStatusFromQuotations(enquiry("quotation_sent"), [draftQuote()]),
    ).toBe("new");
  });

  it("shows quotation_draft display when draft linked on new enquiry", () => {
    expect(getEnquiryDisplayStatus(enquiry("new"), [draftQuote()])).toBe("quotation_draft");
  });

  it("keeps quotation_sent when quote is actually sent", () => {
    const sent = { ...draftQuote(), status: "sent" as const, sentAt: "2026-01-02" };
    expect(deriveEnquiryStatusFromQuotations(enquiry("quotation_sent"), [sent])).toBe(
      "quotation_sent",
    );
  });

  it("promotes new enquiry to quotation_sent when a linked quote is sent", () => {
    const sent = { ...draftQuote(), status: "sent" as const, sentAt: "2026-01-02" };
    expect(deriveEnquiryStatusFromQuotations(enquiry("new"), [sent])).toBe("quotation_sent");
    expect(getEnquiryDisplayStatus(enquiry("new"), [sent])).toBe("quotation_sent");
  });
});
