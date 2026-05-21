import type { Dispatch, SetStateAction } from "react";
import type { AppState } from "@/contexts/AppDataContext";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import { syncPrototypeRepositoriesFromAppState } from "@/infrastructure/repositories/syncPrototypeRepositories";

/**
 * AR1 — wrap React setState so prototype mss.repo.* mirrors always match AppState
 * before the debounced mahi_solar_app_data persist (removes command vs direct drift).
 */
export function createRepositorySyncedSetState(
  setState: Dispatch<SetStateAction<AppState>>,
  repositories: AppRepositoryContext,
): Dispatch<SetStateAction<AppState>> {
  return (action) => {
    setState((prev) => {
      const next = typeof action === "function" ? action(prev) : action;
      syncPrototypeRepositoriesFromAppState(next, repositories);
      return next;
    });
  };
}

/** Merge slices from repositories after a successful command (canonical command-bus tail). */
export function mergeCommandBusSlicesFromRepositories(
  prev: AppState,
  repositories: AppRepositoryContext,
  slices: {
    projects?: boolean;
    quotations?: boolean;
    enquiries?: boolean;
    customers?: boolean;
    invoices?: boolean;
    employees?: boolean;
    inventoryItems?: boolean;
    auditLogs?: boolean;
  },
): AppState {
  return {
    ...prev,
    ...(slices.projects
      ? { projects: repositories.projectRepository.getAll() as AppState["projects"] }
      : {}),
    ...(slices.quotations
      ? { quotations: repositories.quotationRepository.getAll() as AppState["quotations"] }
      : {}),
    ...(slices.enquiries
      ? { enquiries: repositories.enquiryRepository.getAll() as AppState["enquiries"] }
      : {}),
    ...(slices.customers
      ? { customers: repositories.customerRepository.getAll() as AppState["customers"] }
      : {}),
    ...(slices.invoices
      ? {
          invoices: repositories.invoiceRepository
            .getAll()
            .filter((d) => (d as { type?: string }).type !== "sale-bill") as AppState["invoices"],
          saleBills: repositories.invoiceRepository
            .getAll()
            .filter((d) => (d as { type?: string }).type === "sale-bill") as AppState["saleBills"],
        }
      : {}),
    ...(slices.employees
      ? { employees: repositories.employeeRepository.getAll() as AppState["employees"] }
      : {}),
    ...(slices.inventoryItems
      ? {
          inventoryItems: repositories.inventoryItemRepository.getAll() as AppState["inventoryItems"],
        }
      : {}),
    ...(slices.auditLogs
      ? { auditLogs: repositories.auditRepository.getAll() as AppState["auditLogs"] }
      : {}),
  };
}
