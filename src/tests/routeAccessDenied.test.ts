import { describe, expect, it } from "vitest";
import { normalizeDeniedPath, routeAccessDeniedToastContent } from "@/lib/routeAccessDenied";

describe("routeAccessDenied (M6)", () => {
  it("strips query and hash from denied paths", () => {
    expect(normalizeDeniedPath("/invoices?create=1")).toBe("/invoices");
    expect(normalizeDeniedPath("/audit/profit-loss#tab")).toBe("/audit/profit-loss");
  });

  it("includes role label and path in toast copy", () => {
    const msg = routeAccessDeniedToastContent("/audit", "salesperson");
    expect(msg.title).toMatch(/don't have access/i);
    expect(msg.description).toContain("/audit");
    expect(msg.description).toContain("Salesperson");
    expect(msg.description).toMatch(/dashboard/i);
  });
});
