import type { Customer } from "@/types/finance";
import type { Enquiry } from "@/types/project";
import { findCustomerByIdentity } from "@/lib/customerMatching";
import { createNextCustomerId } from "@/lib/idFactory";

export type ResolveEnquiryCustomerResult = {
  customerId: string;
  customerCreated: boolean;
  customer?: Customer;
};

/** Build a Customer row from enquiry fields at conversion time. */
export function buildCustomerFromEnquiry(enquiry: Enquiry, customerId: string): Customer {
  return {
    id: customerId,
    name: enquiry.customerName.trim(),
    phone: enquiry.customerPhone?.trim() || "",
    email: enquiry.customerEmail?.trim() || "",
    address: enquiry.customerAddress?.trim() || "",
    type: enquiry.customerType,
    itemsBought: [],
    totalPurchases: 0,
    customerKind: "project",
    createdAt: new Date().toISOString().split("T")[0],
  };
}

/** Backfill missing billing fields on an existing customer from the enquiry. */
export function enrichCustomerFromEnquiry(customer: Customer, enquiry: Enquiry): Customer {
  const type =
    customer.type === "company" || enquiry.customerType === "company"
      ? "company"
      : customer.type ?? enquiry.customerType;
  return {
    ...customer,
    name: customer.name?.trim() || enquiry.customerName.trim(),
    phone: customer.phone?.trim() || enquiry.customerPhone?.trim() || "",
    email: customer.email?.trim() || enquiry.customerEmail?.trim() || "",
    address: customer.address?.trim() || enquiry.customerAddress?.trim() || "",
    type,
  };
}

function findCustomerByEnquiryEmail(
  customers: Customer[],
  enquiryEmail: string,
): Customer | undefined {
  const normalized = enquiryEmail.trim().toLowerCase();
  if (!normalized) return undefined;
  return customers.find((c) => (c.email || "").trim().toLowerCase() === normalized);
}

/**
 * Resolve or create the customer for an enquiry conversion.
 * Prefers linked customerId, then identity (name/phone), then email, then creates a new row.
 */
export function resolveCustomerForEnquiryConversion(
  enquiry: Enquiry,
  customers: Customer[],
): ResolveEnquiryCustomerResult {
  if (enquiry.customerId) {
    const linked = customers.find((c) => c.id === enquiry.customerId);
    if (linked) {
      return { customerId: linked.id, customerCreated: false };
    }
  }

  const byIdentity = findCustomerByIdentity(customers, {
    name: enquiry.customerName,
    phone: enquiry.customerPhone,
  });
  if (byIdentity) {
    return { customerId: byIdentity.id, customerCreated: false };
  }

  const enquiryEmail = enquiry.customerEmail?.trim();
  if (enquiryEmail) {
    const byEmail = findCustomerByEnquiryEmail(customers, enquiryEmail);
    if (byEmail) {
      return { customerId: byEmail.id, customerCreated: false };
    }
  }

  const customerId = createNextCustomerId(customers.map((c) => c.id));
  const customer = buildCustomerFromEnquiry(enquiry, customerId);
  return { customerId, customerCreated: true, customer };
}
