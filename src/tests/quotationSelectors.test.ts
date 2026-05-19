import { describe, expect, it } from "vitest";
import { isQuotationConverted, quotationLinkedProjectId } from "@/lib/quotationSelectors";
import type { Quotation } from "@/types/project";

const base = {
  id: "Q1",
  quotationNumber: "Q-001",
  clientName: "Test",
} as Quotation;

describe("quotationSelectors", () => {
  it("quotationLinkedProjectId prefers linkedProjectId", () => {
    expect(
      quotationLinkedProjectId({
        ...base,
        linkedProjectId: "PROJ-A",
        convertedToProjectId: "PROJ-B",
      }),
    ).toBe("PROJ-A");
  });

  it("quotationLinkedProjectId falls back to convertedToProjectId", () => {
    expect(
      quotationLinkedProjectId({
        ...base,
        convertedToProjectId: "PROJ-B",
      }),
    ).toBe("PROJ-B");
  });

  it("isQuotationConverted when status or link present", () => {
    expect(isQuotationConverted({ ...base, status: "converted_to_project" })).toBe(true);
    expect(isQuotationConverted({ ...base, linkedProjectId: "P1" })).toBe(true);
    expect(isQuotationConverted({ ...base, status: "draft" })).toBe(false);
  });
});
