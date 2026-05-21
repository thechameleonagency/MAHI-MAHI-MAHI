import { LocalStorageJsonRepository } from "@/infrastructure/repositories/localStorage/LocalStorageJsonRepository";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import type { Customer, Invoice, AuditLogEntry } from "@/types/finance";
import type { Enquiry, InventoryItem, Project, Quotation, Employee } from "@/types/project";

const STORAGE_KEYS = {
  projects: "mss.repo.projects",
  quotations: "mss.repo.quotations",
  enquiries: "mss.repo.enquiries",
  customers: "mss.repo.customers",
  invoices: "mss.repo.invoices",
  employees: "mss.repo.employees",
  inventoryItems: "mss.repo.inventoryItems",
  auditLogs: "mss.repo.auditLogs",
};

export const createPrototypeRepositoryContext = (): AppRepositoryContext => {
  return {
    projectRepository: new LocalStorageJsonRepository<Project>(STORAGE_KEYS.projects, []),
    quotationRepository: new LocalStorageJsonRepository<Quotation>(STORAGE_KEYS.quotations, []),
    enquiryRepository: new LocalStorageJsonRepository<Enquiry>(STORAGE_KEYS.enquiries, []),
    customerRepository: new LocalStorageJsonRepository<Customer>(STORAGE_KEYS.customers, []),
    invoiceRepository: new LocalStorageJsonRepository<Invoice>(STORAGE_KEYS.invoices, []),
    employeeRepository: new LocalStorageJsonRepository<Employee>(STORAGE_KEYS.employees, []),
    inventoryItemRepository: new LocalStorageJsonRepository<InventoryItem>(STORAGE_KEYS.inventoryItems, []),
    auditRepository: new LocalStorageJsonRepository<AuditLogEntry>(STORAGE_KEYS.auditLogs, []),
  };
};
