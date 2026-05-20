import { describe, expect, it } from "vitest";
import type { Customer } from "@/types/finance";
import {
  filterActiveCustomers,
  filterCustomersForList,
} from "@/lib/customerListFilters";

const c = (id: string, overrides: Partial<Customer> = {}): Customer => ({
  id,
  name: `Customer ${id}`,
  phone: "9876543210",
  email: `${id}@test.com`,
  address: "",
  type: "individual",
  itemsBought: [],
  totalPurchases: 0,
  createdAt: "2026-01-01",
  ...overrides,
});

describe("customerListFilters", () => {
  const rows = [
    c("C1", { customerKind: "project" }),
    c("C2", { customerKind: "inventory", archivedAt: "2026-05-01" }),
    c("C3", { customerKind: "both", name: "Acme Corp", type: "company" }),
  ];

  it("filterActiveCustomers excludes archived rows", () => {
    expect(filterActiveCustomers(rows).map((x) => x.id)).toEqual(["C1", "C3"]);
  });

  it("default list hides archived", () => {
    expect(filterCustomersForList(rows, {}).map((x) => x.id)).toEqual(["C1", "C3"]);
  });

  it("showArchived lists only archived customers", () => {
    expect(filterCustomersForList(rows, { showArchived: true }).map((x) => x.id)).toEqual(["C2"]);
  });

  it("applies kind and type filters within archived view", () => {
    const archivedInventory = filterCustomersForList(rows, {
      showArchived: true,
      kindFilter: "inventory",
    });
    expect(archivedInventory.map((x) => x.id)).toEqual(["C2"]);
  });
});
