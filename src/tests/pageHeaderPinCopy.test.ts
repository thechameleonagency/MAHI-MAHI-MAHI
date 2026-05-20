import { describe, expect, it } from "vitest";
import {
  PAGE_HEADER_PIN_HELP,
  pageHeaderPinAriaLabel,
  pageHeaderPinTooltip,
} from "@/lib/pageHeaderPinCopy";

describe("pageHeaderPinCopy", () => {
  it("uses short tooltip strings", () => {
    expect(pageHeaderPinTooltip(true)).toBe("Unpin header");
    expect(pageHeaderPinTooltip(false)).toBe("Pin header to top");
    expect(pageHeaderPinTooltip(true).length).toBeLessThan(40);
  });

  it("keeps verbose guidance in help copy only", () => {
    expect(PAGE_HEADER_PIN_HELP).toContain("pinned");
    expect(PAGE_HEADER_PIN_HELP.length).toBeGreaterThan(80);
    expect(pageHeaderPinAriaLabel(false)).toMatch(/pin/i);
  });
});
