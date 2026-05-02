import { seedInventoryItems, seedTools, seedVendorBills, seedVendorPayments } from "./seedData";
import type { VendorBill, VendorPayment } from "@/types/inventory";

export const dummyInventoryItems = seedInventoryItems;
export const dummyTools = seedTools;
export const dummyVendorBills = seedVendorBills;
export const dummyVendorPayments = seedVendorPayments;

export type { VendorBill, VendorPayment };
