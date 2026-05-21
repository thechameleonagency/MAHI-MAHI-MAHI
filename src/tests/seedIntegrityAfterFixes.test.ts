import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import { projectBillingDrift } from "@/lib/billingSelectors";
import { getOutstandingReceivables } from "@/domain/finance/financialSemantics";
import { computeLedgerTotals } from "@/lib/audit/ledgerTotals";
import { getCashRevenue } from "@/lib/billingSelectors";

const DRIFT_EPS = 1;

describe("seed & hydration integrity after audit fixes", () => {
  it("full business seed passes verifySeedState", () => {
    const { verification } = buildBusinessSeed("full");
    if (!verification.ok) {
      console.error("Seed errors:", verification.errors);
    }
    expect(verification.ok, verification.errors.join("; ")).toBe(true);
  });

  it("hydrated projects: amountInvoiced and amountReceived match derived totals", () => {
    const { state: seeded } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(seeded);

    const invoicedDrifts: string[] = [];
    const receivedDrifts: string[] = [];
    for (const project of hydrated.projects) {
      const drift = projectBillingDrift(
        project,
        hydrated.invoices,
        hydrated.payments,
        hydrated.expenses,
        hydrated.saleBills,
        hydrated.incomes,
      );
      if (drift.amountInvoicedDrift > DRIFT_EPS) {
        invoicedDrifts.push(`${project.id}:${drift.amountInvoicedDrift}`);
      }
      if (drift.amountReceivedDrift > DRIFT_EPS) {
        receivedDrifts.push(`${project.id}:${drift.amountReceivedDrift}`);
      }
    }

    expect(invoicedDrifts, `amountInvoiced drift on ${invoicedDrifts.slice(0, 5).join(", ")}`).toEqual([]);
    expect(receivedDrifts, `amountReceived drift on ${receivedDrifts.slice(0, 5).join(", ")}`).toEqual([]);
  });

  it("buildBusinessSeed output already has reconciled amountReceived (pre second hydration pass)", () => {
    const { state } = buildBusinessSeed("smoke");
    const drifts = state.projects
      .map((p) => ({
        id: p.id,
        drift: projectBillingDrift(
          p,
          state.invoices,
          state.payments,
          state.expenses,
          state.saleBills,
          state.incomes,
        ).amountReceivedDrift,
      }))
      .filter((x) => x.drift > DRIFT_EPS);
    expect(drifts.map((d) => `${d.id}:${d.drift}`)).toEqual([]);
  });

  it("audit ledger receivables align with finance semantics after hydration", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    const ledger = computeLedgerTotals(
      {
        invoices: hydrated.invoices,
        saleBills: hydrated.saleBills,
        expenses: hydrated.expenses,
        vendorBills: hydrated.vendorBills,
        inventoryItems: hydrated.inventoryItems,
        payments: hydrated.payments,
      },
      () => true,
    );
    const expectedAr = getOutstandingReceivables(
      hydrated.invoices,
      hydrated.payments,
      hydrated.saleBills,
    );
    expect(Math.abs(ledger.receivablesOpen - expectedAr)).toBeLessThanOrEqual(DRIFT_EPS);
    const cashIn = getCashRevenue({ payments: hydrated.payments });
    expect(Math.abs(ledger.revenueCollected - cashIn)).toBeLessThanOrEqual(DRIFT_EPS);
  });

  it("no open enquiry remains when linked quotation is approved with customer", () => {
    const { state } = buildBusinessSeed("smoke");
    const mismatches = state.quotations
      .filter(
        (q) =>
          q.status === "approved" &&
          q.enquiryId &&
          q.customerId,
      )
      .map((q) => state.enquiries.find((e) => e.id === q.enquiryId))
      .filter(
        (e) =>
          e &&
          e.status !== "converted" &&
          e.status !== "lost" &&
          (e.status === "quotation_sent" || e.status === "meeting_scheduled"),
      );
    expect(mismatches.length).toBe(0);
  });

  it("command audit logs use display names not raw member ids", () => {
    const { state } = buildBusinessSeed("smoke");
    const bad = state.auditLogs.filter(
      (l) => l.userName === l.userId && /^[A-Z]{2,4}-\d{3}$/.test(l.userId),
    );
    expect(bad.length, `id-only userName rows: ${bad.slice(0, 3).map((b) => b.id).join(", ")}`).toBe(0);
  });
});
