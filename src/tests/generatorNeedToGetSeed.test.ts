import { describe, expect, it } from "vitest";
import { NeedToGetService } from "@/application/services/NeedToGetService";
import { projectSiteChecklistToSiteChecklistItems } from "@/lib/siteChecklistNeedToGetSync";
import type { InventoryItem, Project, ProjectSiteChecklistItem, SiteRecord } from "@/types/project";

/** Mirrors autonomous generator: low stock SKUs + high planned BOQ qty. */
function showcaseChecklistFixture(): {
  inventory: InventoryItem[];
  siteChecklist: ProjectSiteChecklistItem[];
} {
  const inventory: InventoryItem[] = [0, 1, 2].map((idx) => ({
    id: `INV-SKU-${idx}`,
    name: `Module SKU ${idx + 1}`,
    category: "Module",
    stock: 2 + (idx % 2),
    unit: "pcs",
    value: 1000,
    buyPrice: 4000,
    salePrice: 5000,
    hsn: "8541",
    minStock: 5,
  })) as InventoryItem[];

  const siteChecklist: ProjectSiteChecklistItem[] = inventory.map((item, i) => ({
    id: `CL-${i}`,
    name: item.name,
    category: item.category,
    unit: "pcs",
    qtyPlanned: 20 + i * 4,
    qtySent: 0,
    qtyReturned: 0,
    qtyConsumed: 0,
    unitPrice: item.buyPrice,
    source: "template" as const,
  }));

  return { inventory, siteChecklist };
}

describe("generator Need-to-Get seed shape", () => {
  it("active site checklist with low stock produces procurement shortfalls", () => {
    const { inventory, siteChecklist } = showcaseChecklistFixture();
    const checklistItems = projectSiteChecklistToSiteChecklistItems(siteChecklist, inventory);
    const sites: SiteRecord[] = [
      {
        id: "1001",
        name: "Main Site",
        projectId: "PRJ-ACTIVE",
        projectName: "Demo Active",
        status: "active",
        workStartDate: "2026-06-15",
        checklistItems,
      } as SiteRecord,
    ];
    const projects: Project[] = [
      {
        id: "PRJ-ACTIVE",
        name: "Demo Active",
        lifecycleStatus: "In Progress",
        status: "In Progress",
        startDate: "2026-06-01",
        client: "Client",
        contractAmount: 100000,
        siteChecklist,
      } as Project,
    ];

    const rows = new NeedToGetService().buildRows(sites, projects, inventory, [], [], []);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.qtyShort > 0)).toBe(true);
  });
});
