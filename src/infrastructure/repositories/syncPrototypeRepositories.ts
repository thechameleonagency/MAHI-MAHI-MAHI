import type { AppState } from "@/contexts/AppDataContext";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import {
  PROTOTYPE_REPOSITORY_MIRROR_SLICES,
  PROTOTYPE_REPOSITORY_STORAGE_KEYS,
} from "@/infrastructure/repositories/prototypeRepositoryManifest";

export { PROTOTYPE_REPOSITORY_STORAGE_KEYS, PROTOTYPE_REPOSITORY_MIRROR_SLICES };

const REPOSITORY_BY_KEY: Record<
  keyof typeof PROTOTYPE_REPOSITORY_STORAGE_KEYS,
  keyof AppRepositoryContext
> = {
  projects: "projectRepository",
  quotations: "quotationRepository",
  enquiries: "enquiryRepository",
  customers: "customerRepository",
  invoices: "invoiceRepository",
  employees: "employeeRepository",
  inventoryItems: "inventoryItemRepository",
  auditLogs: "auditRepository",
};

/**
 * Keeps every `mss.repo.*` mirror aligned with the canonical `mahi_solar_app_data` snapshot.
 * Call before command-bus handlers and after cross-tab / hydration reload (MD9).
 */
export function syncPrototypeRepositoriesFromAppState(
  state: AppState,
  repositories: AppRepositoryContext,
): void {
  for (const slice of PROTOTYPE_REPOSITORY_MIRROR_SLICES) {
    const repoProp = REPOSITORY_BY_KEY[slice.key];
    const items = slice.select(state);
    repositories[repoProp].replaceAll(items as never);
  }
}
