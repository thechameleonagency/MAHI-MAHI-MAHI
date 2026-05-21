import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAllNarratives } from "@/data/seed/narratives/index";
import { buildEmptyAppState } from "@/data/appSeedBuilder";

describe("seedNarratives", () => {
  it("applyAllNarratives runs all narrative patches on full seed without error", () => {
    const { state } = buildBusinessSeed("full");
    expect(state.enquiries.length).toBeGreaterThan(0);
    expect(state.invoices.length).toBeGreaterThan(0);
  });

  it("applyAllNarratives no-ops safely when collections are empty", () => {
    const state = buildEmptyAppState();
    expect(() => applyAllNarratives(state)).not.toThrow();
  });

  it("includes key narrative outcomes after full build", () => {
    const { state } = buildBusinessSeed("full");
    const billing = [...state.invoices, ...state.saleBills];
    expect(state.enquiries.some((e) => e.notes.some((n) => n.note.toLowerCase().includes("reopened")))).toBe(true);
    expect(state.enquiries.some((e) => (e.shareHistory?.length ?? 0) > 0)).toBe(true);
    expect(billing.some((i) => ["overdue", "overpaid", "voided", "partial"].includes(i.status))).toBe(true);
    expect(state.blockages.some((b) => b.status === "active")).toBe(true);
    expect(state.vendorBills.some((b) => b.status === "disputed")).toBe(true);
    expect(state.projectChangeRequests.some((c) => c.status === "approved")).toBe(true);
    expect(state.projectChangeRequests.some((c) => c.status === "rejected")).toBe(true);
    expect(state.tasks.some((t) => t.delayHistory?.length)).toBe(true);
  });
});
