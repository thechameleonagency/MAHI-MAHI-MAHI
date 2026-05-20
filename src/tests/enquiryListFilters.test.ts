import { describe, expect, it } from "vitest";
import {
  countEnquiriesHiddenByOpenFilter,
  DEFAULT_ENQUIRY_STATUS_FILTER,
  filterEnquiriesForList,
  isEnquiryOpenPipelineFilterActive,
} from "@/lib/enquiryListFilters";
import type { Enquiry } from "@/types/project";

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

describe("enquiryListFilters", () => {
  it("default open filter excludes converted and lost", () => {
    const rows = [
      base({ id: "E1", status: "new" }),
      base({ id: "E2", status: "converted" }),
      base({ id: "E3", status: "lost" }),
    ];
    const filtered = filterEnquiriesForList(rows, { statusFilter: DEFAULT_ENQUIRY_STATUS_FILTER });
    expect(filtered.map((e) => e.id)).toEqual(["E1"]);
    expect(countEnquiriesHiddenByOpenFilter(rows)).toBe(2);
  });

  it("all status includes converted when not archived", () => {
    const rows = [base({ status: "converted" })];
    const filtered = filterEnquiriesForList(rows, { statusFilter: "all" });
    expect(filtered).toHaveLength(1);
  });

  it("detects active open pipeline filter", () => {
    expect(isEnquiryOpenPipelineFilterActive("open")).toBe(true);
    expect(isEnquiryOpenPipelineFilterActive("all")).toBe(false);
  });
});
