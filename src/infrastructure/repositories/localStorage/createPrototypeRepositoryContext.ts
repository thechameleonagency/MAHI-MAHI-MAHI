import { LocalStorageJsonRepository } from "@/infrastructure/repositories/localStorage/LocalStorageJsonRepository";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import type { Customer, Invoice, AuditLogEntry } from "@/types/finance";
import type { Enquiry, InventoryItem, Project, Quotation, Employee } from "@/types/project";
import { dummyAuditLogs, dummyCustomers, dummyEmployees, dummyEnquiries, dummyInvoices, dummyProjects, dummyQuotations } from "@/data/dummyData";
import { dummyInventoryItems } from "@/data/inventoryData";

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
    projectRepository: new LocalStorageJsonRepository<Project>(STORAGE_KEYS.projects, dummyProjects),
    quotationRepository: new LocalStorageJsonRepository<Quotation>(STORAGE_KEYS.quotations, dummyQuotations),
    enquiryRepository: new LocalStorageJsonRepository<Enquiry>(STORAGE_KEYS.enquiries, dummyEnquiries),
    customerRepository: new LocalStorageJsonRepository<Customer>(STORAGE_KEYS.customers, dummyCustomers),
    invoiceRepository: new LocalStorageJsonRepository<Invoice>(STORAGE_KEYS.invoices, dummyInvoices),
    employeeRepository: new LocalStorageJsonRepository<Employee>(STORAGE_KEYS.employees, dummyEmployees),
    inventoryItemRepository: new LocalStorageJsonRepository<InventoryItem>(STORAGE_KEYS.inventoryItems, dummyInventoryItems),
    auditRepository: new LocalStorageJsonRepository<AuditLogEntry>(STORAGE_KEYS.auditLogs, dummyAuditLogs),
  };
};
