import type { BankReconciliationLink } from "@/types/finance";

export type VendorBillStatus = "draft" | "approved" | "disputed" | "pending" | "partial" | "paid";

export interface VendorBill {
  id: string;
  vendorId: string;
  vendorName?: string;
  billNumber: string;
  billDate: string;
  dueDate?: string;
  projectId?: string;
  projectName?: string;
  items: { description: string; name?: string; quantity: number; rate: number; amount: number; inventoryItemId?: string }[];
  subtotal?: number;
  gst?: number;
  total: number;
  amountPaid: number;
  status: VendorBillStatus;
  notes?: string;
  /** Purchase order / LPO reference (prototype). No draft-PO workflow until a first-class PO model exists — use this field only. */
  purchaseOrderRef?: string;
  /** Local blob URL or data URL from uploaded bill document (prototype). */
  documentUrl?: string;
  documentFileName?: string;
  /**
   * ER6 — warehouse PurchaseIn applied for this bill's inventory lines.
   * `false` = booked but receipt pending (hydrate will repair); `undefined` = legacy (do not re-apply).
   */
  warehouseReceiptApplied?: boolean;
}

export interface VendorPayment {
  id: string;
  vendorId: string;
  vendorName?: string;
  billId?: string;
  billNumber?: string;
  date: string;
  amount: number;
  paymentMode?: string;
  reference?: string;
  notes?: string;
  /** E6 — when vendor payment settles a loan EMI. */
  loanId?: string;
  loanRepaymentId?: string;
  /** E9 — bank/cash statement line this vendor payment was matched against. */
  reconciledWith?: BankReconciliationLink;
}
