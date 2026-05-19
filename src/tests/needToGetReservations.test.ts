import { describe, expect, it } from "vitest";
import { NeedToGetService } from "@/application/services/NeedToGetService";
import { dummySites, dummyProjects } from "@/data/dummyData";
import { dummyInventoryItems, dummyVendorBills } from "@/data/inventoryData";
import type { MaterialReservation } from "@/types/operations";

describe("NeedToGetService.buildRows with materialReservations", () => {
  it("reduces shortfall when stock is reserved for another project", () => {
    const svc = new NeedToGetService();
    const without = svc.buildRows(dummySites, dummyProjects, dummyInventoryItems, dummyVendorBills, []);
    const itemId = dummyInventoryItems[0]?.id;
    if (!itemId) return;

    const projectId = dummyProjects[0]?.id ?? "P-1";
    const reservations: MaterialReservation[] = [
      {
        id: "res-1",
        itemId: String(itemId),
        qty: 9999,
        projectId: "other-project",
        createdAt: "2026-05-01",
        source: "manual",
      },
    ];

    const withRes = svc.buildRows(
      dummySites,
      dummyProjects,
      dummyInventoryItems,
      dummyVendorBills,
      reservations,
    );

    const shortWithout = without
      .filter((r) => r.rowKind !== "nonMaterial" && String(r.materialId) === String(itemId))
      .reduce((s, r) => s + r.qtyShort, 0);
    const shortWith = withRes
      .filter((r) => r.rowKind !== "nonMaterial" && String(r.materialId) === String(itemId) && r.projectId === projectId)
      .reduce((s, r) => s + r.qtyShort, 0);

    expect(shortWith).toBeGreaterThanOrEqual(shortWithout);
  });
});
