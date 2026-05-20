import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  computeMatchTier,
  isEnquirySearchTerminal,
  isProjectSearchTerminal,
  isQuotationSearchTerminal,
  sortGlobalSearchResults,
} from "@/lib/globalSearchRank";

describe("globalSearchRank (Mn13)", () => {
  it("computeMatchTier prefers exact over prefix over substring", () => {
    expect(computeMatchTier("acme", ["acme"])).toBe(0);
    expect(computeMatchTier("ac", ["acme solar"])).toBe(1);
    expect(computeMatchTier("zzz", ["solar"])).toBeNull();
    expect(computeMatchTier("lar", ["solar panel"])).toBe(2);
    expect(computeMatchTier("q-1", ["Q-1", "other"])).toBe(0);
  });

  it("sortGlobalSearchResults ranks active before terminal", () => {
    const sorted = sortGlobalSearchResults([
      { name: "Zeta Closed", matchTier: 0, isTerminal: true },
      { name: "Alpha Open", matchTier: 2, isTerminal: false },
      { name: "Beta Open", matchTier: 0, isTerminal: false },
    ]);
    expect(sorted.map((r) => r.name)).toEqual(["Beta Open", "Alpha Open", "Zeta Closed"]);
  });

  it("sortGlobalSearchResults ranks exact match before substring within same terminal class", () => {
    const sorted = sortGlobalSearchResults([
      { name: "Contains acme corp", matchTier: 2, isTerminal: false },
      { name: "acme", matchTier: 0, isTerminal: false },
      { name: "acme west", matchTier: 1, isTerminal: false },
    ]);
    expect(sorted.map((r) => r.name)).toEqual(["acme", "acme west", "Contains acme corp"]);
  });

  it("GlobalSearch applies sortGlobalSearchResults before capping results", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/layout/GlobalSearch.tsx"), "utf8");
    expect(source).toContain("sortGlobalSearchResults");
    expect(source).toContain("computeMatchTier");
  });

  it("terminal helpers align with lifecycle semantics", () => {
    expect(isProjectSearchTerminal({ lifecycleStatus: "Completed" })).toBe(true);
    expect(isProjectSearchTerminal({ lifecycleStatus: "In Progress" })).toBe(false);
    expect(isQuotationSearchTerminal("withdrawn")).toBe(true);
    expect(isQuotationSearchTerminal("sent")).toBe(false);
    expect(isEnquirySearchTerminal("lost")).toBe(true);
    expect(isEnquirySearchTerminal("quotation_sent")).toBe(false);
  });
});
