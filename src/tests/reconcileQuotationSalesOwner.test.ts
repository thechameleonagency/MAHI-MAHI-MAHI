import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import {
  findStaleQuotationSalesOwners,
  reconcileQuotationSalesOwners,
} from "@/lib/reconcileQuotationSalesOwner";
import type { Enquiry, Quotation } from "@/types/project";

describe("reconcileQuotationSalesOwner (V5)", () => {
  it("backfills salesOwnerMemberId from enquiry assignee", () => {
    const enquiries: Enquiry[] = [
      {
        id: "E-1",
        assignedToMemberId: "SAL-001",
        assignedTo: "Priya Nair",
        customerName: "A",
        customerPhone: "1",
        customerEmail: "a@b.com",
        customerAddress: "x",
        customerType: "individual",
        systemCapacity: "5 kW",
        estimatedBudget: 1000,
        requirements: "",
        status: "new",
        source: "phone",
        priority: "low",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
        notes: [],
      },
    ];
    const quotations: Quotation[] = [
      {
        id: "Q-1",
        quotationNumber: "Q-1",
        status: "draft",
        quotationType: "solar",
        enquiryId: "E-1",
        clientName: "A",
        clientPhone: "1",
        clientEmail: "a@b.com",
        clientCity: "Pune",
        clientState: "MH",
        paymentType: "cash",
        totalAmount: 1000,
        createdAt: "2026-01-01",
      },
    ];
    const next = reconcileQuotationSalesOwners(quotations, enquiries);
    expect(next[0]?.salesOwnerMemberId).toBe("SAL-001");
  });

  it("hydrated smoke seed has no stale quotation sales owners", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect(findStaleQuotationSalesOwners(hydrated)).toEqual([]);
    const withEnquiry = hydrated.quotations.filter((q) => q.enquiryId);
    expect(withEnquiry.length).toBeGreaterThan(0);
    expect(withEnquiry.every((q) => q.salesOwnerMemberId?.trim())).toBe(true);
  });
});
