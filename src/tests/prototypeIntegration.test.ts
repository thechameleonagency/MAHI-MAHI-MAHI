import { describe, expect, it } from "vitest";
import { dummySites, dummyProjects } from "@/data/dummyData";
import { dummyInventoryItems, dummyVendorBills } from "@/data/inventoryData";
import { initialOperationalBlockages, initialProjectTimelineByProjectId } from "@/data/activeSitesSeed";
import { findUnknownChecklistInventoryIds } from "@/lib/siteChecklist";
import { NeedToGetService } from "@/application/services/NeedToGetService";

describe("prototype MSS integration", () => {
  it("validates seeded site checklist inventory IDs against catalog", () => {
    const combined = dummySites.flatMap((s) => s.checklistItems ?? []);
    const unknown = findUnknownChecklistInventoryIds(combined, dummyInventoryItems);
    expect(unknown).toEqual([]);
  });

  it("Need-to-Get derives at least one shortfall row from seeded active sites", () => {
    const svc = new NeedToGetService();
    const rows = svc.buildRows(dummySites, dummyProjects, dummyInventoryItems, dummyVendorBills, []);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("Active Sites operational seed references existing projects", () => {
    const ids = new Set(dummyProjects.map((p) => p.id));
    const missing = initialOperationalBlockages.filter((b) => !ids.has(b.projectId));
    expect(missing).toEqual([]);
    for (const pid of Object.keys(initialProjectTimelineByProjectId)) {
      expect(ids.has(pid)).toBe(true);
    }
  });
});
