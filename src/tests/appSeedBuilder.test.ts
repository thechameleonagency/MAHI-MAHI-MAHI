import { describe, expect, it } from "vitest";
import { buildEmptyAppState, buildSequencedAppSeed } from "@/data/appSeedBuilder";
import { SEED_LAYER_ORDER } from "@/data/seedLayerOrder";
import { isQuotationConverted } from "@/lib/quotationSelectors";

describe("appSeedBuilder", () => {
  it("buildEmptyAppState has zero business rows", () => {
    const s = buildEmptyAppState();
    expect(s.customers).toHaveLength(0);
    expect(s.projects).toHaveLength(0);
    expect(s.quotations).toHaveLength(0);
    expect(s.vendors).toHaveLength(0);
    expect(s.procurementNeedLines).toHaveLength(0);
  });

  it("buildSequencedAppSeed hydrates realistic linked data", () => {
    const s = buildSequencedAppSeed();
    expect(s.customers.length).toBeGreaterThan(10);
    expect(s.projects.length).toBeGreaterThan(10);
    expect(s.quotations.length).toBeGreaterThan(5);
    expect(s.vendorBills.length).toBeGreaterThan(0);
    expect(s.procurementNeedLines.length).toBeGreaterThan(0);
    expect(s.attendanceRecords.length).toBeGreaterThan(30);

    for (const p of s.projects) {
      expect(p.projectMode).toBeDefined();
    }

    const converted = s.quotations.filter((q) => isQuotationConverted(q));
    for (const q of converted) {
      expect(q.linkedProjectId?.trim()).toBeTruthy();
    }

    expect(SEED_LAYER_ORDER.length).toBeGreaterThan(0);
  });
});
