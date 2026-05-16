export type VendorBillStatus = "draft" | "approved" | "disputed" | "pending" | "partial" | "paid";

export interface VendorBill {
  id: string;
  vendorId: number;
  vendorName?: string;
  billNumber: string;
  billDate: string;
  dueDate?: string;
  projectId?: string;
  projectName?: string;
  items: { description: string; name?: string; quantity: number; rate: number; amount: number; inventoryItemId?: number }[];
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
}

export interface VendorPayment {
  id: string;
  vendorId: number;
  vendorName?: string;
  billId?: string;
  billNumber?: string;
  date: string;
  amount: number;
  paymentMode?: string;
  reference?: string;
  notes?: string;
}
