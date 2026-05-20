import { describe, expect, it } from "vitest";
import {
  aggregateNeedToGetRows,
  formatNeedToGetMergeSummary,
  summarizeNeedToGetMerge,
  type NeedToGetRow,
} from "@/application/services/NeedToGetService";

const baseRow = (overrides: Partial<NeedToGetRow>): NeedToGetRow => ({
  projectId: "P1",
  projectName: "Alpha",
  siteId: "S1",
  siteName: "Site A",
  materialId: "M1",
  materialName: "Panel",
  qtyShort: 2,
  needByDate: "2026-06-01",
  lastPurchaseRate: 100,
  ...overrides,
});

const locationLabel = (r: NeedToGetRow) => `${r.projectName} · ${r.siteName}`;

describe("NeedToGet aggregation", () => {
  it("merges duplicate material across sites within a project", () => {
    const rows = [
      baseRow({ siteId: "S1", siteName: "Site A", qtyShort: 2 }),
      baseRow({ siteId: "S2", siteName: "Site B", qtyShort: 3 }),
    ];
    const merged = aggregateNeedToGetRows(rows, "project", locationLabel);
    expect(merged).toHaveLength(1);
    expect(merged[0].qtyShort).toBe(5);
    expect(merged[0].mergedCount).toBe(2);
  });

  it("summarizeNeedToGetMerge reports lines combined away", () => {
    const rows = [
      baseRow({ siteId: "S1", qtyShort: 1 }),
      baseRow({ siteId: "S2", qtyShort: 1 }),
      baseRow({ materialId: "M2", materialName: "Cable", qtyShort: 1 }),
    ];
    const merged = aggregateNeedToGetRows(rows, "project", locationLabel);
    const stats = summarizeNeedToGetMerge(rows.length, merged);
    expect(stats.rawLineCount).toBe(3);
    expect(stats.mergedRowCount).toBe(2);
    expect(stats.linesMergedAway).toBe(1);
    expect(formatNeedToGetMergeSummary(stats, "project")).toContain("3 shortfall lines → 2 rows");
  });

  it("flat mode keeps one row per site+material+need-by", () => {
    const rows = [
      baseRow({ siteId: "S1", qtyShort: 2 }),
      baseRow({ siteId: "S2", qtyShort: 3 }),
    ];
    const merged = aggregateNeedToGetRows(rows, "flat", locationLabel);
    expect(merged).toHaveLength(2);
    const stats = summarizeNeedToGetMerge(rows.length, merged);
    expect(stats.linesMergedAway).toBe(0);
  });
});
