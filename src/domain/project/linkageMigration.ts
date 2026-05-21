import { resolveProjectExecutionLineItems } from "@/domain/project/executionLineItems";
import { canonicalizeProjectLifecycleStatus } from "@/domain/stateMachines/projectStateMachine";
import { normalizeProject } from "@/lib/projectNormalize";
import {
  resolveCustomerIdFromHints,
  syncProjectClientFromCustomer,
} from "@/lib/projectCustomerLinkage";
import { migrateQuotationProjectLink } from "@/lib/quotationProjectLink";
import type { Customer, Invoice } from "@/types/finance";
import type { Project, Quotation } from "@/types/project";

function normalizeLegacyProjectFields(project: Project): Project {
  const lifecycleStatus =
    project.lifecycleStatus ??
    canonicalizeProjectLifecycleStatus((project as { status?: string }).status);
  return normalizeProject({ ...project, lifecycleStatus });
}

export function hydrateProjectLinkage(projects: Project[], customers: Customer[]): Project[] {
  return projects.map((p) => {
    const existingId = p.customerId?.trim();
    const customer =
      existingId && customers.some((c) => c.id === existingId)
        ? customers.find((c) => c.id === existingId)
        : undefined;

    if (customer) {
      return syncProjectClientFromCustomer(p, customer);
    }

    const resolved = resolveCustomerIdFromHints(
      {
        client: p.client,
        clientPhone: p.clientPhone,
        clientEmail: p.clientEmail,
        clientGstin: p.clientGstin,
      },
      customers,
    );

    if (resolved) {
      const matched = customers.find((c) => c.id === resolved);
      if (matched) {
        return syncProjectClientFromCustomer({ ...p, customerId: resolved }, matched);
      }
      return normalizeLegacyProjectFields({ ...p, customerId: resolved });
    }

    return normalizeLegacyProjectFields(p);
  });
}

export function hydrateQuotationLinkage(quotations: Quotation[], customers: Customer[]): Quotation[] {
  return quotations.map((q) => {
    const existingId = q.customerId?.trim();
    const customer =
      existingId && customers.some((c) => c.id === existingId)
        ? customers.find((c) => c.id === existingId)
        : undefined;

    const customerId =
      customer?.id ||
      resolveCustomerIdFromHints(
        {
          client: q.clientName,
          clientPhone: q.clientPhone,
          clientEmail: q.clientEmail,
          clientGstin: q.clientGstin,
        },
        customers,
      );

    const linked = migrateQuotationProjectLink({
      ...q,
      customerId,
      clientName: customer?.name ?? q.clientName,
    });
    return linked;
  });
}

/** Ensure invoices carry customerId + projectId from linked project when possible (ER3). */
export function hydrateInvoiceLinkage(
  invoices: Invoice[],
  customers: Customer[],
  projects: Project[],
): Invoice[] {
  const projectById = new Map(projects.map((p) => [p.id, p]));

  return invoices.map((inv) => {
    const project = inv.projectId ? projectById.get(inv.projectId) : undefined;
    const existingId = inv.customerId?.trim();
    const customer =
      existingId && customers.some((c) => c.id === existingId)
        ? customers.find((c) => c.id === existingId)
        : undefined;

    const customerId =
      customer?.id ||
      project?.customerId ||
      resolveCustomerIdFromHints({ client: inv.customerName }, customers);

    const resolvedCustomer = customerId ? customers.find((c) => c.id === customerId) : undefined;
    const projectId = inv.projectId || project?.id || projects.find((p) => p.customerId === customerId)?.id;

    return {
      ...inv,
      customerId: resolvedCustomer?.id ?? customerId,
      customerName: resolvedCustomer?.name ?? inv.customerName,
      billingScope: inv.billingScope ?? "project",
      projectId,
    };
  });
}
