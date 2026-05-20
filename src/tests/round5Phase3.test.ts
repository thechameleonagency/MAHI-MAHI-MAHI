import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getProjectIdleAging,
  getQuotationNoResponseAging,
  getQuotationInFlightAging,
  getInvoiceOverdueAging,
  getEnquiryFollowUpAging,
  isProjectCompleted,
  isProjectOpen,
} from "@/lib/agingHelpers";
import type { Project, Quotation, Enquiry } from "@/types/project";
import type { Invoice, Customer } from "@/types/finance";
import { buildQuotationCloneDraft } from "@/lib/createFromContext";
import { getCustomerKind, isCustomerArchived } from "@/lib/selectors";

describe("round5 Phase 3 — aging helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("classifies completed vs open projects", () => {
    expect(isProjectCompleted({ lifecycleStatus: "Completed" } as Project)).toBe(true);
    expect(isProjectOpen({ lifecycleStatus: "In Progress", status: "Ongoing" } as Project)).toBe(true);
  });

  it("flags idle projects after 3+ days", () => {
    const signal = getProjectIdleAging(
      { startDate: "2026-05-07" } as Project,
    );
    expect(signal?.label).toBe("Idle 10d");
  });

  it("flags sent quotations with no response", () => {
    const sent = new Date("2026-05-12T12:00:00");
    const q = {
      status: "sent",
      sentAt: sent.toISOString(),
      createdAt: sent.toISOString(),
    } as Quotation;
    expect(getQuotationNoResponseAging(q)?.label).toMatch(/No response 5d/);
    const draft = {
      status: "draft",
      createdAt: "2026-04-01",
      updatedAt: "2026-04-01",
    } as Quotation;
    expect(getQuotationInFlightAging(draft)?.label).toMatch(/Draft/);
  });

  it("flags overdue invoices", () => {
    const inv = {
      status: "pending",
      dueDate: "2026-05-14",
      total: 1000,
    } as Invoice;
    expect(getInvoiceOverdueAging(inv)?.label).toBe("Overdue 3d");
  });

  it("flags enquiry follow-up overdue", () => {
    const e = {
      status: "new",
      followUpDate: "2026-05-15",
    } as Enquiry;
    expect(getEnquiryFollowUpAging(e)?.label).toBe("Follow-up 2d late");
  });

  it("clone quotation draft copies client fields without id", () => {
    const draft = buildQuotationCloneDraft({
      id: "Q-1",
      quotationNumber: "Q-2026-001",
      clientName: "Acme",
      clientPhone: "9000000000",
      status: "approved",
      paymentType: "cash",
      quotationType: "solar",
      totalAmount: 100000,
      createdAt: "2026-05-01",
    } as import("@/types/project").Quotation);
    expect(draft.clientName).toBe("Acme");
    expect(draft.sourceQuotationNumber).toBe("Q-2026-001");
    expect((draft as { id?: string }).id).toBeUndefined();
  });

  it("customer kind and archive selectors", () => {
    expect(getCustomerKind({ customerKind: "inventory" } as Customer)).toBe("inventory");
    expect(isCustomerArchived({ archivedAt: "2026-01-01" } as Customer)).toBe(true);
  });
});
