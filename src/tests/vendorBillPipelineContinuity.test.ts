import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import { applySeedHydrationPipeline } from "@/data/seed/seedHydration";
import {
  findStaleVendorBillBooks,
  findVendorBillInventoryDrift,
} from "@/lib/vendorBillPipelineContinuity";
import { hasPurchaseBillBookedVoucher } from "@/lib/vendorBillVoucherPosting";

describe("vendorBillPipelineContinuity (FC4)", () => {
  it("hydrated seed has PurchaseBillBooked for every bookable vendor bill", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applySeedHydrationPipeline(state);
    expect(findStaleVendorBillBooks(hydrated)).toEqual([]);
    const bookable = hydrated.vendorBills.filter((b) => b.status !== "draft");
    expect(bookable.length).toBeGreaterThan(0);
    for (const bill of bookable) {
      expect(hasPurchaseBillBookedVoucher(hydrated.accountingVouchers, bill.id)).toBe(true);
    }
  });

  it("narrative overdue vendor bill is booked and linked to inventory", () => {
    const { state } = buildBusinessSeed("smoke");
    const overdue = state.vendorBills.find((b) => b.billNumber === "VB-2026-OVERDUE");
    expect(overdue).toBeTruthy();
    expect(hasPurchaseBillBookedVoucher(state.accountingVouchers, overdue!.id)).toBe(true);
    expect(overdue!.items[0]?.inventoryItemId).toBeTruthy();
    expect(findVendorBillInventoryDrift(state)).toEqual([]);
  });

  it("hydration repairs bills missing GL rows", () => {
    const { state } = buildBusinessSeed("smoke");
    const bookable = state.vendorBills.find((b) => b.status !== "draft");
    expect(bookable).toBeTruthy();
    const stripped = {
      ...state,
      accountingVouchers: state.accountingVouchers.filter(
        (v) => v.sourceDocumentId !== bookable!.id,
      ),
    };
    const hydrated = applyAppStateHydrationPipeline(stripped);
    expect(findStaleVendorBillBooks(hydrated)).toEqual([]);
  });
});
