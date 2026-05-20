import { describe, expect, it } from "vitest";
import type { Customer } from "@/types/finance";
import type { Enquiry } from "@/types/project";
import {
  buildCustomerFromEnquiry,
  enrichCustomerFromEnquiry,
  resolveCustomerForEnquiryConversion,
} from "@/lib/convertEnquiryCustomer";

const baseEnquiry = (overrides: Partial<Enquiry> = {}): Enquiry => ({
  id: "ENQ-1",
  customerName: "Ravi Kumar",
  customerPhone: "9876543210",
  customerEmail: "ravi@example.com",
  customerAddress: "Hyderabad",
  customerType: "individual",
  source: "phone",
  systemCapacity: "5kW",
  estimatedBudget: 100000,
  requirements: "—",
  status: "quotation_sent",
  priority: "medium",
  assignedTo: "",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  notes: [],
  ...overrides,
});

describe("convertEnquiryCustomer", () => {
  it("creates a new customer when no match exists", () => {
    const resolved = resolveCustomerForEnquiryConversion(baseEnquiry(), []);
    expect(resolved.customerCreated).toBe(true);
    expect(resolved.customer?.name).toBe("Ravi Kumar");
    expect(resolved.customerId).toMatch(/^CUST-/);
  });

  it("reuses customer linked on enquiry", () => {
    const existing: Customer = {
      id: "CUST-0005",
      name: "Linked Co",
      phone: "9000000000",
      email: "",
      address: "",
      type: "individual",
      itemsBought: [],
      totalPurchases: 0,
      createdAt: "2026-01-01",
    };
    const resolved = resolveCustomerForEnquiryConversion(
      baseEnquiry({ customerId: "CUST-0005" }),
      [existing],
    );
    expect(resolved.customerCreated).toBe(false);
    expect(resolved.customerId).toBe("CUST-0005");
  });

  it("reuses customer matched by phone identity", () => {
    const existing: Customer = {
      id: "CUST-0010",
      name: "Different Label",
      phone: "+91 98765 43210",
      email: "",
      address: "",
      type: "individual",
      itemsBought: [],
      totalPurchases: 0,
      createdAt: "2026-01-01",
    };
    const resolved = resolveCustomerForEnquiryConversion(baseEnquiry(), [existing]);
    expect(resolved.customerCreated).toBe(false);
    expect(resolved.customerId).toBe("CUST-0010");
  });

  it("enrichCustomerFromEnquiry backfills sparse customer rows", () => {
    const sparse: Customer = {
      id: "CUST-1",
      name: "",
      phone: "",
      email: "",
      address: "",
      type: "individual",
      itemsBought: [],
      totalPurchases: 0,
      createdAt: "2026-01-01",
    };
    const enriched = enrichCustomerFromEnquiry(sparse, baseEnquiry());
    expect(enriched.name).toBe("Ravi Kumar");
    expect(enriched.phone).toBe("9876543210");
    expect(buildCustomerFromEnquiry(baseEnquiry(), "CUST-NEW").email).toBe("ravi@example.com");
  });
});
