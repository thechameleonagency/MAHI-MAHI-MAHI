import { describe, expect, it } from "vitest";
import { formatINR, formatINRCompact } from "@/lib/formatCurrency";

describe("formatINR", () => {
  it("formats with Indian grouping and rupee symbol", () => {
    expect(formatINR(1234567)).toBe("₹12,34,567");
    expect(formatINR(0)).toBe("₹0");
    expect(formatINR(-500)).toBe("-₹500");
  });
});

describe("formatINRCompact", () => {
  it("uses L / Cr suffixes for large amounts", () => {
    expect(formatINRCompact(150_000)).toContain("L");
    expect(formatINRCompact(12_000_000)).toContain("Cr");
  });
});
