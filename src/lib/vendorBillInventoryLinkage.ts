import type { AppState } from "@/contexts/AppDataContext";
import { isVendorBillBookable } from "@/lib/vendorBillVoucherPosting";
import type { InventoryItem } from "@/types/project";
import type { VendorBill } from "@/types/inventory";

export type VendorBillInventoryLine = { itemId: string; qty: number };

export function vendorBillInventoryReceiptLines(bill: VendorBill): VendorBillInventoryLine[] {
  const lines: VendorBillInventoryLine[] = [];
  for (const line of bill.items ?? []) {
    const itemId = line.inventoryItemId;
    const qty = Number(line.quantity);
    if (!itemId || !Number.isFinite(qty) || qty <= 0) continue;
    lines.push({ itemId, qty });
  }
  return lines;
}

export function vendorBillNeedsWarehouseReceipt(bill: VendorBill): boolean {
  return isVendorBillBookable(bill.status) && vendorBillInventoryReceiptLines(bill).length > 0;
}

/** Explicit false = bill booked but warehouse PurchaseIn not yet applied (ER6). Undefined = legacy, treated as applied. */
export function vendorBillWarehouseReceiptIsPending(bill: VendorBill): boolean {
  return vendorBillNeedsWarehouseReceipt(bill) && bill.warehouseReceiptApplied === false;
}

function applyReceiptToInventoryItems(
  inventoryItems: InventoryItem[],
  bill: VendorBill,
  lines: VendorBillInventoryLine[],
): InventoryItem[] {
  const next = [...inventoryItems];
  for (const { itemId, qty } of lines) {
    const idx = next.findIndex((i) => i.id === itemId);
    if (idx < 0) continue;
    const item = next[idx];
    next[idx] = {
      ...item,
      stock: (item.stock ?? 0) + qty,
      movementHistory: [
        ...(item.movementHistory ?? []),
        {
          id: `MOV-VB-${bill.id}-${itemId}`,
          type: "purchase",
          qty,
          date: bill.billDate,
          notes: `Vendor bill ${bill.billNumber} (${bill.id})`,
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }
  return next;
}

/**
 * Hydration repair: apply warehouse receipt for bookable bills explicitly marked pending.
 * Does not touch legacy bills (warehouseReceiptApplied undefined).
 */
export function reconcileVendorBillInventoryReceipt(state: AppState): AppState {
  let inventoryItems = state.inventoryItems;
  let vendorBills = state.vendorBills;
  let changed = false;

  for (const bill of state.vendorBills) {
    if (!vendorBillWarehouseReceiptIsPending(bill)) continue;
    const lines = vendorBillInventoryReceiptLines(bill);
    inventoryItems = applyReceiptToInventoryItems(inventoryItems, bill, lines);
    vendorBills = vendorBills.map((b) =>
      b.id === bill.id ? { ...b, warehouseReceiptApplied: true } : b,
    );
    changed = true;
  }

  if (!changed) return state;
  return { ...state, inventoryItems, vendorBills };
}

export type StaleVendorBillInventoryReceipt = {
  vendorBillId: string;
  billNumber: string;
  reason: "warehouse_receipt_pending";
};

export function findStaleVendorBillInventoryReceipt(state: AppState): StaleVendorBillInventoryReceipt[] {
  const stale: StaleVendorBillInventoryReceipt[] = [];
  for (const bill of state.vendorBills) {
    if (!vendorBillWarehouseReceiptIsPending(bill)) continue;
    stale.push({
      vendorBillId: bill.id,
      billNumber: bill.billNumber,
      reason: "warehouse_receipt_pending",
    });
  }
  return stale;
}
