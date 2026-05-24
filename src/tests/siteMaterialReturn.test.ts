import { describe, expect, it } from "vitest";
import {
  getReturnableMaterialsForProject,
  validateReturnQuantityInput,
} from "@/lib/siteMaterialReturn";
import type { InventoryItem, Project } from "@/types/project";

describe("siteMaterialReturn", () => {
  it("lists materials with positive site ledger balance", () => {
    const project = {
      id: "P-1",
      siteMaterialLedger: [
        {
          itemId: "101",
          openingQty: 0,
          issuedQty: 20,
          returnedQty: 5,
          scrapAtSiteQty: 0,
          consumedQty: 0,
          updatedAt: "2026-01-01T00:00:00Z",
        },
        {
          itemId: "102",
          openingQty: 0,
          issuedQty: 10,
          returnedQty: 10,
          scrapAtSiteQty: 0,
          consumedQty: 0,
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ],
    } as Project;

    const inventory = [
      { id: 101, name: "Panel", unit: "pcs" },
      { id: 102, name: "Cable", unit: "m" },
    ] as InventoryItem[];

    const rows = getReturnableMaterialsForProject(project, inventory);
    expect(rows).toHaveLength(1);
    expect(rows[0].itemId).toBe("101");
    expect(rows[0].balance).toBe(15);
    expect(rows[0].itemName).toBe("Panel");
  });

  it("validateReturnQuantityInput rejects over-return and non-integer when required", () => {
    expect(validateReturnQuantityInput("16", 15, false)).toMatch(/Maximum returnable/);
    expect(validateReturnQuantityInput("1.5", 10, false)).toMatch(/Whole units only/);
    expect(validateReturnQuantityInput("2.5", 10, true)).toBeNull();
  });
});
