import { describe, expect, it } from "vitest";
import { computeGstSplit } from "@/lib/gstCalculator";

describe("gstCalculator", () => {
  it("splits CGST+SGST for same state", () => {
    const r = computeGstSplit({
      subtotal: 10000,
      gstRatePercent: 12,
      companyStateCode: "08",
      counterpartyStateCode: "08",
    });
    expect(r.cgst).toBe(600);
    expect(r.sgst).toBe(600);
    expect(r.igst).toBe(0);
    expect(r.total).toBe(11200);
  });

  it("uses IGST for different states", () => {
    const r = computeGstSplit({
      subtotal: 10000,
      gstRatePercent: 12,
      companyStateCode: "08",
      counterpartyStateCode: "27",
    });
    expect(r.igst).toBe(1200);
    expect(r.cgst).toBe(0);
    expect(r.total).toBe(11200);
  });
});
