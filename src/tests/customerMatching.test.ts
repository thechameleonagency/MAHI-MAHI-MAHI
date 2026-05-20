import { describe, expect, it } from "vitest";
import {
  customerIdentityMatches,
  customerNamesMatch,
  customerPhonesMatch,
  findCustomerByIdentity,
  findProjectForCustomer,
  findQuotationForCustomer,
  normalizeCustomerName,
  projectMatchesCustomer,
  quotationMatchesCustomer,
} from "@/lib/customerMatching";

describe("customerMatching", () => {
  it("normalizes names: trim, case, M/s prefix", () => {
    expect(normalizeCustomerName("  M/s Acme Solar  ")).toBe("acme solar");
    expect(customerNamesMatch("M/s Acme Solar", "acme solar")).toBe(true);
  });

  it("matches phones with country code and formatting", () => {
    expect(customerPhonesMatch("+91 98765 43210", "9876543210")).toBe(true);
    expect(customerPhonesMatch("09876543210", "9876543210")).toBe(true);
  });

  it("does not match empty or too-short phones", () => {
    expect(customerPhonesMatch("", "9876543210")).toBe(false);
    expect(customerPhonesMatch("123", "9876543210")).toBe(false);
  });

  it("findCustomerByIdentity links quotation client to existing customer", () => {
    const customers = [
      { id: "CUST-0001", name: "Rajesh Kumar", phone: "9876543210" },
      { id: "CUST-0002", name: "Other Co", phone: "9000000000" },
    ];
    const match = findCustomerByIdentity(customers, {
      name: "  rajesh kumar ",
      phone: "+91-98765-43210",
    });
    expect(match?.id).toBe("CUST-0001");
  });

  it("projectMatchesCustomer prefers customerId then normalized client fields", () => {
    const customer = { id: "C1", name: "Acme", phone: "9876543210" };
    expect(
      projectMatchesCustomer(
        { customerId: "C1", client: "Different", clientPhone: "0000000000" },
        customer,
      ),
    ).toBe(true);
    expect(
      projectMatchesCustomer(
        { client: "M/s Acme", clientPhone: "9876543210" },
        customer,
      ),
    ).toBe(true);
  });

  it("quotationMatchesCustomer and find helpers align", () => {
    const customer = { name: "Beta Ltd", phone: "9123456789" };
    const quotations = [
      { id: "Q1", clientName: "beta ltd", clientPhone: "09123456789" },
      { id: "Q2", clientName: "Gamma", clientPhone: "9000000000" },
    ];
    expect(quotationMatchesCustomer(quotations[0], customer)).toBe(true);
    expect(findQuotationForCustomer(quotations, customer)?.id).toBe("Q1");
    expect(
      findProjectForCustomer(
        [{ id: 1, client: "Beta Ltd", clientPhone: "9123456789" }],
        { id: "C1", ...customer },
      )?.id,
    ).toBe(1);
  });

  it("customerIdentityMatches is false for unrelated parties", () => {
    expect(
      customerIdentityMatches(
        { name: "Alpha", phone: "9876543210" },
        { name: "Beta", phone: "9123456789" },
      ),
    ).toBe(false);
  });
});
