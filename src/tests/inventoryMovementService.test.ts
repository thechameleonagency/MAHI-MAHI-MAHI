import { describe, expect, it } from "vitest";
import { InventoryMovementService } from "@/application/services/InventoryMovementService";

describe("InventoryMovementService", () => {
  const service = new InventoryMovementService();

  it("issues material to site when warehouse has stock", () => {
    const result = service.applyMovement(
      {
        warehouseQty: 100,
        siteLedger: { materialId: 1, openingQty: 0, issuedQty: 0, returnedQty: 0, scrapAtSiteQty: 0, consumedQty: 0 },
      },
      "IssueToSite",
      20,
    );
    expect(result.ok).toBe(true);
    expect(result.nextState?.warehouseQty).toBe(80);
  });

  it("blocks negative site ledger without override", () => {
    const result = service.applyMovement(
      {
        warehouseQty: 100,
        siteLedger: { materialId: 1, openingQty: 0, issuedQty: 5, returnedQty: 0, scrapAtSiteQty: 0, consumedQty: 0 },
      },
      "ConsumptionAtSite",
      10,
    );
    expect(result.ok).toBe(false);
  });
});
