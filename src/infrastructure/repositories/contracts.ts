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
import type { AuditLogEntry, Customer, Invoice } from "@/types/finance";

export interface CrudRepository<TEntity extends { id: string | number }> {
  getAll(): TEntity[];
  getById(id: TEntity["id"]): TEntity | undefined;
  add(entity: TEntity): void;
  update(id: TEntity["id"], updates: Partial<TEntity>): void;
  remove(id: TEntity["id"]): void;
  replaceAll(items: TEntity[]): void;
}

export interface AppRepositoryContext {
  projectRepository: CrudRepository<Project>;
  quotationRepository: CrudRepository<Quotation>;
  enquiryRepository: CrudRepository<Enquiry>;
  customerRepository: CrudRepository<Customer>;
  invoiceRepository: CrudRepository<Invoice>;
  employeeRepository: CrudRepository<Employee>;
  inventoryItemRepository: CrudRepository<InventoryItem>;
  auditRepository: CrudRepository<AuditLogEntry>;
  siteRepository: CrudRepository<SiteRecord>;
  taskRepository: CrudRepository<Task>;
  vendorRepository: CrudRepository<Vendor>;
}
