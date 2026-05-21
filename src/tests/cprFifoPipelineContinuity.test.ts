import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import { applySeedHydrationPipeline } from "@/data/seed/seedHydration";
import { findStaleCprFifoVoidedAllocations } from "@/lib/cprFifoPipelineContinuity";
import { getInvoiceOpenBalance } from "@/lib/billingSelectors";

describe("cprFifoPipelineContinuity (FC6)", () => {
  it("hydrated seed has no FIFO allocation on voided or draft invoices", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applySeedHydrationPipeline(state);
    expect(findStaleCprFifoVoidedAllocations(hydrated)).toEqual([]);
    const voided = hydrated.invoices.find((i) => i.status === "voided");
    if (voided) {
      expect(voided.amountReceived ?? 0).toBe(0);
      expect(getInvoiceOpenBalance(voided, hydrated.payments)).toBe(0);
    }
  });

  it("hydration repairs voided invoice that incorrectly received CPR FIFO", () => {
    const { state } = buildBusinessSeed("smoke");
    const voided = state.invoices.find((i) => i.status === "voided");
    if (!voided) return;
    const broken = {
      ...state,
      invoices: state.invoices.map((inv) =>
        inv.id === voided.id ? { ...inv, amountReceived: 50000 } : inv,
      ),
    };
    const hydrated = applyAppStateHydrationPipeline(broken);
    expect(findStaleCprFifoVoidedAllocations(hydrated)).toEqual([]);
    expect(hydrated.invoices.find((i) => i.id === voided.id)?.amountReceived).toBe(0);
  });
});
