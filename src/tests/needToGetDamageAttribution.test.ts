import { describe, expect, it } from "vitest";
import { NeedToGetService, aggregateNeedToGetRows } from "@/application/services/NeedToGetService";
import {
  attributeDamageToShortfall,
  buildDamageQtyIndex,
} from "@/lib/needToGetDamageAttribution";
import type { InventoryItem, Project, SiteRecord } from "@/types/project";
import type { MaterialDamage } from "@/types/operations";

describe("needToGetDamageAttribution", () => {
  it("flags shortfall widened by damage write-off", () => {
    expect(
      attributeDamageToShortfall({
        requiredQty: 10,
        effectiveStock: 3,
        totalDamageQty: 4,
        projectDamageQty: 4,
      }),
    ).toEqual({ shortfallIncludesDamage: true, damageQtyAttributed: 4 });
  });

  it("does not flag when there is no damage on the SKU", () => {
    expect(
      attributeDamageToShortfall({
        requiredQty: 10,
        effectiveStock: 3,
        totalDamageQty: 0,
        projectDamageQty: 0,
      }),
    ).toEqual({ shortfallIncludesDamage: false, damageQtyAttributed: 0 });
  });

  it("buildDamageQtyIndex totals item and project scopes", () => {
    const index = buildDamageQtyIndex([
      { id: "D1", itemId: "99", qty: 3, stage: "storage", projectId: "P1", reportedAt: "2026-01-01" },
      { id: "D2", itemId: "99", qty: 2, stage: "transport", reportedAt: "2026-01-02" },
    ]);
    expect(index.totalByItem.get("99")).toBe(5);
    expect(index.projectByItem.get("99")?.get("P1")).toBe(3);
  });
});

describe("NeedToGetService damage chip data", () => {
  it("annotates checklist shortfall rows affected by damage", () => {
    const inventory: InventoryItem[] = [
      {
        id: 99,
        name: "Panel",
        category: "Panel/Module",
        stock: 2,
        unit: "pcs",
        value: 0,
        buyPrice: 1000,
        salePrice: 1200,
        hsn: "8541",
        minStock: 0,
      },
    ];
    const sites: SiteRecord[] = [
      {
        id: "SITE-1",
        name: "Site A",
        projectId: "P1",
        projectName: "Proj",
        status: "active",
        workStartDate: "2026-06-01",
        checklistItems: [
          {
            id: "CL-1",
            materialName: "Panel",
            requiresMaterial: true,
            inventoryItemId: 99,
            requiredQuantity: 10,
            status: "pending",
          },
        ],
      },
    ];
    const projects: Project[] = [
      {
        id: "P1",
        name: "Proj",
        type: "EPC",
        projectType: "Residential",
        projectCategory: "solar",
        ownerType: "solo",
        progressStage: "work-in-progress",
        client: "C",
        capacity: "5kW",
        location: "Jaipur",
        assignees: [],
        onSite: 0,
        contractAmount: 1,
        totalCost: 1,
        amountReceived: 0,
        photos: 0,
        startDate: "2026-06-01",
        endDate: null,
        createdAt: "2026-01-01",
        customerId: "C1",
        lifecycleStatus: "Active",
        executionPhase: "execution",
        status: "Ongoing",
      },
    ];
    const damage: MaterialDamage[] = [
      {
        id: "DMG-1",
        itemId: 99,
        qty: 5,
        stage: "installation",
        projectId: "P1",
        reportedAt: "2026-05-20",
      },
    ];

    const svc = new NeedToGetService();
    const rows = svc.buildRows(sites, projects, inventory, [], [], damage);
    const row = rows.find((r) => r.materialId === "99");
    expect(row?.qtyShort).toBe(8);
    expect(row?.shortfallIncludesDamage).toBe(true);
    expect(row?.damageQtyAttributed).toBe(5);
  });

  it("aggregateNeedToGetRows preserves damage flags when merging", () => {
    const rows = [
      {
        projectId: "P1",
        projectName: "A",
        siteId: "S1",
        siteName: "Site 1",
        materialId: "M1",
        materialName: "Panel",
        qtyShort: 3,
        needByDate: "2026-06-01",
        lastPurchaseRate: 100,
        shortfallIncludesDamage: true,
        damageQtyAttributed: 2,
      },
      {
        projectId: "P1",
        projectName: "A",
        siteId: "S2",
        siteName: "Site 2",
        materialId: "M1",
        materialName: "Panel",
        qtyShort: 4,
        needByDate: "2026-06-01",
        lastPurchaseRate: 100,
      },
    ];
    const merged = aggregateNeedToGetRows(rows, "project", (r) => r.siteName);
    expect(merged[0].shortfallIncludesDamage).toBe(true);
    expect(merged[0].damageQtyAttributed).toBe(2);
  });
});
