import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import { findStaleProcurementNeedLines } from "@/lib/procurementNeedLineContinuity";
import type { ProcurementNeedLine } from "@/types/operations";

describe("procurementNeedLineContinuity (FC9)", () => {
  it("hydrated seed has consistent procurement need lines", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect(findStaleProcurementNeedLines(hydrated)).toEqual([]);
  });

  it("flags acquired lines without vendor bill", () => {
    const line: ProcurementNeedLine = {
      id: "PNL-1",
      lineKey: "P|S|M|2026-05-01",
      projectId: "P1",
      siteId: "S1",
      materialId: "M1",
      materialName: "Panel",
      qtyNeeded: 5,
      needByDate: "2026-05-01",
      lastPurchaseRate: 100,
      status: "acquired",
      acquiredAt: "2026-05-02",
    };
    const stale = findStaleProcurementNeedLines({
      procurementNeedLines: [line],
      projects: [{ id: "P1" } as import("@/types/project").Project],
      sites: [{ id: "S1", name: "Site", projectId: "P1" } as import("@/types/project").SiteRecord],
    } as import("@/contexts/AppDataContext").AppState);
    expect(stale).toEqual([{ lineKey: line.lineKey, reason: "acquired_without_vendor_bill" }]);
  });

  it("upsertProcurementNeedLine writes audit entries", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/contexts/AppDataContext.tsx"),
      "utf8",
    );
    expect(source).toMatch(
      /const upsertProcurementNeedLine = useCallback[\s\S]*?createAuditEntry\(\s*"create",\s*"ProcurementNeedLine"/,
    );
    expect(source).toMatch(
      /const updateProcurementNeedLine = useCallback[\s\S]*?auditFieldDiff\(\s*createAuditEntry,\s*"ProcurementNeedLine"/,
    );
  });
});
