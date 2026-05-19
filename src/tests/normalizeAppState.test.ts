import { describe, expect, it } from "vitest";
import { buildEmptyAppState, normalizeAppState } from "@/data/appSeedBuilder";
import { deriveBusinessAlertDescriptors } from "@/lib/businessAlerts";
import type { AppState } from "@/contexts/AppDataContext";

describe("normalizeAppState", () => {
  it("fills missing collections from empty baseline", () => {
    const partial = {
      projects: [{ id: "P1", name: "Test" }],
      customers: [],
    } as unknown as Partial<AppState>;

    const normalized = normalizeAppState(partial);
    expect(normalized.projects).toHaveLength(1);
    expect(normalized.blockages).toEqual([]);
    expect(normalized.loanRepayments).toEqual([]);
    expect(normalized.procurementNeedLines).toEqual([]);
    expect(normalized.projectTimelineByProjectId).toEqual({});
  });

  it("returns empty baseline for null input", () => {
    const normalized = normalizeAppState(null);
    expect(normalized).toEqual(buildEmptyAppState());
  });

  it("allows deriveBusinessAlertDescriptors without throw when blockages missing on raw partial", () => {
    const partial = {
      invoices: [],
      loans: [],
      quotations: [],
      projects: [],
      projectTimelineByProjectId: {},
      vendorBills: [],
    } as unknown as Partial<AppState>;

    const normalized = normalizeAppState(partial);
    expect(() =>
      deriveBusinessAlertDescriptors({
        invoices: normalized.invoices,
        loans: normalized.loans,
        lowStockItems: [],
        blockages: normalized.blockages,
        quotations: normalized.quotations,
        projects: normalized.projects,
        projectTimelineByProjectId: normalized.projectTimelineByProjectId,
        vendorBills: normalized.vendorBills,
        vendorNamesById: new Map(),
      }),
    ).not.toThrow();
  });
});
