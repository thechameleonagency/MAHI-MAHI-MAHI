import { describe, expect, it } from "vitest";
import { assertCanLinkNewQuotationToEnquiry, enquiryAllowsNewQuotation } from "@/lib/enquiryQuotationCreateGate";
import type { Enquiry } from "@/types/project";

const base = (status: Enquiry["status"]): Pick<Enquiry, "status"> => ({ status });

describe("enquiryQuotationCreateGate", () => {
  it("blocks converted and lost enquiries", () => {
    expect(assertCanLinkNewQuotationToEnquiry(base("converted"), "admin").ok).toBe(false);
    expect(assertCanLinkNewQuotationToEnquiry(base("lost"), "sales").ok).toBe(false);
    expect(enquiryAllowsNewQuotation(base("lost"))).toBe(false);
  });

  it("allows quotation_rejected and new enquiries", () => {
    expect(assertCanLinkNewQuotationToEnquiry(base("quotation_rejected"), "sales").ok).toBe(true);
    expect(assertCanLinkNewQuotationToEnquiry(base("new"), "sales").ok).toBe(true);
  });
});
