import { describe, expect, it } from "vitest";
import {
  LIFECYCLE_TERMINOLOGY,
  getLifecycleTerm,
  lifecycleTermSummary,
  type LifecycleTermId,
} from "@/lib/lifecycleTerminology";

const TERM_IDS: LifecycleTermId[] = [
  "quotationWithdraw",
  "quotationReject",
  "quotationWithoutEnquiryException",
  "quotationWithdrawVsReject",
  "quotationQuotedTotal",
  "quotationClientAgreedAmount",
];

describe("lifecycleTerminology", () => {
  it("defines all quotation lifecycle glossary entries", () => {
    expect(Object.keys(LIFECYCLE_TERMINOLOGY).sort()).toEqual([...TERM_IDS].sort());
  });

  it("keeps withdraw and reject copy distinct", () => {
    const withdraw = getLifecycleTerm("quotationWithdraw");
    const reject = getLifecycleTerm("quotationReject");
    expect(withdraw.summary).not.toBe(reject.summary);
    expect(withdraw.detail.toLowerCase()).toContain("retract");
    expect(reject.detail.toLowerCase()).toMatch(/declin|lost/);
  });

  it("exposes concise summaries for banners", () => {
    for (const id of TERM_IDS) {
      const summary = lifecycleTermSummary(id);
      expect(summary.length).toBeGreaterThan(20);
      expect(summary.length).toBeLessThan(160);
      expect(getLifecycleTerm(id).detail.length).toBeGreaterThan(60);
    }
  });

  it("compare term mentions both withdraw and reject", () => {
    const compare = getLifecycleTerm("quotationWithdrawVsReject");
    expect(compare.summary.toLowerCase()).toContain("withdraw");
    expect(compare.summary.toLowerCase()).toContain("reject");
  });
});
