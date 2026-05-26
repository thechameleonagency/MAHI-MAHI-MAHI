import { describe, expect, it } from "vitest";
import {
  countEnquiriesHiddenByOpenFilter,
  DEFAULT_ENQUIRY_STATUS_FILTER,
  filterEnquiriesForList,
  getEnquiryListFilterKey,
  isOnlyDefaultOpenStatusFilters,
  matchesEnquiryStatusFilterIds,
} from "@/lib/enquiryListFilters";
import type { Enquiry, Quotation } from "@/types/project";

const base = (overrides: Partial<Enquiry> = {}): Enquiry =>
  ({
    id: "ENQ-1",
    customerName: "Acme",
    customerPhone: "999",
    status: "new",
    priority: "medium",
    source: "phone",
    createdAt: "2026-01-01",
    ...overrides,
  }) as Enquiry;

const draftQuote = (): Quotation =>
  ({
    id: "Q-1",
    quotationNumber: "Q-001",
    status: "draft",
    enquiryId: "ENQ-1",
    clientName: "Acme",
    createdAt: "2026-01-01",
    presetSnapshot: [{ id: "l1", name: "Panel", quantity: 1, unitPrice: 1 }],
  }) as Quotation;

describe("enquiryListFilters", () => {
  it("default open filter excludes converted and lost", () => {
    const rows = [
      base({ id: "E1", status: "new" }),
      base({ id: "E2", status: "converted" }),
      base({ id: "E3", status: "lost" }),
    ];
    const filtered = filterEnquiriesForList(rows, { statusFilterIds: [DEFAULT_ENQUIRY_STATUS_FILTER] });
    expect(filtered.map((e) => e.id)).toEqual(["E1"]);
    expect(countEnquiriesHiddenByOpenFilter(rows)).toBe(2);
  });

  it("multi-select status filters use OR semantics", () => {
    const rows = [
      base({ id: "E1", status: "new" }),
      base({ id: "E2", status: "converted" }),
      base({ id: "E3", status: "meeting_scheduled" }),
    ];
    const filtered = filterEnquiriesForList(rows, {
      statusFilterIds: ["new", "meeting_scheduled"],
    });
    expect(filtered.map((e) => e.id).sort()).toEqual(["E1", "E3"]);
  });

  it("multi-select priority filters use OR semantics", () => {
    const rows = [
      base({ id: "E1", priority: "high" }),
      base({ id: "E2", priority: "low" }),
      base({ id: "E3", priority: "medium" }),
    ];
    const filtered = filterEnquiriesForList(rows, {
      statusFilterIds: ["all"],
      priorityFilterIds: ["high", "low"],
    });
    expect(filtered.map((e) => e.id).sort()).toEqual(["E1", "E2"]);
  });

  it("quotation_draft filter matches display bucket", () => {
    const rows = [base({ id: "E1", status: "new", quotationId: "Q-1" })];
    const quotes = [draftQuote()];
    expect(getEnquiryListFilterKey(rows[0], quotes)).toBe("quotation_draft");
    expect(matchesEnquiryStatusFilterIds(rows[0], ["quotation_draft"], quotes)).toBe(true);
    expect(matchesEnquiryStatusFilterIds(rows[0], ["new"], quotes)).toBe(false);
  });

  it("detects default open-only filter set", () => {
    expect(isOnlyDefaultOpenStatusFilters(["open"], [])).toBe(true);
    expect(isOnlyDefaultOpenStatusFilters([], [])).toBe(true);
    expect(isOnlyDefaultOpenStatusFilters(["open", "new"], [])).toBe(false);
    expect(isOnlyDefaultOpenStatusFilters(["open"], ["high"])).toBe(false);
  });

  it("empty statusFilterIds applies open pipeline default", () => {
    const rows = [
      base({ id: "E1", status: "new" }),
      base({ id: "E2", status: "converted" }),
    ];
    expect(filterEnquiriesForList(rows, { statusFilterIds: [] }).map((e) => e.id)).toEqual(["E1"]);
  });
});
