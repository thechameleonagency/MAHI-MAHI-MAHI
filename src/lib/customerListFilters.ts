import type { Customer } from "@/types/finance";
import { getCustomerKind, isCustomerArchived } from "@/lib/selectors";

export type CustomerKindFilter = "all" | "project" | "inventory" | "both";

export type CustomerListFilterInput = {
  searchQuery?: string;
  typeFilter?: "all" | "individual" | "company";
  kindFilter?: CustomerKindFilter;
  /** When true, list only archived customers; when false, exclude archived. */
  showArchived?: boolean;
};

/** Active pipeline customers (not archived). */
export function filterActiveCustomers(customers: Customer[]): Customer[] {
  return customers.filter((c) => !isCustomerArchived(c));
}

export function filterCustomersForList(
  customers: Customer[],
  input: CustomerListFilterInput,
): Customer[] {
  const search = (input.searchQuery ?? "").trim().toLowerCase();
  const typeFilter = input.typeFilter ?? "all";
  const kindFilter = input.kindFilter ?? "all";
  const showArchived = input.showArchived ?? false;

  return customers.filter((c) => {
    const archived = isCustomerArchived(c);
    if (showArchived) {
      if (!archived) return false;
    } else if (archived) {
      return false;
    }

    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search) ||
      c.phone.includes(search) ||
      (c.email || "").toLowerCase().includes(search);
    const matchesType = typeFilter === "all" || c.type === typeFilter;
    const kind = getCustomerKind(c);
    const matchesKind =
      kindFilter === "all" || kind === kindFilter || kind === "both";

    return matchesSearch && matchesType && matchesKind;
  });
}
