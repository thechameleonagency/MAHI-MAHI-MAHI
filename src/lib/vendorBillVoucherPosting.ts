import {
  VoucherPostingService,
  type AccountingEventType,
  type PostingResult,
} from "@/application/services/VoucherPostingService";
import type { AppState } from "@/contexts/AppDataContext";
import type { AccountingReviewQueueItem, AccountingVoucher } from "@/types/finance";
import type { VendorBill, VendorBillStatus } from "@/types/inventory";

const PURCHASE_BILL_EVENT: AccountingEventType = "PurchaseBillBooked";
const PURCHASE_BILL_ADJUST_EVENT: AccountingEventType = "PurchaseBillAdjusted";

const VENDOR_BILL_GL_EVENTS: readonly AccountingEventType[] = [
  PURCHASE_BILL_EVENT,
  PURCHASE_BILL_ADJUST_EVENT,
];

/** Bills that should hit AP / purchases (non-draft). */
export function isVendorBillBookable(status: VendorBillStatus): boolean {
  return status !== "draft";
}

/** Open vendor AP rows (matches Vendor detail payable queue — excludes draft). */
export function isVendorBillOpenPayable(status: VendorBillStatus): boolean {
  return isVendorBillBookable(status) && status !== "paid";
}

export function getVendorBillOpenBalance(
  bill: Pick<VendorBill, "total" | "amountPaid">,
): number {
  return Math.max(0, bill.total - (bill.amountPaid ?? 0));
}

/** Total outstanding AP across bookable, non-paid vendor bills. */
export function sumVendorOpenPayables(vendorBills: VendorBill[]): number {
  return vendorBills
    .filter((b) => isVendorBillOpenPayable(b.status))
    .reduce((s, b) => s + getVendorBillOpenBalance(b), 0);
}

/** Sum bookable vendor bills in period (COGS / input GST — same set as PurchaseBillBooked). */
export function sumBookableVendorBillsInPeriod(
  vendorBills: VendorBill[],
  inPeriod: (dateStr: string) => boolean,
  amount: (bill: VendorBill) => number = (b) => b.total,
): number {
  return vendorBills
    .filter((b) => isVendorBillBookable(b.status) && inPeriod(b.billDate))
    .reduce((s, b) => s + amount(b), 0);
}

/** Whether a purchase bill is already represented in the books (initial booking). */
export function hasPurchaseBillBookedVoucher(
  vouchers: AccountingVoucher[],
  billId: string,
): boolean {
  return vouchers.some(
    (v) => v.sourceDocumentId === billId && v.sourceEvent === PURCHASE_BILL_EVENT,
  );
}

/** Book AP + purchases when a vendor bill is operational (non-draft). */
export function postVendorBillVoucher(
  bill: Pick<VendorBill, "id" | "status" | "total" | "gst">,
  voucherService: VoucherPostingService = new VoucherPostingService(),
): PostingResult | null {
  if (!isVendorBillBookable(bill.status)) {
    return null;
  }
  return voucherService.post({
    type: PURCHASE_BILL_EVENT,
    sourceDocumentId: bill.id,
    amount: bill.total,
    gstAmount: bill.gst ?? 0,
  });
}

/** Post AP/purchases delta when an already-booked bill total changes (MD7). */
export function postVendorBillAdjustmentVoucher(
  billId: string,
  deltaAmount: number,
  voucherService: VoucherPostingService = new VoucherPostingService(),
): PostingResult | null {
  if (deltaAmount === 0) return null;
  return voucherService.post({
    type: PURCHASE_BILL_ADJUST_EVENT,
    sourceDocumentId: billId,
    amount: deltaAmount,
    gstAmount: 0,
  });
}

export function vendorBillBooksAmountChanged(before: VendorBill, after: VendorBill): boolean {
  return before.total !== after.total || (before.gst ?? 0) !== (after.gst ?? 0);
}

export type VendorBillInventoryDelta = { itemId: string; deltaQty: number };

/** Per inventory line qty change between bill versions (for warehouse movements). */
export function vendorBillInventoryLineDeltas(
  before: VendorBill,
  after: VendorBill,
): VendorBillInventoryDelta[] {
  const sumQty = (items: VendorBill["items"]) => {
    const m = new Map<string, number>();
    for (const line of items ?? []) {
      const id = line.inventoryItemId;
      const qty = Number(line.quantity);
      if (!id || !Number.isFinite(qty)) continue;
      m.set(id, (m.get(id) ?? 0) + qty);
    }
    return m;
  };

  const beforeMap = sumQty(before.items);
  const afterMap = sumQty(after.items);
  const ids = new Set([...beforeMap.keys(), ...afterMap.keys()]);
  const deltas: VendorBillInventoryDelta[] = [];
  for (const itemId of ids) {
    const deltaQty = (afterMap.get(itemId) ?? 0) - (beforeMap.get(itemId) ?? 0);
    if (deltaQty !== 0) deltas.push({ itemId, deltaQty });
  }
  return deltas;
}

