import { describe, expect, it } from "vitest";
import { NeedToGetService } from "@/application/services/NeedToGetService";
import type { InventoryItem, Project, SiteRecord } from "@/types/project";

const inventory: InventoryItem[] = [
  {
    id: 99,
    name: "Test Panel",
    category: "Panel/Module",
    stock: 0,
    unit: "pcs",
    value: 0,
    buyPrice: 1000,
    salePrice: 1200,
    hsn: "8541",
    minStock: 0,
  },
];

describe("NeedToGetService need-by dates", () => {
  it("BOQ shortfalls use site workStartDate minus lead days, not today", () => {
    const svc = new NeedToGetService();
    const sites: SiteRecord[] = [
      {
        id: "SITE-1",
        name: "Rooftop A",
        projectId: "P-BOQ",
        projectName: "BOQ Project",
        status: "active",
        workStartDate: "2026-05-20",
        checklistItems: [],
      },
    ];
    const projects: Project[] = [
      {
        id: "P-BOQ",
        name: "BOQ Project",
        type: "EPC",
        projectType: "Residential",
        projectCategory: "solar",
        ownerType: "solo",
        progressStage: "work-in-progress",
        client: "Client",
        capacity: "5 kW",
        location: "Jaipur",
        assignees: [],
        onSite: 0,
        contractAmount: 100000,
        totalCost: 50000,
        amountReceived: 0,
        photos: 0,
        startDate: "2026-06-01",
        endDate: null,
        createdAt: "2026-01-01",
        customerId: "C-1",
        lifecycleStatus: "In Progress",
        executionPhase: "execution",
        status: "Ongoing",
        executionLineItems: [
          {
            id: "EX-1",
            inventoryItemId: 99,
            description: "Test Panel",
            quantity: 10,
            issuedQty: 2,
            unit: "pcs",
          },
        ],
      },
    ];

    const rows = svc.buildRows(sites, projects, inventory, [], []);
    const boqRow = rows.find((r) => r.projectId === "P-BOQ" && r.materialId === "99");
    expect(boqRow).toBeDefined();
    expect(boqRow?.needByDate).toBe("2026-05-19");
    expect(boqRow?.needByDate).not.toBe("2026-05-20");
  });

  it("site checklist and BOQ rows share the same need-by when schedules match", () => {
    const svc = new NeedToGetService();
    const sites: SiteRecord[] = [
      {
        id: "SITE-2",
        name: "Rooftop B",
        projectId: "P-MIX",
        projectName: "Mixed",
        status: "active",
        workStartDate: "2026-05-15",
        checklistItems: [
          {
            id: "CL-1",
            materialName: "Test Panel",
            requiresMaterial: true,
            inventoryItemId: 99,
            requiredQuantity: 5,
            status: "pending",
          },
        ],
      },
    ];
    const projects: Project[] = [
      {
        id: "P-MIX",
        name: "Mixed",
        type: "EPC",
        projectType: "Residential",
        projectCategory: "solar",
        ownerType: "solo",
        progressStage: "work-in-progress",
        client: "Client",
        capacity: "5 kW",
        location: "Jaipur",
        assignees: [],
        onSite: 0,
        contractAmount: 100000,
        totalCost: 50000,
        amountReceived: 0,
        photos: 0,
        startDate: "2026-06-10",
        endDate: null,
        createdAt: "2026-01-01",
        customerId: "C-1",
        lifecycleStatus: "In Progress",
        executionPhase: "execution",
        status: "Ongoing",
        executionLineItems: [
          {
            id: "EX-2",
            inventoryItemId: 99,
            description: "Test Panel",
            quantity: 8,
            issuedQty: 0,
            unit: "pcs",
          },
        ],
      },
    ];

    const rows = svc.buildRows(sites, projects, inventory, [], []);
    const checklist = rows.find((r) => r.siteId === "SITE-2" && r.rowKind === "material");
    const boq = rows.find((r) => r.projectId === "P-MIX" && r.materialId === "99" && r.siteId === "SITE-2");
    expect(checklist?.needByDate).toBe("2026-05-14");
    expect(boq?.needByDate).toBe("2026-05-14");
  });
});
