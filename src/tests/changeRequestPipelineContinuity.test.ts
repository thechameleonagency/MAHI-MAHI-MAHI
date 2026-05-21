import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import { applySeedHydrationPipeline } from "@/data/seed/seedHydration";
import { findStaleChangeRequestBilling } from "@/lib/changeRequestPipelineContinuity";

describe("changeRequestPipelineContinuity (FC3)", () => {
  it("hydrated business seed has no stale approved change-request billing", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applySeedHydrationPipeline(state);
    const stale = findStaleChangeRequestBilling(hydrated);
    expect(stale, JSON.stringify(stale.slice(0, 5))).toEqual([]);
  });

  it("subsidy-revision change request has invoice-targeted payment on hydrated seed (FC3)", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applySeedHydrationPipeline(state);
    const cr = hydrated.projectChangeRequests?.find(
      (r) => r.status === "approved" && r.notes?.includes("subsidy revision"),
    );
    expect(cr?.generatedInvoiceId).toBeTruthy();
    const invoice = hydrated.invoices.find((i) => i.id === cr?.generatedInvoiceId);
    expect(invoice?.status).not.toBe("draft");
    const payment = hydrated.payments.find((p) => p.invoiceId === cr?.generatedInvoiceId);
    expect(payment?.amount).toBeGreaterThan(0);
    expect((invoice?.amountReceived ?? 0)).toBeGreaterThan(0);
  });

  it("app hydration pipeline repairs placeholder invoice ids", () => {
    const { state } = buildBusinessSeed("smoke");
    const withPlaceholder = {
      ...state,
      projectChangeRequests: (state.projectChangeRequests ?? []).map((cr, i) =>
        i === 0 && cr.status === "approved"
          ? { ...cr, generatedInvoiceId: `INV-DRAFT-${cr.id}` }
          : cr,
      ),
    };
    const hydrated = applyAppStateHydrationPipeline(withPlaceholder);
    expect(findStaleChangeRequestBilling(hydrated)).toEqual([]);
  });
});
