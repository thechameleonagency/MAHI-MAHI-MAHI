import type { AppState } from "@/contexts/AppDataContext";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";

/**
 * Keeps `mss.repo.*` mirrors aligned with the canonical `mahi_solar_app_data` snapshot.
 * Command-bus handlers read/write repositories; UI state lives in AppDataContext.
 */
export function syncPrototypeRepositoriesFromAppState(
  state: AppState,
  repositories: AppRepositoryContext,
): void {
  repositories.projectRepository.replaceAll(state.projects);
  repositories.quotationRepository.replaceAll(state.quotations);
  repositories.enquiryRepository.replaceAll(state.enquiries);
  repositories.customerRepository.replaceAll(state.customers);
  repositories.invoiceRepository.replaceAll([...state.invoices, ...state.saleBills]);
  repositories.employeeRepository.replaceAll(state.employees);
  repositories.inventoryItemRepository.replaceAll(state.inventoryItems);
  repositories.auditRepository.replaceAll(state.auditLogs);
}