export function vendorBillUpdateAffectsBooks(updates: Partial<VendorBill>): boolean {
  const keys = Object.keys(updates);
  if (keys.length === 0) return false;
  const bookKeys = new Set(["total", "gst", "subtotal", "items", "status"]);
  return keys.some((k) => bookKeys.has(k));
}

export function vendorBillUpdateIsDocumentOnly(updates: Partial<VendorBill>): boolean {
  const keys = Object.keys(updates);
  return keys.length > 0 && keys.every((k) => k === "documentUrl" || k === "documentFileName");
}

export type VendorBillAccountingUpdatePlan = {
  /** Remove all GL rows for this bill (e.g. revert to draft). */
  stripExisting: boolean;
  postings: PostingResult[];
  inventoryDeltas: VendorBillInventoryDelta[];
};

/**
 * Derive voucher postings + inventory deltas for a vendor bill update (MD7).
 */
export function planVendorBillAccountingUpdate(
  ctx: {
    vouchers: AccountingVoucher[];
    before: VendorBill;
    after: VendorBill;
  },
  voucherService: VoucherPostingService = new VoucherPostingService(),
): VendorBillAccountingUpdatePlan {
  const { before, after } = ctx;
  const wasBookable = isVendorBillBookable(before.status);
  const willBookable = isVendorBillBookable(after.status);
  const hasBooked = hasPurchaseBillBookedVoucher(ctx.vouchers, after.id);
  const postings: PostingResult[] = [];

  if (wasBookable && !willBookable) {
    return {
      stripExisting: true,
      postings: [],
      inventoryDeltas: vendorBillInventoryLineDeltas(before, after),
    };
  }

  if (!wasBookable && willBookable && !hasBooked) {
    const initial = postVendorBillVoucher(after, voucherService);
    if (initial) postings.push(initial);
  } else if (wasBookable && willBookable) {
    if (!hasBooked) {
      const initial = postVendorBillVoucher(after, voucherService);
      if (initial) postings.push(initial);
    } else if (vendorBillBooksAmountChanged(before, after)) {
      const delta = after.total - before.total;
      const adjustment = postVendorBillAdjustmentVoucher(after.id, delta, voucherService);
      if (adjustment) postings.push(adjustment);
    }
  }

  return {
    stripExisting: false,
    postings,
    inventoryDeltas: vendorBillInventoryLineDeltas(before, after),
  };
}

function makeHydrationReviewItem(
  bill: VendorBill,
  reason: string,
): AccountingReviewQueueItem {
  return {
    id: `ARQ-VB-${bill.id}`,
    reason,
    eventType: PURCHASE_BILL_EVENT,
    sourceDocumentId: bill.id,
    projectId: bill.projectId,
    amount: bill.total,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Backfill missing PurchaseBillBooked vouchers for persisted/seed vendor bills
 * (e.g. bills created before UI posted to GL).
 */
export function reconcileVendorBillVouchers(state: AppState): AppState {
  const voucherService = new VoucherPostingService();
  let accountingVouchers = [...state.accountingVouchers];
  let accountingReviewQueue = [...state.accountingReviewQueue];
  let changed = false;

  for (const bill of state.vendorBills) {
    if (!isVendorBillBookable(bill.status)) continue;
    if (hasPurchaseBillBookedVoucher(accountingVouchers, bill.id)) continue;
    if (accountingReviewQueue.some((q) => q.sourceDocumentId === bill.id && q.eventType === PURCHASE_BILL_EVENT)) {
      continue;
    }

    const postingResult = postVendorBillVoucher(bill, voucherService);
    if (!postingResult) continue;

    changed = true;
    if (postingResult.ok) {
      accountingVouchers = [postingResult.voucher, ...accountingVouchers];
    } else {
      const { reason } = postingResult.reviewQueueItem;
      accountingReviewQueue = [makeHydrationReviewItem(bill, reason), ...accountingReviewQueue];
    }
  }

  if (!changed) {
    return state;
  }

  return { ...state, accountingVouchers, accountingReviewQueue };
}

/** Remove GL artifacts when a vendor bill is deleted or reverted to draft. */
export function stripVendorBillAccounting(
  state: Pick<AppState, "accountingVouchers" | "accountingReviewQueue">,
  billId: string,
): Pick<AppState, "accountingVouchers" | "accountingReviewQueue"> {
  return {
    accountingVouchers: state.accountingVouchers.filter(
      (v) =>
        !(
          v.sourceDocumentId === billId &&
          (VENDOR_BILL_GL_EVENTS as readonly string[]).includes(v.sourceEvent)
        ),
    ),
    accountingReviewQueue: state.accountingReviewQueue.filter((q) => q.sourceDocumentId !== billId),
  };
}
