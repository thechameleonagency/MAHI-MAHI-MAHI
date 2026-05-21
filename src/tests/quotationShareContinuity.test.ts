import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import {
  findStaleQuotationShareDetails,
  reconcileQuotationShareDetails,
} from "@/lib/quotationShareContinuity";

describe("quotationShareContinuity (ER7)", () => {
  it("hydrated smoke seed has canonical share details aligned with shareHistory", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect((hydrated.quotationShareDetails ?? []).length).toBeGreaterThan(0);
    expect(findStaleQuotationShareDetails(hydrated)).toEqual([]);
  });

  it("reconcile migrates inline shareHistory into quotationShareDetails", () => {
    const { state } = buildBusinessSeed("smoke");
    const q = state.quotations.find((x) => (x.shareHistory?.length ?? 0) > 0);
    expect(q).toBeTruthy();
    const broken = {
      ...state,
      quotationShareDetails: [],
    };
    const fixed = reconcileQuotationShareDetails(broken);
    expect((fixed.quotationShareDetails ?? []).length).toBeGreaterThan(0);
    expect(fixed.quotations.find((x) => x.id === q!.id)?.shareHistory?.length).toBe(
      q!.shareHistory?.length,
    );
    expect(findStaleQuotationShareDetails(fixed)).toEqual([]);
  });
});
