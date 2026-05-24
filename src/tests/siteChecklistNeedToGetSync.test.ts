import { describe, expect, it } from "vitest";
import {
  applyProjectSiteChecklistDispatch,
  applyProjectSiteChecklistMaterialMovement,
  findStaleSiteChecklistNeedToGetDrift,
  projectSiteChecklistToSiteChecklistItems,
  reconcileProjectsSiteChecklistFromDispatchedSites,
  reconcileProjectsSiteChecklistFromMaterialLedger,
  reconcileSiteChecklistNeedToGetState,
  syncSitesChecklistFromProjects,
} from "@/lib/siteChecklistNeedToGetSync";
import type { InventoryItem, Project, ProjectSiteChecklistItem, SiteRecord } from "@/types/project";

const inventory: InventoryItem[] = [
  {
    id: "INV-1",
    name: "Solar Panel 550W",
    category: "Module",
    unit: "pcs",
    stock: 100,
    buyPrice: 8500,
    sellPrice: 9500,
  } as InventoryItem,
];

const baseChecklist = (): ProjectSiteChecklistItem[] => [
  {
    id: "CL-1",
    name: "Solar Panel 550W",
    unit: "pcs",
    qtyPlanned: 10,
    qtySent: 0,
    qtyReturned: 0,
    qtyConsumed: 0,
  },
];

const baseProject = (overrides: Partial<Project> = {}): Project =>
  ({
    id: "P-1",
    name: "Test Project",
    lifecycleStatus: "Active",
    siteChecklist: baseChecklist(),
    ...overrides,
  }) as Project;

const baseSite = (checklistStatus: SiteRecord["checklistItems"][number]["status"]): SiteRecord =>
  ({
    id: 1,
    projectId: "P-1",
    status: "active",
    checklistItems: [
      {
        id: "CL-1",
        requiresMaterial: true,
        inventoryItemId: "INV-1",
        materialName: "Solar Panel 550W",
        requiredQuantity: 10,
        status: checklistStatus,
      },
    ],
  }) as SiteRecord;

describe("siteChecklistNeedToGetSync", () => {
  it("maps BOQ qtySent to site dispatched status", () => {
    const items = projectSiteChecklistToSiteChecklistItems(
      [{ ...baseChecklist()[0], qtySent: 10 }],
      inventory,
    );
    expect(items[0].status).toBe("dispatched");
  });

  it("applyProjectSiteChecklistMaterialMovement bumps qtySent on issue", () => {
    const next = applyProjectSiteChecklistMaterialMovement(
      baseChecklist(),
      inventory[0],
      "IssueToSite",
      4,
      "CL-1",
    );
    expect(next?.[0].qtySent).toBe(4);
  });

  it("applyProjectSiteChecklistDispatch marks BOQ line sent", () => {
    const project = applyProjectSiteChecklistDispatch(baseProject(), "CL-1", 10);
    expect(project.siteChecklist?.[0].qtySent).toBe(10);
  });

  it("syncSitesChecklistFromProjects aligns site execution lines with BOQ", () => {
    const project = baseProject({
      siteChecklist: [{ ...baseChecklist()[0], qtySent: 6 }],
    });
    const sites = syncSitesChecklistFromProjects([project], [baseSite("pending")], inventory, ["P-1"]);
    expect(sites[0].checklistItems?.[0].status).toBe("partially-dispatched");
  });

  it("reconcileProjectsSiteChecklistFromMaterialLedger repairs BOQ from ledger", () => {
    const project = baseProject({
      siteMaterialLedger: [
        {
          itemId: "INV-1",
          openingQty: 0,
          issuedQty: 8,
          returnedQty: 1,
          scrapAtSiteQty: 1,
          consumedQty: 2,
          updatedAt: "2026-05-01",
        },
      ],
    });
    const next = reconcileProjectsSiteChecklistFromMaterialLedger([project], inventory);
    expect(next[0].siteChecklist?.[0].qtySent).toBe(8);
    expect(next[0].siteChecklist?.[0].qtyReturned).toBe(1);
    expect(next[0].siteChecklist?.[0].qtyConsumed).toBe(3);
  });

  it("reconcileProjectsSiteChecklistFromDispatchedSites repairs legacy dispatch drift", () => {
    const project = baseProject();
    const site = baseSite("dispatched");
    const next = reconcileProjectsSiteChecklistFromDispatchedSites([project], [site]);
    expect(next[0].siteChecklist?.[0].qtySent).toBe(10);
  });

  it("reconcileSiteChecklistNeedToGetState clears drift on hydrate", () => {
    const project = baseProject();
    const site = baseSite("dispatched");
    const result = reconcileSiteChecklistNeedToGetState([project], [site], inventory);
    expect(result.projects[0].siteChecklist?.[0].qtySent).toBe(10);
    expect(findStaleSiteChecklistNeedToGetDrift(result.projects, result.sites, inventory)).toEqual([]);
  });

  it("findStaleSiteChecklistNeedToGetDrift flags mismatched site and BOQ", () => {
    const project = baseProject();
    const site = baseSite("dispatched");
    const stale = findStaleSiteChecklistNeedToGetDrift([project], [site], inventory);
    expect(stale).toEqual([{ siteId: "1", projectId: "P-1", reason: "checklist_drift" }]);
  });
});
