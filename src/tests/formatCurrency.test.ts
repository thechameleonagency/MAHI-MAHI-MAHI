import { describe, expect, it } from "vitest";
import { formatCurrency, formatINR, formatINRChartAxis, formatINRCompact } from "@/lib/formatCurrency";

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

describe("formatCurrency alias (DS1)", () => {
  it("matches formatINR for representative amounts", () => {
    expect(formatCurrency(1234567)).toBe(formatINR(1234567));
    expect(formatCurrency(0)).toBe("₹0");
    expect(formatCurrency(-500)).toBe("-₹500");
  });
});

describe("formatINRChartAxis", () => {
  it("uses compact suffix for thousands and full INR below", () => {
    expect(formatINRChartAxis(250_000)).toBe(formatINRCompact(250_000));
    expect(formatINRChartAxis(500)).toBe(formatINR(500));
  });
});
