import { LocalStorageJsonRepository } from "@/infrastructure/repositories/localStorage/LocalStorageJsonRepository";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import type { AuditLogEntry, Customer, Invoice } from "@/types/finance";
import type {
  Enquiry,
  InventoryItem,
  Project,
  Quotation,
  Employee,
  SiteRecord,
  Task,
  Vendor,
} from "@/types/project";

/** Isolated localStorage repos for unit tests (includes AR3 site/task/vendor mirrors). */
export function mockRepositoryContext(
  prefix: string,
  partial?: Partial<AppRepositoryContext>,
): AppRepositoryContext {
  const key = (suffix: string) => `mss.test.${prefix}.${suffix}`;
  return {
    projectRepository: new LocalStorageJsonRepository<Project>(key("projects"), []),
    quotationRepository: new LocalStorageJsonRepository<Quotation>(key("quotations"), []),
    enquiryRepository: new LocalStorageJsonRepository<Enquiry>(key("enquiries"), []),
    customerRepository: new LocalStorageJsonRepository<Customer>(key("customers"), []),
    invoiceRepository: new LocalStorageJsonRepository<Invoice>(key("invoices"), []),
    employeeRepository: new LocalStorageJsonRepository<Employee>(key("employees"), []),
    inventoryItemRepository: new LocalStorageJsonRepository<InventoryItem>(key("inventory"), []),
    auditRepository: new LocalStorageJsonRepository<AuditLogEntry>(key("audit"), []),
    siteRepository: new LocalStorageJsonRepository<SiteRecord>(key("sites"), []),
    taskRepository: new LocalStorageJsonRepository<Task>(key("tasks"), []),
    vendorRepository: new LocalStorageJsonRepository<Vendor>(key("vendors"), []),
    ...partial,
  };
}
