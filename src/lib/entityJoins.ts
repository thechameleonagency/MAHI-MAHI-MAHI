import type { Customer, Invoice, Payment } from "@/types/finance";
import type { Project, Quotation } from "@/types/project";

export function getProjectsForCustomer(
  customerId: string,
  projects: Project[],
): Project[] {
  return projects.filter((p) => p.customerId === customerId);
}

export function getQuotationsForCustomer(
  customerId: string,
  quotations: Quotation[],
): Quotation[] {
  return quotations.filter((q) => q.customerId === customerId);
}

export function getInvoicesForCustomer(
  customerId: string,
  invoices: Invoice[],
): Invoice[] {
  return invoices.filter((i) => i.customerId === customerId);
}

export function getInvoicesForProject(projectId: string, invoices: Invoice[]): Invoice[] {
  return invoices.filter((i) => i.projectId === projectId);
}

export function getCanonicalProjectPartnerId(project: Project): string | undefined {
  return project.scope?.partnerId ?? project.partners?.[0]?.partnerId;
}

export function getCanonicalProjectAgentId(project: Project): string | undefined {
  return project.scope?.agentId ?? project.agentId;
}

/** Normalize vendor id during string migration (accept legacy number). */
export function resolveVendorId(vendorId: string | number): string {
  return String(vendorId);
}

export function findCustomerById(
  customers: Customer[],
  id: string,
): Customer | undefined {
  return customers.find((c) => c.id === id);
}

export function findProjectById(projects: Project[], id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

export function paymentsForInvoice(invoiceId: string, payments: Payment[]): Payment[] {
  return payments.filter((p) => p.invoiceId === invoiceId && p.direction === "in");
}
