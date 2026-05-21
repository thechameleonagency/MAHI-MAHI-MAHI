import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import {
  findStaleVendorBillInventoryReceipt,
  reconcileVendorBillInventoryReceipt,
  vendorBillWarehouseReceiptIsPending,
} from "@/lib/vendorBillInventoryLinkage";
import type { VendorBill } from "@/types/inventory";

describe("vendorBillInventoryLinkage (ER6)", () => {
  it("legacy bills without warehouseReceiptApplied are not stale", () => {
    const bill: VendorBill = {
      id: "VB-1",
      vendorId: "V-1",
      billNumber: "B-1",
      billDate: "2026-05-01",
      items: [{ description: "Panel", quantity: 2, rate: 100, amount: 200, inventoryItemId: "INV-1" }],
      total: 236,
      amountPaid: 0,
      status: "pending",
    };
    expect(vendorBillWarehouseReceiptIsPending(bill)).toBe(false);
  });

  it("reconcile applies receipt only when explicitly pending", () => {
    const state = {
      vendorBills: [
        {
          id: "VB-PEND",
          vendorId: "V-1",
          billNumber: "PEND-1",
          billDate: "2026-05-01",
          items: [{ description: "Cable", quantity: 5, rate: 10, amount: 50, inventoryItemId: "INV-C" }],
          total: 59,
          amountPaid: 0,
          status: "pending",
          warehouseReceiptApplied: false,
        },
      ],
      inventoryItems: [
        {
          id: "INV-C",
          name: "DC Cable",
          category: "cable",
          stock: 10,
          unit: "m",
          value: 0,
          buyPrice: 10,
          salePrice: 12,
          hsn: "8544",
          minStock: 1,
        },
      ],
    } as import("@/contexts/AppDataContext").AppState;

    const next = reconcileVendorBillInventoryReceipt(state);
    expect(next.inventoryItems[0].stock).toBe(15);
    expect(next.vendorBills[0].warehouseReceiptApplied).toBe(true);
    expect(findStaleVendorBillInventoryReceipt(next)).toEqual([]);
  });

  it("hydrated smoke seed has no pending warehouse receipts", () => {
    const { state: seeded } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(seeded);
    expect(findStaleVendorBillInventoryReceipt(hydrated)).toEqual([]);
  });
});
