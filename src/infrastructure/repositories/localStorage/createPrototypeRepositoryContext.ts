import { LocalStorageJsonRepository } from "@/infrastructure/repositories/localStorage/LocalStorageJsonRepository";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import { PROTOTYPE_REPOSITORY_STORAGE_KEYS } from "@/infrastructure/repositories/prototypeRepositoryManifest";
import type { Customer, Invoice, AuditLogEntry } from "@/types/finance";
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

export const createPrototypeRepositoryContext = (): AppRepositoryContext => {
  return {
    projectRepository: new LocalStorageJsonRepository<Project>(PROTOTYPE_REPOSITORY_STORAGE_KEYS.projects, []),
    quotationRepository: new LocalStorageJsonRepository<Quotation>(PROTOTYPE_REPOSITORY_STORAGE_KEYS.quotations, []),
    enquiryRepository: new LocalStorageJsonRepository<Enquiry>(PROTOTYPE_REPOSITORY_STORAGE_KEYS.enquiries, []),
    customerRepository: new LocalStorageJsonRepository<Customer>(PROTOTYPE_REPOSITORY_STORAGE_KEYS.customers, []),
    invoiceRepository: new LocalStorageJsonRepository<Invoice>(PROTOTYPE_REPOSITORY_STORAGE_KEYS.invoices, []),
    employeeRepository: new LocalStorageJsonRepository<Employee>(PROTOTYPE_REPOSITORY_STORAGE_KEYS.employees, []),
    inventoryItemRepository: new LocalStorageJsonRepository<InventoryItem>(
      PROTOTYPE_REPOSITORY_STORAGE_KEYS.inventoryItems,
      [],
    ),
    auditRepository: new LocalStorageJsonRepository<AuditLogEntry>(PROTOTYPE_REPOSITORY_STORAGE_KEYS.auditLogs, []),
    siteRepository: new LocalStorageJsonRepository<SiteRecord>(PROTOTYPE_REPOSITORY_STORAGE_KEYS.sites, []),
    taskRepository: new LocalStorageJsonRepository<Task>(PROTOTYPE_REPOSITORY_STORAGE_KEYS.tasks, []),
    vendorRepository: new LocalStorageJsonRepository<Vendor>(PROTOTYPE_REPOSITORY_STORAGE_KEYS.vendors, []),
  };
};
