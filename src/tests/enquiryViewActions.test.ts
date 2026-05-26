import { describe, expect, it } from "vitest";
import {
  executeEnquirySendQuotation,
  getEnquiryViewActions,
} from "@/lib/enquiryViewActions";
import type { Enquiry, Quotation } from "@/types/project";

const baseEnquiry = (status: Enquiry["status"], overrides?: Partial<Enquiry>): Enquiry => ({
  id: "ENQ-1",
  customerName: "Test Customer",
  customerPhone: "9999999999",
  customerEmail: "t@test.com",
  customerAddress: "Jaipur",
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
  ...overrides,
});

const draftQuotation = (overrides?: Partial<Quotation>): Quotation => ({
  id: "Q-1",
  quotationNumber: "Q-001",
  status: "draft",
  quotationType: "solar",
  clientName: "Test Customer",
  clientPhone: "9999999999",
  clientEmail: "t@test.com",
  clientCity: "Jaipur",
  clientState: "Rajasthan",
  paymentType: "cash",
  totalAmount: 100000,
  isConverted: false,
  enquiryId: "ENQ-1",
  createdAt: "2026-01-01",
  presetSnapshot: [{ id: "line-1", name: "Panel", quantity: 1, unitPrice: 100000 }],
  ...overrides,
});

describe("getEnquiryViewActions", () => {
  it("new enquiry without quote shows create and assign, not send", () => {
    const actions = getEnquiryViewActions(baseEnquiry("new"), [], "salesperson");
    expect(actions.showCreateQuotation).toBe(true);
    expect(actions.showSendQuotation).toBe(false);
    expect(actions.showViewQuotation).toBe(false);
    expect(actions.showAssignLead).toBe(true);
    expect(actions.showScheduleMeeting).toBe(true);
    expect(actions.showMarkAsLost).toBe(true);
  });

  it("new enquiry with draft quote shows send, not create", () => {
    const enquiry = baseEnquiry("new", { quotationId: "Q-1" });
    const actions = getEnquiryViewActions(enquiry, [draftQuotation()], "salesperson");
    expect(actions.showCreateQuotation).toBe(false);
    expect(actions.showSendQuotation).toBe(true);
    expect(actions.showViewQuotation).toBe(true);
  });

  it("quotation_sent with draft shows send, not mark converted", () => {
    const enquiry = baseEnquiry("quotation_sent", { quotationId: "Q-1" });
    const actions = getEnquiryViewActions(enquiry, [draftQuotation()], "salesperson");
    expect(actions.showSendQuotation).toBe(true);
    expect(actions.showMarkAsConverted).toBe(false);
    expect(actions.showCreateQuotation).toBe(false);
  });

  it("quotation_sent with sent quote shows mark converted", () => {
    const enquiry = baseEnquiry("quotation_sent", { quotationId: "Q-1" });
    const actions = getEnquiryViewActions(
      enquiry,
      [draftQuotation({ status: "sent" })],
      "salesperson",
    );
    expect(actions.showSendQuotation).toBe(false);
    expect(actions.showMarkAsConverted).toBe(true);
  });

  it("quotation_rejected shows create quotation", () => {
    const enquiry = baseEnquiry("quotation_rejected", { quotationId: "Q-1" });
    const actions = getEnquiryViewActions(
      enquiry,
      [draftQuotation({ status: "rejected" })],
      "salesperson",
    );
    expect(actions.showCreateQuotation).toBe(true);
    expect(actions.showViewQuotation).toBe(true);
  });

  it("converted shows archive and view quotation only", () => {
    const enquiry = baseEnquiry("converted", { quotationId: "Q-1" });
    const actions = getEnquiryViewActions(
      enquiry,
      [draftQuotation({ status: "approved" })],
      "salesperson",
    );
    expect(actions.showArchive).toBe(true);
    expect(actions.showViewQuotation).toBe(true);
    expect(actions.showMarkAsLost).toBe(false);
    expect(actions.showAssignLead).toBe(false);
  });

  it("lost shows reopen for admin", () => {
    const actions = getEnquiryViewActions(baseEnquiry("lost"), [], "admin");
    expect(actions.showReopen).toBe(true);
    expect(actions.showArchive).toBe(true);
  });

  it("meeting_scheduled shows reschedule not schedule", () => {
    const actions = getEnquiryViewActions(baseEnquiry("meeting_scheduled"), [], "salesperson");
    expect(actions.showScheduleMeeting).toBe(false);
    expect(actions.showRescheduleMeeting).toBe(true);
  });

  it("archived enquiry shows unarchive", () => {
    const actions = getEnquiryViewActions(
      baseEnquiry("new", { archivedAt: "2026-01-02" }),
      [],
      "admin",
    );
    expect(actions.showUnarchive).toBe(true);
    expect(actions.showAssignLead).toBe(false);
  });
});

describe("executeEnquirySendQuotation", () => {
  it("uses transitionEnquiryStatus for new enquiry", async () => {
    const enquiry = baseEnquiry("new", { quotationId: "Q-1" });
    let called: string | null = null;
    const result = await executeEnquirySendQuotation(enquiry, {
      transitionEnquiryStatus: async (id, status) => {
        called = `${id}:${status}`;
        return { ok: true };
      },
      transitionQuotationStatus: async () => ({ ok: false }),
      quotations: [draftQuotation()],
    });
    expect(result.ok).toBe(true);
    expect(called).toBe("ENQ-1:quotation_sent");
  });

  it("uses transitionEnquiryStatus when quotation_sent is stale but quote is still draft", async () => {
    const enquiry = baseEnquiry("quotation_sent", { quotationId: "Q-1" });
    let called: string | null = null;
    const result = await executeEnquirySendQuotation(enquiry, {
      transitionEnquiryStatus: async (id, status) => {
        called = `${id}:${status}`;
        return { ok: true };
      },
      transitionQuotationStatus: async () => ({ ok: false }),
      quotations: [draftQuotation()],
    });
    expect(result.ok).toBe(true);
    expect(called).toBe("ENQ-1:quotation_sent");
  });

  it("uses transitionQuotationStatus when enquiry is quotation_sent and quote is already sent", async () => {
    const enquiry = baseEnquiry("quotation_sent", { quotationId: "Q-1" });
    let sentId: string | null = null;
    const sent = { ...draftQuotation(), status: "sent" as const, sentAt: "2026-01-02" };
    const result = await executeEnquirySendQuotation(enquiry, {
      transitionEnquiryStatus: async () => ({ ok: false }),
      transitionQuotationStatus: async (id, status) => {
        sentId = `${id}:${status}`;
        return { ok: true };
      },
      quotations: [sent],
    });
    expect(result.ok).toBe(false);
    expect(sentId).toBeNull();
  });
});
