import { describe, expect, it } from "vitest";
import {
  NeedToGetService,
  aggregateNeedToGetRows,
  type NeedToGetRow,
} from "@/application/services/NeedToGetService";

describe("NeedToGetService partial row safety", () => {
  it("buildRows sort does not throw when projectName or needByDate are missing", () => {
    const svc = new NeedToGetService();
    const rows = svc.buildRows([], [], [], [], [], []);
    expect(() =>
      rows.sort(
        (a, b) =>
          (a.needByDate ?? "").localeCompare(b.needByDate ?? "") ||
          (a.projectName ?? "").localeCompare(b.projectName ?? ""),
      ),
    ).not.toThrow();
  });

  it("aggregateNeedToGetRows tolerates undefined display fields when sorting merged rows", () => {
    const partial = (overrides: Partial<NeedToGetRow>): NeedToGetRow => ({
      projectId: "P-1",
      projectName: undefined as unknown as string,
      siteId: "S-1",
      siteName: undefined as unknown as string,
      materialId: "M-1",
      materialName: undefined as unknown as string,
      qtyShort: 1,
      needByDate: undefined as unknown as string,
      lastPurchaseRate: 0,
      ...overrides,
    });

    const rows: NeedToGetRow[] = [
      partial({ materialId: "M-1", qtyShort: 2 }),
      partial({ materialId: "M-1", qtyShort: 3, projectId: "P-2" }),
    ];

    expect(() => aggregateNeedToGetRows(rows, "project", (r) => r.siteName ?? "—")).not.toThrow();
    const merged = aggregateNeedToGetRows(rows, "project", (r) => `${r.projectName ?? ""} · ${r.siteName ?? ""}`);
    expect(merged.length).toBeGreaterThan(0);
    expect(() =>
      merged.sort(
        (a, b) =>
          (a.displayWhere ?? "").localeCompare(b.displayWhere ?? "") ||
          (a.materialName ?? "").localeCompare(b.materialName ?? ""),
      ),
    ).not.toThrow();
  });
});
