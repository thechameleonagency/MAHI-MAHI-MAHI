import { describe, expect, it } from "vitest";
import { ProcurementShortfallService } from "@/application/services/ProcurementShortfallService";
import type { InventoryItem, Project, Quotation } from "@/types/project";
import type { SiteChecklistTemplate } from "@/types/templates";

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: "P-1",
  name: "Test Project",
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
  totalCost: 65000,
  amountReceived: 25000,
  photos: 0,
  startDate: "2026-05-12",
  endDate: null,
  createdAt: "2026-05-01",
  customerId: "C-1",
  lifecycleStatus: "Active",
  executionPhase: "execution",
  ...overrides,
});

describe("ProcurementShortfallService", () => {
  it("computes shortfall from quotation preset snapshot", () => {
    const service = new ProcurementShortfallService();
    const inventoryItems: InventoryItem[] = [
      {
        id: 1,
        name: "Solar Panel 550W",
        category: "Panel/Module",
        stock: 4,
        unit: "pcs",
        value: 1,
        buyPrice: 8500,
        salePrice: 9200,
        hsn: "8541",
        minStock: 2,
      },
    ];
    const project = makeProject({
      materialsSent: [{ itemId: 1, itemName: "Solar Panel 550W", quantity: 2, dateIssued: "2026-05-11", unitPrice: 8500 }],
    });
    const quotation: Quotation = {
      id: "Q-1",
      quotationNumber: "Q-2026-001",
      status: "converted_to_project",
      quotationType: "solar",
      clientName: "Client",
      clientPhone: "9999999999",
      clientEmail: "client@example.com",
      clientCity: "Jaipur",
      clientState: "Rajasthan",
      paymentType: "cash",
      totalAmount: 100000,
      createdAt: "2026-05-01",
      customerId: "C-1",
      isConverted: false,
      presetSnapshot: [{ id: 1, name: "Solar Panel 550W", quantity: 10, unit: "pcs", rate: 8500 }],
    };

    const shortfalls = service.buildShortfalls({
      projects: [project],
      inventoryItems,
      getProjectQuotation: () => quotation,
      getSiteChecklistTemplateById: () => undefined,
    });

    expect(shortfalls).toHaveLength(1);
    expect(shortfalls[0].shortfallQty).toBe(8);
    expect(shortfalls[0].needByDate).toBe("2026-05-11");
  });

  it("falls back to project site-checklist template when quotation snapshot is unavailable", () => {
    const service = new ProcurementShortfallService();
    const inventoryItems: InventoryItem[] = [
      {
        id: 5,
        name: "MC4 Connector Pair",
        category: "Wiring",
        stock: 50,
        unit: "pcs",
        value: 1,
        buyPrice: 35,
        salePrice: 55,
        hsn: "8536",
        minStock: 20,
      },
    ];
    const project = makeProject({ presetId: "PRE-1", materialsSent: [] });
    const preset: SiteChecklistTemplate = {
      id: "PRE-1",
      name: "Residential 5kW",
      segment: "residential",
      createdAt: "2026-05-01",
      items: [{ inventoryItemId: 5, name: "MC4 Connector Pair", quantity: 80, unit: "pcs" }],
    };

    const shortfalls = service.buildShortfalls({
      projects: [project],
      inventoryItems,
      getProjectQuotation: () => undefined,
      getSiteChecklistTemplateById: () => preset,
    });

    expect(shortfalls).toHaveLength(1);
    expect(shortfalls[0].shortfallQty).toBe(80);
    expect(shortfalls[0].lastPurchaseRate).toBe(35);
  });
});
