import { describe, expect, it } from "vitest";
import {
  MIN_QUOTATION_WITHOUT_ENQUIRY_REASON_LENGTH,
  validateQuotationCreateSource,
} from "@/lib/quotationCreateSource";
import type { Enquiry } from "@/types/project";

const openEnquiry = (): Pick<Enquiry, "status"> => ({ status: "new" });
const lostEnquiry = (): Pick<Enquiry, "status"> => ({ status: "lost" });

describe("validateQuotationCreateSource", () => {
  it("requires enquiry or exception reason", () => {
    const r = validateQuotationCreateSource({}, null, "admin");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/enquiry|exception/i);
  });

  it("rejects both enquiry and exception reason", () => {
    const r = validateQuotationCreateSource(
      { enquiryId: "ENQ-1", withoutEnquiryReason: "repeat customer direct call" },
      openEnquiry(),
      "admin",
    );
    expect(r.ok).toBe(false);
  });

  it("accepts linked enquiry when gate allows", () => {
    const r = validateQuotationCreateSource({ enquiryId: "ENQ-1" }, openEnquiry(), "admin");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mode).toBe("enquiry");
      expect(r.enquiryId).toBe("ENQ-1");
    }
  });

  it("rejects terminal enquiry", () => {
    const r = validateQuotationCreateSource({ enquiryId: "ENQ-1" }, lostEnquiry(), "admin");
    expect(r.ok).toBe(false);
  });

  it("accepts exception with minimum reason length", () => {
    const reason = "x".repeat(MIN_QUOTATION_WITHOUT_ENQUIRY_REASON_LENGTH);
    const r = validateQuotationCreateSource({ withoutEnquiryReason: reason }, null, "admin");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mode).toBe("exception");
      expect(r.withoutEnquiryReason).toBe(reason);
    }
  });

  it("rejects short exception reason", () => {
    const r = validateQuotationCreateSource({ withoutEnquiryReason: "too short" }, null, "admin");
    expect(r.ok).toBe(false);
  });
});
