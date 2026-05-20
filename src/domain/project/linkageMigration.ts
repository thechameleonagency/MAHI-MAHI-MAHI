import { normalizeProject } from "@/lib/projectNormalize";
import { migrateQuotationProjectLink } from "@/lib/quotationProjectLink";
import type { Customer, Invoice } from "@/types/finance";
import type { ExecutionLineItem, Project, Quotation } from "@/types/project";

const LEGACY_FALLBACK = "C001";

/** Resolve stable customer key from friendly name match. */
function matchCustomerId(name: string | undefined, customers: Customer[]): string {
  if (!name?.trim()) return customers[0]?.id ?? LEGACY_FALLBACK;
  const n = name.trim().toLowerCase();
  const exact = customers.find((c) => c.name.trim().toLowerCase() === n);
  if (exact) return exact.id;
  const partial = customers.find((c) => n.includes(c.name.trim().toLowerCase()) || c.name.trim().toLowerCase().includes(n.slice(0, 8)));
  return partial?.id ?? customers[0]?.id ?? LEGACY_FALLBACK;
}

const legacyStatusToLifecycle = (status: string | undefined): Project["lifecycleStatus"] => {
  if (status === "Completed") return "Completed";
  if (status === "On Hold") return "On Hold";
  if (status === "Ongoing") return "Active";
  return "Draft"; // default for legacy
};

const _lifecycleToLegacyStatus = (lifecycle: Project["lifecycleStatus"] | undefined): string => {
  if (lifecycle === "Completed") return "Completed";
  if (lifecycle === "On Hold") return "On Hold";
  if (lifecycle === "Active") return "Ongoing";
  return "Ongoing"; // default
};

function normalizeLegacyProjectFields(project: Project): Project {
  // Ensure lifecycleStatus is set, defaulting from any legacy status
  const lifecycleStatus = project.lifecycleStatus ?? legacyStatusToLifecycle((project as any).status);
  return normalizeProject({ ...project, lifecycleStatus });
}

export function hydrateProjectLinkage(projects: Project[], customers: Customer[]): Project[] {
  return projects.map((p) => {
    const customerId = p.customerId || matchCustomerId(p.client, customers);
    let executionLineItems = p.executionLineItems;
    if ((!executionLineItems || executionLineItems.length === 0) && p.commercialBaseline?.lines?.length) {
      executionLineItems = p.commercialBaseline.lines.map(
        (l): ExecutionLineItem => ({
          ...l,
          source: p.quotationId ? "quotation" : "intake",
          issuedQty: p.status === "Completed" ? l.quantity : 0,
        }),
      );
    }
    return normalizeLegacyProjectFields({
      ...p,
      customerId,
      executionLineItems,
    });
  });
}

export function hydrateQuotationLinkage(quotations: Quotation[], customers: Customer[]): Quotation[] {
  return quotations.map((q) => {
    const linked = migrateQuotationProjectLink({
      ...q,
      customerId: q.customerId || matchCustomerId(q.clientName, customers),
    });
    return linked;
  });
}

/** Ensure invoices carry customerId + projectId defaults for legacy demos. */
export function hydrateInvoiceLinkage(invoices: Invoice[], customers: Customer[], projects: Project[]): Invoice[] {
  return invoices.map((inv) => {
    const customerId = inv.customerId || matchCustomerId(inv.customerName, customers);
    const projectId =
      inv.projectId ||
      projects.find((p) => p.customerId === customerId)?.id ||
      projects[0]?.id;
    return {
      ...inv,
      customerId,
      billingScope: inv.billingScope ?? "project",
      projectId,
    };
  });
}
