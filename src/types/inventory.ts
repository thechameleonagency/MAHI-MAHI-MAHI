export interface VendorBill {
  id: string;
  vendorId: number;
  vendorName?: string;
  billNumber: string;
  billDate: string;
  dueDate?: string;
  date?: string;
  projectId?: string;
  projectName?: string;
  items: { description: string; name?: string; quantity: number; rate: number; amount: number; inventoryItemId?: number }[];
  subtotal?: number;
  gst?: number;
  total: number;
  totalAmount?: number;
  amountPaid: number;
  status: "pending" | "partial" | "paid";
  notes?: string;
}

export interface VendorPayment {
  id: string;
  vendorId: number;
  vendorName?: string;
  billId?: string;
  billNumber?: string;
  date: string;
  amount: number;
  mode?: "cash" | "bank" | "upi";
  paymentMode?: string;
  reference?: string;
  notes?: string;
}
